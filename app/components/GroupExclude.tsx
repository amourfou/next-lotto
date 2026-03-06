"use client";

export const LOTTO_GROUPS = [
  { key: 9, label: "9그룹", range: "1~9" },
  { key: 18, label: "18그룹", range: "10~18" },
  { key: 27, label: "27그룹", range: "19~27" },
  { key: 36, label: "36그룹", range: "28~36" },
  { key: 45, label: "45그룹", range: "37~45" },
] as const;

export function getNumbersInGroup(groupKey: number): number[] {
  const start = groupKey === 9 ? 1 : groupKey - 8;
  return Array.from({ length: 9 }, (_, i) => start + i);
}

export function getNumbersInExcludedGroups(excludedGroupKeys: number[]): number[] {
  const set = new Set<number>();
  for (const key of excludedGroupKeys) {
    for (const n of getNumbersInGroup(key)) set.add(n);
  }
  return Array.from(set);
}

type GroupExcludeProps = {
  excludedGroups: number[];
  onToggle: (groupKey: number) => void;
};

export default function GroupExclude({ excludedGroups, onToggle }: GroupExcludeProps) {
  const excludedSet = new Set(excludedGroups);

  return (
    <div className="w-full max-w-md">
      <h3 className="text-slate-400 font-semibold text-sm mb-2 text-center">
        제외할 그룹 (해당 구간 번호가 뽑히지 않음)
      </h3>
      <div className="flex flex-wrap justify-center gap-2">
        {LOTTO_GROUPS.map(({ key, label, range }) => {
          const isExcluded = excludedSet.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isExcluded
                  ? "bg-violet-600/90 text-white ring-2 ring-violet-400"
                  : "bg-slate-600/80 text-slate-300 hover:bg-slate-500"
              }`}
              title={`${label} (${range}) ${isExcluded ? "클릭 시 해제" : "클릭 시 제외"}`}
            >
              {label}
              <span className="ml-1 text-slate-400 text-xs">({range})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
