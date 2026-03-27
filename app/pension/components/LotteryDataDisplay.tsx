'use client';

import { LotteryData, analyzePositionFrequency, analyzeDigitSum, getLotteryDataSummary } from '../lib/dataParser';
import { Calendar, Hash, TrendingUp, BarChart3 } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface LotteryDataDisplayProps {
  lotteryData: LotteryData[];
}

export default function LotteryDataDisplay({ lotteryData }: LotteryDataDisplayProps) {
  if (lotteryData.length === 0) {
    return null;
  }

  const { minOrder, maxOrder, rowCount } = getLotteryDataSummary(lotteryData);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
        <Hash size={20} />
        복권 데이터 (회차 {minOrder}~{maxOrder} · {rowCount}건)
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

        {/* 자릿수 × 자리별 빈도 히트맵 */}
        {(() => {
          const posFreq = analyzePositionFrequency(lotteryData);
          const total = lotteryData.length;
          const digits = [0,1,2,3,4,5,6,7,8,9];

          // 숫자별 텍스트 색상
          const digitTextColor: Record<number, string> = {
            0: 'text-gray-500', 1: 'text-red-500', 2: 'text-orange-500',
            3: 'text-amber-500', 4: 'text-lime-600', 5: 'text-teal-500',
            6: 'text-blue-500', 7: 'text-indigo-500', 8: 'text-purple-500', 9: 'text-pink-500',
          };

          // 전체 컬럼 (6자리 합산) 빈도
          const overallFreq: Record<number, number> = {};
          digits.forEach(d => {
            overallFreq[d] = posFreq.reduce((s, p) => s + (p.digitFrequency[d] || 0), 0);
          });
          const overallTotal = total * 6;

          // 컬럼별 최대값 (열 상대 강조용)
          const colMax = posFreq.map(p => Math.max(...digits.map(d => p.digitFrequency[d] || 0)));
          const overallMax = Math.max(...digits.map(d => overallFreq[d]));

          // 비율에 따른 배경색
          function cellBg(count: number, max: number) {
            if (max === 0) return 'bg-gray-50 text-gray-500';
            const r = count / max;
            if (r >= 0.90) return 'bg-blue-500 text-white font-bold';
            if (r >= 0.75) return 'bg-blue-300 text-blue-900 font-semibold';
            if (r >= 0.55) return 'bg-blue-100 text-blue-800';
            if (r >= 0.35) return 'bg-blue-50 text-blue-700';
            return 'bg-gray-50 text-gray-400';
          }

          return (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BarChart3 size={18} />
                자릿수 × 자리별 빈도 분석
                <InfoTooltip text="각 자리(1~6번째 열)에서 숫자 0~9(행)가 출현한 비율을 히트맵으로 표시합니다. 파란색이 진할수록 해당 자리에서 자주 등장한 숫자이며, 하단 기대값(10%)과 비교해 편향을 파악할 수 있습니다." width="w-80" />
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-2">각 자리(열)에서 해당 숫자(행)가 출현한 비율 — 파란색이 진할수록 해당 자리에서 자주 등장</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[420px]">
                  <thead>
                    <tr>
                      <th className="p-1.5 bg-gray-100 border border-gray-200 text-gray-600 w-10 text-center">숫자</th>
                      {posFreq.map(p => (
                        <th key={p.position} className="p-1.5 bg-purple-50 border border-gray-200 text-purple-700 font-semibold text-center">
                          {p.position}번째
                        </th>
                      ))}
                      <th className="p-1.5 bg-gray-100 border border-gray-200 text-gray-700 font-semibold text-center">전체</th>
                    </tr>
                  </thead>
                  <tbody>
                    {digits.map(digit => (
                      <tr key={digit}>
                        <td className={`p-1.5 border border-gray-200 text-center font-bold text-sm bg-white ${digitTextColor[digit]}`}>
                          {digit}
                        </td>
                        {posFreq.map((p, pi) => {
                          const count = p.digitFrequency[digit] || 0;
                          const pct = (count / total * 100);
                          const isMax = count === colMax[pi];
                          const isMin = count === Math.min(...digits.map(d => p.digitFrequency[d] || 0));
                          return (
                            <td key={pi} className={`p-1 border border-gray-200 text-center ${cellBg(count, colMax[pi])}`}>
                              <div className="text-[11px] leading-tight">{pct.toFixed(1)}%</div>
                              <div className="text-[9px] leading-tight opacity-75">{count}회</div>
                              {isMax && <div className="text-[8px] leading-none mt-0.5">▲최다</div>}
                              {isMin && <div className="text-[8px] leading-none mt-0.5">▽최소</div>}
                            </td>
                          );
                        })}
                        <td className={`p-1 border border-gray-200 text-center ${cellBg(overallFreq[digit], overallMax)}`}>
                          <div className="text-[11px] leading-tight">{(overallFreq[digit] / overallTotal * 100).toFixed(1)}%</div>
                          <div className="text-[9px] leading-tight opacity-75">{overallFreq[digit]}회</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="p-1.5 bg-gray-50 border border-gray-200 text-center text-[10px] text-gray-500 font-semibold">기대값</td>
                      {posFreq.map((_, pi) => (
                        <td key={pi} className="p-1 bg-gray-50 border border-gray-200 text-center text-[10px] text-gray-500">
                          {(100 / 10).toFixed(1)}%<br/><span className="text-[9px]">{(total / 10).toFixed(1)}회</span>
                        </td>
                      ))}
                      <td className="p-1 bg-gray-50 border border-gray-200 text-center text-[10px] text-gray-500">
                        {(100 / 10).toFixed(1)}%<br/><span className="text-[9px]">{(overallTotal / 10).toFixed(1)}회</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })()}

        {/* 자릿수 합계 분포 분석 */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 size={18} />
            자릿수 합계 분포 분석
            <InfoTooltip text="6자리 숫자를 모두 더한 합계(0~54)의 분포입니다. 초록색 막대는 평균 ±1 표준편차(σ) 범위 내, 연한 파랑은 범위 밖을 나타내며, 노란 점선은 표준편차 경계입니다." width="w-80" />
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

            const avg = sumAnalysis.statistics.avgSum;
            const allSums = lotteryData.map(d => d.numbers.reduce((s, n) => s + n, 0));
            const variance = allSums.reduce((acc, s) => acc + Math.pow(s - avg, 2), 0) / allSums.length;
            const stdDev = Math.sqrt(variance);

            // 커스텀 툴팁
            const CustomTooltip = ({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const inStdDev = Math.abs(data.sum - avg) <= stdDev;
                return (
                  <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg text-xs sm:text-sm">
                    <p className="font-bold text-gray-800">합계: {data.sum}</p>
                    <p className="text-blue-600">개수: <span className="font-bold">{data.count}회</span></p>
                    <p className="text-green-600">비율: <span className="font-bold">{data.ratio.toFixed(2)}%</span></p>
                    {inStdDev && <p className="text-emerald-600 font-semibold mt-1">± 1σ 범위 내</p>}
                  </div>
                );
              }
              return null;
            };

            return (
              <div className="space-y-3 sm:space-y-4">
                {/* 통계 요약 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                  <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-blue-600">{sumAnalysis.statistics.minSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">최소</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-green-600">{sumAnalysis.statistics.maxSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">최대</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-purple-600">{avg.toFixed(1)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">평균</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-orange-600">{sumAnalysis.statistics.medianSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">중앙값</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-red-600">{sumAnalysis.statistics.modeSum}</div>
                    <div className="text-xs sm:text-sm text-gray-600">최빈값</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-amber-50 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-amber-600">{stdDev.toFixed(1)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">표준편차 σ</div>
                  </div>
                </div>

                {/* 회차별 합계 추이 선 그래프 */}
                {(() => {
                  const trendData = [...lotteryData]
                    .sort((a, b) => a.order - b.order)
                    .map(d => ({
                      order: d.order,
                      sum: d.numbers.reduce((s, n) => s + n, 0),
                    }));
                  const avg = sumAnalysis.statistics.avgSum;

                  const TrendTooltip = ({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border border-gray-200 rounded-lg shadow text-xs">
                          <p className="font-bold text-gray-700">{payload[0].payload.order}회차</p>
                          <p className="text-indigo-600">합계: <span className="font-bold">{payload[0].value}</span></p>
                        </div>
                      );
                    }
                    return null;
                  };

                  return (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <TrendingUp size={15} className="text-indigo-500" />
                        회차별 합계 추이
                        <InfoTooltip text="회차 순서대로 자릿수 합계가 어떻게 변해왔는지 보여주는 시계열 그래프입니다. 노란 점선은 전체 평균으로, 이 선 위아래로 합계가 얼마나 오르내리는지 확인할 수 있습니다." width="w-72" direction="bottom" />
                      </h4>
                      <div className="h-48 sm:h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="order"
                              stroke="#9ca3af"
                              fontSize={9}
                              tickFormatter={(v) => `${v}`}
                              interval="preserveStartEnd"
                              label={{ value: '회차', position: 'insideBottom', offset: -4, style: { fontSize: '10px', fill: '#6b7280' } }}
                            />
                            <YAxis
                              stroke="#9ca3af"
                              fontSize={9}
                              domain={['auto', 'auto']}
                              label={{ value: '합계', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '10px', fill: '#6b7280' } }}
                            />
                            <Tooltip content={<TrendTooltip />} />
                            <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                              label={{ value: `평균 ${avg.toFixed(1)}`, position: 'insideTopRight', style: { fontSize: '10px', fill: '#f59e0b' } }}
                            />
                            <Line
                              type="monotone"
                              dataKey="sum"
                              stroke="#6366f1"
                              strokeWidth={1.5}
                              dot={false}
                              activeDot={{ r: 4, fill: '#6366f1' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}

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
                      <ReferenceLine x={Math.round(avg - stdDev)} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                      <ReferenceLine x={Math.round(avg + stdDev)} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                      <Bar dataKey="count" fill="#3b82f6">
                        {chartData.map((entry, index) => {
                          const inStdDev = Math.abs(entry.sum - avg) <= stdDev;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={inStdDev ? '#10b981' : '#93c5fd'}
                              opacity={inStdDev ? 1 : 0.6}
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
