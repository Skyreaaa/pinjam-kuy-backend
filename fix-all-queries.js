const fs = require('fs');
const path = require('path');

function convertToPostgres(filePath) {
    console.log(`\n🔧 Processing: ${path.basename(filePath)}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let changeCount = 0;

    // Remove MySQL transaction patterns
    content = content.replace(/const \[duplicate\] = await (connection|pool)\.query/g, (match) => {
        changeCount++;
        return 'const duplicateResult = await pool.query';
    });
    content = content.replace(/const \[oldBook\] = await (connection|pool)\.query/g, (match) => {
        changeCount++;
        return 'const oldBookResult = await pool.query';
    });
    content = content.replace(/const \[result\] = await (connection|pool)\.query/g, (match) => {
        changeCount++;
        return 'const result = await pool.query';
    });
    content = content.replace(/const \[columns\] = await (connection|pool)\.query/g, (match) => {
        changeCount++;
        return 'const columnsResult = await pool.query';
    });

    // Fix duplicate.length checks
    content = content.replace(/if \(duplicate\.length > 0\)/g, 'if (duplicateResult.rows && duplicateResult.rows.length > 0)');
    content = content.replace(/if \(oldBook\.length === 0\)/g, 'if (!oldBookResult.rows || oldBookResult.rows.length === 0)');
    
    // Fix data access
    content = content.replace(/oldBook\[0\]/g, 'oldBookResult.rows[0]');
    content = content.replace(/columns\.map\(col => col\.COLUMN_NAME\)/g, 'columnsResult.rows.map(col => col.column_name)');

    // Remove MySQL transaction code
    content = content.replace(/let connection;/g, '// PostgreSQL uses pool directly');
    content = content.replace(/connection = await pool\.getConnection\(\);/g, '// No getConnection needed');
    content = content.replace(/await connection\.beginTransaction\(\);/g, '// No transactions for now');
    content = content.replace(/await connection\.rollback\(\);/g, '// No rollback');
    content = content.replace(/await connection\.commit\(\);/g, '// No commit');
    content = content.replace(/connection\.release\(\);/g, '// No release');
    
    // Replace connection.query with pool.query
    content = content.replace(/await connection\.query\(/g, 'await pool.query(');

    // Remove DATABASE() function - PostgreSQL doesn't have it
    content = content.replace(/WHERE TABLE_SCHEMA = DATABASE\(\)/g, "WHERE TABLE_SCHEMA = 'public'");
    content = content.replace(/TABLE_NAME = 'books'/g, "TABLE_NAME = 'books'");

    // Fix INSERT placeholders with dynamic builder
    const insertMatches = content.match(/const insertQuery = `INSERT INTO \w+ \([^)]+\) VALUES \([^)]+\)`/g);
    if (insertMatches) {
        insertMatches.forEach(match => {
            if (match.includes('$1')) return; // Already converted
            const newMatch = match.replace(/\$1/g, (m, idx) => {
                const count = (match.match(/\$1/g) || []).length;
                let result = match;
                for (let i = 1; i <= count; i++) {
                    result = result.replace('$1', `$${i}`);
                }
                return result;
            });
            // Fix the dynamic placeholder generation
            content = content.replace(
                /columnsToInsert\.map\(\(\) => '\$1'\)/g,
                'columnsToInsert.map((_, i) => `$${i+1}`)'
            );
            changeCount++;
        });
    }

    // Fix UPDATE queries with ? placeholders
    content = content.replace(
        /(updates\.push\('[^']+)(\?)/g,
        (match, before, q) => {
            // Convert to use $n placeholders - will fix dynamically
            return before + '$PH';
        }
    );

    // Fix all remaining ? in queries by counting and replacing sequentially
    const queryPattern = /pool\.query\(\s*['"`]([^'"`]+?)['"`]\s*,\s*\[/g;
    let matches = [];
    let match;
    while ((match = queryPattern.exec(content)) !== null) {
        matches.push({ index: match.index, sql: match[1] });
    }
    
    matches.reverse().forEach(m => {
        if (!m.sql.includes('?')) return;
        let paramNum = 1;
        const newSql = m.sql.replace(/\?/g, () => `$${paramNum++}`);
        content = content.substring(0, m.index) + content.substring(m.index).replace(m.sql, newSql);
        changeCount++;
    });

    // Fix result.insertId to result.rows[0].id for PostgreSQL
    content = content.replace(/result\.insertId/g, 'result.rows[0]?.id');
    
    // Fix affectedRows
    content = content.replace(/result\.affectedRows/g, 'result.rowCount');

    if (changeCount > 0) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Made ${changeCount} changes`);
        return true;
    } else {
        console.log('⏭️  No changes needed');
        return false;
    }
}

const files = [
    path.join(__dirname, 'controllers', 'bookController.js'),
    path.join(__dirname, 'controllers', 'adminController.js'),
    path.join(__dirname, 'controllers', 'loanController.js'),
    path.join(__dirname, 'controllers', 'profileController.js')
];

console.log('='.repeat(70));
console.log('Advanced PostgreSQL Query Fixer');
console.log('='.repeat(70));

let fixed = 0;
files.forEach(f => {
    if (fs.existsSync(f)) {
        if (convertToPostgres(f)) fixed++;
    }
});

console.log('\n' + '='.repeat(70));
console.log(`✅ Fixed ${fixed} files`);
console.log('='.repeat(70));
