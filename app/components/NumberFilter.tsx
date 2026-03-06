"use client";

export type NumberFilterState = "none" | "include" | "exclude" | "atLeastOne";

export type FilterCategory = "include" | "exclude" | "atLeastOne";

const MIN = 1;
const MAX = 45;

const CATEGORIES: { value: FilterCategory; label: string; className: string }[] = [
  { value: "include", label: "꼭 넣을 번호", className: "ring-emerald-400 bg-emerald-600/90 hover:bg-emerald-500/90" },
  { value: "exclude", label: "꼭 뺄 번호", className: "ring-red-400 bg-red-600/90 hover:bg-red-500/90" },
  { value: "atLeastOne", label: "하나 포함", className: "ring-amber-400 bg-amber-500/90 text-slate-900 hover:bg-amber-400/90" },
];

type NumberFilterProps = {
  filterStates: Record<number, NumberFilterState>;
  currentCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  onNumberClick: (num: number) => void;
};

function stateStyle(state: NumberFilterState): string {
  switch (state) {
    case "include":
      return "ring-2 ring-emerald-400 bg-emerald-500/90 text-white";
    case "exclude":
      return "ring-2 ring-red-400 bg-red-500/90 text-white";
    case "atLeastOne":
      return "ring-2 ring-amber-400 bg-amber-500/90 text-slate-900";
    default:
      return "bg-slate-600/80 text-slate-300 hover:bg-slate-500";
  }
}

export default function NumberFilter({
  filterStates,
  currentCategory,
  onCategoryChange,
  onNumberClick,
}: NumberFilterProps) {
  const numbers = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN);
  const includeList = numbers.filter((n) => filterStates[n] === "include").sort((a, b) => a - b);
  const excludeList = numbers.filter((n) => filterStates[n] === "exclude").sort((a, b) => a - b);
  const atLeastOneList = numbers.filter((n) => filterStates[n] === "atLeastOne").sort((a, b) => a - b);

  return (
    <div className="w-full max-w-md">
      <p className="text-slate-400 text-sm mb-3 text-center">
        먼저 항목을 선택한 뒤, 번호를 클릭해 추가·해제하세요
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {CATEGORIES.map(({ value, label, className }) => (
          <button
            key={value}
            type="button"
            onClick={() => onCategoryChange(value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ring-2 transition-colors ${className} ${currentCategory === value ? "ring-offset-2 ring-offset-slate-800" : "opacity-70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-slate-400">
        {includeList.length > 0 && (
          <span>꼭 넣을 번호: {includeList.join(", ")} ({includeList.length}개)</span>
        )}
        {excludeList.length > 0 && (
          <span>꼭 뺄 번호: {excludeList.join(", ")} ({excludeList.length}개)</span>
        )}
        {atLeastOneList.length > 0 && (
          <span className="text-amber-400/90">하나 포함: {atLeastOneList.join(", ")} ({atLeastOneList.length}개)</span>
        )}
      </div>

      <div className="grid grid-cols-9 gap-1.5">
        {numbers.map((num) => {
          const state = filterStates[num] ?? "none";
          const isCurrentCategory = state === currentCategory;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onNumberClick(num)}
              className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${stateStyle(state)} ${isCurrentCategory ? "ring-offset-2 ring-offset-slate-800" : ""}`}
              title={
                state === "none"
                  ? `클릭 시 [${CATEGORIES.find((c) => c.value === currentCategory)?.label}]에 추가`
                  : `현재: ${state === "include" ? "꼭 넣을 번호" : state === "exclude" ? "꼭 뺄 번호" : "하나 포함"} (같은 항목 다시 클릭 시 해제)`
              }
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
