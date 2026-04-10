'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';
import { Repeat, BarChart3, PieChart as PieChartIcon, Trophy, TrendingUp, Layers, Hash, Link } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { LotteryData, analyzeDuplicatePatterns, DuplicatePatternAnalysisResult, analyzeDuplicatePositionPatterns, analyzeDuplicateFrequency, analyzeConsecutivePatterns, analyzeRangeDistribution, analyzeEvenOddPatterns, analyzeDigitPairPatterns } from '../lib/dataParser';

interface DuplicatePatternAnalysisProps {
  lotteryData: LotteryData[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function DuplicatePatternAnalysis({ lotteryData }: DuplicatePatternAnalysisProps) {
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);

  if (lotteryData.length === 0) {
    return null;
  }

  const analysis = analyzeDuplicatePatterns(lotteryData);

  // 이론값 (000000~999999 균등분포 기준)
  // 계산 근거:
  //   중복 없음: P(6,10)/10^6 = 151200/1000000 = 15.12%
  //   1개 중복:  C(10,1)×C(6,2)×P(9,4)/10^6 = 453600/1000000 = 45.36%
  //   2개 중복:  (2×2+싱글2: 226800) + (2×3+싱글1: 43200) + (2×4: 1350) = 271350 → 27.14%
  //   기타:      나머지 = 12.39%  (단, 코드 기준: 3종 이상 중복 OR 1종이 3회↑ OR 2종 모두 3회↑)
  const THEORETICAL_RATIO: Record<number, number> = {
    0:  15.12,   // 중복 없음
    1:  45.36,   // 1개 중복
    2:  27.14,   // 2개 중복
    [-1 as unknown as number]: 12.39, // 기타
  };
  // TypeScript key 문제 회피용
  const getTheoretical = (key: number) => key === -1 ? 12.39 : (THEORETICAL_RATIO[key] ?? 0);

  // 중복 개수별 분포 차트 데이터
  const distributionData = Object.entries(analysis.duplicateCountDistribution)
    .map(([count, value]) => {
      const countNum = parseInt(count);
      let name: string;
      if (countNum === -1) {
        name = '기타';
      } else if (countNum === 0) {
        name = '중복 없음';
      } else {
        name = `${countNum}개 중복`;
      }
      const actualRatio = analysis.duplicateCountRatio[countNum] * 100;
      const theoreticalRatio = getTheoretical(countNum);
      return {
        name,
        count: countNum === -1 ? 999 : countNum,
        originalCount: countNum,
        value,
        ratio: actualRatio,
        theoreticalRatio,
        deviation: actualRatio - theoreticalRatio,
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
        <InfoTooltip text="6자리 번호 내에서 같은 숫자가 2번 이상 반복 등장하는 패턴을 분석합니다. 중복 개수 분포, 자주 중복되는 숫자 순위, 중복 위치 패턴 등을 종합적으로 확인할 수 있습니다." width="w-80" />
      </h2>

      <div className="space-y-6">
        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {distributionData.map((item) => (
            <div key={item.count} className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{item.value}</div>
              <div className="text-sm text-gray-600">{item.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">실제 {item.ratio.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">이론 {item.theoreticalRatio.toFixed(2)}%</div>
              <div className={`text-xs font-semibold mt-0.5 ${item.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {item.deviation >= 0 ? '+' : ''}{item.deviation.toFixed(2)}pp
              </div>
            </div>
          ))}
        </div>

        {/* 이중 도넛 차트: 안쪽=이론, 바깥쪽=실제 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <PieChartIcon size={20} />
            중복 개수별 비율 — 이론(안) vs 실제(밖)
            <InfoTooltip text="안쪽 링=이론값(균등분포), 바깥쪽 링=실제 비율. 같은 색 세그먼트 크기 차이가 괴리입니다." width="w-72" />
          </h3>
          <p className="text-xs text-gray-400 mb-2">바깥 링이 안쪽보다 크면 이론 초과(↑), 작으면 이론 미달(↓)</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {/* 안쪽 링: 이론값 (legendType="none" 으로 legend 중복 방지) */}
              <Pie
                data={distributionData.map(d => ({ name: d.name, value: d.theoreticalRatio }))}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={88}
                dataKey="value"
                strokeWidth={1}
                legendType="none"
              >
                {distributionData.map((_, index) => (
                  <Cell key={`inner-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.3} />
                ))}
              </Pie>
              {/* 바깥 링: 실제값 */}
              <Pie
                data={distributionData.map(d => ({ name: d.name, value: d.ratio, deviation: d.deviation, count: d.value }))}
                cx="50%"
                cy="50%"
                innerRadius={92}
                outerRadius={122}
                labelLine={false}
                label={({ cx, cy, midAngle, outerRadius, name, value, deviation }) => {
                  const RADIAN = Math.PI / 180;
                  const r = (outerRadius as number) + 18;
                  const x = (cx as number) + r * Math.cos(-midAngle * RADIAN);
                  const y = (cy as number) + r * Math.sin(-midAngle * RADIAN);
                  const dev = deviation as number;
                  return (
                    <text x={x} y={y} textAnchor={x > (cx as number) ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fill="#374151">
                      {`${name}: ${(value as number).toFixed(1)}%`}
                      <tspan fill={dev >= 0 ? '#ef4444' : '#3b82f6'}>{` (${dev >= 0 ? '+' : ''}${dev.toFixed(1)}pp)`}</tspan>
                    </text>
                  );
                }}
                dataKey="value"
                strokeWidth={1}
              >
                {distributionData.map((_, index) => (
                  <Cell key={`outer-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const name = payload[0].payload?.name;
                  const dist = distributionData.find(x => x.name === name);
                  if (!dist) return null;
                  return (
                    <div className="bg-white p-2 border border-gray-200 rounded shadow text-xs">
                      <p className="font-bold mb-1">{dist.name}</p>
                      <p className="text-gray-400">이론: {dist.theoreticalRatio.toFixed(2)}%</p>
                      <p className="text-blue-600">실제: {dist.ratio.toFixed(2)}% ({dist.value}회)</p>
                      <p className={dist.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}>
                        괴리: {dist.deviation >= 0 ? '+' : ''}{dist.deviation.toFixed(2)}pp
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* 커스텀 범례 */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-1">
            {distributionData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{d.name}</span>
                <span className="text-gray-400">이론 {d.theoreticalRatio.toFixed(1)}%</span>
                <span className="text-gray-700">/ 실제 {d.ratio.toFixed(1)}%</span>
                <span className={`font-semibold ${d.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  ({d.deviation >= 0 ? '+' : ''}{d.deviation.toFixed(1)}pp)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 1개 중복 숫자별 순위 + 이론값 vs 실제 비교 */}
        {topDuplicates.length > 0 && (() => {
          // 이론값: 1개 중복 회차에서 각 숫자는 균등하게 1/10 확률 (000000~999999 균등분포)
          const totalSinglePairRounds = analysis.singleDuplicateDigitRanking.reduce((sum, r) => sum + r.count, 0);
          const theoreticalCount = totalSinglePairRounds / 10;

          // 선택된 digit의 패턴별 분포 계산
          const digitPatternData = (() => {
            if (selectedDigit === null) return null;
            const dKey = String(selectedDigit);
            const patternCount: Record<string, number> = {};
            // 15가지 모든 패턴 초기화
            const ALL_PATTERNS: string[] = [];
            for (let i = 0; i < 6; i++) {
              for (let j = i + 1; j < 6; j++) {
                const p = ['X','X','X','X','X','X'];
                p[i] = 'O'; p[j] = 'O';
                ALL_PATTERNS.push(p.join(''));
              }
            }
            ALL_PATTERNS.forEach(p => { patternCount[p] = 0; });
            lotteryData.forEach(data => {
              const ds = data.numbers.map(n => n.toString());
              const cnt: Record<string, number> = {};
              ds.forEach(d => { cnt[d] = (cnt[d] || 0) + 1; });
              const dups = Object.entries(cnt).filter(([, c]) => c >= 2);
              if (dups.length !== 1 || dups[0][0] !== dKey || dups[0][1] !== 2) return;
              const pattern = ds.map(d => d === dKey ? 'O' : 'X').join('');
              patternCount[pattern] = (patternCount[pattern] || 0) + 1;
            });
            const digitTotal = Object.values(patternCount).reduce((s, c) => s + c, 0);
            const theoreticalPerPattern = digitTotal / 15;
            return ALL_PATTERNS.map(pattern => {
              const actual = patternCount[pattern] ?? 0;
              const deviation = theoreticalPerPattern > 0
                ? ((actual - theoreticalPerPattern) / theoreticalPerPattern) * 100
                : 0;
              return { pattern, 실제: actual, 이론: theoreticalPerPattern, deviation };
            }).sort((a, b) => b.실제 - a.실제);
          })();

          // 전체 비교 차트 데이터 (0~9 순서로)
          const comparisonData = Array.from({ length: 10 }, (_, d) => {
            const actual = analysis.singleDuplicateDigitRanking.find(r => r.digit === String(d));
            const actualCount = actual?.count ?? 0;
            const deviation = ((actualCount - theoreticalCount) / theoreticalCount) * 100;
            return {
              digit: String(d),
              실제: actualCount,
              이론: theoreticalCount,
              deviation,
              absenceCount: actual?.absenceCount ?? 0,
            };
          });

          const selected = selectedDigit !== null
            ? comparisonData[selectedDigit]
            : null;

          return (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Trophy size={20} />
                1개 중복 숫자별 빈도 순위
                <InfoTooltip text="정확히 1가지 숫자가 2번 등장한 회차에서, 어떤 숫자가 중복되었는지 빈도 순위입니다. 연속 미출현 수가 클수록 최근 당첨에서 오래 나오지 않은 숫자입니다." width="w-80" />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 mb-6">
                {topDuplicates.map((item, index) => (
                  <button
                    key={item.digit}
                    onClick={() => setSelectedDigit(prev => prev === parseInt(item.digit) ? null : parseInt(item.digit))}
                    className={`p-3 rounded-lg text-center transition-all ${
                      selectedDigit === parseInt(item.digit)
                        ? 'ring-2 ring-blue-500 bg-blue-50 border-2 border-blue-400'
                        : index === 0
                        ? 'bg-yellow-50 border-2 border-yellow-400 hover:bg-yellow-100'
                        : index < 3
                        ? 'bg-gray-50 border border-gray-300 hover:bg-gray-100'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mx-auto mb-2 ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="text-xl font-bold text-gray-800 mb-1">숫자 {item.digit}</div>
                    <div className="text-lg font-bold text-blue-600 mb-1">{item.count}회</div>
                    <div className="text-xs text-amber-600 font-medium">미출현 {item.absenceCount}회</div>
                    <div className="text-xs text-gray-500">({(item.count / analysis.totalCount * 100).toFixed(1)}%)</div>
                  </button>
                ))}
              </div>

              {/* 이론값 vs 실제 비교 그래프 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={16} className="text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">이론값 vs 실제 출현 비교</span>
                  {selected && (
                    <span className="ml-auto text-xs text-gray-500">
                      숫자 {selectedDigit} 선택됨 — 실제 {selected.실제}회 / 이론 {theoreticalCount.toFixed(1)}회
                      <span className={`ml-1 font-semibold ${selected.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        ({selected.deviation >= 0 ? '+' : ''}{selected.deviation.toFixed(1)}%)
                      </span>
                    </span>
                  )}
                  {!selected && (
                    <span className="ml-auto text-xs text-gray-400">숫자를 클릭하면 상세 표시</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mb-3">이론값 = 균등분포 기댓값 (totalCount ÷ 10). 실제가 이론보다 낮을수록 평균 회귀 여지가 큼.</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparisonData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="digit" stroke="#374151" fontSize={12} tickFormatter={d => `${d}`} />
                    <YAxis stroke="#374151" fontSize={11} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = comparisonData[parseInt(label)];
                        return (
                          <div className="bg-white p-2 border border-gray-200 rounded shadow text-xs">
                            <p className="font-bold mb-1">숫자 {label}</p>
                            <p className="text-blue-600">실제: {d.실제}회 ({(d.실제 / analysis.totalCount * 100).toFixed(1)}%)</p>
                            <p className="text-gray-500">이론: {d.이론.toFixed(1)}회 (10.0%)</p>
                            <p className={d.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}>
                              괴리: {d.deviation >= 0 ? '+' : ''}{d.deviation.toFixed(1)}%
                            </p>
                            <p className="text-amber-600">미출현: {d.absenceCount}회</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="이론" fill="#d1d5db" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="실제" radius={[2, 2, 0, 0]}>
                      {comparisonData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            selectedDigit === index
                              ? '#2563eb'
                              : entry.deviation < 0
                              ? '#3b82f6'
                              : '#ef4444'
                          }
                          opacity={selectedDigit !== null && selectedDigit !== index ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500 justify-center">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />이론값</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />실제 (이론 미달 → 평균회귀 여지)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />실제 (이론 초과 → 과잉)</span>
                </div>
              </div>

              {/* 선택된 digit의 패턴별 분포 */}
              {digitPatternData && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">숫자 {selectedDigit}의 배치 패턴별 출현 분포</span>
                    <span className="ml-auto text-xs text-gray-400">숫자 {selectedDigit}이 중복된 {digitPatternData.reduce((s, d) => s + d.실제, 0)}회 기준 · 이론값 = {digitPatternData[0]?.이론.toFixed(1)}회/패턴</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">해당 숫자가 중복 출현했을 때 어떤 배치패턴으로 나왔는지. 보라색=이론 미달(회귀 여지), 빨간색=이론 초과(과잉)</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={digitPatternData} margin={{ top: 4, right: 16, left: 0, bottom: 55 }} barCategoryGap="15%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                        <XAxis dataKey="pattern" fontSize={10} angle={-45} textAnchor="end" height={55} stroke="#374151" />
                        <YAxis fontSize={11} stroke="#374151" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border border-gray-200 rounded shadow text-xs">
                                <p className="font-mono font-bold mb-1">{d.pattern}</p>
                                <p className="text-gray-400">이론: {d.이론.toFixed(1)}회</p>
                                <p className="text-purple-600">실제: {d.실제}회</p>
                                <p className={d.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}>
                                  괴리: {d.deviation >= 0 ? '+' : ''}{d.deviation.toFixed(1)}%
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="이론" fill="#bfdbfe" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="실제" radius={[2, 2, 0, 0]}>
                          {digitPatternData.map((entry, index) => (
                            <Cell key={index} fill={entry.deviation < 0 ? '#8b5cf6' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 1개 중복 숫자 배치 패턴 분석 */}
        {(() => {
          const positionPatternAnalysis = analyzeDuplicatePositionPatterns(lotteryData);
          
          if (positionPatternAnalysis.totalCount === 0) {
            return null;
          }

          // 배치 패턴 이론값: C(6,2)=15가지 균등분포 → 각 패턴 이론값 = totalCount / 15
          const patternTheoretical = positionPatternAnalysis.totalCount / 15;
          const patternChartData = positionPatternAnalysis.patternDetails.map(p => {
            const deviation = ((p.count - patternTheoretical) / patternTheoretical) * 100;
            return { ...p, 이론: patternTheoretical, 실제: p.count, deviation };
          });

          return (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Repeat size={20} />
                1개 중복 숫자 배치 패턴 분석 (O: 중복 숫자, X: 다른 숫자)
                <InfoTooltip text="중복 숫자가 6자리 중 어느 위치에 배치되는지 패턴을 분석합니다. 이론값 = C(6,2)=15가지 균등분포 기준." width="w-80" />
              </h3>
              <p className="text-xs text-gray-400 mb-4">이론값 = 1개 중복 회차 ÷ 15. 실제가 이론보다 낮을수록 평균 회귀 여지가 큼.</p>

              <div className="space-y-4">
                {/* 패턴별 이론 vs 실제 막대 차트 */}
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={patternChartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                      barCategoryGap="15%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="pattern"
                        stroke="#374151"
                        fontSize={10}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#374151" fontSize={11} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border border-gray-200 rounded shadow text-xs">
                              <p className="font-bold mb-1 font-mono">{d.pattern}</p>
                              <p className="text-gray-400">이론: {patternTheoretical.toFixed(1)}회</p>
                              <p className="text-purple-600">실제: {d.count}회 ({d.percentage.toFixed(1)}%)</p>
                              <p className={d.deviation >= 0 ? 'text-red-500' : 'text-blue-500'}>
                                괴리: {d.deviation >= 0 ? '+' : ''}{d.deviation.toFixed(1)}%
                              </p>
                              <p className="text-amber-600">미출현: {d.absenceCount}회</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="이론" fill="#d1d5db" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="실제" radius={[2, 2, 0, 0]}>
                        {patternChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.deviation < 0 ? '#8b5cf6' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500 justify-center">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />이론값</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" />실제 (이론 미달 → 평균회귀 여지)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />실제 (이론 초과 → 과잉)</span>
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
                       <InfoTooltip text="한 회차에서 중복이 0번·2번·3번·4번 이상 등장한 비율 분포입니다. 2회 중복이 가장 일반적이며, 3회 이상은 드뭅니다." width="w-72" />
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
                       <InfoTooltip text="6자리 번호에서 인접한 두 자리 숫자의 차이(절댓값) 패턴을 분석합니다. 예: '1→4'이면 인접 자리 차이가 3. 연속 증가/감소 여부도 확인합니다." width="w-80" />
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
                       <InfoTooltip text="6자리 번호 중 낮은 숫자(0~3), 중간(4~6), 높은 숫자(7~9)가 각각 몇 개씩 포함되는지 비율을 분석합니다." width="w-72" />
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
                       <InfoTooltip text="6자리 번호에서 짝수(0,2,4,6,8)와 홀수(1,3,5,7,9)의 비율, 그리고 한 회차에 짝수가 몇 개 포함되는지 분포를 보여줍니다." width="w-80" />
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
                       <InfoTooltip text="6자리 번호에서 인접한 두 자리(예: 1번째↔2번째)가 특정 숫자 조합으로 나타난 빈도 상위 10개입니다. 자주 함께 등장하는 숫자 쌍을 파악할 수 있습니다." width="w-80" />
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

