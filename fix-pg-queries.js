// Comprehensive PostgreSQL fix for all controllers
const fs = require('fs');
const path = require('path');

function fixPostgreSQLQueries(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Add helper at top if not exists
    if (!content.includes('function queryOne(')) {
        const helpers = `
// PostgreSQL query helpers
async function queryOne(pool, sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
}

async function queryAll(pool, sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows || [];
}

`;
        // Insert after first line or after getDBPool
        if (content.includes('const getDBPool')) {
            content = content.replace(/(const getDBPool[^;]+;)/, '$1\n' + helpers);
        } else {
            content = helpers + content;
        }
    }
    
    // Fix: const [{ field }] = await pool.query → const r = await queryOne(pool,
    // Fix: const [rows] = await pool.query → const rows = await queryAll(pool,
    
    // Pattern 1: Single row destructuring
    content = content.replace(
        /const \[{ ([^}]+) }\] = await pool\.query\(([^)]+)\)/g,
        'const _temp = await queryOne(pool, $2); const { $1 } = _temp || {}'
    );
    
    // Pattern 2: Multiple rows
    content = content.replace(
        /const \[rows\] = await pool\.query\(/g,
        'const rows = await queryAll(pool, '
    );
    
    // Pattern 3: _pgResult pattern from auto-converter
    content = content.replace(
        /const _pgResult = await pool\.query\(([^;]+)\);\s*const rows = _pgResult\.rows;/g,
        'const rows = await queryAll(pool, $1);'
    );
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${path.basename(filePath)}`);
        return true;
    }
    return false;
}

const controllersDir = path.join(__dirname, 'controllers');
const files = ['adminController.js', 'loanController.js', 'profileController.js', 'bookController.js']
    .map(f => path.join(controllersDir, f));

console.log('=== Fixing PostgreSQL queries ===\n');
files.forEach(file => {
    if (fs.existsSync(file)) {
        fixPostgreSQLQueries(file);
    }
});

console.log('\n✅ Done!');
