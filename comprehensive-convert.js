// Comprehensive MySQL to PostgreSQL converter
const fs = require('fs');
const path = require('path');

function convertFile(filePath) {
    console.log(`\n=== Converting ${path.basename(filePath)} ===`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add getDBPool if missing
    if (!content.includes('const getDBPool')) {
        content = `const getDBPool = (req) => req.app.get('dbPool');\n\n` + content;
        modified = true;
        console.log('✓ Added getDBPool helper');
    }

    // Pattern 1: [[{field}]] = await pool.query
    const pattern1Count = (content.match(/const \[\[\{[^\}]+\}\]\] = await pool\.query/g) || []).length;
    if (pattern1Count > 0) {
        content = content.replace(
            /const \[\[\{([^\}]+)\}\]\] = await pool\.query\(([^;]+)\);/g,
            (match, field, query) => {
                const varName = '_pg' + Math.random().toString(36).substr(2, 5);
                return `const ${varName} = await pool.query(${query});\n        const ${field.trim()} = ${varName}.rows[0]?.${field.trim().toLowerCase()} || 0;`;
            }
        );
        modified = true;
        console.log(`✓ Converted ${pattern1Count} [[{field}]] patterns`);
    }

    // Pattern 2: [rows] = await pool.query
    const pattern2Count = (content.match(/const \[rows\] = await pool\.query/g) || []).length;
    if (pattern2Count > 0) {
        content = content.replace(
            /const \[rows\] = await pool\.query\(([^;]+)\);/g,
            (match, query) => {
                return `const _pgResult = await pool.query(${query});\n        const rows = _pgResult.rows;`;
            }
        );
        modified = true;
        console.log(`✓ Converted ${pattern2Count} [rows] patterns`);
    }

    // Pattern 3: [result] = await pool.query for INSERT/UPDATE
    content = content.replace(
        /const \[result\] = await pool\.query\(([^;]+)\);/g,
        (match, query) => {
            return `const _pgResult = await pool.query(${query});\n        const result = _pgResult.rows;`;
        }
    );

    // Pattern 4: Convert ? placeholders to $1, $2, etc
    const queries = [];
    const queryRegex = /pool\.query\(\s*[`'"]([^`'"]+)[`'"],?\s*\[([^\]]*)\]/g;
    let match;
    while ((match = queryRegex.exec(content)) !== null) {
        queries.push({ start: match.index, sql: match[1], full: match[0] });
    }

    queries.reverse().forEach(q => {
        let paramCount = 1;
        const newSql = q.sql.replace(/\?/g, () => `$${paramCount++}`);
        if (newSql !== q.sql) {
            const newQuery = q.full.replace(q.sql, newSql);
            content = content.substring(0, q.start) + newQuery + content.substring(q.start + q.full.length);
            modified = true;
        }
    });

    if (queries.length > 0) {
        console.log(`✓ Converted placeholders in ${queries.length} queries`);
    }

    // Pattern 5: MySQL functions to PostgreSQL
    const fnReplacements = [
        { from: /IFNULL\(/g, to: 'COALESCE(' },
        { from: /NOW\(\)/g, to: 'CURRENT_TIMESTAMP' },
        { from: /CURDATE\(\)/g, to: 'CURRENT_DATE' }
    ];

    fnReplacements.forEach(({ from, to }) => {
        if (from.test(content)) {
            content = content.replace(from, to);
            modified = true;
        }
    });

    // Pattern 6: Error codes
    content = content.replace(/'ER_DUP_ENTRY'/g, "'23505'");
    content = content.replace(/'ER_BAD_FIELD_ERROR'/g, "'42703'");

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${path.basename(filePath)} converted successfully`);
        return true;
    } else {
        console.log(`⏭️  ${path.basename(filePath)} - no changes needed`);
        return false;
    }
}

// Convert all controllers
const controllersDir = path.join(__dirname, 'controllers');
const files = [
    'adminController.js',
    'bookController.js',
    'loanController.js',
    'profileController.js'
].map(f => path.join(controllersDir, f));

console.log('='.repeat(60));
console.log('MySQL to PostgreSQL Comprehensive Converter');
console.log('='.repeat(60));

let convertedCount = 0;
files.forEach(file => {
    if (fs.existsSync(file)) {
        if (convertFile(file)) convertedCount++;
    } else {
        console.log(`❌ File not found: ${file}`);
    }
});

console.log('\n' + '='.repeat(60));
console.log(`Conversion complete: ${convertedCount}/${files.length} files modified`);
console.log('='.repeat(60));
