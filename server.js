import express from "express";
import fs from "fs-extra";
import path from "path";
import Handlebars from "handlebars";
import juice from "juice";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// Serve static assets (logos, headers, etc.)
app.use('/assets', express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, "data");
const FRONTEND_DIST = path.join(__dirname, "frontend", "dist");

async function loadTemplate(templateKey) {
  const file = path.join(DATA_DIR, "templates", `${templateKey}.html.hbs`);
  return fs.readFile(file, "utf8");
}

async function loadVenue(venueKey) {
  const file = path.join(DATA_DIR, "venues", `${venueKey}.json`);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function saveVenue(venueKey, payload) {
  const file = path.join(DATA_DIR, "venues", `${venueKey}.json`);
  await fs.writeJson(file, payload, { spaces: 2 });
}

async function listVenues() {
  const dir = path.join(DATA_DIR, "venues");
  const files = await fs.readdir(dir);
  return files.filter(f => f.endsWith(".json")).map(f => path.basename(f, ".json"));
}

async function listTemplates() {
  const dir = path.join(DATA_DIR, "templates");
  const files = await fs.readdir(dir);
  return files.filter(f => f.endsWith(".html.hbs")).map(f => path.basename(f, ".html.hbs"));
}

async function loadSchema(templateKey) {
  const file = path.join(DATA_DIR, "schemas", `${templateKey}.json`);
  if (await fs.pathExists(file)) {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  }
  return null;
}

function inlineCss(html) {
  return juice(html, { applyStyleTags: true, removeStyleTags: false });
}

// Public render endpoint (pasteable HTML)
app.get("/render/:templateKey", async (req, res) => {
  try {
    const { templateKey } = req.params;
    const venue = req.query.venue;
    if (!venue) return res.status(400).send("Missing ?venue param");
    const [tplSrc, vars] = await Promise.all([
      loadTemplate(templateKey),
      loadVenue(venue)
    ]);
    const tpl = Handlebars.compile(tplSrc, { noEscape: true });
    const html = tpl(vars);
    const inlined = inlineCss(html);
    res.set("Content-Type", "text/html; charset=utf-8").send(inlined);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// ----- API for Editor -----

// Venues list
app.get("/api/venues", async (_req, res) => {
  try {
    res.json({ venues: await listVenues() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get venue JSON
app.get("/api/venues/:id", async (req, res) => {
  try {
    const json = await loadVenue(req.params.id);
    res.json(json);
  } catch (e) {
    res.status(404).json({ error: "Venue not found" });
  }
});

// Save venue JSON
app.put("/api/venues/:id", async (req, res) => {
  try {
    await saveVenue(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Templates list
app.get("/api/templates", async (_req, res) => {
  try {
    res.json({ templates: await listTemplates() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Schema for a template
app.get("/api/schema/:templateKey", async (req, res) => {
  try {
    const schema = await loadSchema(req.params.templateKey);
    res.json({ schema });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Preview compile
app.post("/api/preview", async (req, res) => {
  try {
    const { templateKey, venueKey, overrides } = req.body;
    const [tplSrc, base] = await Promise.all([
      loadTemplate(templateKey),
      loadVenue(venueKey)
    ]);
    const vars = { ...base, ...(overrides || {}) };
    const html = Handlebars.compile(tplSrc, { noEscape: true })(vars);
    return res.json({ html: inlineCss(html) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Serve frontend if built
app.use(express.static(FRONTEND_DIST));
app.get("*", async (req, res, next) => {
  const indexHtml = path.join(FRONTEND_DIST, "index.html");
  if (await fs.pathExists(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    next();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Email builder on :${PORT}`));
