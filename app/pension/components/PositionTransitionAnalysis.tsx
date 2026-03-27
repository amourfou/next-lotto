'use client';

import React, { useState } from 'react';
import { LotteryData, analyzePositionTransition } from '../lib/dataParser';
import { ArrowRight, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

interface PositionTransitionAnalysisProps {
  lotteryData: LotteryData[];
}

export default function PositionTransitionAnalysis({ lotteryData }: PositionTransitionAnalysisProps) {
  const [expandedPositions, setExpandedPositions] = useState<Set<number>>(new Set());
  const [selectedPrevDigit, setSelectedPrevDigit] = useState<Record<number, number | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null
  });

  if (lotteryData.length < 2) {
    return null;
  }

  const analysis = analyzePositionTransition(lotteryData);

  const togglePosition = (position: number) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(position)) {
      newExpanded.delete(position);
    } else {
      newExpanded.add(position);
    }
    setExpandedPositions(newExpanded);
  };

  const getColorForProbability = (prob: number): string => {
    if (prob >= 0.3) return 'bg-green-500';
    if (prob >= 0.2) return 'bg-yellow-500';
    if (prob >= 0.1) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <BarChart3 className="text-indigo-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            각 자리별 전이 패턴 분석
            <InfoTooltip text="이전 회차의 각 자리 숫자가 다음 회차 같은 자리에서 어떤 숫자로 이어지는지 조건부 확률로 분석합니다. 예: 1번째 자리가 3이었을 때 다음 회차 같은 자리에 각 숫자가 나올 확률을 보여줍니다." width="w-80" />
          </h2>
          <p className="text-sm text-gray-600">
            이전 회차의 각 자리 숫자가 다음 회차의 같은 자리에 어떤 숫자를 만드는지 분석
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-gray-700">
          <strong>총 전이 개수:</strong> {analysis.totalTransitions}개 (회차 수 - 1)
        </div>
      </div>

      <div className="space-y-4">
        {analysis.positionTransitions.map((positionData) => {
          const isExpanded = expandedPositions.has(positionData.position);
          const prevDigits = Object.keys(positionData.transitions).map(Number).sort((a, b) => a - b);

          return (
            <div key={positionData.position} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* 헤더 */}
              <button
                onClick={() => togglePosition(positionData.position)}
                className="w-full p-4 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-indigo-600">
                    {positionData.position}번째 자리
                  </span>
                  <span className="text-sm text-gray-600">
                    ({prevDigits.length}가지 이전 숫자 패턴)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="text-gray-600" size={20} />
                ) : (
                  <ChevronDown className="text-gray-600" size={20} />
                )}
              </button>

              {/* 내용 */}
              {isExpanded && (
                <div className="p-4 bg-gray-50">
                  <div className="space-y-4">
                    {prevDigits.map((prevDigit) => {
                      const transitions = positionData.transitions[prevDigit];
                      const probabilities = positionData.transitionProbabilities[prevDigit] || {};
                      const total = positionData.transitionTotals[prevDigit] || 0;
                      const nextDigits = Object.keys(transitions).map(Number).sort((a, b) => b - a);

                      return (
                        <div
                          key={prevDigit}
                          className={`p-4 bg-white rounded-lg border-2 ${
                            selectedPrevDigit[positionData.position] === prevDigit
                              ? 'border-indigo-500 shadow-lg'
                              : 'border-gray-200 hover:border-indigo-300'
                          } transition-all cursor-pointer`}
                          onClick={() => {
                            setSelectedPrevDigit({
                              ...selectedPrevDigit,
                              [positionData.position]: selectedPrevDigit[positionData.position] === prevDigit ? null : prevDigit
                            });
                          }}
                        >
                          <div className="mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl font-bold text-indigo-600">{prevDigit}</span>
                              <ArrowRight className="text-gray-400" size={16} />
                              <span className="text-sm text-gray-600">다음 숫자</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              총 {total}회 출현
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">다음 숫자</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">횟수</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">확률</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">시각화</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nextDigits.map((nextDigit) => {
                                  const count = transitions[nextDigit];
                                  const prob = probabilities[nextDigit] || 0;

                                  return (
                                    <tr key={nextDigit} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="px-3 py-2">
                                        <span className="text-sm font-semibold text-gray-700">{nextDigit}</span>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className="text-sm text-blue-600 font-semibold">{count}회</span>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className="text-sm text-green-600 font-semibold">{(prob * 100).toFixed(1)}%</span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex-1 relative h-5 bg-gray-200 rounded">
                                          <div
                                            className={`h-full rounded ${getColorForProbability(prob)} transition-all`}
                                            style={{ width: `${Math.min(prob * 100, 100)}%` }}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택된 패턴 요약 */}
      {Object.values(selectedPrevDigit).some(digit => digit !== null) && (
        <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
            선택된 패턴 요약
            <InfoTooltip text="각 자리에서 클릭으로 선택한 이전 숫자를 기준으로, 다음 회차에 등장할 가능성이 높은 상위 3개 숫자와 확률을 요약합니다." width="w-72" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.positionTransitions.map((positionData) => {
              const selectedDigit = selectedPrevDigit[positionData.position];
              if (selectedDigit === null) return null;

              const probabilities = positionData.transitionProbabilities[selectedDigit] || {};
              const topNext = Object.entries(probabilities)
                .map(([digit, prob]) => ({ digit: parseInt(digit), prob }))
                .sort((a, b) => b.prob - a.prob)
                .slice(0, 3);

              return (
                <div key={positionData.position} className="p-3 bg-white rounded border border-indigo-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    {positionData.position}번째 자리: {selectedDigit} →
                  </div>
                  <div className="space-y-1">
                    {topNext.map(({ digit, prob }) => (
                      <div key={digit} className="text-xs text-gray-600">
                        {digit}: {(prob * 100).toFixed(1)}%
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

