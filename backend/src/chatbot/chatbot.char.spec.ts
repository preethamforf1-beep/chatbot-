import 'reflect-metadata';
import * as assert from 'assert/strict';
import { ChatbotService } from './chatbot.service';

// ── Mock data ─────────────────────────────────────────────────────────────────

const EMPLOYEES = [
  {
    id: 'EMP001', name: 'Alice', department: 'IT', designation: 'Engineer',
    salary: 80000, join_date: '2020-01-01', certificates_json: null,
    form16_year: 2023, form16_base_salary: 80000, form16_deductions: 5000,
    form16_tax: 10000, form16_download_url: '',
  },
  {
    id: 'EMP002', name: 'Bob', department: 'HR', designation: 'Manager',
    salary: 90000, join_date: '2019-06-01', certificates_json: null,
    form16_year: 2023, form16_base_salary: 90000, form16_deductions: 6000,
    form16_tax: 12000, form16_download_url: '',
  },
];

const COMPANY_DATA = {
  holidays: [
    { date: '2026-01-26', name: 'Republic Day' },
    { date: '2026-08-15', name: 'Independence Day' },
  ],
  announcements: [{ date: '2026-06-01', title: 'Q2 Results' }],
};

const BALANCE = {
  CL:   { quota: 12,   used: 3, available: 9    },
  SICK: { quota: 6,    used: 1, available: 5    },
  EL:   { quota: 15,   used: 0, available: 15   },
  WFH:  { quota: 10,   used: 2, available: 8    },
  LOP:  { quota: null, used: 0, available: null  },
};

function makeDb() {
  return {
    getAllEmployees:           async () => EMPLOYEES,
    getCompanyData:           async () => COMPANY_DATA,
    getLeaveRequests:         async () => [],
    getLeaveBalance:          async () => BALANCE,
    cancelLeaveRequestByCode: async () => null,
    createLeaveRequest:       async () => ({}),
  } as any;
}

const configStub = { get: (_k: string) => undefined } as any;
const EMP_USER   = { employeeId: 'EMP001', name: 'Alice', role: 'employee' };
const ADMIN_USER = { employeeId: 'EMP002', name: 'Bob',   role: 'admin' };

function svc() { return new ChatbotService(makeDb(), configStub); }
async function gr(s: ChatbotService, message: string, user = EMP_USER): Promise<string> {
  return (s as any).generateResponse(message, user);
}

// ── Golden snapshots (must survive refactor unchanged) ────────────────────────

const GOLD = {
  // "help me" (not "who are you") — normalizeMessage corrupts short words like "who"→"hr"
  identity: `Hi Alice. I can answer questions about the portal, company holidays, announcements, office policies, today's date, and more. You can also apply or cancel leave requests through me.`,

  greeting: `Hello Alice. Hi Alice. I can answer questions about the portal, company holidays, announcements, office policies, today's date, and more. You can also apply or cancel leave requests through me.`,

  myDetails: `Profile summary:\nName: Alice\nID: EMP001\nRole: Engineer\nDepartment: IT`,

  mySalary: `How to view your salary details\n1. Open the Employees section from the top menu.\n2. Click your profile card.\n3. Open the Payroll tab inside your profile to view your current salary, deductions, and net pay.\n\nYour payroll records are private and visible only to you and HR/Admin.`,

  applyLeave: `Sure — I can help apply your leave.\n\nPlease send these details:\n- Leave type: EL / CL / LOP / etc.\n- Date or date range: 15 June or 15 June to 17 June\n- Day type: Full Day / First Half / Second Half\n- Reason: optional\n\nExample: "Apply CL for 15 June to 17 June, Full Day, reason: personal work".`,

  leaveBalance: `Your leave balance for this year:\n• CL: used 3/12, available 9\n• SICK: used 1/6, available 5\n• EL: used 0/15, available 15\n• WFH: used 2/10, available 8\n• LOP: used 0/Unlimited, available Unlimited\n\nTip: Use the Leave Requests page to apply for new leave, view pending requests, or cancel a request before approval.`,

  // "working hours" avoids the "off" substring in "office" triggering the holiday intent
  officeHours: `Office hours: Monday to Friday, 9:00 AM to 6:00 PM.`,

  fallback: `I didn't quite catch that. Try asking something like:\n- "How many leaves do I have left?"\n- "Apply CL for 15 June to 17 June"\n- "Cancel leave request LR-001"\n- "How do I download Form16?"`,
};

// ── Runner ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => { console.log(`  ✓ ${name}`); passed++; })
    .catch((e: Error) => { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; });
}

(async () => {
  console.log('\ngenerateResponse — characterization suite\n');

  await test('identity: "help me"', async () =>
    assert.equal(await gr(svc(), 'help me'), GOLD.identity));

  await test('greeting: "hello"', async () =>
    assert.equal(await gr(svc(), 'hello'), GOLD.greeting));

  await test('my details', async () =>
    assert.equal(await gr(svc(), 'my details'), GOLD.myDetails));

  await test('my salary', async () =>
    assert.equal(await gr(svc(), 'my salary'), GOLD.mySalary));

  await test('apply leave', async () =>
    assert.equal(await gr(svc(), 'apply leave'), GOLD.applyLeave));

  await test('leave balance: "my leave balance"', async () =>
    assert.equal(await gr(svc(), 'my leave balance'), GOLD.leaveBalance));

  await test('working hours', async () =>
    assert.equal(await gr(svc(), 'working hours'), GOLD.officeHours));

  await test('fallback: unrecognized input', async () =>
    assert.equal(await gr(svc(), 'xqz random gibberish'), GOLD.fallback));

  const total = passed + failed;
  console.log(`\n${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ''}\n`);
  if (failed > 0) process.exit(1);
})();
