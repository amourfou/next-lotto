'use client';

import React from 'react';
import { NumberAnalysis } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

interface AnalysisResultsProps {
  analysis: NumberAnalysis | null;
}

/** 숫자(0~9)별 막대 색상 — PredictionGenerator의 DIGIT_COLORS와 동일한 팔레트 */
const DIGIT_BAR_COLORS: Record<number, string> = {
  0: '#9ca3af', // gray-400
  1: '#f87171', // red-400
  2: '#fb923c', // orange-400
  3: '#fbbf24', // amber-400
  4: '#84cc16', // lime-500
  5: '#2dd4bf', // teal-400
  6: '#3b82f6', // blue-500
  7: '#6366f1', // indigo-500
  8: '#a855f7', // purple-500
  9: '#ec4899', // pink-500
};

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-500">숫자를 입력하고 분석을 시작하세요</p>
      </div>
    );
  }

  const totalDigitCount = Object.values(analysis.distribution.digitFrequency).reduce((a, b) => a + b, 0);
  const digitChartData = [0,1,2,3,4,5,6,7,8,9].map(d => {
    const count = analysis.distribution.digitFrequency[d.toString()] ?? 0;
    return {
      digit: d.toString(),
      count,
      probability: totalDigitCount > 0 ? (count / totalDigitCount) * 100 : 0,
    };
  });

  const DigitTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { digit, count, probability } = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 rounded-lg shadow text-xs">
          <p className="font-bold text-gray-800 mb-1">숫자 {digit}</p>
          <p className="text-gray-600">출현: <span className="font-bold">{count}회</span></p>
          <p className="text-blue-600">확률: <span className="font-bold">{probability.toFixed(2)}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
          통계 분석
          <InfoTooltip text="전체 당첨 번호 배열의 기초 통계 — 평균·중앙값·최빈값·범위·표준편차와 함께, 평균 ±1σ 범위 내외에 몇 %가 분포하는지 보여줍니다." width="w-72" />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{Math.round(analysis.statistics.mean)}</div>
            <div className="text-xs sm:text-sm text-gray-600">평균</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{Math.round(analysis.statistics.median)}</div>
            <div className="text-xs sm:text-sm text-gray-600">중앙값</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{analysis.statistics.mode.toString()}</div>
            <div className="text-xs sm:text-sm text-gray-600">최빈값</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{analysis.statistics.range.toString()}</div>
            <div className="text-xs sm:text-sm text-gray-600">범위</div>
          </div>
          <div className="text-center col-span-2 sm:col-span-1">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{Math.round(analysis.statistics.standardDeviation)}</div>
            <div className="text-xs sm:text-sm text-gray-600">표준편차</div>
          </div>
        </div>
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">표준편차 범위 분석</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">범위 내</div>
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {analysis.statistics.outOfRangeCount > 0 ? Math.round((1 - analysis.statistics.outOfRangeRatio) * 100) : 100}%
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">범위 밖</div>
              <div className="text-lg sm:text-xl font-bold text-red-600">{Math.round(analysis.statistics.outOfRangeRatio * 100)}%</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">상한 초과</div>
              <div className="text-lg sm:text-xl font-bold text-orange-600">{Math.round(analysis.statistics.aboveUpperBoundRatio * 100)}%</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">하한 미만</div>
              <div className="text-lg sm:text-xl font-bold text-blue-600">{Math.round(analysis.statistics.belowLowerBoundRatio * 100)}%</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          자릿수 분포
          <InfoTooltip text="6자리 번호에서 0~9 각 숫자가 전체 회차에 걸쳐 등장한 횟수와 확률입니다. 자리 위치 구분 없이 합산하며, 완전히 균등하다면 각 숫자는 약 10%씩 나타납니다." width="w-72" />
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={digitChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="digit" fontSize={12} stroke="#374151" />
            <YAxis fontSize={11} stroke="#374151" label={{ value: '출현 횟수', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#6b7280' } }} />
            <Tooltip content={<DigitTooltip />} />
            <Bar dataKey="count">
              {digitChartData.map((entry) => (
                <Cell key={entry.digit} fill={DIGIT_BAR_COLORS[parseInt(entry.digit)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
          패턴 분석
          <InfoTooltip text="번호 배열의 구조적 특성 — 연속된 숫자 개수, 반복 숫자 여부, 오름차순/내림차순 정렬 여부를 분석합니다." />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{analysis.patterns.consecutiveDigits}</div>
            <div className="text-xs sm:text-sm text-gray-600">연속 자릿수</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{analysis.patterns.repeatedDigits}</div>
            <div className="text-xs sm:text-sm text-gray-600">반복 자릿수</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{analysis.patterns.ascendingSequence ? '✓' : '✗'}</div>
            <div className="text-xs sm:text-sm text-gray-600">오름차순</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{analysis.patterns.descendingSequence ? '✓' : '✗'}</div>
            <div className="text-xs sm:text-sm text-gray-600">내림차순</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
          <PieChartIcon size={20} />
          분포 정보
          <InfoTooltip text="짝수/홀수 비율, 소수 개수, 사용된 서로 다른 자릿수 종류 등 수학적 성질에 따른 분포 정보입니다." />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-2">{analysis.distribution.evenOddRatio.toFixed(2)}</div>
            <div className="text-xs sm:text-sm text-gray-600">짝수/홀수 비율</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600 mb-2">{analysis.distribution.primeCount}</div>
            <div className="text-xs sm:text-sm text-gray-600">소수 개수</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">{Object.keys(analysis.distribution.digitFrequency).length}</div>
            <div className="text-xs sm:text-sm text-gray-600">사용된 자릿수</div>
          </div>
        </div>
      </div>
    </div>
  );
}
