'use client';

import { useMemo } from 'react';
import { ListOrdered } from 'lucide-react';
import { LotteryData, getLotteryDataSummary } from '../lib/dataParser';

const DIGIT_COLORS: Record<number, string> = {
  0: 'bg-gray-500',
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-amber-500',
  4: 'bg-lime-600',
  5: 'bg-teal-500',
  6: 'bg-blue-500',
  7: 'bg-indigo-500',
  8: 'bg-purple-500',
  9: 'bg-pink-500',
};

function digitBg(n: number): string {
  return DIGIT_COLORS[n] ?? 'bg-gray-500';
}

/** 6자리 합계 */
function getDigitSum(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0);
}

/** 숫자 1종류만 정확히 2번 중복일 때 O/X 배치 패턴 (예: OXOXXX). 그 외 null */
function getSingleDuplicatePattern(numbers: number[]): string | null {
  const digitCount: Record<number, number> = {};
  for (const n of numbers) {
    digitCount[n] = (digitCount[n] || 0) + 1;
  }
  const duplicates = Object.entries(digitCount).filter(([, count]) => count >= 2);
  if (duplicates.length !== 1) return null;
  const duplicateDigit = Number(duplicates[0][0]);
  if (digitCount[duplicateDigit] !== 2) return null;
  return numbers.map((d) => (d === duplicateDigit ? 'O' : 'X')).join('');
}

interface WinningNumbersListProps {
  lotteryData: LotteryData[];
}

export default function WinningNumbersList({ lotteryData }: WinningNumbersListProps) {
  const sorted = useMemo(
    () => [...lotteryData].sort((a, b) => b.order - a.order),
    [lotteryData]
  );
  const { minOrder, maxOrder, rowCount } = getLotteryDataSummary(lotteryData);

  if (sorted.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-indigo-100 flex flex-col max-h-[420px] xl:max-h-[calc(100vh-6rem)] xl:sticky xl:top-4">
      <div className="shrink-0 px-3 py-2.5 border-b border-indigo-100 bg-indigo-50/80 rounded-t-lg">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <ListOrdered size={16} className="text-indigo-600" />
          당첨번호
        </h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {minOrder}~{maxOrder}회 · {rowCount}건 (최신순)
        </p>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr className="text-gray-600">
              <th className="py-1.5 px-2 text-left font-semibold w-12">회차</th>
              <th className="py-1.5 px-1 text-center font-semibold">번호</th>
              <th className="py-1.5 px-1 text-center font-semibold w-10">합계</th>
              <th className="py-1.5 px-1 text-center font-semibold">중복</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const sum = getDigitSum(row.numbers);
              const dupPattern = getSingleDuplicatePattern(row.numbers);
              return (
              <tr key={row.order} className="border-t border-gray-100 hover:bg-indigo-50/50">
                <td className="py-1.5 px-2 font-semibold text-gray-700 tabular-nums">{row.order}</td>
                <td className="py-1 px-1">
                  <div className="flex justify-center gap-0.5 flex-wrap">
                    {row.numbers.map((num, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${digitBg(num)}`}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-1.5 px-1 text-center font-semibold text-gray-800 tabular-nums">
                  {sum}
                </td>
                <td className="py-1.5 px-1 text-center">
                  {dupPattern ? (
                    <span className="font-mono text-xs font-semibold tracking-tight">
                      {dupPattern.split('').map((char, i) => (
                        <span key={i} className={char === 'O' ? 'text-amber-600' : 'text-gray-500'}>
                          {char}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
