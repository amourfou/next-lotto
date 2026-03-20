'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, Download, RefreshCw } from 'lucide-react';
import { LotteryData } from '../lib/dataParser';

interface DataAdderProps {
  onDataAdded?: () => void;
  lotteryData?: LotteryData[];
}

export default function DataAdder({ onDataAdded, lotteryData = [] }: DataAdderProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState<number[]>(() => {
    // 기본값: 14개 0으로 초기화
    return Array(14).fill(0);
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 마지막 회차에 1을 더해서 자동 설정
  useEffect(() => {
    if (lotteryData && lotteryData.length > 0) {
      // order 기준으로 정렬하여 마지막 회차 찾기
      const sortedData = [...lotteryData].sort((a, b) => b.order - a.order);
      const lastOrder = sortedData[0].order;
      const nextOrder = lastOrder + 1;
      
      setFormData(prev => {
        const newData = [...prev];
        newData[0] = nextOrder;
        return newData;
      });
    } else {
      // 데이터가 없으면 1로 시작
      setFormData(prev => {
        const newData = [...prev];
        newData[0] = 1;
        return newData;
      });
    }
  }, [lotteryData]);

  // 필드 이름 정의
  const fieldLabels = [
    '회차',
    '조',
    '십만자리',
    '만자리',
    '천자리',
    '백자리',
    '십자리',
    '일자리',
    '보너스번호십만자리',
    '보너스번호만자리',
    '보너스번호천자리',
    '보너스번호백자리',
    '보너스번호십자리',
    '보너스번호일자리'
  ];

  const handleChange = (index: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    
    // 회차 필드(index 0)는 자동 설정되므로 수정 불가
    if (index === 0) {
      return;
    } else if (index === 1) {
      // 조 필드(index 1)는 1~5 범위만 허용
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
        const newData = [...formData];
        newData[index] = numValue;
        setFormData(newData);
        setMessage(null);
      }
    } else {
      // 다른 필드는 0~9 범위 허용
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 9) {
        const newData = [...formData];
        newData[index] = numValue;
        setFormData(newData);
        setMessage(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 조 검증 (회차는 자동 설정되므로 검증 불필요)
    if (formData[1] === 0 || formData[1] < 1 || formData[1] > 5) {
      setMessage({ type: 'error', text: '조는 1~5 사이의 값이어야 합니다.' });
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/add-lottery-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newData: formData }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        // 폼 초기화 (회차는 자동으로 다시 설정됨)
        const newFormData = Array(14).fill(0);
        // 회차는 useEffect에서 자동으로 설정되므로 여기서는 초기화하지 않음
        setFormData(newFormData);
        // 데이터 재로드 콜백 호출
        if (onDataAdded) {
          setTimeout(() => {
            onDataAdded();
          }, 500);
        }
      } else {
        setMessage({ type: 'error', text: result.error || '데이터 추가에 실패했습니다.' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '데이터 추가 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/pension?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pension-db-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('파일 다운로드에 실패했습니다.');
    }
  };

  /** DB에서만 다시 조회해 화면·통계 갱신 (로컬 JSON 파일 미사용) */
  const handleRefreshFromDb = async () => {
    setIsReanalyzing(true);
    setMessage(null);
    try {
      if (onDataAdded) {
        onDataAdded();
      }
      setMessage({
        type: 'success',
        text: 'DB에서 데이터를 다시 불러왔습니다.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '데이터 갱신 중 오류가 발생했습니다.',
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="p-2 sm:p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors touch-manipulation"
          title="DB에 있는 연금복권 데이터를 JSON 파일로 저장"
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          onClick={handleRefreshFromDb}
          disabled={isReanalyzing}
          className="p-2 sm:p-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
          title="DB에서 연금복권 당첨 데이터를 다시 불러와 분석을 갱신합니다"
        >
          <RefreshCw size={18} className={isReanalyzing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
          title={isOpen ? '닫기' : '데이터 추가'}
        >
          <Plus size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
        {/* 첫 줄: 회차 (자동 설정, 읽기 전용) */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="w-20 sm:w-24 px-2 py-2 sm:py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-center text-sm sm:text-base font-bold text-gray-700">
            {formData[0]}
          </div>
          <span className="text-xs sm:text-sm text-gray-500">회차 (자동 설정)</span>
        </div>
        
        {/* 두 번째 줄: 조 | 구분자 | 번호 6개 */}
        <div className="flex gap-1 sm:gap-1.5 items-center flex-wrap">
          <input
            type="number"
            min="1"
            max="5"
            value={formData[1]}
            onChange={(e) => handleChange(1, e.target.value)}
            placeholder="조"
            className="w-10 sm:w-12 px-1 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm sm:text-base font-bold text-gray-900 touch-manipulation"
            style={{ WebkitAppearance: 'none', appearance: 'none', color: '#111827', WebkitTextFillColor: '#111827' }}
            required
          />
          
          {/* 구분자 */}
          <span className="text-base sm:text-lg font-bold text-gray-400 hidden sm:inline">|</span>
          
          {/* 번호 6개 (십만자리 ~ 일자리) */}
          {formData.slice(2, 8).map((value, idx) => (
            <input
              key={idx + 2}
              type="number"
              min="0"
              max="9"
              value={value}
              onChange={(e) => handleChange(idx + 2, e.target.value)}
              placeholder={fieldLabels[idx + 2]}
              className="w-10 sm:w-12 px-1 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm sm:text-base font-bold text-gray-900 touch-manipulation"
              style={{ WebkitAppearance: 'none', appearance: 'none', color: '#111827', WebkitTextFillColor: '#111827' }}
              required
            />
          ))}
        </div>
        
        {/* 세 번째 줄: 보너스번호 6개 */}
        <div className="flex gap-1 sm:gap-1.5 items-center flex-wrap">
          {formData.slice(8, 14).map((value, idx) => (
            <input
              key={idx + 8}
              type="number"
              min="0"
              max="9"
              value={value}
              onChange={(e) => handleChange(idx + 8, e.target.value)}
              placeholder={fieldLabels[idx + 8]}
              className="w-10 sm:w-12 px-1 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm sm:text-base font-bold text-gray-900 touch-manipulation"
              style={{ WebkitAppearance: 'none', appearance: 'none', color: '#111827', WebkitTextFillColor: '#111827' }}
              required
            />
          ))}
          
          {/* 데이터 추가 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="p-2 sm:p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[44px] min-h-[44px]"
            title={isSubmitting ? '추가 중...' : '데이터 추가'}
          >
            {isSubmitting ? (
              <Save size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
          </button>
        </div>

        {message && (
          <div
            className={`p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

      </form>
    </div>
  );
}

