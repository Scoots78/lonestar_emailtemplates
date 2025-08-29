# Lonestar Email Builder – Development Guide

## 1. Project Overview
This repository hosts a **single-page React editor** and **Node/Express API** for generating venue-specific HTML emails.  
The codebase is split into two workspaces:

```
/frontend   → React + Vite (TypeScript)
/app.js     → Express server (API, render, static)
```

## 2. Using the Automated Build System

| Command | What it does |
|---------|--------------|
| `npm run build:frontend` | Builds only the React SPA |
| `npm run build`          | Alias for the above |
| `npm run package`        | Runs `scripts/build-and-package.js` – produces a complete deployable package under `/deploy` (ZIP + TAR) |
| `npm run test:build`     | Executes the build script in **validation-only** mode (skips packaging when `TEST_ONLY=true`) |
| `npm run release`        | `build:frontend` ➜ `package` in one step |

**What the script does**
1. Validates Node version & directory layout  
2. Installs dependencies in `/frontend`, then runs Vite build  
3. Copies server, data, public assets into `/deploy/app`  
4. Generates `.env`, `.htaccess`, README, Plesk guides  
5. Spins up the app on a test port, hits `/health` & `/api/venues`  
6. Creates `lonestar_email_builder.zip` + `.tar.gz`

## 3. Development Workflow

### Local Dev Servers
```bash
# API + static assets
npm run dev          # node server.js (port 3001)

# React editor (auto-reload)
cd frontend
npm run dev          # vite (port 5173, proxy to 3001)
```
Open `http://localhost:5173`.

### Best Practices
* **ES Modules** everywhere (`type":"module`).
* Keep Vite base set to `/app/` – avoids prod path bugs.
* Use **absolute imports** with `@/` alias (configured in `tsconfig.json`).
* Commit only `.env.example`, **never** real secrets.
* Run `npm run lint` (if ESLint configured) before pushing.

## 4. Git Workflow

1. `main` is protected; all work happens in **feature branches**:  
   `feature/<ticket-id>-short-desc`
2. Follow **Conventional Commits** (`feat:`, `fix:` …) for semantic history.
3. Create a **draft PR** early; CI will run build & unit tests.
4. Merge using **Squash & Merge**; delete branch.

## 5. Testing & Validation

| Layer | Tooling | How to run |
|-------|---------|-----------|
| Unit   | Vitest / Jest (tbd) | `npm test` |
| API integration | Supertest | `npm run test:api` |
| Front-end UI    | Playwright | `npm run test:e2e` |
| Build smoke     | Build script | `npm run test:build` |

### Manual Checklist
- Editor loads and lists venues/templates.
- `/render/<tpl>?venue=<key>` returns inlined HTML (<30 KB).
- Images served under `/assets/…` use **https** absolute URLs.

## 6. Preparing for Production Deployments

1. `git pull --rebase`
2. `npm install`
3. `npm run release`
4. **Upload** the generated archive to Plesk and extract.
5. In Plesk → **Node.js**:
   * Document root: `app`
   * Startup file: `app.js`
   * Env: `NODE_ENV=production`, `PORT=3001`
6. Click **NPM Install** then **Start**.  
   Verify `https://<domain>/health` returns `{"status":"ok"}`.

## 7. Troubleshooting Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| React app shows blank page, console MIME error | Assets served as HTML | Ensure `app.use(['/assets', '/app/assets'], …)` present |
| 500 error on Plesk | Wrong `.htaccess` or doc-root | Use minimal `.htaccess`, set doc-root to `app` |
| `EADDRINUSE` during dev | Port 3001 busy | `PORT=0 node app.js` or kill process |
| Builds fail on CI | Node version mismatch | Use `nvm use 18` |

## 8. Update & Release Checklist

1. Pass all unit/integration tests locally.
2. Ensure `npm run test:build` succeeds.
3. Update **CHANGELOG.md**.
4. Bump version in `package.json` (`npm version patch|minor|major`).
5. Push tag; CI produces artefacts.
6. Deploy to staging Plesk, run smoke test.
7. Promote artefact to production.

---

Happy coding! If you hit a snag, consult the troubleshooting table or open an issue with logs from **`plesk_app.log`** and browser console.
