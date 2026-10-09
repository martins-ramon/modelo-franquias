const { cpSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');

// public/ é gerado: nunca copiar o repositório inteiro para a área pública.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log('Build concluído: public/index.html e public/assets/');
