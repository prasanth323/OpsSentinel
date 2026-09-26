import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store database in the server root
const dbPath = path.resolve(__dirname, '../../ops_sentinel.db');
const db = new Database(dbPath);

// Enable WAL mode for optimal concurrent performance
db.pragma('journal_mode = WAL');

export function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Site Reliability Engineer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Incidents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      service TEXT NOT NULL,
      status TEXT NOT NULL, -- PENDING_APPROVAL, RESOLVING, RESOLVED, REJECTED
      error_logs TEXT,
      git_diff TEXT,
      initial_metrics TEXT, -- JSON string
      final_metrics TEXT,   -- JSON string
      proposed_command TEXT,
      blast_radius TEXT,
      confidence_score REAL,
      rca_markdown TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );
  `);

  // 3. Agent Executions Trace Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      status TEXT NOT NULL, -- COMPLETED, FAILED, RUNNING
      input_payload TEXT,
      output_payload TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
    );
  `);

  // Seed default demo SRE user if none exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('sre@sentinel.ai');
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('sentinel2025', salt);
    db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('SRE_Commander', 'sre@sentinel.ai', hashedPassword, 'Lead Staff SRE');
    console.log('[OpsSentinel DB] Seeded default SRE account: sre@sentinel.ai / sentinel2025');
  }

  console.log('[OpsSentinel DB] SQLite Database initialized & tables verified.');
}

export default db;
