
const fs = require("fs");
let c = fs.readFileSync("frontend/src/components/modals/SettingsModal.jsx","utf8");

// Convert multiline styles
c = c.replace(/style={{\s*background:\s*C\.bgSurface,([^}]*)}}/g, "className=\"glass-surface\" style={{$1}}");

c = c.replace(/className=\"([^\"]+)\"\s*style={{\s*background:\s*C\.bgCard,\s*([^}]*)}}/g, "className=\"$1 glass-card\" style={{$2}}");

c = c.replace(/style={{\s*background:\s*C\.bgCard,\s*([^}]*)}}\s*className=\"([^\"]+)\"/g, "style={{$1}} className=\"$2 glass-card\"");

fs.writeFileSync("frontend/src/components/modals/SettingsModal.jsx", c);
console.log("Replaced multi-line bg surface/card!");

