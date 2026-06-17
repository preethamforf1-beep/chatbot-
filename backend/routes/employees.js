// Employee Routes API
// Endpoints: GET /api/employees, GET /api/employees/:id, etc.

import express from 'express';
import { getEmployeeById, getEmployees } from '../db/repository.js';

const router = express.Router();

// GET employee certificates
// Usage: GET http://localhost:5000/api/employees/EMP001/certificates
router.get('/:id/certificates', (req, res) => {
  const employee = getEmployeeById(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  res.json({ success: true, employeeId: req.params.id, employeeName: employee.name, certificates: employee.certificates });
});

// GET employee Form16
// Usage: GET http://localhost:5000/api/employees/EMP001/form16
router.get('/:id/form16', (req, res) => {
  const employee = getEmployeeById(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  res.json({ success: true, employeeId: req.params.id, employeeName: employee.name, form16: employee.form16 });
});

// GET specific employee by ID
// Usage: GET http://localhost:5000/api/employees/EMP001
router.get('/:id', (req, res) => {
  const employee = getEmployeeById(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  res.json({ success: true, data: employee });
});

// GET all employees
// Usage: GET http://localhost:5000/api/employees
router.get('/', (req, res) => {
  const employees = getEmployees();
  console.log('Fetching all employees...');
  res.json({ success: true, count: employees.length, data: employees });
});

export default router;
