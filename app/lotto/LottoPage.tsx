"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { LottoPageBody } from "./LottoPageBody";
import { PensionPageContent } from "../pension/PensionPageContent";

export function LottoPage() {
  const router = useRouter();
  const [pageTab, setPageTab] = useState<"lotto" | "pension">("lotto");
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.user?.name) {
          setUserName(json.user.name);
        }
      } catch {
        // 세션 조회 실패는 무시 (middleware가 미로그인 차단)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className={`flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 ${
        pageTab === "lotto" ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      <div className="flex shrink-0 items-end justify-between gap-2 border-b border-slate-600/50 px-4 pt-3">
        <div className="flex min-w-0">
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
        {userName && (
          <div className="flex shrink-0 items-center gap-2 pb-2">
            <span className="max-w-[8rem] truncate text-xs text-slate-300 sm:text-sm sm:max-w-[12rem]">
              {userName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="로그아웃"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600/60 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isLoggingOut ? "…" : "로그아웃"}
              </span>
            </button>
          </div>
        )}
      </div>
      <div className={pageTab === "lotto" ? "flex flex-1 min-h-0 flex-col" : ""}>
        {pageTab === "lotto" ? <LottoPageBody /> : <PensionPageContent />}
      </div>
    </div>
  );
}
