-- 추출 번호 저장용 테이블: "다음 회차용"으로 여러 게임을 한 회차에 저장
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- (기존 lotto_rounds는 당첨 번호 전용, 추출 번호는 이 테이블에만 저장)

CREATE TABLE IF NOT EXISTS lotto_drawn (
  round INTEGER NOT NULL,
  game_index INTEGER NOT NULL,
  n1 INTEGER NOT NULL,
  n2 INTEGER NOT NULL,
  n3 INTEGER NOT NULL,
  n4 INTEGER NOT NULL,
  n5 INTEGER NOT NULL,
  n6 INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (round, game_index)
);
CREATE INDEX IF NOT EXISTS idx_lotto_drawn_round ON lotto_drawn(round);

ALTER TABLE lotto_drawn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for lotto_drawn" ON lotto_drawn FOR ALL USING (true) WITH CHECK (true);
