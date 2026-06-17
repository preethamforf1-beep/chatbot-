import express from 'express';
import { querySql, testSqlConnection } from '../db/sqlserver.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await testSqlConnection();
    res.json({
      success: true,
      message: 'SQL Server connection is working',
      result
    });
  } catch (error) {
    console.error('SQL Server test route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/employees', async (req, res) => {
  try {
    const rows = await querySql('SELECT TOP 10 id, name, email, department FROM employees');
    res.json({
      success: true,
      rowCount: rows.length,
      rows
    });
  } catch (error) {
    console.error('SQL Server employees route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
