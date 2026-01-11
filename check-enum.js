const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'trolley.proxy.rlwy.net',
  port: process.env.DB_PORT || 15402,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'lJPjxTjKVREGVgNYkBJFBcpNZKMhYHin',
  database: process.env.DB_DATABASE || 'railway',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT unnest(enum_range(NULL::loan_status_enum))::text as status
    `);
    console.log('Valid loan_status_enum values:');
    result.rows.forEach(row => console.log(`  - '${row.status}'`));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
