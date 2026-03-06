"use client";

import { LOTTO_GROUPS } from "./GroupExclude";

const PICK_COUNT = 6;
const MAX_PER_GROUP = 6;

export type GroupCounts = Record<number, number>;

export type GroupEnabled = Record<number, boolean>;

/** true = 지정한 개수 이하, false = 지정한 개수(정확히) */
export type GroupAtMost = Record<number, boolean>;

export function getDefaultGroupAtMost(): GroupAtMost {
  return { 9: false, 18: false, 27: false, 36: false, 45: false };
}

export function getDefaultGroupCounts(): GroupCounts {
  return { 9: 0, 18: 0, 27: 0, 36: 0, 45: 0 };
}

export function getDefaultGroupEnabled(): GroupEnabled {
  return { 9: true, 18: true, 27: true, 36: true, 45: true };
}

export function sumGroupCounts(
  counts: GroupCounts,
  enabled?: GroupEnabled
): number {
  if (!enabled) {
    return LOTTO_GROUPS.reduce((s, { key }) => s + (counts[key] ?? 0), 0);
  }
  return LOTTO_GROUPS.reduce(
    (s, { key }) => s + (enabled[key] ? counts[key] ?? 0 : 0),
    0
  );
}

type GroupCountSelectorProps = {
  groupCounts: GroupCounts;
  groupEnabled: GroupEnabled;
  groupAtMost: GroupAtMost;
  onChange: (groupKey: number, value: number) => void;
  onToggleEnabled: (groupKey: number) => void;
  onSetAtMost: (groupKey: number, atMost: boolean) => void;
};

export default function GroupCountSelector({
  groupCounts,
  groupEnabled,
  groupAtMost,
  onChange,
  onToggleEnabled,
  onSetAtMost,
}: GroupCountSelectorProps) {
  const total = sumGroupCounts(groupCounts, groupEnabled);
  const exactTotal = LOTTO_GROUPS.reduce(
    (s, { key }) =>
      s + (groupEnabled[key] && !(groupAtMost[key] ?? false) ? groupCounts[key] ?? 0 : 0),
    0
  );

  return (
    <div className="w-full max-w-lg">
      <h3 className="text-slate-400 font-semibold text-sm mb-2 text-center">
        그룹별 포함 개수 (체크한 그룹만 제한, 나머지는 자동 채움)
      </h3>
      <p className="text-slate-500 text-xs text-center mb-2">
        오른쪽 [지정] = 정확히 N개, [이하] = 최대 N개
      </p>
      <ul className="space-y-2 mb-3">
        {LOTTO_GROUPS.map(({ key, label, range }) => {
          const value = groupCounts[key] ?? 0;
          const enabled = groupEnabled[key] ?? false;
          return (
            <li
              key={key}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-2 px-3 rounded-xl border ${
                enabled
                  ? "bg-slate-700/50 border-slate-600/50"
                  : "bg-slate-800/30 border-slate-700/30"
              }`}
            >
              <label className="flex items-center gap-2 cursor-pointer shrink-0 min-w-0">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => onToggleEnabled(key)}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-amber-500 focus:ring-amber-500/50"
                />
                <span
                  className={`text-sm truncate ${
                    enabled ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {label}
                  <span className="text-slate-500 ml-1">({range})</span>
                </span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!enabled || value <= 0}
                    onClick={() => onChange(key, Math.max(0, value - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-600 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-500 font-bold text-sm"
                  >
                    −
                  </button>
                  <span
                    className={`w-8 text-center font-semibold ${
                      enabled ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {value}
                  </span>
                  <button
                    type="button"
                    disabled={!enabled || value >= MAX_PER_GROUP}
                    onClick={() => onChange(key, Math.min(MAX_PER_GROUP, value + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-600 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-500 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <div
                  className={`flex rounded-lg overflow-hidden border bg-slate-700/50 ${
                    enabled ? "border-slate-600" : "border-slate-700/50 opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && onSetAtMost(key, false)}
                    className={`px-2.5 py-1.5 text-xs font-medium min-w-[3rem] disabled:cursor-not-allowed disabled:opacity-70 ${
                      !(groupAtMost[key] ?? false)
                        ? "bg-amber-500/90 text-slate-900"
                        : "text-slate-400 hover:text-slate-200"
                    } ${!enabled ? "!bg-slate-600 !text-slate-500" : ""}`}
                  >
                    지정
                  </button>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && onSetAtMost(key, true)}
                    className={`px-2.5 py-1.5 text-xs font-medium min-w-[3rem] disabled:cursor-not-allowed disabled:opacity-70 ${
                      groupAtMost[key] ?? false
                        ? "bg-amber-500/90 text-slate-900"
                        : "text-slate-400 hover:text-slate-200"
                    } ${!enabled ? "!bg-slate-600 !text-slate-500" : ""}`}
                  >
                    이하
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p
        className={`text-sm text-center ${
          exactTotal <= PICK_COUNT ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        지정 합계: {exactTotal}
        {exactTotal <= PICK_COUNT ? " (총 6개 뽑음, 나머지는 채우기)" : " (6 이하여야 함)"}
        {total !== exactTotal && ` · 이하 그룹 포함 시: ${total}`}
      </p>
    </div>
  );
}
