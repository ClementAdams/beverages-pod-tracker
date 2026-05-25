const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('./test_parse.js', 'utf8');

try {
  babel.transformSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'test.jsx'
  });
  console.log('PARSE OK - no syntax errors');
} catch (e) {
  console.log('SYNTAX ERROR:');
  console.log(e.message);
}
