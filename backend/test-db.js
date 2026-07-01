const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true },
};

async function test() {
  try {
    console.log('Connecting to', config.server, '/', config.database, '...');
    const pool = await sql.connect(config);
    console.log('✅ Connected.\n');

    const employeeId = '284512'; // a real ID from your list
    console.log('Calling USP_EmployeeLeaveBalance for', employeeId, '...\n');

    const result = await pool.request()
      .input('EmployeeId', sql.VarChar, employeeId)
      .execute('USP_EmployeeLeaveBalance');

    console.log('✅ Response received. Rows returned:', result.recordset.length);
    console.table(result.recordset);

    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();