const fs=require("fs"); const c=fs.readFileSync("frontend/src/App.jsx","utf8"); console.log("Input:", (c.match(/C\.bgInput/g)||[]).length); console.log("Hover:", (c.match(/C\.bgHover/g)||[]).length);
