const fs = require("node:fs");

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const [action, expected] = process.argv.slice(2);

function fail(message) {
  throw new Error(message);
}

function replaceOnce(content, pattern, replacement, file) {
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) {
    fail(`Expected exactly one version in ${file}, found ${matches.length}`);
  }
  return content.replace(pattern, replacement);
}

function loadVersions() {
  const files = {
    package: "package.json",
    lock: "package-lock.json",
    tauri: "src-tauri/tauri.conf.json",
    cargo: "src-tauri/Cargo.toml",
    cargoLock: "src-tauri/Cargo.lock",
    footer: "src/app/shared/components/footer/footer.component.html",
  };
  const contents = Object.fromEntries(
    Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
  );
  const packageJson = JSON.parse(contents.package);
  const lock = JSON.parse(contents.lock);
  const tauri = JSON.parse(contents.tauri);
  const cargo = contents.cargo.match(/^\[package\]\r?\n(?:(?!\[)[^\n]*\n)*?version = "([^"]+)"/m);
  const cargoLock = contents.cargoLock.match(/^\[\[package\]\]\r?\nname = "GithubSecurityAlerts"\r?\nversion = "([^"]+)"/m);
  const footer = [...contents.footer.matchAll(/>v([^<]+)</g)];
  if (!cargo || !cargoLock || footer.length !== 1 || !lock.packages?.[""]) {
    fail("Could not identify all release versions");
  }
  const versions = {
    [files.package]: packageJson.version,
    [files.lock]: lock.version,
    [`${files.lock} (root package)`]: lock.packages[""].version,
    [files.tauri]: tauri.version,
    [files.cargo]: cargo[1],
    [files.cargoLock]: cargoLock[1],
    [files.footer]: footer[0][1],
  };
  const current = packageJson.version;
  for (const [file, version] of Object.entries(versions)) {
    if (typeof version !== "string" || !versionPattern.test(version) || version !== current) {
      fail(`Version mismatch in ${file}: expected ${current}, found ${version}`);
    }
  }
  return { files, contents, current };
}

function updateVersions(files, contents, current, next) {
  if (current === next) fail(`Version is already ${next}`);
  const jsonVersion = /(^\s*"version":\s*")([^"]+)(")/gm;
  const updateJsonVersion = (content, file, count) => {
    let replaced = 0;
    const updated = content.replace(jsonVersion, (match, prefix, version, suffix) => {
      if (version === current && replaced < count) {
        replaced++;
        return `${prefix}${next}${suffix}`;
      }
      return match;
    });
    if (replaced !== count) fail(`Could not update versions in ${file}`);
    return updated;
  };

  contents.package = updateJsonVersion(contents.package, files.package, 1);
  contents.lock = updateJsonVersion(contents.lock, files.lock, 2);
  contents.tauri = updateJsonVersion(contents.tauri, files.tauri, 1);
  contents.cargo = replaceOnce(contents.cargo, /^(\[package\]\r?\n(?:(?!\[)[^\n]*\n)*?version = ")[^"]+(")/gm, `$1${next}$2`, files.cargo);
  contents.cargoLock = replaceOnce(contents.cargoLock, /^(\[\[package\]\]\r?\nname = "GithubSecurityAlerts"\r?\nversion = ")[^"]+(")/gm, `$1${next}$2`, files.cargoLock);
  contents.footer = replaceOnce(contents.footer, />v[^<]+</g, `>v${next}<`, files.footer);

  const packageJson = JSON.parse(contents.package);
  const lock = JSON.parse(contents.lock);
  const tauri = JSON.parse(contents.tauri);
  if (packageJson.version !== next || lock.version !== next || lock.packages[""].version !== next || tauri.version !== next) {
    fail("Could not update the expected JSON version fields");
  }
  for (const [key, file] of Object.entries(files)) fs.writeFileSync(file, contents[key]);
}

try {
  if (!["check", "update"].includes(action) || (action === "update" && !expected) ||
      (expected && !versionPattern.test(expected)) || process.argv.length > 4) {
    fail("Usage: node scripts/release-version.cjs check [version] | update <version>");
  }
  const { files, contents, current } = loadVersions();
  if (action === "update") {
    updateVersions(files, contents, current, expected);
    console.log(`Updated release versions: ${current} -> ${expected}`);
  } else {
    if (expected && current !== expected) fail(`Tag version ${expected} does not match application version ${current}`);
    console.log(`Release versions match: ${current}`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
