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

### Render URLs
- http://localhost:3001/render/confirmation?venue=SoulBar
- http://localhost:3001/render/confirmation?venue=BotswanaButchery

### Notes
- Put email images in `public/images/` → they’ll be available at `/assets/images/...`
- In production emails, switch to absolute URLs (e.g. `https://yourdomain.com/assets/images/header.png`)
