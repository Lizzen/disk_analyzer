
const fs = require("fs");
let c = fs.readFileSync("frontend/src/components/modals/SettingsModal.jsx","utf8");
c = c.replace(/style={{ background: C\.bgCard,\s*/g, "className=\"glass-card\" style={{ ");
c = c.replace(/style={{\s*background: C\.bgSurface,\s*/g, "className=\"glass-surface\" style={{ ");
c = c.replace(/style={{ background: C\.bgCard2,\s*/g, "className=\"glass-card\" style={{ ");
fs.writeFileSync("frontend/src/components/modals/SettingsModal.jsx", c);
console.log("Done");

