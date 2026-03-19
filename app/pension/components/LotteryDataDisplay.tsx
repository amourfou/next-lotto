'use client';

import { LotteryData, analyzePositionFrequency, analyzeDigitSum, getLotteryDataSummary } from '../lib/dataParser';
import { Calendar, Hash, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LotteryDataDisplayProps {
  lotteryData: LotteryData[];
}

export default function LotteryDataDisplay({ lotteryData }: LotteryDataDisplayProps) {
  if (lotteryData.length === 0) {
    return null;
  }

  const { maxOrder, rowCount } = getLotteryDataSummary(lotteryData);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
        <Hash size={20} />
        복권 데이터 (최신 {maxOrder}회 · {rowCount}건)
      </h2>
      
      <div className="space-y-3 sm:space-y-4">
        {/* 최근 5개 데이터만 간단히 표시 */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">최근 5회차</h3>
          <div className="space-y-2">
            {lotteryData.slice(0, 5).map((data, index) => (
              <div
                key={data.order}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <Calendar size={12} />
                    {data.order}회차
                  </div>
                  <div className="flex gap-0.5 sm:gap-1">
                    {data.numbers.map((num, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="font-mono text-base sm:text-lg font-bold text-gray-800">
                    {data.combinedNumber.toString().padStart(6, '0')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
              {Math.min(...lotteryData.map(d => d.combinedNumber)).toString().padStart(6, '0')}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">최소값</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              {Math.max(...lotteryData.map(d => d.combinedNumber)).toString().padStart(6, '0')}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">최대값</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">
              {Math.round(lotteryData.reduce((sum, d) => sum + d.combinedNumber, 0) / lotteryData.length).toString().padStart(6, '0')}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">평균값</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
              {lotteryData.filter(d => d.combinedNumber % 2 === 0).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">짝수 개수</div>
          </div>
        </div>

        {/* 자릿수 분포 */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">자릿수 분포</h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
              const count = lotteryData.reduce((sum, data) => {
                return sum + data.numbers.filter(num => num === digit).length;
              }, 0);
              const percentage = (count / (lotteryData.length * 6) * 100).toFixed(1);
              
              return (
                <div key={digit} className="text-center p-1.5 sm:p-2 bg-gray-50 rounded">
                  <div className="text-sm sm:text-lg font-bold text-gray-800">{digit}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600">{count}회</div>
                  <div className="text-[10px] sm:text-xs text-blue-600">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 각 자리별 빈도 분석 */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">각 자리별 빈도 분석</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {analyzePositionFrequency(lotteryData).map((positionData) => (
              <div key={positionData.position} className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="text-center mb-1.5 sm:mb-2">
                  <div className="text-xs sm:text-sm font-semibold text-gray-600">자리</div>
                  <div className="text-base sm:text-lg font-bold text-gray-800">{positionData.position}번째</div>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  {/* 가장 높은 빈도 */}
                  <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp size={12} className="text-green-600" />
                      <span className="text-[10px] sm:text-xs text-gray-700">높은</span>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-green-600">{positionData.highestFrequency.digit}</div>
                      <div className="text-[10px] sm:text-xs text-gray-600">
                        {positionData.highestFrequency.count}회
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        {positionData.highestFrequency.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* 가장 낮은 빈도 */}
                  <div className="p-1.5 sm:p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingDown size={12} className="text-red-600" />
                      <span className="text-[10px] sm:text-xs text-gray-700">낮은</span>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-red-600">{positionData.lowestFrequency.digit}</div>
                      <div className="text-[10px] sm:text-xs text-gray-600">
                        {positionData.lowestFrequency.count}회
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        {positionData.lowestFrequency.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* 빈도 차이 */}
                  <div className="text-center pt-1 border-t border-gray-300">
                    <div className="text-[10px] sm:text-xs text-gray-600">
                      차이: <span className="font-bold text-gray-800">{positionData.highestFrequency.count - positionData.lowestFrequency.count}회</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 자릿수 합계 분포 분석 */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 size={18} />
            자릿수 합계 분포 분석
          </h3>
          
          {(() => {
            const sumAnalysis = analyzeDigitSum(lotteryData);
            const chartData = Object.entries(sumAnalysis.sumDistribution)
              .map(([sum, count]) => ({
                sum: parseInt(sum),
                count,
                ratio: sumAnalysis.sumRatio[parseInt(sum)] * 100
              }))
              .sort((a, b) => a.sum - b.sum);

            // 커스텀 툴팁
            const CustomTooltip = ({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg text-xs sm:text-sm">
                    <p className="font-bold text-gray-800">합계: {data.sum}</p>
                    <p className="text-blue-600">
                      개수: <span className="font-bold">{data.count}회</span>
                    </p>
                    <p className="text-green-600">
                      비율: <span className="font-bold">{data.ratio.toFixed(2)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            };

            return (
              <div className="space-y-3 sm:space-y-4">
                {/* 통계 요약 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                  <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-blue-600">{sumAnalysis.statistics.minSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">최소 합계</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-green-600">{sumAnalysis.statistics.maxSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">최대 합계</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-purple-600">{sumAnalysis.statistics.avgSum.toFixed(1)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">평균 합계</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-orange-600">{sumAnalysis.statistics.medianSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">중앙값</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-red-600">{sumAnalysis.statistics.modeSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">최빈값</div>
                  </div>
                </div>

                {/* 합계 분포 막대 차트 */}
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="sum" 
                        stroke="#374151"
                        fontSize={10}
                        label={{ value: '자릿수 합계', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                      />
                      <YAxis 
                        stroke="#374151"
                        fontSize={10}
                        label={{ value: '회수', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#3b82f6">
                        {chartData.map((entry, index) => {
                          // 평균값 근처는 다른 색으로 표시
                          const isNearAverage = Math.abs(entry.sum - sumAnalysis.statistics.avgSum) < 2;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={isNearAverage ? '#10b981' : '#3b82f6'} 
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 합계 범위별 분포 요약 */}
                <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <h4 className="text-sm sm:text-md font-semibold text-gray-700 mb-2">합계 범위별 분포</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                    {[
                      { label: '0-15', range: [0, 15] },
                      { label: '16-25', range: [16, 25] },
                      { label: '26-35', range: [26, 35] },
                      { label: '36+', range: [36, 54] }
                    ].map(({ label, range }) => {
                      const count = chartData.filter(d => d.sum >= range[0] && d.sum <= range[1]).reduce((sum, d) => sum + d.count, 0);
                      const percentage = (count / sumAnalysis.totalCount) * 100;
                      return (
                        <div key={label} className="text-center">
                          <div className="font-bold text-gray-800">{label}</div>
                          <div className="text-blue-600 text-lg font-bold">{count}회</div>
                          <div className="text-xs text-gray-600">{percentage.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 합계 범위별 그래프 (6개 숫자 기준) */}
                <div>
                  <h4 className="text-sm sm:text-md font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                    <BarChart3 size={16} />
                    합계 범위별 분포 그래프 (6개 범위)
                  </h4>
                  {(() => {
                    // 0~5, 6~11, 12~17, 18~23, 24~29, 30~35, 36~41, 42~47, 48~54 범위로 나눔
                    const ranges = [
                      { label: '0-5', range: [0, 5] },
                      { label: '6-11', range: [6, 11] },
                      { label: '12-17', range: [12, 17] },
                      { label: '18-23', range: [18, 23] },
                      { label: '24-29', range: [24, 29] },
                      { label: '30-35', range: [30, 35] },
                      { label: '36-41', range: [36, 41] },
                      { label: '42-47', range: [42, 47] },
                      { label: '48-54', range: [48, 54] }
                    ];

                    const rangeChartData = ranges.map(({ label, range }) => {
                      const count = chartData
                        .filter(d => d.sum >= range[0] && d.sum <= range[1])
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (count / sumAnalysis.totalCount) * 100;
                      return {
                        label,
                        count,
                        percentage,
                        range
                      };
                    });

                    const RangeTooltip = ({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg text-xs sm:text-sm">
                            <p className="font-bold text-gray-800">범위: {data.label}</p>
                            <p className="text-blue-600">
                              개수: <span className="font-bold">{data.count}회</span>
                            </p>
                            <p className="text-green-600">
                              비율: <span className="font-bold">{data.percentage.toFixed(2)}%</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    };

                    return (
                      <div className="h-56 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={rangeChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="label" 
                              stroke="#374151"
                              fontSize={9}
                              label={{ value: '합계 범위', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                            />
                            <YAxis 
                              stroke="#374151"
                              fontSize={10}
                              label={{ value: '회수', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                            />
                            <Tooltip content={<RangeTooltip />} />
                            <Bar dataKey="count" fill="#8b5cf6">
                              {rangeChartData.map((entry, index) => {
                                // 평균값 근처 범위는 다른 색으로 표시
                                const avgRange = Math.floor(sumAnalysis.statistics.avgSum / 6);
                                const entryRangeStart = entry.range[0];
                                const entryRangeEnd = entry.range[1];
                                const isNearAverage = entryRangeStart <= avgRange * 6 && entryRangeEnd >= avgRange * 6;
                                return (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={isNearAverage ? '#10b981' : '#8b5cf6'} 
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
