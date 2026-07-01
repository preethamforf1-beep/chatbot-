export interface User {
  userId?: string;
  employeeId?: string;
  name: string;
  email?: string;
  role: 'admin' | 'hr' | 'employee';
}

export interface Certificate {
  name: string;
}

export interface Form16 {
  year?: number;
  baseSalary?: number;
  deductions: number;
  tax: number;
  downloadUrl?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  salary: number;
  joinDate: string;
  certificates: Certificate[];
  form16: Form16;
}

export interface LeaveRequest {
  requestCode: string;
  employeeId: string;
  leaveType: string;
  leaveDate?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  dayType: string;
  reason?: string;
  status: 'pending' | 'approved' | 'cancelled' | 'partially_cancelled';
  createdAt: string;
  approvedAt?: string;
  cancelledAt?: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface PayrollSummary {
  totalPayroll: number;
  averageSalary: number;
  highestSalary: number;
  employeeCount?: number;
}

export interface DashboardStats {
  totalEmployees: number;
  payroll: PayrollSummary;
}
