const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  'style={{ background: C.bgDark, color: C.textPri }}',
  "style={{ background: C.bgDark, color: C.textPri, '--bg-panel': C.bgPanel, '--bg-surface': C.bgSurface, '--bg-card': C.bgCard, '--border': C.border, '--border-focus': C.borderFocus, '--accent': C.accent, '--accent-L': C.accentL, '--text-pri': C.textPri, '--text-sec': C.textSec, '--text-muted': C.textMuted }}"
);

fs.writeFileSync('src/App.jsx', code);
console.log('updated!');
