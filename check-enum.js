const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:lJPjxTjKVREGVgNYkBJFBcpNZKMhYHin@trolley.proxy.rlwy.net:15402/railway'
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
