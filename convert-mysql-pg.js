// Smart MySQL to PostgreSQL converter
const fs = require('fs');
const path = require('path');

function convertQuery(content) {
    // Step 1: Replace [rows] destructuring with proper pg pattern
    content = content.replace(
        /const\s+\[rows\]\s*=\s*await\s+pool\.query\(/g,
        'const _pgResult = await pool.query('
    );
    
    content = content.replace(
        /\[rows\]\s*=\s*await\s+pool\.query\(/g,
        'let _pgResult = await pool.query('
    );

    // Step 2: Add rows extraction after each query
    // Match pattern: const _pgResult = await pool.query(...);
    const queryMatches = [...content.matchAll(/(_pgResult\s*=\s*await\s+pool\.query\([^;]+\);)/g)];
    
    queryMatches.reverse().forEach(match => {
        const insertPos = match.index + match[0].length;
        const before = content.substring(0, insertPos);
        const after = content.substring(insertPos);
        
        // Check if rows variable already exists after this query
        if (!after.substring(0, 100).includes('const rows =') && !after.substring(0, 100).includes('let rows =')) {
            content = before + '\n        const rows = _pgResult.rows;' + after;
        }
    });

    // Step 3: Convert ? placeholders to $1, $2, etc
    // Find all pool.query calls with parameters
    const regex = /pool\.query\(\s*[`'"]([\s\S]*?)[`'"],\s*\[([^\]]*)\]/g;
    let matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.push({
            full: match[0],
            sql: match[1],
            params: match[2],
            index: match.index
        });
    }

    // Process in reverse order to maintain positions
    matches.reverse().forEach(m => {
        let paramCount = 1;
        const newSql = m.sql.replace(/\?/g, () => `$${paramCount++}`);
        const newQuery = m.full.replace(m.sql, newSql);
        content = content.substring(0, m.index) + newQuery + content.substring(m.index + m.full.length);
    });

    // Step 4: MySQL functions to PostgreSQL
    content = content.replace(/IFNULL\(/g, 'COALESCE(');
    content = content.replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
    
    // Step 5: Error codes
    content = content.replace(/'ER_BAD_FIELD_ERROR'/g, "'42703'");
    content = content.replace(/'ER_DUP_ENTRY'/g, "'23505'");
    content = content.replace(/'ER_NO_SUCH_TABLE'/g, "'42P01'");
    content = content.replace(/'ER_BAD_DB_ERROR'/g, "'3D000'");

    return content;
}

function convertFile(filePath) {
    console.log(`Converting: ${path.basename(filePath)}`);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    content = convertQuery(content);
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Converted: ${path.basename(filePath)}`);
        return true;
    } else {
        console.log(`⏭️  Skipped (no changes): ${path.basename(filePath)}`);
        return false;
    }
}

// Convert all controllers except authController (already done)
const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir)
    .filter(f => f.endsWith('.js') && f !== 'authController.js')
    .map(f => path.join(controllersDir, f));

console.log('=== Converting MySQL to PostgreSQL ===\n');
let converted = 0;
files.forEach(file => {
    if (convertFile(file)) converted++;
});

console.log(`\n=== Conversion Complete: ${converted}/${files.length} files converted ===`);
