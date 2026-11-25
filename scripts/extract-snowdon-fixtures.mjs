import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const commit = "8ff49a1eabeb1c9ae95c743d66815f310a9f2da3";
const base = "frontend 2nd partial submission v2/fixtures/snowdon/";
const files = [
  "run_001_baseline_v01b.json",
  "run_002_v02b.json",
  "decision_accept.json",
  "log.json",
];

for (const file of files) {
  const spec = `${commit}:${base}${file}`;
  const data = execFileSync("git", ["show", spec], { maxBuffer: 80 * 1024 * 1024 });
  writeFileSync(`public/fixtures/snowdon/${file}`, data);
  JSON.parse(data.toString("utf8"));
  console.log(`${file} ${data.length} bytes ok`);
}