export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-100 p-6 text-center">
      <p className="text-amber-400 text-lg font-semibold">오프라인</p>
      <p className="text-slate-400 text-sm max-w-xs">
        네트워크에 연결되지 않았습니다. 연결 후 다시 시도해 주세요.
      </p>
    </main>
  );
}
