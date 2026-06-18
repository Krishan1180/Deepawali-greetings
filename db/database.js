const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'market.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    buy_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    buy_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    added_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
