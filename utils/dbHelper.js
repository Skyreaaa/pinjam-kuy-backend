// Helper untuk konversi query MySQL ke PostgreSQL
// Gunakan di semua controllers

/**
 * Execute PostgreSQL query dan return rows
 * @param {Pool} pool - PostgreSQL pool
 * @param {string} sql - SQL query dengan $1, $2 placeholders
 * @param {array} params - Array of parameters
 * @returns {Promise<array>} Array of rows
 */
async function query(pool, sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}

/**
 * Execute query dan return single row atau null
 * @param {Pool} pool - PostgreSQL pool
 * @param {string} sql - SQL query
 * @param {array} params - Parameters
 * @returns {Promise<object|null>}
 */
async function queryOne(pool, sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
}

/**
 * Execute INSERT dan return inserted row
 * @param {Pool} pool - PostgreSQL pool
 * @param {string} sql - INSERT query with RETURNING *
 * @param {array} params - Parameters
 * @returns {Promise<object>}
 */
async function insert(pool, sql, params = []) {
    // Ensure query has RETURNING clause
    if (!sql.toUpperCase().includes('RETURNING')) {
        sql += ' RETURNING *';
    }
    const result = await pool.query(sql, params);
    return result.rows[0];
}

module.exports = { query, queryOne, insert };
