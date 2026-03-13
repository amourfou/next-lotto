'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Repeat, BarChart3, PieChart as PieChartIcon, Trophy, TrendingUp, Layers, Hash, Link } from 'lucide-react';
import { LotteryData, analyzeDuplicatePatterns, DuplicatePatternAnalysisResult, analyzeDuplicatePositionPatterns, analyzeDuplicateFrequency, analyzeConsecutivePatterns, analyzeRangeDistribution, analyzeEvenOddPatterns, analyzeDigitPairPatterns } from '../lib/dataParser';

interface DuplicatePatternAnalysisProps {
  lotteryData: LotteryData[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function DuplicatePatternAnalysis({ lotteryData }: DuplicatePatternAnalysisProps) {
  if (lotteryData.length === 0) {
    return null;
  }

  const analysis = analyzeDuplicatePatterns(lotteryData);

  // 중복 개수별 분포 차트 데이터
  const distributionData = Object.entries(analysis.duplicateCountDistribution)
    .map(([count, value]) => {
      const countNum = parseInt(count);
      let name: string;
      if (countNum === -1) {
        name = '기타 (3개 이상 중복)';
      } else if (countNum === 0) {
        name = '중복 없음';
      } else {
        name = `${countNum}개 중복`;
      }
      return {
        name,
        count: countNum === -1 ? 999 : countNum, // 기타는 정렬 시 마지막에 오도록
        originalCount: countNum,
        value,
        ratio: analysis.duplicateCountRatio[countNum] * 100
      };
    })
    .sort((a, b) => a.count - b.count);

  // 파이 차트 데이터
  const pieData = distributionData.map(item => ({
    name: item.name,
    value: item.value,
    ratio: item.ratio
  }));

  // 1개 중복 숫자별 순위 (상위 10개만)
  const topDuplicates = analysis.singleDuplicateDigitRanking.slice(0, 10);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
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
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Repeat size={24} />
        중복 숫자 패턴 분석
      </h2>

      <div className="space-y-6">
        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {distributionData.map((item) => (
            <div key={item.count} className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{item.value}</div>
              <div className="text-sm text-gray-600">{item.name}</div>
              <div className="text-xs text-gray-500 mt-1">{item.ratio.toFixed(1)}%</div>
            </div>
          ))}
        </div>

        {/* 중복 개수별 분포 막대 차트 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            중복 개수별 분포
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#374151"
                fontSize={12}
              />
              <YAxis 
                stroke="#374151"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 중복 개수별 비율 파이 차트 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <PieChartIcon size={20} />
            중복 개수별 비율
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, ratio }) => `${name}: ${ratio.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 1개 중복 숫자별 순위 */}
        {topDuplicates.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Trophy size={20} />
              1개 중복 숫자별 빈도 순위
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {topDuplicates.map((item, index) => (
                <div
                  key={item.digit}
                  className={`p-3 rounded-lg text-center ${
                    index === 0
                      ? 'bg-yellow-50 border-2 border-yellow-400'
                      : index < 3
                      ? 'bg-gray-50 border border-gray-300'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mx-auto mb-2 ${
                      index === 0
                        ? 'bg-yellow-500'
                        : index === 1
                        ? 'bg-gray-400'
                        : index === 2
                        ? 'bg-orange-400'
                        : 'bg-blue-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="text-xl font-bold text-gray-800 mb-1">숫자 {item.digit}</div>
                  <div className="text-lg font-bold text-blue-600 mb-1">{item.count}회</div>
                  <div className="text-xs text-amber-600 font-medium" title="최근 몇 회 동안 2중복으로 출현 안 함">
                    연속 미출현 {item.absenceCount}회
                  </div>
                  <div className="text-xs text-gray-500">
                    ({(item.count / analysis.totalCount * 100).toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
            {analysis.singleDuplicateDigitRanking.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                상위 10개만 표시 (총 {analysis.singleDuplicateDigitRanking.length}개 숫자)
              </p>
            )}
          </div>
        )}

        {/* 1개 중복 숫자 배치 패턴 분석 */}
        {(() => {
          const positionPatternAnalysis = analyzeDuplicatePositionPatterns(lotteryData);
          
          if (positionPatternAnalysis.totalCount === 0) {
            return null;
          }

          return (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Repeat size={20} />
                1개 중복 숫자 배치 패턴 분석 (O: 중복 숫자, X: 다른 숫자)
              </h3>
              
              <div className="space-y-4">
                {/* 패턴별 분포 막대 차트 */}
                <div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={positionPatternAnalysis.patternDetails} 
                        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="pattern" 
                          stroke="#374151"
                          fontSize={11}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          stroke="#374151"
                          fontSize={12}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                  <p className="font-bold text-gray-800">패턴: {data.pattern}</p>
                                  <p className="text-blue-600">
                                    출현: <span className="font-bold">{data.count}회</span>
                                  </p>
                                  <p className="text-amber-600">
                                    연속 미출현: <span className="font-bold">{data.absenceCount}회</span>
                                  </p>
                                  <p className="text-green-600">
                                    비율: <span className="font-bold">{data.percentage.toFixed(2)}%</span>
                                  </p>
                                  {data.examples.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      예시: {data.examples.join(', ')}회차
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 패턴별 상세 리스트 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-700 mb-3">패턴별 상세 정보</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">순위</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">패턴</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">횟수</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">연속 미출현</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">비율</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">예시 회차</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positionPatternAnalysis.patternDetails.map((pattern, index) => (
                          <tr
                            key={pattern.pattern}
                            className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                              index === 0
                                ? 'bg-yellow-50'
                                : index < 3
                                ? 'bg-gray-50'
                                : 'bg-white'
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-gray-600">
                              {index + 1}위
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-lg font-bold text-gray-800 font-mono">
                                {pattern.pattern.split('').map((char, i) => (
                                  <span key={i} className={char === 'O' ? 'text-red-600' : 'text-gray-400'}>
                                    {char}
                                  </span>
                                ))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-lg font-bold text-blue-600">{pattern.count}회</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-amber-600" title="최근 몇 회 동안 출현 안 함">{pattern.absenceCount}회</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-gray-600">{pattern.percentage.toFixed(2)}%</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {pattern.examples.length > 0 ? (
                                <span>{pattern.examples.join(', ')}회차</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

               {/* 같은 숫자 중복 빈도 분석 */}
               {(() => {
                 const frequencyAnalysis = analyzeDuplicateFrequency(lotteryData);
                 
                 const frequencyData = [0, 2, 3, 4, 5, 6].map(freq => ({
                   frequency: freq,
                   label: freq === 0 ? '중복 없음' : `${freq}개 중복`,
                   count: frequencyAnalysis.frequencyDistribution[freq] || 0,
                   ratio: (frequencyAnalysis.frequencyRatio[freq] || 0) * 100
                 }));
                 
                 const FrequencyTooltip = ({ active, payload }: any) => {
                   if (active && payload && payload.length) {
                     const data = payload[0].payload;
                     return (
                       <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                         <p className="font-bold text-gray-800">{data.label}</p>
                         <p className="text-blue-600">
                           횟수: <span className="font-bold">{data.count}회</span>
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
                   <div className="mt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                       <Repeat size={20} />
                       같은 숫자 중복 빈도 분석
                     </h3>
                     
                     <div className="space-y-4">
                       {/* 통계 요약 */}
                       <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                         {frequencyData.map((item) => (
                           <div key={item.frequency} className={`text-center p-3 rounded-lg ${
                             item.frequency === 0 ? 'bg-green-50' : 'bg-blue-50'
                           }`}>
                             <div className="text-sm text-gray-600 mb-1">{item.label}</div>
                             <div className={`text-xl font-bold ${item.frequency === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                               {item.count}회
                             </div>
                             <div className="text-xs text-gray-500">{item.ratio.toFixed(1)}%</div>
                           </div>
                         ))}
                       </div>
                       
                       {/* 막대 차트 */}
                       <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={frequencyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                             <XAxis 
                               dataKey="label" 
                               stroke="#374151"
                               fontSize={11}
                               angle={-45}
                               textAnchor="end"
                               height={60}
                               label={{ value: '중복 빈도', position: 'insideBottom', offset: -5 }}
                             />
                             <YAxis 
                               stroke="#374151"
                               fontSize={12}
                               label={{ value: '회수', angle: -90, position: 'insideLeft' }}
                             />
                             <Tooltip content={<FrequencyTooltip />} />
                             <Bar dataKey="count" fill="#8b5cf6">
                               {frequencyData.map((entry, index) => (
                                 <Cell 
                                   key={`cell-${index}`} 
                                   fill={entry.frequency === 0 ? '#10b981' : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index - 1]} 
                                 />
                               ))}
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </div>
                   </div>
                 );
               })()}

               {/* 연속 숫자 패턴 분석 */}
               {(() => {
                 const consecutiveAnalysis = analyzeConsecutivePatterns(lotteryData);
                 
                 // 차이값별 데이터 준비 (-9 ~ 9)
                 const differenceData = [];
                 for (let i = -9; i <= 9; i++) {
                   const count = consecutiveAnalysis.differenceDistribution[i] || 0;
                   if (count > 0 || Math.abs(i) <= 2) { // 차이가 작거나 의미있는 것만 표시
                     differenceData.push({
                       difference: i,
                       label: i === 0 ? '동일' : i > 0 ? `+${i}` : `${i}`,
                       count,
                       percentage: (count / consecutiveAnalysis.totalCount) * 100
                     });
                   }
                 }
                 
                 return (
                   <div className="mt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                       <TrendingUp size={20} />
                       인접 자리 간 차이 패턴 분석
                     </h3>
                     
                     <div className="space-y-4">
                       {/* 통계 요약 */}
                       <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                         <div className="text-center p-3 bg-blue-50 rounded-lg">
                           <div className="text-sm text-gray-600 mb-1">연속 증가</div>
                           <div className="text-xl font-bold text-blue-600">
                             {consecutiveAnalysis.consecutiveIncreaseCount}
                           </div>
                           <div className="text-xs text-gray-500">
                             ({((consecutiveAnalysis.consecutiveIncreaseCount / consecutiveAnalysis.totalCount) * 100).toFixed(1)}%)
                           </div>
                         </div>
                         <div className="text-center p-3 bg-red-50 rounded-lg">
                           <div className="text-sm text-gray-600 mb-1">연속 감소</div>
                           <div className="text-xl font-bold text-red-600">
                             {consecutiveAnalysis.consecutiveDecreaseCount}
                           </div>
                           <div className="text-xs text-gray-500">
                             ({((consecutiveAnalysis.consecutiveDecreaseCount / consecutiveAnalysis.totalCount) * 100).toFixed(1)}%)
                           </div>
                         </div>
                         <div className="text-center p-3 bg-gray-50 rounded-lg">
                           <div className="text-sm text-gray-600 mb-1">동일 숫자</div>
                           <div className="text-xl font-bold text-gray-600">
                             {consecutiveAnalysis.sameDigitCount}
                           </div>
                           <div className="text-xs text-gray-500">
                             ({((consecutiveAnalysis.sameDigitCount / consecutiveAnalysis.totalCount) * 100).toFixed(1)}%)
                           </div>
                         </div>
                         <div className="text-center p-3 bg-purple-50 rounded-lg">
                           <div className="text-sm text-gray-600 mb-1">큰 점프 (≥5)</div>
                           <div className="text-xl font-bold text-purple-600">
                             {consecutiveAnalysis.largeJumpCount}
                           </div>
                           <div className="text-xs text-gray-500">
                             ({((consecutiveAnalysis.largeJumpCount / consecutiveAnalysis.totalCount) * 100).toFixed(1)}%)
                           </div>
                         </div>
                         <div className="text-center p-3 bg-green-50 rounded-lg">
                           <div className="text-sm text-gray-600 mb-1">총 분석 쌍</div>
                           <div className="text-xl font-bold text-green-600">
                             {consecutiveAnalysis.totalCount}
                           </div>
                         </div>
                       </div>
                       
                       {/* 차이값 분포 차트 */}
                       <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={differenceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                             <XAxis 
                               dataKey="label" 
                               stroke="#374151"
                               fontSize={11}
                               angle={-45}
                               textAnchor="end"
                               height={60}
                             />
                             <YAxis 
                               stroke="#374151"
                               fontSize={12}
                               label={{ value: '횟수', angle: -90, position: 'insideLeft' }}
                             />
                             <Tooltip 
                               formatter={(value: any) => [`${value}회`, '횟수']}
                               labelFormatter={(label) => `차이: ${label}`}
                             />
                             <Bar dataKey="count" fill="#8b5cf6">
                               {differenceData.map((entry, index) => (
                                 <Cell 
                                   key={`cell-${index}`} 
                                   fill={entry.difference === 0 ? '#10b981' : 
                                         entry.difference === 1 ? '#3b82f6' : 
                                         entry.difference === -1 ? '#ef4444' :
                                         Math.abs(entry.difference) >= 5 ? '#f59e0b' : '#8b5cf6'} 
                                 />
                               ))}
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </div>
                   </div>
                 );
               })()}

               {/* 숫자 범위 분포 분석 */}
               {(() => {
                 const rangeAnalysis = analyzeRangeDistribution(lotteryData);
                 
                 const rangeData = [
                   { name: '낮은 숫자 (0-3)', value: rangeAnalysis.rangeDistribution.low, percentage: rangeAnalysis.rangeRatio.low * 100 },
                   { name: '중간 숫자 (4-6)', value: rangeAnalysis.rangeDistribution.medium, percentage: rangeAnalysis.rangeRatio.medium * 100 },
                   { name: '높은 숫자 (7-9)', value: rangeAnalysis.rangeDistribution.high, percentage: rangeAnalysis.rangeRatio.high * 100 }
                 ];
                 
                 return (
                   <div className="mt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                       <Layers size={20} />
                       숫자 범위 분포 분석
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* 파이 차트 */}
                       <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                             <Pie
                               data={rangeData}
                               cx="50%"
                               cy="50%"
                               labelLine={false}
                               label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                               outerRadius={80}
                               fill="#8884d8"
                               dataKey="value"
                             >
                               {rangeData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                             </Pie>
                             <Tooltip formatter={(value: any) => `${value}개`} />
                           </PieChart>
                         </ResponsiveContainer>
                       </div>
                       
                       {/* 통계 요약 */}
                       <div className="space-y-3">
                         {rangeData.map((item, index) => (
                           <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                             <div className="flex justify-between items-center">
                               <div className="font-semibold text-gray-700">{item.name}</div>
                               <div className="text-2xl font-bold text-blue-600">{item.value.toLocaleString()}</div>
                             </div>
                             <div className="text-sm text-gray-500 mt-1">{item.percentage.toFixed(2)}%</div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 );
               })()}

               {/* 짝수/홀수 분포 분석 */}
               {(() => {
                 const evenOddAnalysis = analyzeEvenOddPatterns(lotteryData);
                 
                 const evenCountData = [0, 1, 2, 3, 4, 5, 6].map(count => ({
                   evenCount: count,
                   label: `${count}개`,
                   count: evenOddAnalysis.evenCountDistribution[count] || 0,
                   percentage: ((evenOddAnalysis.evenCountDistribution[count] || 0) / evenOddAnalysis.totalCount) * 100
                 }));
                 
                 const evenOddPieData = [
                   { name: '짝수', value: evenOddAnalysis.evenOddDistribution.even, percentage: (evenOddAnalysis.evenOddDistribution.even / (evenOddAnalysis.totalCount * 6)) * 100 },
                   { name: '홀수', value: evenOddAnalysis.evenOddDistribution.odd, percentage: (evenOddAnalysis.evenOddDistribution.odd / (evenOddAnalysis.totalCount * 6)) * 100 }
                 ];
                 
                 return (
                   <div className="mt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                       <Hash size={20} />
                       짝수/홀수 분포 분석
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* 짝수/홀수 전체 분포 */}
                       <div>
                         <h4 className="text-sm font-semibold text-gray-600 mb-2">전체 분포</h4>
                         <div className="h-48">
                           <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                               <Pie
                                 data={evenOddPieData}
                                 cx="50%"
                                 cy="50%"
                                 labelLine={false}
                                 label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                                 outerRadius={60}
                                 fill="#8884d8"
                                 dataKey="value"
                               >
                                 {evenOddPieData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ef4444'} />
                                 ))}
                               </Pie>
                               <Tooltip formatter={(value: any) => `${value.toLocaleString()}개`} />
                             </PieChart>
                           </ResponsiveContainer>
                         </div>
                         <div className="grid grid-cols-2 gap-3 mt-4">
                           <div className="text-center p-3 bg-blue-50 rounded-lg">
                             <div className="text-sm text-gray-600">짝수 총계</div>
                             <div className="text-xl font-bold text-blue-600">{evenOddAnalysis.evenOddDistribution.even.toLocaleString()}</div>
                           </div>
                           <div className="text-center p-3 bg-red-50 rounded-lg">
                             <div className="text-sm text-gray-600">홀수 총계</div>
                             <div className="text-xl font-bold text-red-600">{evenOddAnalysis.evenOddDistribution.odd.toLocaleString()}</div>
                           </div>
                         </div>
                       </div>
                       
                       {/* 회차별 짝수 개수 분포 */}
                       <div>
                         <h4 className="text-sm font-semibold text-gray-600 mb-2">회차별 짝수 개수 분포</h4>
                         <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={evenCountData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                               <XAxis 
                                 dataKey="label" 
                                 stroke="#374151"
                                 fontSize={12}
                               />
                               <YAxis 
                                 stroke="#374151"
                                 fontSize={12}
                                 label={{ value: '회차 수', angle: -90, position: 'insideLeft' }}
                               />
                               <Tooltip 
                                 formatter={(value: any, name: string, props: any) => [
                                   `${value}회 (${props.payload.percentage.toFixed(1)}%)`,
                                   '회차 수'
                                 ]}
                               />
                               <Bar dataKey="count" fill="#3b82f6" />
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })()}

               {/* 숫자 쌍 패턴 분석 */}
               {(() => {
                 const pairAnalysis = analyzeDigitPairPatterns(lotteryData);
                 
                 return (
                   <div className="mt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                       <Link size={20} />
                       인접 숫자 쌍 패턴 분석 (상위 10개)
                     </h3>
                     
                     <div className="overflow-x-auto">
                       <table className="w-full border-collapse">
                         <thead>
                           <tr className="bg-gray-100 border-b-2 border-gray-300">
                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">순위</th>
                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">숫자 쌍</th>
                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">설명</th>
                             <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">횟수</th>
                             <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">비율</th>
                           </tr>
                         </thead>
                         <tbody>
                           {pairAnalysis.topPairs.map((pair, index) => (
                             <tr
                               key={pair.pair}
                               className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                                 index === 0
                                   ? 'bg-yellow-50'
                                   : index < 3
                                   ? 'bg-gray-50'
                                   : 'bg-white'
                               }`}
                             >
                               <td className="px-4 py-3">
                                 <div className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full font-bold text-sm">
                                   {index + 1}
                                 </div>
                               </td>
                               <td className="px-4 py-3">
                                 <span className="font-mono text-lg font-bold text-gray-800">{pair.pair}</span>
                               </td>
                               <td className="px-4 py-3 text-sm text-gray-500">인접한 두 자리 숫자 쌍</td>
                               <td className="px-4 py-3 text-right">
                                 <span className="text-lg font-bold text-blue-600">{pair.count}회</span>
                               </td>
                               <td className="px-4 py-3 text-right">
                                 <span className="text-sm text-gray-600">{pair.percentage.toFixed(2)}%</span>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 );
               })()}

               {/* 전체 통계 요약 */}
               <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                 <h3 className="text-lg font-semibold text-gray-700 mb-2">전체 통계 요약</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="font-bold text-gray-800">전체 회차</div>
              <div className="text-blue-600 text-xl font-bold">{analysis.totalCount}회</div>
            </div>
            <div>
              <div className="font-bold text-gray-800">중복 없는 경우</div>
              <div className="text-green-600 text-xl font-bold">
                {analysis.duplicateCountDistribution[0] || 0}회
              </div>
              <div className="text-xs text-gray-500">
                ({(analysis.duplicateCountRatio[0] * 100 || 0).toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="font-bold text-gray-800">1개 중복</div>
              <div className="text-blue-600 text-xl font-bold">
                {analysis.duplicateCountDistribution[1] || 0}회
              </div>
              <div className="text-xs text-gray-500">
                ({(analysis.duplicateCountRatio[1] * 100 || 0).toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="font-bold text-gray-800">2개 중복</div>
              <div className="text-purple-600 text-xl font-bold">
                {analysis.duplicateCountDistribution[2] || 0}회
              </div>
              <div className="text-xs text-gray-500">
                ({(analysis.duplicateCountRatio[2] * 100 || 0).toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="font-bold text-gray-800">기타 (3개 이상)</div>
              <div className="text-orange-600 text-xl font-bold">
                {analysis.duplicateCountDistribution[-1] || 0}회
              </div>
              <div className="text-xs text-gray-500">
                ({(analysis.duplicateCountRatio[-1] * 100 || 0).toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

