
const fs = require("fs");

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let before = content;

  content = content.replace(/className=\"([^\"]+)\"\s+style={{([^}]*)background:\s*C\.bgPanel,?\s*([^}]*)}}/g, "className=\"$1 glass-panel\" style={{$2 $3}}");
  content = content.replace(/style={{([^}]*)background:\s*C\.bgPanel,?\s*([^}]*)}}\s+className=\"([^\"]+)\"/g, "style={{$1 $2}} className=\"$3 glass-panel\"");

  content = content.replace(/className=\"([^\"]+)\"\s+style={{([^}]*)background:\s*C\.bgSurface,?\s*([^}]*)}}/g, "className=\"$1 glass-surface\" style={{$2 $3}}");
  content = content.replace(/style={{([^}]*)background:\s*C\.bgSurface,?\s*([^}]*)}}\s+className=\"([^\"]+)\"/g, "style={{$1 $2}} className=\"$3 glass-surface\"");

  content = content.replace(/className=\"([^\"]+)\"\s+style={{([^}]*)background:\s*C\.bgCard,?\s*([^}]*)}}/g, "className=\"$1 glass-card\" style={{$2 $3}}");
  content = content.replace(/style={{([^}]*)background:\s*C\.bgCard,?\s*([^}]*)}}\s+className=\"([^\"]+)\"/g, "style={{$1 $2}} className=\"$3 glass-card\"");

  content = content.replace(/style={{\s*}}/g, "");

  if (before !== content) {
    fs.writeFileSync(filePath, content);
    console.log("Updated " + filePath);
  }
};

processFile("frontend/src/App.jsx");
processFile("frontend/src/components/modals/SettingsModal.jsx");

