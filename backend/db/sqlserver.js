import sql from 'mssql';

function requireSqlConfig() {
  if (!process.env.SQLSERVER_USER || !process.env.SQLSERVER_PASSWORD || !process.env.SQLSERVER_DATABASE) {
    throw new Error('Missing SQL Server environment variables. Add SQLSERVER_USER, SQLSERVER_PASSWORD, and SQLSERVER_DATABASE to your .env file.');
  }
}

const config = {
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  server: process.env.SQLSERVER_HOST || 'localhost',
  database: process.env.SQLSERVER_DATABASE,
  options: {
    encrypt: process.env.SQLSERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQLSERVER_TRUST_CERT === 'true'
  }
};

// Only bind a static network port if specified and not connecting via a named instance string path
if (process.env.SQLSERVER_PORT && !config.server.includes('\\')) {
  config.port = Number(process.env.SQLSERVER_PORT);
}

let pool;
let poolConnect;

function initSqlPool() {
  if (poolConnect) return poolConnect;
  requireSqlConfig();
  pool = new sql.ConnectionPool(config);
  poolConnect = pool.connect()
    .then(() => {
      console.log(`✅ Connected to SQL Server database: ${config.database}`);
      return pool;
    })
    .catch((err) => {
      console.error('❌ SQL Server connection failed:', err.message);
      poolConnect = null; // Clear connection attempt to allow self-healing retry logs
      throw err;
    });
  return poolConnect;
}

async function querySql(queryText, inputs = []) {
  const pool = await initSqlPool();
  const request = pool.request();

  for (const param of inputs) {
    request.input(param.name, param.type, param.value);
  }

  const result = await request.query(queryText);
  return result.recordset;
}

async function testSqlConnection() {
  try {
    const rows = await querySql('SELECT 1 AS value');
    return rows[0] || null;
  } catch (err) {
    console.error('⚠️ Health Check Query Failed:', err.message);
    return null;
  }
}

export { querySql, testSqlConnection, sql };