'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';
import { loadLotteryData, getRecentData, extractNumbers, LotteryData } from '../lib/dataParser';

interface DataLoaderProps {
  onDataLoaded: (numbers: number[], lotteryData: LotteryData[]) => void;
  onStatisticsLoaded: (stats: unknown) => void;
  lotteryData: LotteryData[];
}

export default function DataLoader({ onDataLoaded, onStatisticsLoaded, lotteryData }: DataLoaderProps) {
  const [loadedData, setLoadedData] = useState<LotteryData[] | null>(null);
  const [includeBonus, setIncludeBonus] = useState(false);

  const loadPensionLotteryData = async () => {
    try {
      const { parsedData, numbers, statistics } = await loadLotteryData();
      setLoadedData(parsedData);
      const extractedNumbers = extractNumbers(parsedData, includeBonus);
      onDataLoaded(extractedNumbers, parsedData);
      onStatisticsLoaded(statistics);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      alert(`데이터 로드에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const loadRecentData = (count: number) => {
    const dataToUse = loadedData || lotteryData;
    if (!dataToUse || dataToUse.length === 0) return;
    const recentData = getRecentData(dataToUse, count);
    const numbers = extractNumbers(recentData, includeBonus);
    onDataLoaded(numbers, recentData);
  };

  const handleBonusToggle = () => {
    const newIncludeBonus = !includeBonus;
    setIncludeBonus(newIncludeBonus);
    const dataToUse = loadedData || lotteryData;
    if (dataToUse.length > 0) {
      onDataLoaded(extractNumbers(dataToUse, newIncludeBonus), dataToUse);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Database size={24} />
        데이터 범위 선택
      </h2>
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <input
            type="checkbox"
            id="includeBonus"
            checked={includeBonus}
            onChange={handleBonusToggle}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="includeBonus" className="text-sm font-medium text-gray-700 cursor-pointer">
            보너스 번호 포함
          </label>
        </div>
        {lotteryData.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">현재 {lotteryData.length}회차 데이터가 로드되었습니다.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => loadRecentData(10)} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">최근 10회차</button>
              <button onClick={() => loadRecentData(20)} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">최근 20회차</button>
              <button onClick={() => loadRecentData(50)} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">최근 50회차</button>
              <button onClick={() => loadRecentData(100)} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">최근 100회차</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
