const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");

function dependencyFingerprint(root) {
  const hash = crypto.createHash("sha256");
  for (const name of ["package.json", "package-lock.json"]) {
    hash.update(name);
    const file = path.join(root, name);
    hash.update(fs.existsSync(file) ? fs.readFileSync(file) : "missing");
  }
  hash.update(`${process.platform}/${process.arch}/${process.versions.modules}`);
  return hash.digest("hex");
}

function verifyDependencies(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const requireFromRoot = createRequire(path.join(root, "package.json"));
  for (const name of Object.keys(manifest.dependencies || {})) {
    // Check the project's own installation, rather than an ancestor's modules.
    fs.accessSync(path.join(root, "node_modules", name, "package.json"));
    requireFromRoot.resolve(name);
  }
  // A package directory alone does not guarantee the platform binary is installed.
  const result = spawnSync(process.execPath, ["-e",
    'require("esbuild").transformSync("const ready = true;", { minify: true });'
  ], { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(result.stderr || "The esbuild binary is unavailable.");
  }
}

function installDependencies(root) {
  const command = fs.existsSync(path.join(root, "package-lock.json")) ? "ci" : "install";
  console.log(`Installing dependencies with npm ${command}...`);
  const args = [command, "--include=dev", "--include=optional", "--no-audit", "--no-fund"];
  // npm.cmd needs cmd.exe on Windows. All command arguments here are fixed literals.
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`],
      { cwd: root, stdio: "inherit", windowsHide: true })
    : spawnSync("npm", args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`npm ${command} failed (exit ${result.status}).`);
  }
}

function ensureDependencies(root, { install = installDependencies, verify = verifyDependencies } = {}) {
  const stampPath = path.join(root, "node_modules", ".examlist-dependencies");
  const fingerprint = dependencyFingerprint(root);
  let current = false;
  try {
    current = fs.readFileSync(stampPath, "utf8") === fingerprint;
    if (current) verify(root);
  } catch {
    current = false;
  }
  if (current) {
    console.log("Dependencies are up to date.");
    return false;
  }
  // Invalidate the previous success marker before attempting an update.
  fs.rmSync(stampPath, { force: true });
  install(root);
  verify(root);
  fs.writeFileSync(stampPath, dependencyFingerprint(root));
  console.log("Dependencies are ready.");
  return true;
}

if (require.main === module) {
  try {
    ensureDependencies(path.resolve(__dirname, ".."));
  } catch (error) {
    console.error(`Dependency setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { ensureDependencies, verifyDependencies };
