// Leave Requests Routes
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getEmployeeById,
  getLeaveRequests,
  getLeaveRequestByCode,
  addLeaveRequest,
  approveLeaveRequest,
  cancelLeaveRequest
} from '../db/repository.js';

const router = express.Router();
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  try {
    req.session = jwt.verify(token, ACCESS_TOKEN_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireAdminOrHR(req, res, next) {
  const role = req.session?.role;
  if (role === 'admin' || role === 'hr') return next();
  return res.status(403).json({ success: false, message: 'Admin or HR access required' });
}

// GET /api/leaves - list leave requests
router.get('/', verifyToken, (req, res) => {
  const session = req.session;
  const requests = ['admin', 'hr'].includes(session.role)
    ? getLeaveRequests()
    : getLeaveRequests(session.employeeId);

  return res.json({ success: true, count: requests.length, data: requests });
});

// GET /api/leaves/:code - get a leave request by code
router.get('/:code', verifyToken, (req, res) => {
  const request = getLeaveRequestByCode(req.params.code);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  const session = req.session;
  if (request.employeeId !== session.employeeId && !['admin', 'hr'].includes(session.role)) {
    return res.status(403).json({ success: false, message: 'Access denied to this leave request' });
  }

  return res.json({ success: true, data: request });
});

// POST /api/leaves - create a new leave request
router.post('/', verifyToken, (req, res) => {
  const session = req.session;
  const { leaveType, leaveDate, dayType, reason } = req.body;

  if (!leaveType || !leaveDate || !dayType) {
    return res.status(400).json({
      success: false,
      message: 'leaveType, leaveDate, and dayType are required'
    });
  }

  const employee = getEmployeeById(session.employeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  const request = addLeaveRequest({
    employeeId: session.employeeId,
    leaveType,
    leaveDate,
    dayType,
    reason: reason || ''
  });

  return res.status(201).json({ success: true, message: 'Leave request created', data: request });
});

// PATCH /api/leaves/:code/approve - approve a pending leave request
router.patch('/:code/approve', verifyToken, requireAdminOrHR, (req, res) => {
  const request = getLeaveRequestByCode(req.params.code);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Only pending requests can be approved' });
  }

  const approvedRequest = approveLeaveRequest(request.requestCode, req.session.userId);
  return res.json({ success: true, message: 'Leave request approved', data: approvedRequest });
});

// PATCH /api/leaves/:code/cancel - cancel a pending leave request
router.patch('/:code/cancel', verifyToken, (req, res) => {
  const request = getLeaveRequestByCode(req.params.code);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  const session = req.session;
  const isOwner = request.employeeId === session.employeeId;
  const isAdminOrHR = ['admin', 'hr'].includes(session.role);

  if (!isOwner && !isAdminOrHR) {
    return res.status(403).json({ success: false, message: 'You may only cancel your own leave requests' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Only pending leave requests can be cancelled' });
  }

  const cancelledRequest = cancelLeaveRequest(request.requestCode);
  return res.json({ success: true, message: 'Leave request cancelled', data: cancelledRequest });
});

export default router;
