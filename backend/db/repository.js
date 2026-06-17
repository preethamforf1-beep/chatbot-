import { db } from './database.js';

function normalizeUser(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    employeeId: row.employee_id,
    email: row.email,
    password: row.password,
    role: row.role,
    name: row.name
  };
}

function normalizeEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.id,
    name: row.name,
    email: row.email,
    department: row.department,
    designation: row.designation,
    salary: row.salary,
    join_date: row.join_date,
    certificates: JSON.parse(row.certificates_json || '[]'),
    form16: {
      year: row.form16_year,
      baseSalary: row.form16_base_salary,
      deductions: row.form16_deductions,
      tax: row.form16_tax,
      downloadUrl: row.form16_download_url
    }
  };
}

function normalizeLeave(row) {
  if (!row) return null;
  return {
    id: row.id,
    requestCode: row.request_code,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    type: row.leave_type,
    leaveDate: row.leave_date,
    date: row.leave_date,
    dayType: row.day_type,
    reason: row.reason,
    status: row.status || 'pending',
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at
  };
}

function normalizeAttendance(row) {
  if (!row) return null;
  return {
    id: row.id,
    attendanceCode: row.attendance_code,
    employeeId: row.employee_id,
    timestamp: row.event_timestamp,
    type: row.type,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at
  };
}

// ===== AUTHENTICATION GATEWAYS =====
export function getUserByEmailAndPassword(email, password) {
  if (!email || !password) return null;
  const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email.toLowerCase());
  if (!row || row.password !== password) return null;
  return normalizeUser(row);
}

export function getUserByUserId(userId) {
  const row = db.prepare('SELECT * FROM users WHERE user_id = ?').get(String(userId));
  return normalizeUser(row);
}

export function getUsers() {
  const rows = db.prepare('SELECT * FROM users ORDER BY name').all();
  if (rows.length > 0) return rows.map(normalizeUser);
  return [];
}

// ===== EMPLOYEES LIFECYCLE CONTROLLER =====
export function getEmployees() {
  const rows = db.prepare('SELECT * FROM employees ORDER BY name').all();
  return rows.map(normalizeEmployee);
}

export function getEmployeeById(id) {
  const row = db.prepare('SELECT * FROM employees WHERE id = ? OR employeeId = ?').get(id, id);
  return normalizeEmployee(row);
}

// ===== LEAVE OPERATIONS & SYNTAX MATCHER =====
export function getLeaveRequests(employeeId = null) {
  if (employeeId) {
    const rows = db.prepare('SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY created_at DESC').all(employeeId);
    return rows.map(normalizeLeave);
  }

  const rows = db.prepare('SELECT * FROM leave_requests ORDER BY created_at DESC').all();
  return rows.map(normalizeLeave);
}

export function getLeaveRequestByCode(code) {
  const row = db.prepare('SELECT * FROM leave_requests WHERE request_code = ? OR id = ?').get(code, code);
  return normalizeLeave(row);
}

export function addLeaveRequest(request) {
  const requestCode = `LV-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO leave_requests (
      request_code, employee_id, leave_type, leave_date, day_type, reason, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    requestCode,
    request.employeeId,
    request.leaveType,
    request.leaveDate,
    request.dayType,
    request.reason || '',
    'pending'
  );
  return getLeaveRequestByCode(requestCode);
}

export function approveLeaveRequest(code, approvedBy = null) {
  db.prepare(`
    UPDATE leave_requests
    SET status = 'approved', approved_by = ?, approved_at = datetime('now')
    WHERE request_code = ? OR id = ?
  `).run(approvedBy, code, code);
  return getLeaveRequestByCode(code);
}

export function cancelLeaveRequest(code) {
  db.prepare(`
    UPDATE leave_requests
    SET status = 'cancelled', cancelled_at = datetime('now')
    WHERE request_code = ? OR id = ?
  `).run(code, code);
  return getLeaveRequestByCode(code);
}

// ===== ATTENDANCE ENGINE =====
export function getAttendanceAll() {
  const rows = db.prepare('SELECT * FROM attendance ORDER BY event_timestamp DESC').all();
  return rows.map(normalizeAttendance);
}

export function getAttendanceByEmployee(empId) {
  const rows = db.prepare('SELECT * FROM attendance WHERE employee_id = ? ORDER BY event_timestamp DESC').all(empId);
  return rows.map(normalizeAttendance);
}

export function addAttendance(record) {
  const attendanceCode = `AT-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO attendance (
      attendance_code, employee_id, event_timestamp, type, confidence, source
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    attendanceCode,
    record.employeeId,
    record.timestamp,
    record.type,
    record.confidence || 0,
    record.source || 'manual'
  );
  return getAttendanceByEmployee(record.employeeId).find(item => item.attendanceCode === attendanceCode);
}

// ===== PORTAL CORE SUMMARY DATA PACK =====
export function getCompanyData() {
  const holidays = db.prepare('SELECT * FROM holidays ORDER BY date').all();
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY date DESC').all();
  const policies = {};
  const portalGuide = {};
  const supportTeam = { issues: [] };

  db.prepare('SELECT * FROM policies').all().forEach(row => {
    policies[row.key] = row.value;
  });

  db.prepare('SELECT * FROM portal_guide').all().forEach(row => {
    portalGuide[row.section] = row.description;
  });

  db.prepare('SELECT * FROM support_config').all().forEach(row => {
    supportTeam[row.key] = row.value;
  });

  supportTeam.issues = db.prepare('SELECT issue FROM support_issues ORDER BY id').all().map(row => row.issue);

  return {
    holidays,
    announcements,
    policies,
    portalGuide,
    supportTeam
  };
}

export function getPayrollSummary() {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS employeeCount,
      COALESCE(SUM(salary), 0) AS totalPayroll,
      COALESCE(MAX(salary), 0) AS highestSalary
    FROM employees
  `).get();

  const averageSalary = row.employeeCount > 0 ? Math.round(row.totalPayroll / row.employeeCount) : 0;
  return {
    totalPayroll: row.totalPayroll,
    averageSalary,
    highestSalary: row.highestSalary,
    employeeCount: row.employeeCount
  };
}

export function addRefreshToken(token) {
  db.prepare('INSERT OR IGNORE INTO refresh_tokens (token) VALUES (?)').run(token);
}

export function removeRefreshToken(token) {
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
}

export function hasRefreshToken(token) {
  const row = db.prepare('SELECT token FROM refresh_tokens WHERE token = ?').get(token);
  return !!row;
}
