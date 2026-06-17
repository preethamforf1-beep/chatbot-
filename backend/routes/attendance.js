// Attendance Routes - handles attendance records
import express from 'express';
import jwt from 'jsonwebtoken';
import { getEmployeeById } from '../db/repository.js';
import { addAttendance, getAll, getByEmployee } from '../data/attendance.js';

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
const ATTENDANCE_API_KEY = process.env.ATTENDANCE_API_KEY || 'demo_attendance_key';

function verifyRequest(req, res, next) {
  // Allow either an API key (x-api-key) or a Bearer JWT
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === ATTENDANCE_API_KEY) return next();

  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ success: false, message: 'No auth provided' });
  const token = auth.split(' ')[1];
  try {
    jwt.verify(token, ACCESS_TOKEN_SECRET);
    return next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}

// POST /api/attendance - create attendance record
// Body: { employeeId, timestamp, type: 'checkin'|'checkout', confidence, source }
router.post('/', verifyRequest, (req, res) => {
  const { employeeId, timestamp, type, confidence, source } = req.body;
  if (!employeeId || !timestamp || !type) {
    return res.status(400).json({ success: false, message: 'employeeId, timestamp and type are required' });
  }

  const employee = getEmployeeById(employeeId);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const record = addAttendance({ employeeId, timestamp, type, confidence: confidence || 0, source: source || 'manual' });
  return res.json({ success: true, data: record });
});

// GET /api/attendance - list all attendance (protected)
router.get('/', verifyRequest, (req, res) => {
  res.json({ success: true, data: getAll() });
});

// GET /api/attendance/employee/:id - get attendance for an employee
router.get('/employee/:id', verifyRequest, (req, res) => {
  const id = req.params.id;
  const employee = getEmployeeById(id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, data: getByEmployee(id) });
});

export default router;
