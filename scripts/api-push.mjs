// Updates files on ltpng247-blip/cremapp main via the GitHub Contents API.
// Run: GH_TOKEN=xxx bun scripts/api-push.mjs file1 file2 ...
import { readFileSync, writeFileSync } from "node:fs";

const TOKEN = process.env.GH_TOKEN;
const REPO = "ltpng247-blip/cremapp";
const BRANCH = "main";
const FILES = process.argv.slice(2);

const out = [];
const log = (s) => { out.push(s); writeFileSync("scripts/_apipush.txt", out.join("\n") + "\n"); };

(async () => {
  if (!TOKEN) { log("NO TOKEN"); return; }
  if (!FILES.length) { log("NO FILES"); return; }
  for (const path of FILES) {
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
        { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json" } },
      );
      const meta = await getRes.json();
      const sha = meta.sha; // undefined if file doesn't exist yet (will create)
      const b64 = Buffer.from(readFileSync(path)).toString("base64");
      const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Deploy: ${path} (PWA + font resilience)`,
          content: b64,
          ...(sha ? { sha } : {}),
          branch: BRANCH,
        }),
      });
      const putJson = await putRes.json();
      log(`${path}: GET ${getRes.status} -> PUT ${putRes.status} commit ${String(putJson.commit?.sha || "").slice(0, 7)} ${putRes.status >= 400 ? JSON.stringify(putJson).slice(0, 180) : ""}`);
    } catch (e) {
      log(`${path}: ERROR ${e?.message || e}`);
    }
  }
  log("DONE");
})();
