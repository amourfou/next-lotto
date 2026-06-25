"use client";

import { useState } from "react";
import { LottoPageBody } from "./LottoPageBody";
import { PensionPageContent } from "../pension/PensionPageContent";

export function LottoPage() {
  const [pageTab, setPageTab] = useState<"lotto" | "pension">("lotto");

  return (
    <div
      className={`flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 ${
        pageTab === "lotto" ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      <div className="flex shrink-0 border-b border-slate-600/50 px-4 pt-3">
        {(["lotto", "pension"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setPageTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative z-10 -mb-px ${
              pageTab === tab
                ? "border border-b-0 border-slate-600/50 rounded-t-lg bg-slate-800/50 text-amber-400"
                : "border border-transparent text-slate-400 hover:text-slate-200 rounded-t-lg"
            }`}
          >
            {tab === "lotto" ? "Lotto 6/45" : "연금복권"}
          </button>
        ))}
      </div>
      <div className={pageTab === "lotto" ? "flex flex-1 min-h-0 flex-col" : ""}>
        {pageTab === "lotto" ? <LottoPageBody /> : <PensionPageContent />}
      </div>
    </div>
  );
}
