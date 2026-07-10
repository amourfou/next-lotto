"use client";

import { LOTTO_GROUPS } from "./GroupExclude";

const PICK_COUNT = 6;
/** 그룹별 최대 개수 (4개 이상은 제외) */
const MAX_PER_GROUP = 3;

export type GroupCounts = Record<number, number>;
export type GroupEnabled = Record<number, boolean>;
/** @deprecated 지정/이하 → min/max 범위로 대체. 설정 로드 호환용으로만 유지 */
export type GroupAtMost = Record<number, boolean>;

export type GroupCountRange = { min: number; max: number };
export type GroupCountRanges = Record<number, GroupCountRange>;

export function getDefaultGroupAtMost(): GroupAtMost {
  return { 9: false, 18: false, 27: false, 36: false, 45: false };
}

export function getDefaultGroupCounts(): GroupCounts {
  return { 9: 0, 18: 0, 27: 0, 36: 0, 45: 0 };
}

export function getDefaultGroupCountRanges(): GroupCountRanges {
  return {
    9: { min: 0, max: MAX_PER_GROUP },
    18: { min: 0, max: MAX_PER_GROUP },
    27: { min: 0, max: MAX_PER_GROUP },
    36: { min: 0, max: MAX_PER_GROUP },
    45: { min: 0, max: MAX_PER_GROUP },
  };
}

export function getDefaultGroupEnabled(): GroupEnabled {
  return { 9: true, 18: true, 27: true, 36: true, 45: true };
}

export function clampGroupCount(n: number): number {
  return Math.min(MAX_PER_GROUP, Math.max(0, Math.floor(n)));
}

/** 구 설정(groupCounts + groupAtMost) 또는 {min,max} 객체를 범위로 변환 */
export function normalizeGroupCountRanges(
  groupCounts: unknown,
  groupAtMost?: unknown
): GroupCountRanges {
  const base = getDefaultGroupCountRanges();
  if (!groupCounts || typeof groupCounts !== "object") return base;
  const counts = groupCounts as Record<string | number, unknown>;
  const atMost =
    groupAtMost && typeof groupAtMost === "object"
      ? (groupAtMost as Record<string | number, unknown>)
      : null;

  for (const key of [9, 18, 27, 36, 45] as const) {
    const raw = counts[key] ?? counts[String(key)];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as { min?: unknown; max?: unknown };
      let min = typeof obj.min === "number" ? clampGroupCount(obj.min) : 0;
      let max = typeof obj.max === "number" ? clampGroupCount(obj.max) : min;
      if (max < min) max = min;
      base[key] = { min, max };
      continue;
    }
    if (typeof raw === "number") {
      const v = clampGroupCount(raw);
      const isAtMost = atMost ? Boolean(atMost[key] ?? atMost[String(key)]) : false;
      base[key] = isAtMost ? { min: 0, max: v } : { min: v, max: v };
    }
  }
  return base;
}

export function sumGroupMins(
  ranges: GroupCountRanges,
  enabled?: GroupEnabled
): number {
  return LOTTO_GROUPS.reduce(
    (s, { key }) =>
      s + (enabled == null || enabled[key] ? ranges[key]?.min ?? 0 : 0),
    0
  );
}

/** @deprecated sumGroupMins 사용 권장 */
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

type SpinNumberProps = {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  label: string;
  onChange: (value: number) => void;
};

function SpinNumber({ value, min, max, disabled, label, onChange }: SpinNumberProps) {
  const canDown = !disabled && value > min;
  const canUp = !disabled && value < max;

  return (
    <div
      className={`inline-flex h-9 items-stretch overflow-hidden rounded-lg border bg-slate-800 ${
        disabled ? "border-slate-700" : "border-slate-600"
      }`}
    >
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (Number.isNaN(v)) return;
          onChange(Math.max(min, Math.min(max, v)));
        }}
        className={`w-9 text-center text-sm font-semibold tabular-nums bg-transparent focus:outline-none disabled:cursor-not-allowed ${
          disabled ? "text-slate-500" : "text-white"
        }`}
        aria-label={label}
        title={label}
      />
      <div className="flex flex-col border-l border-slate-600/70 w-6 shrink-0">
        <button
          type="button"
          disabled={!canUp}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex-1 flex items-center justify-center text-[10px] leading-none text-slate-300 hover:bg-slate-600/80 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`${label} 증가`}
        >
          ▲
        </button>
        <button
          type="button"
          disabled={!canDown}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex-1 flex items-center justify-center text-[10px] leading-none text-slate-300 hover:bg-slate-600/80 disabled:opacity-30 disabled:cursor-not-allowed border-t border-slate-600/70"
          aria-label={`${label} 감소`}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

type GroupCountSelectorProps = {
  groupCountRanges: GroupCountRanges;
  groupEnabled: GroupEnabled;
  onChangeMin: (groupKey: number, value: number) => void;
  onChangeMax: (groupKey: number, value: number) => void;
  onToggleEnabled: (groupKey: number) => void;
};

export default function GroupCountSelector({
  groupCountRanges,
  groupEnabled,
  onChangeMin,
  onChangeMax,
  onToggleEnabled,
}: GroupCountSelectorProps) {
  const minTotal = sumGroupMins(groupCountRanges, groupEnabled);

  return (
    <div className="w-full max-w-xl">
      <h3 className="text-slate-400 font-semibold text-sm mb-2 text-center">
        그룹별 포함 개수 (체크한 그룹만 제한, 나머지는 자동 채움)
      </h3>
      <p className="text-slate-500 text-xs text-center mb-2">
        각 그룹에서 <span className="text-slate-300">n ≤ 개수 ≤ m</span> 범위를 설정합니다
      </p>
      <ul className="space-y-2 mb-3">
        {LOTTO_GROUPS.map(({ key, label, range }) => {
          const { min, max } = groupCountRanges[key] ?? { min: 0, max: 0 };
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
              <div
                className={`flex items-center gap-2 flex-wrap ${
                  enabled ? "" : "opacity-50"
                }`}
              >
                <SpinNumber
                  value={min}
                  min={0}
                  max={max}
                  disabled={!enabled}
                  label={`${label} 최소`}
                  onChange={(v) => onChangeMin(key, v)}
                />
                <span
                  className={`text-base font-semibold tracking-wide ${
                    enabled ? "text-slate-200" : "text-slate-600"
                  }`}
                >
                  ≤ x ≤
                </span>
                <SpinNumber
                  value={max}
                  min={min}
                  max={MAX_PER_GROUP}
                  disabled={!enabled}
                  label={`${label} 최대`}
                  onChange={(v) => onChangeMax(key, v)}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p
        className={`text-sm text-center ${
          minTotal <= PICK_COUNT ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        최소 합계: {minTotal}
        {minTotal <= PICK_COUNT
          ? " (총 6개 뽑음, 나머지는 범위 안에서 채움)"
          : " (6 이하여야 함)"}
      </p>
    </div>
  );
}
