import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let isInMemory = false;

// In-Memory store for Serverless (Vercel) environments
const memoryStore = {
  users: [],
  incidents: [],
  agent_executions: []
};

// Seed default demo user in memory store
const defaultSalt = bcrypt.genSaltSync(10);
const defaultPasswordHash = bcrypt.hashSync('sentinel2025', defaultSalt);
memoryStore.users.push({
  id: 1,
  username: 'SRE_Commander',
  email: 'sre@sentinel.ai',
  password: defaultPasswordHash,
  role: 'Lead Staff SRE',
  created_at: new Date().toISOString()
});

try {
  // Dynamically attempt to load better-sqlite3 (Works in full Node.js environments)
  const Database = (await import('better-sqlite3')).default;
  const dbPath = path.resolve(__dirname, '../../ops_sentinel.db');
  db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {
    // Ignore pragma error if unsupported
  }
} catch (err) {
  isInMemory = true;
  console.log('[OpsSentinel DB] Running in Serverless/In-Memory Mode (Vercel)');
}

// In-memory query simulator matching better-sqlite3 API
const inMemoryDb = {
  exec: (sql) => {},
  pragma: () => {},
  prepare: (sql) => {
    const trimmed = sql.trim().toUpperCase();

    return {
      run: (...params) => {
        if (trimmed.startsWith('INSERT INTO USERS')) {
          const [username, email, password, role] = params;
          const id = memoryStore.users.length + 1;
          memoryStore.users.push({ id, username, email, password, role, created_at: new Date().toISOString() });
          return { lastInsertRowid: id };
        }

        if (trimmed.startsWith('INSERT INTO INCIDENTS')) {
          const [incident_code, title, severity, service, status, error_logs, git_diff, initial_metrics] = params;
          const id = memoryStore.incidents.length + 1;
          const newIncident = {
            id,
            incident_code,
            title,
            severity,
            service,
            status,
            error_logs,
            git_diff,
            initial_metrics,
            created_at: new Date().toISOString()
          };
          memoryStore.incidents.push(newIncident);
          return { lastInsertRowid: id };
        }

        if (trimmed.startsWith('UPDATE INCIDENTS SET PROPOSED_COMMAND')) {
          const [proposed_command, blast_radius, confidence_score, id] = params;
          const inc = memoryStore.incidents.find(i => i.id === Number(id));
          if (inc) {
            inc.proposed_command = proposed_command;
            inc.blast_radius = blast_radius;
            inc.confidence_score = confidence_score;
          }
          return { changes: 1 };
        }

        if (trimmed.startsWith('UPDATE INCIDENTS SET STATUS = \'RESOLVED\'') || trimmed.includes('STATUS = ?')) {
          const [final_metrics, rca_markdown, id] = params;
          const inc = memoryStore.incidents.find(i => i.id === Number(id));
          if (inc) {
            inc.status = 'RESOLVED';
            inc.final_metrics = final_metrics;
            inc.rca_markdown = rca_markdown;
            inc.resolved_at = new Date().toISOString();
          }
          return { changes: 1 };
        }

        if (trimmed.startsWith('UPDATE INCIDENTS SET STATUS')) {
          const id = params[params.length - 1];
          const inc = memoryStore.incidents.find(i => i.id === Number(id));
          if (inc) {
            if (trimmed.includes('REJECTED')) inc.status = 'REJECTED';
            else if (trimmed.includes('RESOLVING')) inc.status = 'RESOLVING';
          }
          return { changes: 1 };
        }

        if (trimmed.startsWith('INSERT INTO AGENT_EXECUTIONS')) {
          const [incident_id, stage, agent_name, status, input_payload, output_payload] = params;
          const id = memoryStore.agent_executions.length + 1;
          memoryStore.agent_executions.push({
            id,
            incident_id: Number(incident_id),
            stage,
            agent_name,
            status,
            input_payload,
            output_payload,
            executed_at: new Date().toISOString()
          });
          return { lastInsertRowid: id };
        }

        return { lastInsertRowid: 1, changes: 1 };
      },

      get: (...params) => {
        if (trimmed.startsWith('SELECT ID FROM USERS WHERE EMAIL = ?')) {
          return memoryStore.users.find(u => u.email === params[0]);
        }

        if (trimmed.startsWith('SELECT ID, USERNAME, EMAIL, ROLE FROM USERS') || trimmed.startsWith('SELECT ID, USERNAME, EMAIL, ROLE, CREATED_AT FROM USERS WHERE ID = ?')) {
          const user = memoryStore.users.find(u => u.id === Number(params[0]));
          if (user) {
            const { password, ...safeUser } = user;
            return safeUser;
          }
          return undefined;
        }

        if (trimmed.includes('FROM USERS WHERE EMAIL = ? OR USERNAME = ?')) {
          const [identifier] = params;
          return memoryStore.users.find(u => u.email === identifier || u.username === identifier);
        }

        if (trimmed.startsWith('SELECT * FROM INCIDENTS WHERE ID = ?')) {
          return memoryStore.incidents.find(i => i.id === Number(params[0]));
        }

        return undefined;
      },

      all: (...params) => {
        if (trimmed.startsWith('SELECT ID, INCIDENT_CODE, TITLE, SEVERITY, SERVICE, STATUS, CONFIDENCE_SCORE, CREATED_AT, RESOLVED_AT FROM INCIDENTS')) {
          return [...memoryStore.incidents].reverse().slice(0, 25);
        }

        if (trimmed.startsWith('SELECT * FROM AGENT_EXECUTIONS WHERE INCIDENT_ID = ?')) {
          return memoryStore.agent_executions.filter(e => e.incident_id === Number(params[0]));
        }

        return [];
      }
    };
  }
};

const activeDb = isInMemory || !db ? inMemoryDb : db;

export function initDatabase() {
  if (isInMemory || !db) {
    console.log('[OpsSentinel DB] In-Memory / Serverless Store Active.');
    return;
  }

  // SQLite Initialization
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Site Reliability Engineer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      service TEXT NOT NULL,
      status TEXT NOT NULL,
      error_logs TEXT,
      git_diff TEXT,
      initial_metrics TEXT,
      final_metrics TEXT,
      proposed_command TEXT,
      blast_radius TEXT,
      confidence_score REAL,
      rca_markdown TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS agent_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      status TEXT NOT NULL,
      input_payload TEXT,
      output_payload TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
    );
  `);

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('sre@sentinel.ai');
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('sentinel2025', salt);
    db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('SRE_Commander', 'sre@sentinel.ai', hashedPassword, 'Lead Staff SRE');
  }

  console.log('[OpsSentinel DB] SQLite Database initialized & tables verified.');
}

export default activeDb;
