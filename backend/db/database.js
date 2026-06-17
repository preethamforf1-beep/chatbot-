import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { employees as seedEmployeesData } from '../data/seed/employees.seed.js';
import { users as seedUsersData } from '../data/seed/users.seed.js';
import { companyData as seedCompanyDataData } from '../data/seed/companyData.seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDbPath = path.join(__dirname, '..', 'data', 'hrms.sqlite');
const dbPath = process.env.DB_PATH || defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

let initialized = false;

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      join_date TEXT NOT NULL,
      salary INTEGER NOT NULL,
      certificates_json TEXT NOT NULL DEFAULT '[]',
      form16_year INTEGER,
      form16_base_salary INTEGER,
      form16_deductions INTEGER,
      form16_tax INTEGER,
      form16_download_url TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_code TEXT UNIQUE,
      employee_id TEXT NOT NULL,
      event_timestamp TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('checkin', 'checkout')),
      confidence REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE,
      employee_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      leave_date TEXT NOT NULL,
      day_type TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'cancelled')) DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS policies (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portal_guide (
      section TEXT PRIMARY KEY,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue TEXT NOT NULL UNIQUE
    );
  `);
}

function seedEmployees() {
  const count = db.prepare('SELECT COUNT(1) AS count FROM employees').get().count;
  if (count > 0) return;

  const insertEmployee = db.prepare(`
    INSERT OR IGNORE INTO employees (
      id, name, email, department, designation, join_date, salary,
      certificates_json, form16_year, form16_base_salary, form16_deductions,
      form16_tax, form16_download_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const employee of seedEmployeesData) {
      insertEmployee.run(
        employee.id,
        employee.name,
        employee.email,
        employee.department,
        employee.designation,
        employee.joinDate,
        employee.salary,
        JSON.stringify(employee.certificates || []),
        employee.form16?.year || null,
        employee.form16?.baseSalary || null,
        employee.form16?.deductions || null,
        employee.form16?.tax || null,
        employee.form16?.downloadUrl || null
      );
    }
  });

  tx();
}

function seedUsers() {
  const count = db.prepare('SELECT COUNT(1) AS count FROM users').get().count;
  if (count > 0) return;

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (user_id, employee_id, email, password, role, name)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const user of seedUsersData) {
      insertUser.run(
        user.userId,
        user.employeeId,
        user.email,
        user.password,
        user.role,
        user.name
      );
    }
  });

  tx();
}

function seedCompanyData() {
  const holidayCount = db.prepare('SELECT COUNT(1) AS count FROM holidays').get().count;
  if (holidayCount === 0) {
    const insertHoliday = db.prepare('INSERT OR IGNORE INTO holidays (date, name, type) VALUES (?, ?, ?)');
    const tx = db.transaction(() => {
      for (const holiday of seedCompanyDataData.holidays || []) {
        insertHoliday.run(holiday.date, holiday.name, holiday.type);
      }
    });
    tx();
  }

  const announcementCount = db.prepare('SELECT COUNT(1) AS count FROM announcements').get().count;
  if (announcementCount === 0) {
    const insertAnnouncement = db.prepare('INSERT OR IGNORE INTO announcements (id, date, title, message) VALUES (?, ?, ?, ?)');
    const tx = db.transaction(() => {
      for (const announcement of seedCompanyDataData.announcements || []) {
        insertAnnouncement.run(announcement.id, announcement.date, announcement.title, announcement.message);
      }
    });
    tx();
  }

  const policyCount = db.prepare('SELECT COUNT(1) AS count FROM policies').get().count;
  if (policyCount === 0) {
    const insertPolicy = db.prepare('INSERT OR IGNORE INTO policies (key, value) VALUES (?, ?)');
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(seedCompanyDataData.policies || {})) {
        insertPolicy.run(key, value);
      }
    });
    tx();
  }

  const guideCount = db.prepare('SELECT COUNT(1) AS count FROM portal_guide').get().count;
  if (guideCount === 0) {
    const insertGuide = db.prepare('INSERT OR IGNORE INTO portal_guide (section, description) VALUES (?, ?)');
    const tx = db.transaction(() => {
      for (const [section, description] of Object.entries(seedCompanyDataData.portalGuide || {})) {
        insertGuide.run(section, description);
      }
    });
    tx();
  }

  const supportConfigCount = db.prepare('SELECT COUNT(1) AS count FROM support_config').get().count;
  if (supportConfigCount === 0) {
    const supportConfig = seedCompanyDataData.supportTeam || {};
    const insertConfig = db.prepare('INSERT OR IGNORE INTO support_config (key, value) VALUES (?, ?)');
    insertConfig.run('email', supportConfig.email || 'it-support@company.com');
    insertConfig.run('phone', supportConfig.phone || '');
    insertConfig.run('hours', supportConfig.hours || '');
  }

  const supportIssueCount = db.prepare('SELECT COUNT(1) AS count FROM support_issues').get().count;
  if (supportIssueCount === 0) {
    const insertIssue = db.prepare('INSERT OR IGNORE INTO support_issues (issue) VALUES (?)');
    const tx = db.transaction(() => {
      for (const issue of seedCompanyDataData.supportTeam?.issues || []) {
        insertIssue.run(issue);
      }
    });
    tx();
  }
}

function seedRefreshTokensFromFile() {
  const tokenCount = db.prepare('SELECT COUNT(1) AS count FROM refresh_tokens').get().count;
  if (tokenCount > 0) return;

  const refreshTokensPath = path.join(__dirname, '..', 'data', 'refreshTokens.json');
  if (!fs.existsSync(refreshTokensPath)) return;

  try {
    const raw = fs.readFileSync(refreshTokensPath, 'utf8');
    const tokens = JSON.parse(raw || '[]');

    if (!Array.isArray(tokens) || tokens.length === 0) return;

    const insertToken = db.prepare('INSERT OR IGNORE INTO refresh_tokens (token, user_id) VALUES (?, NULL)');
    const tx = db.transaction(() => {
      for (const token of tokens) {
        if (typeof token === 'string' && token.trim()) {
          insertToken.run(token);
        }
      }
    });
    tx();
  } catch (error) {
    console.error('Failed to seed refresh tokens from JSON:', error.message);
  }
}

function initializeDatabase() {
  if (initialized) return;
  createSchema();
  seedEmployees();
  seedUsers();
  seedCompanyData();
  seedRefreshTokensFromFile();
  initialized = true;
}

initializeDatabase();

export { db, initializeDatabase };
