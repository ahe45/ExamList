const path = require("node:path");
const { buildClientAssets } = require("../server/client-assets");
buildClientAssets(path.resolve(__dirname, "..")).then(result => {
  console.log(`Built client assets; ${result.runtimeScriptCount} editor scripts combined into ${result.urls.runtime}`);
}).catch(error => { console.error(error.message); process.exitCode = 1; });
