const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const esbuild = require("esbuild");

const assetDirectory = ".client-assets";
const assetUrlPrefix = "/assets/";

async function buildClientAssets(root) {
  const outdir = path.join(root, assetDirectory);
  await fs.mkdir(outdir, { recursive: true });
  const pages = {};
  const entries = { app: "client/core.js", login: "client/login.js" };
  const virtualCss = {};
  for (const [name, file] of [["app", "index.html"], ["login", "login.html"]]) {
    const html = await fs.readFile(path.join(root, file), "utf8");
    const styles = [...html.matchAll(/<link rel="stylesheet" href="(\/[^\"]+)"\s*\/>/g)].map(match => match[1]);
    virtualCss[`${name}-styles`] = styles.filter(url => url !== "/styles/features/template-editor.css");
    entries[`${name}-styles`] = `virtual:${name}-styles`;
    pages[name] = html;
  }
  entries["editor-styles"] = "styles/features/template-editor.css";
  entries["editor-runtime-styles"] = "client/template-editor-runtime/client/template-editor-runtime/template-editor-runtime.css";
  const result = await esbuild.build({
    absWorkingDir: root, entryPoints: entries, outdir, bundle: true, splitting: true,
    format: "esm", platform: "browser", target: "es2020", minify: true,
    entryNames: "[name]-[hash]", chunkNames: "chunk-[hash]", assetNames: "media-[hash]",
    metafile: true, write: false, publicPath: assetUrlPrefix, legalComments: "none",
    loader: { ".png": "file", ".svg": "file", ".woff2": "file", ".jpg": "file" },
    plugins: [{ name: "page-styles", setup(build) {
      build.onResolve({ filter: /^virtual:/ }, args => ({ path: args.path.slice(8), namespace: "page-styles" }));
      build.onLoad({ filter: /.*/, namespace: "page-styles" }, args => ({
        contents: virtualCss[args.path].map(url => `@import ${JSON.stringify(`.${url}`)};`).join("\n"),
        resolveDir: root, loader: "css",
      }));
    } }],
  });
  const urls = {};
  for (const [file, metadata] of Object.entries(result.metafile.outputs)) {
    if (metadata.entryPoint) {
      const key = Object.keys(entries).find(key => entries[key] === metadata.entryPoint || metadata.entryPoint === `page-styles:${key}`);
      if (key) urls[key] = assetUrlPrefix + path.basename(file);
    }
  }
  // Retain previous hashed files so tabs opened before an update can finish loading.
  await Promise.all(result.outputFiles.map(file => fs.writeFile(file.path, file.contents)));
  async function emit(name, extension, contents) {
    const hash = crypto.createHash("sha256").update(contents).digest("hex").slice(0, 16);
    const file = `${name}-${hash}.${extension}`;
    await fs.writeFile(path.join(outdir, file), contents);
    return assetUrlPrefix + file;
  }
  const runtimeRoot = path.join(root, "client/template-editor-runtime");
  const manifest = require(path.join(runtimeRoot, "client/template-editor-runtime/manifest.js"));
  const scripts = await Promise.all(manifest.requiredScripts.map(file => fs.readFile(path.resolve(runtimeRoot, file), "utf8")));
  const runtime = await esbuild.transform(scripts.join("\n;\n"), { minify: true, target: "es2020", legalComments: "none" });
  urls.runtime = await emit("editor-runtime", "js", runtime.code);
  const config = await esbuild.transform(await fs.readFile(path.join(root, "shared/app-config.js"), "utf8"), { minify: true, target: "es2020" });
  urls.config = await emit("config", "js", config.code);
  const logo = await fs.readFile(path.join(root, "client/assets/logo.png"));
  urls.logo = await emit("logo", "png", logo);
  const settings = JSON.stringify({ runtimeScript: urls.runtime, runtimeStyles: urls["editor-runtime-styles"], editorStyles: urls["editor-styles"] }).replaceAll("<", "\\u003c");
  for (const name of Object.keys(pages)) {
    pages[name] = pages[name]
      .replace(/<link rel="stylesheet" href="\/[^\"]+"\s*\/>/g, "")
      .replace("</head>", `<link rel="stylesheet" href="${urls[`${name}-styles`]}" />\n<script>window.ExamListAssets=${settings};</script>\n</head>`)
      .replaceAll('/client/assets/logo.png', urls.logo)
      .replace('/shared/app-config.js', urls.config)
      .replace('/client/core.js', urls.app)
      .replace('/client/login.js', urls.login);
  }
  return { pages, urls, outdir, metafile: result.metafile, runtimeScriptCount: scripts.length };
}

module.exports = { assetDirectory, assetUrlPrefix, buildClientAssets };
