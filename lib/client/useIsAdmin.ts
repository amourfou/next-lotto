"use client";

import { useEffect, useState } from "react";

/** /api/auth/me 로 관리자 여부를 확인 (화면 표시용, 실제 권한은 서버가 검사) */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setIsAdmin(!!j?.user?.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return isAdmin;
}
