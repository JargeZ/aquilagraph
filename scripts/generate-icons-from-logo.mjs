import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "logo.svg");
const publicDir = path.join(root, "public");

if (!fs.existsSync(logoPath)) {
  console.error(`Missing ${logoPath}`);
  process.exit(1);
}

function pngSize(size) {
  return sharp(logoPath).resize(size, size).png();
}

await pngSize(192).toFile(path.join(publicDir, "logo192.png"));
await pngSize(512).toFile(path.join(publicDir, "logo512.png"));
await pngSize(180).toFile(path.join(publicDir, "apple-touch-icon.png"));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aquilagraph-icons-"));
try {
  const p16 = path.join(tmp, "16.png");
  const p32 = path.join(tmp, "32.png");
  const p48 = path.join(tmp, "48.png");
  await pngSize(16).toFile(p16);
  await pngSize(32).toFile(p32);
  await pngSize(48).toFile(p48);

  const icoOut = path.join(publicDir, "favicon.ico");
  const tryMagick = () => {
    const a = spawnSync("magick", [p16, p32, p48, icoOut], {
      encoding: "utf8",
    });
    if (a.status === 0) {
      return true;
    }
    const b = spawnSync("convert", [p16, p32, p48, icoOut], {
      encoding: "utf8",
    });
    if (b.status === 0) {
      return true;
    }
    if (a.error?.code === "ENOENT" && b.error?.code === "ENOENT") {
      console.error(
        "ImageMagick not found: install `magick` (IM 7) or `convert` (IM 6) on PATH.",
      );
    } else {
      console.error(a.stderr || b.stderr || "magick/convert failed");
    }
    return false;
  };

  if (!tryMagick()) {
    process.exit(1);
  }
  console.log(
    "Wrote public/logo192.png, logo512.png, apple-touch-icon.png, favicon.ico",
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
