import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import chatbotRoutes from './routes/chatbot.js';
import employeesRoutes from './routes/employees.js';
import leavesRoutes from './routes/leaves.js';
import payrollRoutes from './routes/payroll.js';
import attendanceRoutes from './routes/attendance.js';
import { getCompanyData } from './db/repository.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', message: 'HRMS backend healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/company', (req, res) => {
  try {
    const companyData = getCompanyData();
    res.json({ success: true, data: companyData });
  } catch (error) {
    console.error('Company route error:', error);
    res.status(500).json({ success: false, error: 'Unable to load company data' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ HRMS Server running on http://localhost:${PORT}`);
});