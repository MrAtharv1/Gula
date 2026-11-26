import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const tempDir = path.join(root, ".capacitor-temp-excluded");

// Routes incompatible with static `output: "export"` (dev-only API / dynamic metadata routes)
const excludedPaths = [
  "app/api",
  "app/robots.ts",
  "app/sitemap.ts",
];

function moveAside() {
  fs.mkdirSync(tempDir, { recursive: true });
  for (const rel of excludedPaths) {
    const src = path.join(root, rel);
    if (fs.existsSync(src)) {
      const dest = path.join(tempDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
    }
  }
}

function restoreBack() {
  for (const rel of excludedPaths) {
    const src = path.join(tempDir, rel);
    const dest = path.join(root, rel);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
    }
  }
  fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

try {
  console.log("Building static bundle for Android APK (CAPACITOR_EXPORT=1)...");
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  moveAside();
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, CAPACITOR_EXPORT: "1" },
  });
} finally {
  restoreBack();
}

console.log("Syncing static web assets to Capacitor Android project...");
execSync("npx cap sync android", { stdio: "inherit" });
