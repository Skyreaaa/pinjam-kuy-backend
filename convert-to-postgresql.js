// Auto-convert MySQL syntax to PostgreSQL
const fs = require('fs');
const path = require('path');

function convertFileToPostgreSQL(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: [rows] = await pool.query(...) → result = await pool.query(...); rows = result.rows
    const pattern1 = /\[rows\]\s*=\s*await\s+pool\.query\(([^;]+)\);/g;
    if (pattern1.test(content)) {
        content = content.replace(pattern1, (match, queryPart) => {
            modified = true;
            return `const result = await pool.query(${queryPart});\n        const rows = result.rows;`;
        });
    }

    // Pattern 2: const [rows] = await pool.query(...) → same
    const pattern2 = /const\s+\[rows\]\s*=\s*await\s+pool\.query\(([^;]+)\);/g;
    if (pattern2.test(content)) {
        content = content.replace(pattern2, (match, queryPart) => {
            modified = true;
            return `const result = await pool.query(${queryPart});\n        const rows = result.rows;`;
        });
    }

    // Pattern 3: Replace ? placeholders with $1, $2, etc
    // This is complex - need to count ? in each query
    const queryPattern = /pool\.query\(\s*`([^`]+)`\s*,\s*\[([^\]]*)\]/g;
    const queries = [];
    let match;
    while ((match = queryPattern.exec(content)) !== null) {
        queries.push({ full: match[0], sql: match[1], start: match.index });
    }

    // Process queries in reverse to maintain string positions
    queries.reverse().forEach(q => {
        let newSql = q.sql;
        let paramCount = 1;
        newSql = newSql.replace(/\?/g, () => `$${paramCount++}`);
        
        if (newSql !== q.sql) {
            const newQuery = q.full.replace(q.sql, newSql);
            content = content.substring(0, q.start) + newQuery + content.substring(q.start + q.full.length);
            modified = true;
        }
    });

    // Pattern 4: MySQL specific SQL → PostgreSQL
    content = content.replace(/IFNULL\(/g, 'COALESCE(');
    content = content.replace(/LIMIT\s+\?/g, 'LIMIT $1');
    
    // Pattern 5: Error codes
    content = content.replace(/'ER_BAD_FIELD_ERROR'/g, "'42703'"); // undefined column
    content = content.replace(/'ER_DUP_ENTRY'/g, "'23505'"); // unique violation
    content = content.replace(/'ER_NO_SUCH_TABLE'/g, "'42P01'"); // undefined table

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Converted: ${filePath}`);
        return true;
    }
    return false;
}

// Convert all controllers
const controllersDir = path.join(__dirname, 'controllers');
const controllers = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js') && f !== 'authController.js');

console.log('Converting controllers to PostgreSQL...\n');
controllers.forEach(file => {
    convertFileToPostgreSQL(path.join(controllersDir, file));
});

console.log('\n✅ Conversion complete!');
