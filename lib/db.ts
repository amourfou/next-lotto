import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lotto.db");

let db: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS lotto_rounds (
      round INTEGER PRIMARY KEY,
      n1 INTEGER NOT NULL,
      n2 INTEGER NOT NULL,
      n3 INTEGER NOT NULL,
      n4 INTEGER NOT NULL,
      n5 INTEGER NOT NULL,
      n6 INTEGER NOT NULL,
      bonus INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_lotto_rounds_round ON lotto_rounds(round);
    CREATE TABLE IF NOT EXISTS lotto_analysis (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lotto_draw_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_count INTEGER NOT NULL,
      filter_states TEXT NOT NULL,
      group_counts TEXT NOT NULL,
      group_enabled TEXT NOT NULL,
      group_at_most TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE lotto_draw_settings ADD COLUMN pattern_settings TEXT DEFAULT '{}'");
  } catch {
    // column already exists
  }
  return db;
}

export type LottoRoundRow = {
  round: number;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
  bonus: number;
  created_at?: string;
};

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
