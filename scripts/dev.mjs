// Локальный сервер с пересборкой: node scripts/dev.mjs [порт]
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, statSync, watch } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.argv[2] || process.env.PORT || 5173);

const build = () => spawnSync("node", [join(root, "scripts/build.mjs")], { stdio: "inherit", env: { ...process.env, SITE_URL: `http://localhost:${port}` } });
build();

let t;
for (const dir of ["src", "data", "public"]) {
  watch(join(root, dir), { recursive: true }, () => { clearTimeout(t); t = setTimeout(build, 120); });
}

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };

createServer((req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  if (p.endsWith("/")) p += "index.html";
  const file = join(dist, p);
  try {
    const st = statSync(file);
    const type = types[extname(file)] || "application/octet-stream";
    const range = req.headers.range;
    if (range && type.startsWith("video/")) { // Safari требует Range для видео
      const [a, b] = range.replace("bytes=", "").split("-");
      const start = Number(a), end = b ? Number(b) : st.size - 1;
      const buf = readFileSync(file).subarray(start, end + 1);
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": buf.length });
      return res.end(buf);
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Cache-Control": "no-store", "Accept-Ranges": "bytes" });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }); res.end("404");
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
