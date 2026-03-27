'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { LotteryData } from '../lib/dataParser';

interface TrendChartProps {
  lotteryData: LotteryData[];
}

interface ChartDataPoint {
  order: number;
  number: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export default function TrendChart({ lotteryData }: TrendChartProps) {
  console.log('TrendChart - lotteryData:', lotteryData.length, '개 항목');
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  if (lotteryData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-500">데이터를 로드하여 트렌드 차트를 확인하세요</p>
        <p className="text-sm text-gray-400 mt-2">현재 데이터: {lotteryData.length}개</p>
      </div>
    );
  }

  // 차트 데이터 생성 (회차 순서대로 정렬 - 1회차부터 마지막 회차까지)
  const sortedData = [...lotteryData].sort((a, b) => a.order - b.order);
  console.log('TrendChart - sortedData:', sortedData.length, '개, 첫 3개:', sortedData.slice(0, 3));
  
  const chartData: ChartDataPoint[] = sortedData.map((data, index) => {
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let change = 0;
    
    if (index > 0) {
      const prevNumber = sortedData[index - 1].combinedNumber;
      change = data.combinedNumber - prevNumber;
      
      if (change > 10000) trend = 'up';
      else if (change < -10000) trend = 'down';
      else trend = 'stable';
    }
    
    return {
      order: data.order,
      number: data.combinedNumber,
      trend,
      change
    };
  });
  
  console.log('TrendChart - chartData 생성 완료:', chartData.length, '개, 첫 3개:', chartData.slice(0, 3));

  // 평균값 계산
  const average = chartData.reduce((sum, point) => sum + point.number, 0) / chartData.length;
  
  // 최대/최소값
  const maxValue = Math.max(...chartData.map(d => d.number));
  const minValue = Math.min(...chartData.map(d => d.number));
  
  // 트렌드 통계
  const upTrends = chartData.filter(d => d.trend === 'up').length;
  const downTrends = chartData.filter(d => d.trend === 'down').length;
  const stableTrends = chartData.filter(d => d.trend === 'stable').length;

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800">{label}회차</p>
          <p className="text-blue-600">
            숫자: <span className="font-mono font-bold">{data.number.toString().padStart(6, '0')}</span>
          </p>
          {data.change !== 0 && (
            <p className={`text-sm ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              변화: {data.change > 0 ? '+' : ''}{data.change.toLocaleString()}
            </p>
          )}
          <p className="text-sm text-gray-600">
            트렌드: {
              data.trend === 'up' ? '📈 상승' : 
              data.trend === 'down' ? '📉 하락' : '➡️ 안정'
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart3 size={24} />
        1회차부터 {chartData[chartData.length - 1]?.order}회차까지 전체 트렌드 ({chartData.length}회차)
        <InfoTooltip text="전체 회차의 6자리 당첨 번호(combinedNumber)를 시계열 선 그래프로 표시합니다. 확대/축소로 특정 구간을 자세히 볼 수 있으며, 파란 기준선은 평균값입니다." width="w-80" />
      </h2>
      
      <div className="space-y-6">
        {/* 트렌드 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-sm text-gray-600">상승</span>
            </div>
            <div className="text-xl font-bold text-green-600">{upTrends}</div>
            <div className="text-xs text-gray-500">
              {((upTrends / (chartData.length - 1)) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown size={16} className="text-red-600" />
              <span className="text-sm text-gray-600">하락</span>
            </div>
            <div className="text-xl font-bold text-red-600">{downTrends}</div>
            <div className="text-xs text-gray-500">
              {((downTrends / (chartData.length - 1)) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Minus size={16} className="text-gray-600" />
              <span className="text-sm text-gray-600">안정</span>
            </div>
            <div className="text-xl font-bold text-gray-600">{stableTrends}</div>
            <div className="text-xs text-gray-500">
              {((stableTrends / (chartData.length - 1)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* 선그래프 */}
        <div className="p-4" style={{ border: '2px solid #ef4444', backgroundColor: '#fef2f2' }}>
          <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
            차트 데이터: {chartData.length}개 포인트
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
              📈 1회차부터 {chartData[chartData.length - 1]?.order}회차까지 전체 트렌드
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="줌 아웃"
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.2))}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="줌 인"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => { setZoomLevel(1); setScrollPosition(0); }}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="리셋"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
          
          {/* 전체 데이터 선그래프 - 스크롤 가능 */}
          <div style={{ 
            width: '100%', 
            backgroundColor: '#f3f4f6', 
            border: '1px solid #d1d5db', 
            padding: '0.5rem',
            boxSizing: 'border-box'
          }}>
            <div style={{ 
              width: '100%', 
              height: '380px',
              overflowX: 'auto',
              overflowY: 'hidden',
              boxSizing: 'border-box'
            }}>
              <div style={{ 
                width: `${Math.max(100, chartData.length * 8 * zoomLevel)}px`, 
                minWidth: '100%',
                height: '100%',
                boxSizing: 'border-box'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="order" 
                      stroke="#374151"
                      fontSize={10}
                      tickFormatter={(value) => `${value}회`}
                      interval={Math.floor(chartData.length / 20)}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="#374151"
                      fontSize={12}
                      tickFormatter={(value) => value.toString().padStart(6, '0')}
                      domain={[minValue * 0.9, maxValue * 1.1]}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* 평균선 */}
                    <ReferenceLine 
                      y={average} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      label={{ value: "평균", position: "top" }}
                    />
                    
                    {/* 메인 라인 */}
                    <Line
                      type="monotone"
                      dataKey="number"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 1, r: 2 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
                    {Math.round(average).toString().padStart(6, '0')}
            </div>
            <div className="text-gray-600">평균값</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
                    {maxValue.toString().padStart(6, '0')}
            </div>
            <div className="text-gray-600">최대값</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">
                    {minValue.toString().padStart(6, '0')}
            </div>
            <div className="text-gray-600">최소값</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
                    {(maxValue - minValue).toString().padStart(6, '0')}
            </div>
            <div className="text-gray-600">범위</div>
          </div>
        </div>

        {/* 최근 트렌드 분석 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
            최근 트렌드 분석
            <InfoTooltip text="가장 최근 5회차의 당첨 번호와 직전 대비 증감량을 보여줍니다. 가장 최근 회차는 파란 배경으로 강조됩니다." width="w-72" />
          </h3>
          <div className="space-y-2">
            {chartData.slice(-5).map((point, index) => {
              const isLast = index === chartData.slice(-5).length - 1;
              return (
                <div key={point.order} className={`flex items-center justify-between p-2 rounded ${isLast ? 'bg-blue-100' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{point.order}회차</span>
                    {point.trend === 'up' && <TrendingUp size={14} className="text-green-600" />}
                    {point.trend === 'down' && <TrendingDown size={14} className="text-red-600" />}
                    {point.trend === 'stable' && <Minus size={14} className="text-gray-600" />}
                  </div>
                  <div className="text-right">
                          <div className="font-mono font-bold">{point.number.toString().padStart(6, '0')}</div>
                    {point.change !== 0 && (
                      <div className={`text-xs ${point.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {point.change > 0 ? '+' : ''}{point.change.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
