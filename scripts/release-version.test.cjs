const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const current = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const [major, minor, patch] = current.split(".").map(Number);
const next = `${major}.${minor}.${patch + 1}`;
const other = `${major}.${minor}.${patch + 2}`;
const files = [
  "release.sh",
  "scripts/release-version.cjs",
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "src/app/shared/components/footer/footer.component.html",
];

function run(cwd, command, args, input) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", input });
  if (result.error) throw result.error;
  return result;
}

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const file of files) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  return dir;
}

function succeeds(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

test("updates all release versions without changing dependency versions", (t) => {
  const dir = fixture(t);
  const before = fs.readFileSync(path.join(dir, "src-tauri/Cargo.lock"), "utf8");
  succeeds(run(dir, "node", ["scripts/release-version.cjs", "update", next]));
  succeeds(run(dir, "node", ["scripts/release-version.cjs", "check", next]));
  const after = fs.readFileSync(path.join(dir, "src-tauri/Cargo.lock"), "utf8");
  assert.equal(after, before.replace(`name = "GithubSecurityAlerts"\nversion = "${current}"`, `name = "GithubSecurityAlerts"\nversion = "${next}"`));
  const mismatch = run(dir, "node", ["scripts/release-version.cjs", "check", other]);
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /Tag version .* does not match/);
});

test("refuses inconsistent input without changing files", (t) => {
  const dir = fixture(t);
  const tauriPath = path.join(dir, "src-tauri/tauri.conf.json");
  fs.writeFileSync(tauriPath, fs.readFileSync(tauriPath, "utf8").replace(`"version": "${current}"`, `"version": "${other}"`));
  const before = files.map((file) => fs.readFileSync(path.join(dir, file), "utf8"));
  const result = run(dir, "node", ["scripts/release-version.cjs", "update", next]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Version mismatch/);
  assert.deepEqual(files.map((file) => fs.readFileSync(path.join(dir, file), "utf8")), before);
});

test("release script creates a matching commit and tag and rejects dirty worktrees", (t) => {
  const dir = fixture(t);
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), "release-remote-"));
  t.after(() => fs.rmSync(remote, { recursive: true, force: true }));
  for (const args of [
    ["init", "-b", "main"],
    ["config", "user.name", "Release Test"],
    ["config", "user.email", "release-test@example.invalid"],
    ["config", "commit.gpgsign", "false"],
    ["add", "."],
    ["commit", "-m", "Initial commit"],
    ["init", "--bare", remote],
    ["remote", "add", "origin", remote],
    ["push", "-u", "origin", "main"],
  ]) succeeds(run(dir, "git", args));

  fs.writeFileSync(path.join(dir, "unrelated.txt"), "unrelated");
  const dirty = run(dir, "./release.sh", [next], "y\n");
  assert.notEqual(dirty.status, 0);
  assert.match(dirty.stderr, /working tree must be clean/);
  fs.unlinkSync(path.join(dir, "unrelated.txt"));

  succeeds(run(dir, "git", ["tag", `v${other}`]));
  const existing = run(dir, "./release.sh", [other], "y\n");
  assert.notEqual(existing.status, 0);
  assert.match(existing.stderr, /already exists/);
  assert.equal(run(dir, "git", ["status", "--porcelain"]).stdout.trim(), "");

  succeeds(run(dir, "./release.sh", [next], "y\n"));
  succeeds(run(dir, "node", ["scripts/release-version.cjs", "check", next]));
  assert.equal(run(dir, "git", ["tag", "--points-at", "HEAD"]).stdout.trim(), `v${next}`);
  assert.equal(run(dir, "git", ["status", "--porcelain"]).stdout.trim(), "");
});
