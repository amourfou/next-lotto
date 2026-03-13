-- Supabase 로또 테이블 스키마 (참고: HaanRiver public 스키마 방식)
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 로또 회차 테이블 + 인덱스
CREATE TABLE IF NOT EXISTS lotto_rounds (
  round INTEGER PRIMARY KEY,
  n1 INTEGER NOT NULL,
  n2 INTEGER NOT NULL,
  n3 INTEGER NOT NULL,
  n4 INTEGER NOT NULL,
  n5 INTEGER NOT NULL,
  n6 INTEGER NOT NULL,
  bonus INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lotto_rounds_round ON lotto_rounds(round);

-- 2. 로또 분석 결과 테이블 (단일 행, id=1) — PK만 있음
CREATE TABLE IF NOT EXISTS lotto_analysis (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 로또 뽑기 설정 테이블 + 인덱스
CREATE TABLE IF NOT EXISTS lotto_draw_settings (
  id SERIAL PRIMARY KEY,
  game_count INTEGER NOT NULL,
  filter_states TEXT NOT NULL,
  group_counts TEXT NOT NULL,
  group_enabled TEXT NOT NULL,
  group_at_most TEXT NOT NULL,
  pattern_settings TEXT DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_settings_id ON lotto_draw_settings(id DESC);

-- 4. 로또 메타 (당첨/과거추출 구분용)
CREATE TABLE IF NOT EXISTS lotto_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE lotto_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for lotto_meta" ON lotto_meta FOR ALL USING (true) WITH CHECK (true);

-- 5. 연금복권 회차 테이블 + 인덱스 (회차, 조, 6자리번호, 보너스 6자리)
CREATE TABLE IF NOT EXISTS pension_lottery_rounds (
  order_num INTEGER PRIMARY KEY,
  jo INTEGER NOT NULL,
  d1 INTEGER NOT NULL,
  d2 INTEGER NOT NULL,
  d3 INTEGER NOT NULL,
  d4 INTEGER NOT NULL,
  d5 INTEGER NOT NULL,
  d6 INTEGER NOT NULL,
  b1 INTEGER NOT NULL,
  b2 INTEGER NOT NULL,
  b3 INTEGER NOT NULL,
  b4 INTEGER NOT NULL,
  b5 INTEGER NOT NULL,
  b6 INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pension_lottery_rounds_order ON pension_lottery_rounds(order_num DESC);

-- 6. RLS 설정 (선택: 공개 읽기/쓰기 허용)
ALTER TABLE lotto_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotto_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotto_draw_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pension_lottery_rounds ENABLE ROW LEVEL SECURITY;

-- 7. 정책: 모든 작업 허용 (anon key로 접근 가능, HaanRiver 방식)
CREATE POLICY "Enable all for lotto_rounds" ON lotto_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for lotto_analysis" ON lotto_analysis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for lotto_draw_settings" ON lotto_draw_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for pension_lottery_rounds" ON pension_lottery_rounds FOR ALL USING (true) WITH CHECK (true);
