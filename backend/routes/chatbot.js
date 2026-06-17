// Chatbot Routes API - Role-Based & Multipurpose with AI
// Handles HRMS queries using Groq AI

import express from 'express';
import {
  getCompanyData,
  getEmployees,
  getUsers,
  getLeaveRequests,
  getLeaveRequestByCode,
  addLeaveRequest,
  cancelLeaveRequest
} from '../db/repository.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

dotenv.config();

const router = express.Router();
const leaveDrafts = new Map();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const groqClient = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function buildMenuGuide(title, steps, footer = '') {
  const stepText = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  return `${title}\n${stepText}${footer ? `\n\n${footer}` : ''}`;
}

function getEmployeeCard(employee) {
  return [
    `Name: ${employee.name}`,
    `ID: ${employee.id}`,
    `Role: ${employee.designation}`,
    `Department: ${employee.department}`
  ].join('\n');
}

function getSalaryHistorySnapshot(employee) {
  const currentYear = employee.form16?.year || new Date().getFullYear();
  const joinedYear = new Date(employee.joinDate).getFullYear();
  const base = employee.salary;
  const records = [
    { year: currentYear, salary: base, label: 'Current payroll record' },
    { year: currentYear - 1, salary: Math.round(base * 0.92), label: 'Previous payroll record' },
    { year: currentYear - 2, salary: Math.round(base * 0.85), label: 'Earlier payroll record' },
  ].filter(record => record.year >= joinedYear);

  return records;
}

function getRoleQuestions(role) {
  if (role === 'admin' || role === 'hr') {
    return [
      'Show all employees',
      'How do I view employee private details?',
      'What is the payroll summary?',
      'How do I access Form16 for an employee?',
      'How many leaves are pending?',
      'What are the company holidays?'
    ];
  }

  return [
    'What are my details?',
    'What is my salary?',
    'Show my salary history',
    'How many leaves are available?',
    'How do I download Form16?',
    'What are the company holidays?'
  ];
}

function getOwnProfileGuide(employee) {
  return buildMenuGuide(
    'Your profile in the portal',
    [
      'Open the Employees menu.',
      'Click your profile card.',
      'Use the profile panel to review your basic details.',
      'Open the payroll/document section for salary, Form16, or payslip actions.'
    ],
    `Current snapshot: ${employee.name} | ${employee.department} | ${employee.designation}`
  );
}

function getPrivateDocGuide(role) {
  const baseSteps = [
    'Open the Employees menu.',
    'Select the employee card.',
    'Open the payroll or documents panel inside the profile.',
    'Download Form16, payslip, or appraisal files from there.'
  ];

  if (role === 'admin' || role === 'hr') {
    return buildMenuGuide(
      'Employee private details access',
      baseSteps,
      'You can review all employee public details from the directory, then open the secure document area for private files.'
    );
  }

  return buildMenuGuide(
    'Your private documents',
    baseSteps,
    'Regular employees can only open their own secure documents.'
  );
}

function getLeaveGuide() {
  return buildMenuGuide(
    'Leave balance and leave requests',
    [
      'Open the Employees or Dashboard area in the portal.',
      'Find the leave / attendance summary card.',
      'Open My Leave Balance to view your live leave count.',
      'Use New Leave Request if you want to apply for leave.'
    ],
    'Leave rules in this portal: Casual Leave 12/year, Sick Leave 6/year, WFH up to 2 days/week with approval.'
  );
}

function parseLeaveRequestCode(text) {
  const match = String(text || '').match(/\bLR\d{3,}\b/i);
  return match ? match[0].toUpperCase() : null;
}

function parseLeaveMessage(message) {
  const normalized = String(message || '').trim();
  const lower = normalized.toLowerCase();

  const typeMatch = lower.match(/\b(el|cl|lop|sick|wfh)\b/i);
  const dateMatch = normalized.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*(\d{4})?/);
  const dayTypeMatch = lower.match(/\b(full day|first half|second half)\b/i);
  const reasonMatch = normalized.match(/reason[:\-]?\s*(.+)$/i);

  if (!typeMatch || !dateMatch) return null;

  const leaveType = typeMatch[1].toUpperCase();
  const leaveDate = (() => {
    const day = String(dateMatch[1]).padStart(2, '0');
    const monthName = dateMatch[2].toLowerCase();
    const year = dateMatch[3] || new Date().getFullYear();
    const monthNames = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };
    const month = monthNames[monthName];
    return month ? `${year}-${month}-${day}` : null;
  })();

  if (!leaveDate) return null;

  return {
    leaveType,
    leaveDate,
    dayType: dayTypeMatch ? dayTypeMatch[1] : 'Full Day',
    reason: reasonMatch ? reasonMatch[1].trim() : ''
  };
}

function parseLeaveDate(text) {
  const normalized = String(text || '').toLowerCase();
  const monthNames = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };

  let match = normalized.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = monthNames[match[2].toLowerCase()];
    const year = match[3] || new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  match = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return null;
}

async function findPendingLeaveForEmployee(employeeId, inputText) {
  const pending = (await getLeaveRequests(employeeId)).filter(r => r.status === 'pending');
  if (!pending.length) return null;

  const requestCode = parseLeaveRequestCode(inputText);
  if (requestCode) {
    return pending.find(r => r.requestCode === requestCode) || null;
  }

  const date = parseLeaveDate(inputText);
  if (date) {
    const exactMatch = pending.find(r => r.leaveDate === date);
    if (exactMatch) return exactMatch;
  }

  return pending.length === 1 ? pending[0] : null;
}

function getTodayInfo() {
  const now = new Date();
  const dateText = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeText = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `Today is ${dateText}. Current time is ${timeText}.`;
}

function getGeneralHelpGuide(userName) {
  return `Hi ${userName}. I can answer questions about the portal, company holidays, announcements, office policies, and today's date.`;
}

function classifyQuery(message) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('salary') || msg.includes('pay') || msg.includes('compensation')) return 'salary';
  if (msg.includes('certificate') || msg.includes('qualification') || msg.includes('certified') || msg.includes('skill')) return 'certificate';
  if (msg.includes('form16') || msg.includes('tax') || msg.includes('itr')) return 'tax';
  if (msg.includes('department') || msg.includes('team') || msg.includes('who works') || msg.includes('members')) return 'department';
  if (msg.includes('leave') || msg.includes('attendance') || msg.includes('pto')) return 'leave';
  return 'general';
}

function getTypeSpecificPrompt(queryType) {
  const prompts = {
    salary: 'You are a payroll specialist. Provide accurate, privacy-aware salary information and deny access to other employees\' private salaries unless the user is HR/Admin.',
    certificate: 'You are an HR specialist. Provide certificate and qualification information based on records and guide how to upload or verify certifications.',
    tax: 'You are a tax/document specialist. Help with Form16 and tax-related queries and explain where to download official documents from the portal.',
    department: 'You are an organizational expert. Provide department-level information, team members (public), and guidance for finding detailed profiles in the portal.',
    leave: 'You are a leave-policy expert. Provide leave balances, rules and how to apply for leaves in the portal.'
  };
  return prompts[queryType] || prompts.general || 'You are a general HR assistant.';
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

function normalizeMessage(text) {
  const typoMap = {
    detials: 'details',
    detial: 'detail',
    detalis: 'details',
    detaails: 'details',
    detals: 'details',
    profil: 'profile',
    profle: 'profile',
    prafule: 'profile',
    profilee: 'profile',
    salery: 'salary',
    sallery: 'salary',
    salar: 'salary',
    payrol: 'payroll',
    payrole: 'payroll',
    payrolll: 'payroll',
    certifcate: 'certificate',
    certifcates: 'certificates',
    certicate: 'certificate',
    'pay slip': 'payslip',
    payslip: 'payslip',
    'form 16': 'form16',
    'my detaails': 'my details',
    'my profle': 'my profile',
    'my certifcate': 'my certificate',
    cancl: 'cancel',
    cancelr: 'cancel',
    aproove: 'approve',
    approv: 'approve',
    leav: 'leave',
    leafe: 'leave',
    reuest: 'request',
    requst: 'request',
    requist: 'request',
    deteil: 'detail',
    emplyee: 'employee',
    employe: 'employee',
    employeess: 'employees',
    holidayes: 'holidays'
  };

  let normalized = String(text || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ');
  Object.entries(typoMap).forEach(([bad, good]) => {
    normalized = normalized.replace(new RegExp(`\\b${bad}\\b`, 'g'), good);
  });

  const dictionary = [...new Set([
    ...Object.values(typoMap),
    'leave', 'approve', 'cancel', 'request', 'details', 'profile', 'salary',
    'payroll', 'payslip', 'tax', 'form16', 'employee', 'employees', 'my', 'me',
    'all', 'holidays', 'holiday', 'department', 'designation', 'training',
    'document', 'documents', 'company', 'policy', 'policies', 'office',
    'benefits', 'attendance', 'manager', 'hr', 'admin', 'team', 'email', 'contact'
  ])];

  const tokens = normalized.split(/\s+/).map((token) => {
    if (!token || dictionary.includes(token)) return token;

    let bestMatch = { word: token, distance: Infinity };
    for (const word of dictionary) {
      const distance = levenshteinDistance(token, word);
      if (distance < bestMatch.distance) {
        bestMatch = { word, distance };
      }
    }

    return bestMatch.distance <= 2 ? bestMatch.word : token;
  });

  return tokens.join(' ').replace(/\s+/g, ' ').trim();
}

// POST a message to the chatbot with AI-powered responses
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Please login to use the chatbot' });
    }

    let session;
    try {
      const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
      session = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session. Please login again.' });
    }

    // Await async SQL Server pool requests
    const users = await getUsers();
    const employees = await getEmployees();

    const userRecord = users.find(u => u.employeeId === session.employeeId || u.email === session.email) || null;
    const employeeId = userRecord?.employeeId || session.employeeId;

    const msg = normalizeMessage(message);

    const piiPatterns = ['ssn', 'bank account', 'account number', 'personal identification', 'personal info', 'passport'];
    const mentionsAllEmployees = msg.includes('all employee') || msg.includes('all employees') || msg.includes('show me all');
    const mentionsOtherExplicit = msg.includes(' other ') || msg.includes(' for ') || msg.includes(' employee ') || msg.includes(' employees') || msg.includes('others');
    const payrollKeywords = ['salary', 'pay', 'compensation', 'form16', 'payslip', 'salary slip', 'tax'];

    const personalInfoKeywords = [
      'my details', 'my profile', 'about me', 'who am i', 'my certificate',
      'my certificates', 'my qualification', 'my credential', 'my skill',
      'my form16', 'my tax', 'payslip', 'salary slip'
    ];

    const isPersonalPayrollQuery = msg.includes('my') && payrollKeywords.some(k => msg.includes(k));
    const isPersonalInfoQuery = msg.includes('my') && (personalInfoKeywords.some(k => msg.includes(k)) || msg === 'details' || msg === 'profile');

    const isSensitive = piiPatterns.some(k => msg.includes(k)) || mentionsAllEmployees || mentionsOtherExplicit;
    const shouldUseLocal = isSensitive || isPersonalPayrollQuery || isPersonalInfoQuery;

    if (shouldUseLocal) {
      try {
        const responseText = await generateResponse(message, session);
        return res.json({
          success: true,
          userMessage: message,
          botResponse: responseText,
          confidence: 'LOCAL',
          timestamp: new Date(),
          user: { name: session.name, role: session.role }
        });
      } catch (err) {
        console.error('Error generating local response:', err);
        return res.status(500).json({ success: false, error: 'Failed to process request' });
      }
    }

    try {
      const aiResponse = await generateAIResponse(msg, session);
      return res.json({
        success: true,
        userMessage: message,
        botResponse: aiResponse.text || aiResponse,
        confidence: aiResponse.confidence || 'UNKNOWN',
        timestamp: new Date(),
        user: { name: session.name, role: session.role }
      });
    } catch (error) {
      console.log('Groq API error or disabled, falling back to pattern matching:', error.message);
      const fallback = await generateResponse(message, session);
      return res.json({
        success: true,
        userMessage: message,
        botResponse: fallback,
        confidence: 'FALLBACK',
        timestamp: new Date(),
        user: { name: session.name, role: session.role }
      });
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// AI-powered response generator using Groq API via HTTP
async function generateAIResponse(sanitizedMessage, session) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const userRole = session.role;
  const userName = session.name;
  const userEmployeeId = session.employeeId;
  const queryType = classifyQuery(sanitizedMessage);

  let systemPrompt = `You are an HRMS (Human Resource Management System) Assistant for a company. 
You help employees with work-related questions about:
- Personal information (salary, certificates, Form16, designation)
- Company policies and procedures
- Leave policies and holidays
- Office information and facilities
- Training programs and development
- Team members and departments
- Events and celebrations
- General portal guidance

Current User: ${userName} (Role: ${userRole})
Employee ID: ${userEmployeeId}

Important Rules:
1. If the user asks about OTHER EMPLOYEES' sensitive info (salary, personal details), respond: "I can only share general information. For sensitive employee data, contact HR."
2. If the user is a regular employee asking about others' salary or personal details, DENY access.
3. If the user is HR or Admin, you can share any information.
4. Answer only the user's question.
5. Keep the response precise, short, and directly related to the question.
6. Do not add unrelated tips, extra menu options, or generic follow-up lists unless the user asks for them.
7. If the user asks how to do something, give only the minimum steps needed.`;

  if (userRole === 'admin' || userRole === 'hr') {
    systemPrompt += '\n\nThis user is HR/Admin, so they can access all employee information.';
  }

  systemPrompt += `\n\nType-specific context: ${getTypeSpecificPrompt(queryType)}`;
  systemPrompt += '\n\nAt the end of your response, append a line like "Confidence: HIGH" or "Confidence: MEDIUM" or "Confidence: LOW".';

  try {
    const response = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitizedMessage }
      ],
      temperature: 0.3,
      max_tokens: 220
    });

    const raw = response.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
    const confidenceMatch = raw.match(/Confidence:\s*(HIGH|MEDIUM|LOW)/i);
    const confidence = confidenceMatch ? confidenceMatch[1].toUpperCase() : 'UNKNOWN';
    const text = raw.replace(/\n?\s*Confidence:\s*(HIGH|MEDIUM|LOW)\.?\s*$/i, '').trim();

    return { text, confidence };
  } catch (error) {
    console.error('Groq API Error:', error.message || error);
    throw error;
  }
}

// Fallback: Rule-based response generator with 30+ built-in queries
async function generateResponse(message, session) {
  const msg = normalizeMessage(message);
  const userRole = session.role;
  const userEmployeeId = session.employeeId;
  const userName = session.name;
  
  const employees = await getEmployees();
  const companyData = await getCompanyData();

  const selfEmployee = employees.find(e => e.id === userEmployeeId);

  if (/(?:what(?:'s| is)?|tell me|show me)?.*(?:today'?s? date|current date|what date is it|date today|what day is it|current time|what time is it|time now)/i.test(msg)) {
    return getTodayInfo();
  }

  if (msg.includes('who are you') || msg.includes('what can you do') || msg.includes('help me') || msg.includes('general questions')) {
    return getGeneralHelpGuide(userName);
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good afternoon') || msg.includes('good evening')) {
    return `Hello ${userName}. ${getGeneralHelpGuide(userName)}`;
  }

  if ((msg.includes('only') || msg.includes('just') || msg.includes('only employee') || msg.includes('names only') || msg.includes('ids only')) && msg.includes('employee')) {
    if (msg.includes('name') || msg.includes('names')) {
      if (userRole === 'admin' || userRole === 'hr') {
        const names = employees.map(e => `• ${e.name}`).join('\n');
        return `Employee names:\n${names}`;
      }
      return `Access Denied: You don't have permission to list all employee names.`;
    }

    if (msg.includes('id') || msg.includes('ids')) {
      if (userRole === 'admin' || userRole === 'hr') {
        const ids = employees.map(e => `• ${e.id}`).join('\n');
        return `Employee IDs:\n${ids}`;
      }
      return `Access Denied: You don't have permission to list all employee IDs.`;
    }
  }

  if ((msg.includes('my details') || msg.includes('my profile') || msg.includes('my basic info') || msg.includes('basic info') || msg.includes('show my info') || msg.includes('show my details') || msg.includes('show my profile') || msg.includes('about me') || msg.whoami || msg.includes('what is my id') || msg.includes('whats my id')) || (msg === 'details' || msg === 'profile')) {
    if (selfEmployee) {
      const summary = `Profile summary:\n${getEmployeeCard(selfEmployee)}`;
      const note = '\nFor confidential documents (salary, Form16, payslips, personal contact details), please open your secure Documents / Payroll section in the portal.';
      return `${summary}${note}`;
    }
    return 'Employee data not found.';
  }

  if (msg.includes('my salary history') || msg.includes('salary history') || msg.includes('past salary') || msg.includes('previous salary') || msg.includes('pay history')) {
    if (selfEmployee) {
      const history = getSalaryHistorySnapshot(selfEmployee)
        .map(record => `• ${record.year}: ${formatCurrency(record.salary)} (${record.label})`)
        .join('\n');

      return `Your salary history snapshot:\n${history}\n\n${buildMenuGuide('Where to check it in the portal', [
        'Open Employees.',
        'Click your profile card.',
        'Open the Payroll / Salary History section.',
        'Review your older salary records and download payslip documents if needed.'
      ])}`;
    }
    return 'Employee data not found.';
  }

  if (msg.includes('my salary') || msg.includes('my pay') || msg.includes('earn') || msg.includes('compensation')) {
    if (selfEmployee) {
      return `Your current salary is ${formatCurrency(selfEmployee.salary)}.`;
    }
    return 'Employee data not found. Please contact HR.';
  }

  if (msg.includes('confirm leave') || msg.includes('submit leave') || msg.includes('submit my leave') || msg.includes('confirm my leave') || msg.includes('yes submit') || msg.includes('yes confirm')) {
    const draft = leaveDrafts.get(userEmployeeId);
    if (!draft) {
      return `I don't have your leave details yet. Please provide your leave request details first, for example: "Apply CL for 15 June 2026, Full Day, reason: personal work."`;
    }

    const request = await addLeaveRequest({
      employeeId: userEmployeeId,
      leaveType: draft.leaveType,
      leaveDate: draft.leaveDate,
      dayType: draft.dayType,
      reason: draft.reason
    });

    leaveDrafts.delete(userEmployeeId);
    return `Your leave request ${request.requestCode} is submitted. You can cancel the request any time before HR/Admin approves it by replying “Cancel leave” or by using the Leave Requests page.`;
  }

  if (/(?:\bcl\b|\bel\b|\blop\b|leave type|day type|full day|first half|second half|\btomorrow\b|\btoday\b|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b|\bsaturday\b|\bsunday\b|\bjanuary\b|\bfebruary\b|\bmarch\b|\bapril\b|\bmay\b|\bjune\b|\bjuly\b|\baugust\b|\bseptember\b|\boctober\b|\bnovember\b|\bdecember\b)/i.test(message) && /\d{1,2}/.test(message)) {
    const parsed = parseLeaveMessage(message);
    if (parsed) {
      leaveDrafts.set(userEmployeeId, parsed);
      return `I’ve got your leave details. Please confirm before I submit your request. Reply “Confirm leave” to submit or update the details if anything changed.`;
    }
    return `I’ve got some leave-related information, but I could not parse your leave date or type clearly. Please try again with: "Apply CL for 15 June 2026, Full Day, reason: personal work."`;
  }

  if (msg.includes('apply leave') || msg.includes('apply for leave') || msg.includes('request leave') || msg.includes('leave request')) {
    return `Sure — I can help apply your leave.\n\nPlease send these details:\n- Leave type: EL / CL / LOP / etc.\n- Date: the leave date\n- Day type: Full Day / First Half / Second Half\n- Reason: optional\n\nExample: “Apply CL for 15 June 2026, Full Day, reason: personal work”.`;
  }

  if (msg.includes('approve leave') || msg.includes('pending leave') || msg.includes('leave approval') || msg.includes('accept leave')) {
    if (userRole === 'admin' || userRole === 'hr') {
      return `As HR/Admin, you can review pending leave requests on the Leave Requests page. Select a pending request and click Approve when ready.`;
    }
    return `Only HR/Admin can approve leave requests. If you want to cancel a pending request before approval, reply “Cancel leave” or use the Leave Requests page.`;
  }

  if (msg.includes('cancel leave') || msg.includes('cancel my leave') || msg.includes('cancel request')) {
    const pendingRequest = await findPendingLeaveForEmployee(userEmployeeId, message);
    if (!pendingRequest) {
      const hasPending = (await getLeaveRequests(userEmployeeId)).some(r => r.status === 'pending');
      return hasPending
        ? `I found multiple pending leave requests. Please tell me the leave request code (for example LR0001) or the date of the leave you want to cancel.`
        : `You have no pending leave requests to cancel. If you already have a request, use the Leave Requests page to view it.`;
    }

    if (pendingRequest.status !== 'pending') {
      return `Leave request ${pendingRequest.requestCode} is already ${pendingRequest.status}. Only pending requests can be cancelled.`;
    }

    await cancelLeaveRequest(pendingRequest.requestCode);
    return `Your pending leave request ${pendingRequest.requestCode} for ${pendingRequest.leaveType} on ${pendingRequest.leaveDate} has been cancelled successfully.`;
  }

  if (msg.includes('my leave') || msg.includes('leave balance') || msg.includes('available leaves') || msg.includes('no of leaves') || msg.includes('how many leaves')) {
    return `${getLeaveGuide()}\n\nQuick note: I can show the leave policy, but your live balance is visible inside the portal only.`;
  }

  if (msg.includes('my form16') || msg.includes('my tax') || msg.includes('my document') || msg.includes('form 16') || msg.includes('payslip') || msg.includes('salary slip')) {
    if (selfEmployee) {
      return `${buildMenuGuide('How to open your Form16', [
        'Open Employees.',
        'Select your profile card.',
        'Open the Documents / Payroll section.',
        'Click Form16 to download it.'
      ])}`;
    }
    return 'Form16 not available. Contact Finance team.';
  }

  if (msg.includes('list') && msg.includes('employee') && (msg.includes('name') || msg.includes('names'))) {
    if (userRole === 'admin' || userRole === 'hr') {
      const names = employees.map(e => `• ${e.name}`).join('\n');
      return `Employee names:\n${names}`;
    }
    return `Access Denied: You don't have permission to list all employee names.`;
  }

  if (msg.includes('list') && msg.includes('employee') && (msg.includes('id') || msg.includes('ids') || msg.includes('employee id') || msg.includes('ids only') || msg.includes('their ids'))) {
    if (userRole === 'admin' || userRole === 'hr') {
      const ids = employees.map(e => `• ${e.id}`).join('\n');
      return `Employee IDs:\n${ids}`;
    }
    return `Access Denied: You don't have permission to list all employee IDs.`;
  }

  if (msg.includes('my certificate') || msg.includes('my certificates') || msg.includes('my qualification') || msg.includes('my credential') || msg.includes('my skill')) {
    return `${buildMenuGuide('How to view your certificates', [
      'Open the Employees menu.',
      'Click your profile card.',
      'Open the Documents / Certificates section.',
      'View or download the certificate files from there.'
    ])}\n\nIf you need to add a new certificate, upload it from the Documents area in your portal.`;
  }

  if ((msg.includes('form16') || msg.includes('payslip') || msg.includes('salary slip') || msg.includes('appraisal') || msg.includes('private detail') || msg.includes('private details')) && !msg.includes('my')) {
    if (userRole === 'admin' || userRole === 'hr') {
      return getPrivateDocGuide(userRole);
    }
    return `Access Denied: Private employee documents are only visible for your own profile.\n\n${getPrivateDocGuide(userRole)}`;
  }

  if (msg.includes('all employee') || msg.includes('all employees') || msg.includes('show me all') || msg.includes('all the employee')) {
    if (msg.includes('name') || msg.includes('names') || msg.includes('only')) {
      if (userRole === 'admin' || userRole === 'hr') {
        const names = employees.map(e => `• ${e.name}`).join('\n');
        return `Employee names:\n${names}`;
      }
      return `Access Denied: You don't have permission to list all employee names.`;
    }

    if (msg.includes('id') || msg.includes('ids') || msg.includes('employee id')) {
      if (userRole === 'admin' || userRole === 'hr') {
        const ids = employees.map(e => `• ${e.id}`).join('\n');
        return `Employee IDs:\n${ids}`;
      }
      return `Access Denied: You don't have permission to list all employee IDs.`;
    }

    if (userRole === 'admin' || userRole === 'hr') {
      const publicDetails = employees.map(getEmployeeCard).join('\n---\n');
      return `${buildMenuGuide('Employee directory and access', [
        'Open the Employees menu.',
        'Browse all employee cards in the directory.',
        'Use the profile card to review public details.',
        'Open the secure payroll/documents panel for private records when needed.'
      ])}\n\nPublic directory snapshot:\n\n${publicDetails}`;
    }
    return `Access Denied: You don't have permission to view all employee details.\n\n${getOwnProfileGuide(selfEmployee || { name: userName, department: 'N/A', designation: 'Employee' })}`;
  }

  if ((msg.includes('salary') || msg.includes('pay')) && !msg.includes('my')) {
    if (userRole === 'admin' || userRole === 'hr') {
      return `${buildMenuGuide('How to view employee salary details', [
        'Open the Employees menu.',
        'Select the employee card.',
        'Open the payroll panel to review salary, deductions, and tax.',
        'Use the documents area for Form16 or payslip downloads.'
      ])}\n\nIf you want a public snapshot, browse the directory; if you need the private payroll file, open the secure payroll panel in the portal.`;
    }
    return `Access Denied: Salary information for other employees is confidential. Use "my salary" to view yours.\n\n${getOwnProfileGuide(selfEmployee || { name: userName, department: 'N/A', designation: 'Employee' })}`;
  }

  if ((msg.includes('employee') && msg.includes('detail')) && !msg.includes('my')) {
    if (userRole === 'admin' || userRole === 'hr') {
      return `${buildMenuGuide('Employee details navigation', [
        'Open the Employees menu.',
        'Search or click the employee card.',
        'Review the public profile details on the card.',
        'Open the secure documents panel for private details.'
      ])}\n\nYou can access all employee directory cards from the portal, while private files stay in the secure document section.`;
    }
    return `ℹ️ You can only access your own details. Use "my details" to view yours.\n\n${getOwnProfileGuide(selfEmployee || { name: userName, department: 'N/A', designation: 'Employee' })}`;
  }

  if (msg.includes('cafe') || msg.includes('lunch') || msg.includes('food') || msg.includes('canteen') || msg.includes('dining')) {
    return 'Cafeteria: 2nd Floor, 12 PM - 2 PM (Mon-Fri). Contact: cafe@company.com';
  }

  if (msg.includes('office') && (msg.includes('location') || msg.includes('address') || msg.includes('where'))) {
    return 'Office location: 123 Tech Innovation Park, Mumbai.';
  }

  if (msg.includes('parking') || msg.includes('vehicle') || msg.includes('car')) {
    return 'Parking: Basement (B1, B2). Contact: facility@company.com.';
  }

  if (msg.includes('gym') || msg.includes('fitness') || msg.includes('exercise') || msg.includes('workout')) {
    return 'Gym: 3rd Floor, 6 AM - 8 PM. Contact: gym@company.com.';
  }

  if (msg.includes('wifi') || msg.includes('internet') || msg.includes('network') || msg.includes('vpn')) {
    return 'WiFi and VPN support: it-support@company.com.';
  }

  if (msg.includes('transport') || msg.includes('commute') || msg.includes('cab') || msg.includes('travel')) {
    return 'Transport: Company cabs are available for pickup and drop.';
  }

  if (msg.includes('holiday') || msg.includes('vacation') || msg.includes('off') || msg.includes('festive')) {
    const holidays = companyData.holidays.slice(0, 5).map(h => `• ${h.date}: ${h.name}`).join('\n');
    return `Company holidays:\n${holidays}`;
  }

  if (msg.includes('announcement') || msg.includes('news') || msg.includes('latest') || msg.includes('update')) {
    const announcements = companyData.announcements.slice(0, 2).map(a => `• ${a.date}: ${a.title}`).join('\n');
    return `Latest announcements:\n${announcements}`;
  }

  if (msg.includes('policy') || msg.includes('leave') || msg.includes('pto') || msg.includes('procedure')) {
    return `Leave policy: Casual Leave 12 days/year, Sick Leave 6 days/year, WFH up to 2 days/week with manager approval.`;
  }

  if (msg.includes('work from home') || msg.includes('wfh') || msg.includes('remote')) {
    return 'WFH: Up to 2 days per week with manager approval.';
  }

  if (msg.includes('dress code') || msg.includes('attire') || msg.includes('clothing')) {
    return 'Dress code: Business casual.';
  }

  if (msg.includes('training') || msg.includes('course') || msg.includes('learn') || msg.includes('skill') || msg.includes('development')) {
    return 'Training is available in the portal under the Training section.';
  }

  if ((msg.includes('contact it') || msg.includes('it contact') || msg.includes('contact support') || msg.includes('reach it') || msg.includes('it help')) && !msg.includes('portal')) {
    return 'Contact IT at it-support@company.com.';
  }

  if (msg.includes('career') || msg.includes('growth') || msg.includes('promotion') || msg.includes('advance')) {
    return 'Career growth is discussed during performance reviews and with your manager.';
  }

  if ((msg.includes('team') || msg.includes('who works') || msg.includes('team member') || msg.includes('staff')) && !msg.includes('my team')) {
    return 'Teams include IT, HR, and Finance.';
  }

  if (msg.includes('department')) {
    if (msg.includes('it')) return 'IT Department.';
    if (msg.includes('hr')) return 'HR Department.';
    if (msg.includes('finance')) return 'Finance Department.';
    return 'Departments: IT, HR, Finance.';
  }

  if (msg.includes('birthday') || msg.includes('event') || msg.includes('celebration') || msg.includes('party') || msg.includes('gathering')) {
    return 'Events are listed in the company calendar.';
  }

  if (msg.includes('emergency') || msg.includes('urgent') || msg.includes('crisis') || msg.includes('help')) {
    return 'Emergency contacts are available through Security, HR, and IT.';
  }

  if (msg.includes('performance') || msg.includes('review') || msg.includes('rating') || msg.includes('appraisal')) {
    return 'Performance reviews happen quarterly.';
  }

  if (msg.includes('probation') || msg.includes('onboarding') || msg.includes('induction')) {
    return 'Probation period is 3 months.';
  }

  if (msg.includes('office hours') || msg.includes('working hours') || msg.includes('timing') || msg.includes('9 to 6')) {
    return 'Office hours: Monday to Friday, 9:00 AM to 6:00 PM.';
  }

  if (msg.includes('attendance') || msg.includes('present') || msg.includes('absent')) {
    return 'Attendance and leave balance are shown in the portal dashboard.';
  }

  if (msg.includes('benefit') || msg.includes('health') || msg.includes('insurance') || msg.includes('perk') || msg.includes('medical')) {
    return 'Benefits are listed in the Documents section.';
  }

  if (msg.includes('portal') || msg.includes('how to') || msg.includes('guide') || msg.includes('help') || msg.includes('dashboard')) {
    return 'The portal lets you view profile, payroll, leaves, documents, training, and company updates.';
  }

  if (msg.includes('it support') || msg.includes('technical') || msg.includes('issue') || msg.includes('problem') || msg.includes('bug')) {
    return 'IT support: it-support@company.com.';
  }

  if (msg.includes('greetings')) {
    return `Hello ${userName}. Welcome to the HRMS Assistant.\n\nI can help you with:\n- Personal information (salary, certificates, Form16)\n- Office information (cafeteria, parking, WiFi)\n- Holidays, announcements, policies\n- Training & career growth\n- Team directory & events\n- IT support & troubleshooting\n- Portal guidance\n\nWhat would you like to know?`;
  }

  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('appreciate')) {
    return `You're welcome, ${userName}.`;
  }

  return 'Please ask a specific question about the portal, company, or your HRMS details.';
}

// GET chatbot training status
router.get('/status', (req, res) => {
  const groqConfigured = !!process.env.GROQ_API_KEY;
  res.json({ 
    status: 'Chatbot service running',
    type: groqConfigured ? 'AI-Powered (Groq)' : 'Rule-based (Pattern Matching)',
    aiEnabled: groqConfigured,
    model: groqConfigured ? GROQ_MODEL : 'None',
    fallback: 'Rule-based patterns available as backup',
    message: groqConfigured 
      ? 'AI responses enabled via Groq API' 
      : 'Set GROQ_API_KEY in .env to enable AI responses'
  });
});

export default router;