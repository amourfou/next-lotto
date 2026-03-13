'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Target } from 'lucide-react';
import { LotteryData, analyzePreviousRoundComparison } from '../lib/dataParser';

interface TrendAnalysisProps {
  lotteryData: LotteryData[];
}

interface TrendData {
  order: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
}

export default function TrendAnalysis({ lotteryData }: TrendAnalysisProps) {
  if (lotteryData.length === 0) {
    return null;
  }

  // 회차별 변화량 데이터 생성
  const sortedData = [...lotteryData].sort((a, b) => a.order - b.order);
  
  const trendData: TrendData[] = sortedData.map((data, index) => {
    let change = 0;
    let changePercent = 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let volatility = 0;
    
    if (index > 0) {
      const prevNumber = sortedData[index - 1].combinedNumber;
      change = data.combinedNumber - prevNumber;
      changePercent = (change / prevNumber) * 100;
      
      if (change > 10000) trend = 'up';
      else if (change < -10000) trend = 'down';
      else trend = 'stable';
      
      // 변동성 계산 (절댓값 기준)
      volatility = Math.abs(change);
    }
    
    return {
      order: data.order,
      change,
      changePercent,
      trend,
      volatility
    };
  });

  // 통계 계산
  const totalChanges = trendData.filter(d => d.change !== 0);
  const avgChange = totalChanges.reduce((sum, d) => sum + d.change, 0) / totalChanges.length;
  const avgVolatility = totalChanges.reduce((sum, d) => sum + d.volatility, 0) / totalChanges.length;
  
  // 최대/최소 변화량
  const maxIncrease = Math.max(...totalChanges.map(d => d.change));
  const maxDecrease = Math.min(...totalChanges.map(d => d.change));
  
  // 연속 상승/하락 패턴 분석
  let currentStreak = 0;
  let maxUpStreak = 0;
  let maxDownStreak = 0;
  let currentTrend: 'up' | 'down' | null = null;
  
  totalChanges.forEach(d => {
    if (d.trend === 'up') {
      if (currentTrend === 'up') {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentTrend = 'up';
      }
      maxUpStreak = Math.max(maxUpStreak, currentStreak);
    } else if (d.trend === 'down') {
      if (currentTrend === 'down') {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentTrend = 'down';
      }
      maxDownStreak = Math.max(maxDownStreak, currentStreak);
    } else {
      currentStreak = 0;
      currentTrend = null;
    }
  });

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800">{label}회차</p>
          <p className={`${data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            변화량: {data.change > 0 ? '+' : ''}{data.change.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            변동성: {data.volatility.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Activity size={24} />
        트렌드 분석
      </h2>
      
      <div className="space-y-6">
        {/* 변화량 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {avgChange > 0 ? '+' : ''}{avgChange.toFixed(0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">평균 변화량</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              +{maxIncrease.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">최대 상승</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">
              {maxDecrease.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">최대 하락</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {avgVolatility.toFixed(0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">평균 변동성</div>
          </div>
        </div>

        {/* 연속 패턴 분석 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-700 mb-2 flex items-center gap-2">
              <TrendingUp size={20} />
              연속 상승 패턴
            </h3>
            <div className="text-2xl font-bold text-green-600">{maxUpStreak}회</div>
            <div className="text-sm text-gray-600">최대 연속 상승</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
              <TrendingDown size={20} />
              연속 하락 패턴
            </h3>
            <div className="text-2xl font-bold text-red-600">{maxDownStreak}회</div>
            <div className="text-sm text-gray-600">최대 연속 하락</div>
          </div>
        </div>

        {/* 변화량 막대 차트 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">회차별 변화량</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.slice(-20)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="order" 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value}회`}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="change" fill="#8884d8">
                  {trendData.slice(-20).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.change > 0 ? '#10b981' : entry.change < 0 ? '#ef4444' : '#6b7280'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 직전 회차 대비 변화 빈도 분석 */}
        {(() => {
          const comparisonAnalysis = analyzePreviousRoundComparison(lotteryData);
          
          const pieData = [
            { name: '증가', value: comparisonAnalysis.increaseCount, ratio: comparisonAnalysis.increaseRatio * 100, color: '#10b981' },
            { name: '감소', value: comparisonAnalysis.decreaseCount, ratio: comparisonAnalysis.decreaseRatio * 100, color: '#ef4444' },
            { name: '동일', value: comparisonAnalysis.sameCount, ratio: comparisonAnalysis.sameRatio * 100, color: '#6b7280' }
          ].filter(item => item.value > 0);

          return (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">직전 회차 대비 변화 빈도 분석</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 파이 차트 */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, ratio }) => `${name}: ${ratio.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-bold text-gray-800">{data.name}</p>
                                <p className="text-blue-600">
                                  개수: <span className="font-bold">{data.value}회</span>
                                </p>
                                <p className="text-green-600">
                                  비율: <span className="font-bold">{data.ratio.toFixed(2)}%</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* 통계 요약 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp size={16} className="text-green-600" />
                        <span className="text-sm text-gray-600">증가</span>
                      </div>
                      <div className="text-xl font-bold text-green-600">{comparisonAnalysis.increaseCount}회</div>
                      <div className="text-xs text-gray-500">{(comparisonAnalysis.increaseRatio * 100).toFixed(1)}%</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingDown size={16} className="text-red-600" />
                        <span className="text-sm text-gray-600">감소</span>
                      </div>
                      <div className="text-xl font-bold text-red-600">{comparisonAnalysis.decreaseCount}회</div>
                      <div className="text-xs text-gray-500">{(comparisonAnalysis.decreaseRatio * 100).toFixed(1)}%</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Minus size={16} className="text-gray-600" />
                        <span className="text-sm text-gray-600">동일</span>
                      </div>
                      <div className="text-xl font-bold text-gray-600">{comparisonAnalysis.sameCount}회</div>
                      <div className="text-xs text-gray-500">{(comparisonAnalysis.sameRatio * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">연속 패턴</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">최대 연속 증가:</span>
                        <span className="font-bold text-green-600 ml-2">{comparisonAnalysis.maxConsecutiveIncrease}회</span>
                      </div>
                      <div>
                        <span className="text-gray-600">최대 연속 감소:</span>
                        <span className="font-bold text-red-600 ml-2">{comparisonAnalysis.maxConsecutiveDecrease}회</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">변화량 통계</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">상승 평균:</span>
                        <span className="font-bold text-green-600 ml-1">+{comparisonAnalysis.changeStatistics.avgIncrease.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">하락 평균:</span>
                        <span className="font-bold text-red-600 ml-1">-{comparisonAnalysis.changeStatistics.avgDecrease.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">총 평균:</span>
                        <span className={`font-bold ml-1 ${comparisonAnalysis.changeStatistics.avgTotalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparisonAnalysis.changeStatistics.avgTotalChange >= 0 ? '+' : ''}{comparisonAnalysis.changeStatistics.avgTotalChange.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">표준편차:</span>
                        <span className="font-bold text-orange-600 ml-1">±{comparisonAnalysis.changeStatistics.stdDeviation.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">최대 증가:</span>
                        <span className="font-bold text-green-600 ml-1">+{comparisonAnalysis.changeStatistics.maxIncrease.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">최대 감소:</span>
                        <span className="font-bold text-red-600 ml-1">-{comparisonAnalysis.changeStatistics.maxDecrease.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">변화 범위:</span>
                        <span className="font-bold text-blue-600 ml-1">{comparisonAnalysis.changeStatistics.minChange.toFixed(0)} ~ {comparisonAnalysis.changeStatistics.maxChange.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm font-semibold text-gray-700 mb-2">표준편차 범위 분석</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">범위 내:</span>
                        <span className="font-bold text-green-600 ml-1">
                          {comparisonAnalysis.standardDeviationAnalysis.withinRangeCount}회
                        </span>
                        <span className="text-gray-500 ml-1">
                          ({(comparisonAnalysis.standardDeviationAnalysis.withinRangeRatio * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">범위 밖:</span>
                        <span className="font-bold text-red-600 ml-1">
                          {comparisonAnalysis.standardDeviationAnalysis.outOfRangeCount}회
                        </span>
                        <span className="text-gray-500 ml-1">
                          ({(comparisonAnalysis.standardDeviationAnalysis.outOfRangeRatio * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      * 평균 ± 표준편차 범위: 약 {(comparisonAnalysis.standardDeviationAnalysis.withinRangeRatio * 100).toFixed(1)}%의 회차가 범위 내에 있습니다
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 트렌드 예측 힌트 */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Target size={20} />
            트렌드 예측 힌트
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• 최근 {maxUpStreak}회 연속 상승 패턴이 관찰되었습니다</p>
            <p>• 평균 변동성: {avgVolatility.toFixed(0).toLocaleString()}</p>
            <p>• 최근 트렌드: {trendData.slice(-3).filter(d => d.trend === 'up').length >= 2 ? '상승 우세' : 
                              trendData.slice(-3).filter(d => d.trend === 'down').length >= 2 ? '하락 우세' : '혼재'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
