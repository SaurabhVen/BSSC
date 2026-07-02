const fs = require('fs');
const filePath = 'src/utils/pdf.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The write_to_file tool literally wrote \` and \${
// Let's replace \` with ` and \${ with ${
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\${/g, '${');

fs.writeFileSync(filePath, content);
console.log('Fixed syntax errors in pdf.ts');
