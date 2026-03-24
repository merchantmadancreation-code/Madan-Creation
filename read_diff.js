const fs = require('fs');
const content = fs.readFileSync('diff.txt', 'utf16le');
console.log(content);
