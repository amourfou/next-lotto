"use client";

import { useCallback, useEffect, useState } from "react";
import { useIsAdmin } from "@/lib/client/useIsAdmin";

type Game = "lotto" | "pension";
interface Status {
  status: "ok" | "pending" | "error";
  at: string;
  saved: number[];
  pending: number[];
  problems: string[];
}

const LABEL: Record<Game, string> = { lotto: "로또", pension: "연금복권" };

function fmt(at: string) {
  try {
    return new Date(at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return at;
  }
}

/** 당첨번호 자동 가져오기 상태(실패 시 모두에게 표시) + 관리자 '지금 가져오기' */
export function DrawSyncPanel({ game, onSynced }: { game: Game; onSynced?: () => void }) {
  const isAdmin = useIsAdmin();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/sync-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setStatus(j?.statuses?.[game] ?? null))
      .catch(() => {});
  }, [game]);

  useEffect(load, [load]);

  const runNow = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/sync-draws?game=${game}`, { method: "POST" });
      const j = await res.json();
      const r = j?.results?.[0];
      if (!res.ok || !r) setMsg({ ok: false, text: j?.error ?? "가져오기 실패" });
      else if (r.status === "error") setMsg({ ok: false, text: r.problems?.[0] ?? "가져오기 실패" });
      else if (r.saved.length) setMsg({ ok: true, text: `${r.saved.join(", ")}회 저장됨` });
      else if (r.status === "pending") setMsg({ ok: true, text: `${r.pending[0]}회는 아직 발표 전이에요` });
      else setMsg({ ok: true, text: "이미 최신이에요" });
      load();
      onSynced?.();
    } catch {
      setMsg({ ok: false, text: "네트워크 오류" });
    } finally {
      setBusy(false);
    }
  };

  const failed = status?.status === "error";
  if (!failed && !isAdmin) return null;

  return (
    <div className="w-full flex flex-col items-center gap-1 text-xs">
      {failed && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-300">
          {LABEL[game]} 당첨번호 자동 가져오기 실패 ({fmt(status!.at)}){status!.problems[0] ? `: ${status!.problems[0]}` : ""}
        </p>
      )}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runNow}
            disabled={busy}
            className="rounded-lg bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {busy ? "가져오는 중…" : `${LABEL[game]} 당첨번호 지금 가져오기`}
          </button>
          {status && !failed && (
            <span className="text-slate-400">
              마지막 {fmt(status.at)} · {status.status === "pending" ? "발표 대기" : "정상"}
            </span>
          )}
        </div>
      )}
      {msg && <p className={msg.ok ? "text-emerald-300" : "text-red-300"}>{msg.text}</p>}
    </div>
  );
}
