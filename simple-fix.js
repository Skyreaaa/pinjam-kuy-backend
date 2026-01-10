// Simple PostgreSQL converter - just fix destructuring
const fs = require('fs');
const path = require('path');

function simpleConvert(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Replace [rows] = with result = ... rows = result.rows
    content = content.replace(
        /const \[rows\] = await pool\.query\(/g,
        'const result = await pool.query('
    );
    
    content = content.replace(
        /\[rows\] = await pool\.query\(/g,
        'let result = await pool.query('
    );
    
    // After each pool.query, add rows extraction
    // Find all: const result = await pool.query(...);
    // Add after it: const rows = result.rows;
    const lines = content.split('\n');
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
        newLines.push(lines[i]);
        if (lines[i].includes('const result = await pool.query(') || 
            lines[i].includes('let result = await pool.query(')) {
            // Check if next line already has rows extraction
            if (i + 1 < lines.length && !lines[i + 1].includes('const rows =') && !lines[i + 1].includes('let rows =')) {
                newLines.push('        const rows = result.rows;');
            }
        }
    }
    content = newLines.join('\n');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${path.basename(filePath)}`);
    }
}

['adminController.js', 'bookController.js', 'loanController.js', 'profileController.js'].forEach(f => {
    simpleConvert(path.join(__dirname, 'controllers', f));
});
