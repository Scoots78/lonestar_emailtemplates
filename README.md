# Email Builder (complete) — Backend + React editor + /assets

## Dev: backend
```bash
npm install
npm run dev
```

- Backend runs at http://localhost:3001
- Static assets served from /assets (folder: ./public)

## Dev: frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Build frontend into backend
```bash
npm run build:frontend
npm run serve:frontend
```
Then open http://localhost:3001 (editor served by backend).

## Automated Build & Release

The repository now includes a **one-command** build system that
validates, tests and packages the entire application for Plesk
deployment.

```bash
# run from repository root
npm run release          # ⇒ creates ./deploy/lonestar_email_builder.{zip,tar.gz}
```

What `npm run release` does:

1. Runs the Vite production build inside `frontend/`
2. Copies backend, data, public assets and fresh frontend build into
   `deploy/app`
3. Spins up the app on a temporary port, hits `/health` + `/api/venues`
   to make sure the build works
4. Generates Linux-compatible **ZIP** and **TAR.GZ** archives
5. Writes updated deployment guides (`DEPLOY_README.md`,
   `PLESK_SETUP_GUIDE.md`, `QUICK_FIX_500_ERROR.md`)

The resulting archives are the only files you need to upload to Plesk.

### Primary npm scripts

| Script                | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `dev`                 | Start backend (port 3001)                            |
| `build:frontend`      | Vite SPA production build                            |
| `serve:frontend`      | Serve built SPA through backend                      |
| `package`             | Build **and** create deploy artefacts (no tests)     |
| `test:build`          | Run build validation only (CI smoke-test)            |
| `release`             | `build:frontend` → `package` in one go               |

> CI in `.github/workflows/build-and-test.yml` runs `test:build` on every
> PR and tag, guaranteeing that broken packages never reach production.

## Deployment (quick recap)

1. **Upload** `lonestar_email_builder.tar.gz` (or .zip) to `/httpdocs`
2. **Extract** – you should now have `/httpdocs/app`
3. **Hosting Settings** → Document-root =`httpdocs/app`
4. **Node.js** (Plesk) → Startup file =`app.js`, click **NPM Install**,
   then **Start**
5. Verify:
   * `/<domain>/health` → `{"status":"ok"}`
   * `/<domain>/api/venues` → JSON array
   * root URL loads the editor UI

Detailed, versioned instructions live in the generated
`deploy/DEPLOY_README.md` and `PLESK_SETUP_GUIDE.md`.

### Render URLs
- http://localhost:3001/render/confirmation?venue=SoulBar
- http://localhost:3001/render/confirmation?venue=BotswanaButchery

### Notes
- Put email images in `public/images/` → they’ll be available at `/assets/images/...`
- In production emails, switch to absolute URLs (e.g. `https://yourdomain.com/assets/images/header.png`)
