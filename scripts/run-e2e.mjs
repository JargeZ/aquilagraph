import { spawnSync } from "node:child_process";
import process from "node:process";

const env = { ...process.env };
delete env.PLAYWRIGHT_BROWSERS_PATH;

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: false });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

run("npm", ["run", "build:vite:pwa"]);
run("npx", ["playwright", "install", "chromium"]);
run("npx", [
  "start-server-and-test",
  "npm run preview:e2e",
  "http://127.0.0.1:4141",
  "npm run test --prefix ./e2e",
]);
