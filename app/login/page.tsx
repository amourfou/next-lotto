"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, User } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("이름을 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "로그인에 실패했습니다.");
        return;
      }
      const from = searchParams.get("from");
      const dest =
        from && from.startsWith("/") && !from.startsWith("//") ? from : "/lotto";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-900/30">
            <User className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            로또 번호 뽑기
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            등록된 이름을 입력하면 접속할 수 있습니다
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-600/50 bg-slate-800/60 p-6 shadow-xl backdrop-blur"
        >
          <label
            htmlFor="login-name"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            이름
          </label>
          <input
            id="login-name"
            type="text"
            autoComplete="username"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="등록된 이름 입력"
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60"
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 border border-red-500/30"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {isLoading ? "확인 중…" : "입장하기"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          등록된 이름만 입장할 수 있습니다
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-slate-400 text-sm">
          로딩 중…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
