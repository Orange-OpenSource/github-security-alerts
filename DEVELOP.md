# Development Guide

## ⚡ Quick Start

```bash
git clone https://github.com/Orange-OpenSource/github-security-alerts.git
```

```bash
cd github-security-alerts
```

```bash
npm install && npm start
```

The application should open automatically via Tauri.

## 🧰 Requirements

Make sure you have the following installed:

- Node.js >= 22
- npm >= 10
- Rust (stable)

Tauri prerequisites:
https://v2.tauri.app/start/prerequisites

Check versions:

```bash
node -v
```

```bash
npm -v
```

```bash
rustc -V
```

## 🧑‍💻 Development Mode

### Run full app (Tauri)

```bash
npm start
```

- Launches the desktop app via Tauri
- Includes backend (Rust) + frontend (Angular)

## 🧪 Tests

Run tests:

```bash
npm test
```

Test release version handling:

```bash
node --test scripts/release-version.test.cjs
```

> [!NOTE]
> Test coverage is currently limited. Contributions are welcome.

---

## 🐛 Debugging

- Frontend logs → Browser devtools
- Backend logs → Terminal running the app

Enable verbose logs:

```bash
RUST_LOG=debug npm start
```

## 📦 Build

### Web build

```bash
npm run web:prod
```

Output:
/dist

---

### Desktop app (Tauri)

```bash
npm run tauri:bundle
```

Output:
src-tauri/target/release/bundle/

## Release

From a clean `main` working tree, run `./release.sh 1.2.3` with the new
version. The script pulls the latest changes, checks and updates all release
versions, then asks before creating the commit and tag. Push the commit and tag
to start the release build. If canceled, the version changes remain uncommitted.
The build checks that the tag matches the versions in the repository.

## 📁 Project Structure

| Folder    | Description                         |
| --------- | ----------------------------------- |
| src       | Angular frontend (renderer process) |
| src-tauri | Tauri backend (Rust main process)   |

## 🔄 Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run the app locally
4. Ensure everything builds correctly
5. Submit a Pull Request

## ℹ️ Notes

- Only the `/dist` folder is included in the final bundle
- Prefer `web:serve` for frontend work to improve speed
