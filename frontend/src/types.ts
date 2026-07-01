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

// A tappable button the bot can attach under a message. `send` is the text
// submitted to the bot (as if the user typed it) when the button is tapped.
export interface ChatAction {
  label: string;
  send: string;
}

// An interactive control the bot can render inside a message, used by the
// guided leave flow. `type` decides which control the widget shows:
//   'date'       → a date picker (asks for start or end date)
//   'leaveTypes' → one button per leave type, each with its balance
export interface ChatLeaveTypeOption {
  code: string;        // e.g. "CL"
  name: string;        // e.g. "Casual Leave"
  balance: number | null;   // remaining days, or null if not initialised
}

export interface ChatWidget {
  type: 'date' | 'leaveTypes';
  step?: string;                       // which flow step this widget is for
  minDate?: string;                    // for 'date': earliest selectable (YYYY-MM-DD)
  options?: ChatLeaveTypeOption[];     // for 'leaveTypes': the choices
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  actions?: ChatAction[];
  widget?: ChatWidget;
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