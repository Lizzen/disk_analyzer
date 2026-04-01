const fs=require("fs"); const c=fs.readFileSync("frontend/src/App.jsx","utf8").split("\n"); const i=c.findIndex(l=>l.includes("C.bgSurface")); if(i!==-1)console.log(i, c[i]);
