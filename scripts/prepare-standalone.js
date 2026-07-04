const fs = require("fs");
const path = require("path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(standaloneDir)) {
  console.warn("[prepare-standalone] No standalone output — skipping.");
  process.exit(0);
}

copyDir(staticDir, path.join(standaloneDir, ".next", "static"));
copyDir(publicDir, path.join(standaloneDir, "public"));

const pkgPath = path.join(standaloneDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.scripts = { ...pkg.scripts, start: "node server.js" };
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log("[prepare-standalone] Ready for Azure deploy.");
