-- 기존 프로젝트에 lotto_meta 테이블이 없을 때 한 번만 실행하세요.
-- Supabase 대시보드 → SQL Editor → 새 쿼리 → 아래 붙여넣기 → Run

CREATE TABLE IF NOT EXISTS lotto_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE lotto_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for lotto_meta" ON lotto_meta FOR ALL USING (true) WITH CHECK (true);
