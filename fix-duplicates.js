const fs = require('fs');
const path = require('path');

function fixDuplicateVariables(filePath) {
    console.log(`🔧 Fixing: ${path.basename(filePath)}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find all _pgResult, _tmpResult declarations and make them unique
    let counter = 1;
    content = content.replace(/const (_pg|_tmp)Result = await pool\.query/g, () => {
        return `const pgResult${counter++} = await pool.query`;
    });
    
    // Now fix references: replace .rows with pgResult1.rows, pgResult2.rows, etc.
    // This is tricky - let's use a different approach: use unique names from the start
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${path.basename(filePath)}`);
}

// Better approach: rewrite to avoid conflicts
function smartFix(filePath) {
    console.log(`\n🔧 Smart fixing: ${path.basename(filePath)}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace all const _pgResult and _tmpResult with result then immediately extract rows
    content = content.replace(/const (_pg|_tmp)Result = await pool\.query\(([^;]+)\);\s*const rows = \1Result\.rows;/g, (match, prefix, query) => {
        modified = true;
        return `const { rows } = await pool.query(${query});`;
    });
    
    // For cases without immediate rows extraction
    let funcCounter = {};
    content = content.replace(/exports\.(\w+) = async[^{]*{/g, (match, funcName) => {
        funcCounter[funcName] = 1;
        return match;
    });
    
    // Replace remaining _pgResult/_tmpResult with unique names per function
    const lines = content.split('\n');
    let currentFunc = null;
    let funcVarCount = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Track current function
        if (line.match(/exports\.(\w+) = async/)) {
            currentFunc = line.match(/exports\.(\w+) = async/)[1];
            funcVarCount = 1;
        }
        
        // Replace variable declarations
        if (line.includes('const _pgResult =') || line.includes('const _tmpResult =')) {
            lines[i] = line.replace(/const (_pg|_tmp)Result/, `const result${funcVarCount}`);
            
            // Also replace usage in next few lines
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                if (lines[j].includes('.rows')) {
                    lines[j] = lines[j].replace(/\1Result\.rows/g, `result${funcVarCount}.rows`);
                    lines[j] = lines[j].replace(/_pgResult\.rows/g, `result${funcVarCount}.rows`);
                    lines[j] = lines[j].replace(/_tmpResult\.rows/g, `result${funcVarCount}.rows`);
                }
                if (lines[j].includes('}') || lines[j].match(/const \w+ =/)) break;
            }
            
            funcVarCount++;
            modified = true;
        }
    }
    
    if (modified) {
        content = lines.join('\n');
        fs.writeFileSync(filePath, content);
        console.log(`✅ Applied ${funcVarCount - 1} fixes`);
        return true;
    }
    
    console.log('⏭️  No changes');
    return false;
}

const file = path.join(__dirname, 'controllers', 'adminController.js');
smartFix(file);
