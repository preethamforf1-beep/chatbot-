import {
  addAttendance as addAttendanceRecord,
  getAttendanceAll,
  getAttendanceByEmployee
} from '../db/repository.js';

function addAttendance(record) {
  return addAttendanceRecord(record);
}

function getAll() {
  return getAttendanceAll();
}

function getByEmployee(employeeId) {
  return getAttendanceByEmployee(employeeId);
}

export { addAttendance, getAll, getByEmployee };
