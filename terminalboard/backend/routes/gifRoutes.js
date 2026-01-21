// backend/routes/gifRoutes.js
// =========================================================
// TerminalBoard — GIF Routes (Tenor)
// What this file does:
// - Provides REST endpoints that your frontend uses for GIF search
// - Proxies requests to Tenor so your API key stays on the server
//
// Notes:
// - Uses Node 18+ global fetch (no node-fetch required)
// - Requires: process.env.TENOR_API_KEY
// =========================================================

const express = require("express");
const router = express.Router();

// Tenor API base URL (v2)
const TENOR_BASE = "https://tenor.googleapis.com/v2";

/**
 * Basic query cleanup:
 * - force string
 * - trim whitespace
 * - cap length to keep requests tidy
 */
function sanitizeQuery(q) {
  return String(q || "").trim().slice(0, 80);
}

/* =========================================================
   GET /api/gifs/search?q=cat&limit=12
   - Returns a minimal payload for the frontend:
     { results: [ "gifUrl1", "gifUrl2", ... ] }
========================================================= */
router.get("/search", async (req, res) => {
  try {
    const key = process.env.TENOR_API_KEY;
    if (!key) {
      return res.status(500).json({ message: "TENOR_API_KEY not set" });
    }

    const q = sanitizeQuery(req.query.q);
    const limit = Math.min(Number(req.query.limit || 12), 24);

    // Empty query = empty results (keeps frontend logic simple)
    if (!q) return res.json({ results: [] });

    const url = `${TENOR_BASE}/search?q=${encodeURIComponent(
      q
    )}&key=${encodeURIComponent(key)}&limit=${limit}&media_filter=gif`;

    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ message: "Tenor error", detail: t });
    }

    const data = await r.json();

    // Return a minimal payload: list of gif URLs
    const results =
      (data.results || [])
        .map((item) => item?.media_formats?.gif?.url)
        .filter(Boolean) || [];

    res.json({ results });
  } catch (err) {
    console.error("GIF search error:", err);
    res.status(500).json({ message: "Server error searching gifs" });
  }
});

/* =========================================================
   GET /api/gifs/trending?limit=12
   - Optional endpoint for “featured/trending” GIFs
   - Same response shape as /search:
     { results: [ "gifUrl1", "gifUrl2", ... ] }
========================================================= */
router.get("/trending", async (req, res) => {
  try {
    const key = process.env.TENOR_API_KEY;
    if (!key) {
      return res.status(500).json({ message: "TENOR_API_KEY not set" });
    }

    const limit = Math.min(Number(req.query.limit || 12), 24);

    const url = `${TENOR_BASE}/featured?key=${encodeURIComponent(
      key
    )}&limit=${limit}&media_filter=gif`;

    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ message: "Tenor error", detail: t });
    }

    const data = await r.json();

    const results =
      (data.results || [])
        .map((item) => item?.media_formats?.gif?.url)
        .filter(Boolean) || [];

    res.json({ results });
  } catch (err) {
    console.error("GIF trending error:", err);
    res.status(500).json({ message: "Server error loading trending gifs" });
  }
});

module.exports = router;
