// Shared utilities for Gloria's console + AI functions.
// Pattern ported from the Lexi Lou admin: Netlify Blobs datastore,
// scrypt password hashing, HMAC-signed session tokens, IP rate limits.
const crypto = require("node:crypto");
const { getStore, connectLambda } = require("@netlify/blobs");

const store = () => getStore("gloria-cms");

// REQUIRED for classic Lambda-style handlers: wires the Blobs environment
// from the invocation event. Call first in every handler.
function init(event) {
  try { if (event) connectLambda(event); } catch (e) { console.error("blobs init", e && e.message); }
}

// ---------- content ----------
const DEFAULT_CONTENT = {
  phone: "720-227-6417",
  heroH1: "A spotless home is a phone call away.",
  heroLede:
    "From family homes and offices to Airbnb turnovers and post-construction cleans — insured & bonded, satisfaction guaranteed, serving the Denver Metro since 2002. Book online or call for a free estimate.",
  badges: ["Insured & Bonded", "Satisfaction guaranteed", "20+ years in business"],
  strip: ["Insured & Bonded", "Serving Colorado since 2002", "Satisfaction guaranteed", "Talk to Gloria directly"],
  areas: ["Highlands Ranch", "Denver Metro Area", "Elizabeth", "Fort Collins", "Loveland"],
  services: [
    { title: "Housekeeping", blurb: "Recurring and one-time home cleaning for houses, townhomes, and apartments — kitchens, baths, floors, and every detail between.",
      items: ["Weekly, bi-weekly & monthly cleans","Kitchens & bathrooms","Dusting, floors & surfaces","Deep cleans","Custom checklists","One-time refreshes"] },
    { title: "Janitorial & Commercial", blurb: "Offices, storefronts, and small commercial spaces kept spotless on a schedule built around your business hours.",
      items: ["Workspaces & common areas","Restrooms & breakrooms","Floors: vacuum, sweep & mop","Trash & recycling","After-hours scheduling","Recurring service available"] },
    { title: "Move-In / Move-Out", blurb: "Empty-home, top-to-bottom cleans that get deposits back and hand new keys to a spotless space.",
      items: ["Inside cabinets & drawers","Appliance interiors","Baseboards & doors","Bath & kitchen detail","Window sills & tracks","Landlord & realtor ready"] },
    { title: "Airbnb & Rental Turnovers", blurb: "Reliable short-term-rental turnovers that keep your listing five-star ready between every guest.",
      items: ["Guest-ready turnovers","Linen & staging reset","Restock checks","Supply & damage notes","Flexible turnover windows","Multi-listing support"] },
    { title: "Multi-Property & HOA", blurb: "Consistent cleaning across portfolios — property managers, HOAs, and owners with more than one door.",
      items: ["Portfolio scheduling","Consistent crews & checklists","Common areas & clubhouses","Vacancy cleans","Single point of contact","Simple consolidated billing"] },
    { title: "Post-Construction Cleaning", blurb: "Final and rough cleans after builds and remodels, so the finished project actually shows finished.",
      items: ["Construction dust removal","Debris & residue clean-up","Window, sill & track detail","Fixture & floor detail","Final cleans before walkthrough","Ready-to-occupy finish"] },
  ],
  addons: [
    { label: "Pet sitting", desc: "Care and company for your pets while you're out." },
    { label: "Pet walking", desc: "Walks for your pets, scheduled around your needs." },
    { label: "Home check-ins", desc: "A quick look-in on your home while you travel." },
    { label: "Plant watering", desc: "Your plants kept watered on schedule." },
    { label: "Lawn & grass watering", desc: "Outdoor watering handled while you're away." },
  ],
  announcement: { enabled: false, text: "" },
  chatExtraFacts: "",
};

async function getContent() {
  try {
    const raw = await store().get("content", { type: "json" });
    return { ...DEFAULT_CONTENT, ...(raw || {}) };
  } catch {
    return { ...DEFAULT_CONTENT };
  }
}

async function putContent(content) {
  const clean = {
    phone: String(content.phone || DEFAULT_CONTENT.phone).slice(0, 20),
    heroH1: String(content.heroH1 || "").slice(0, 120) || DEFAULT_CONTENT.heroH1,
    heroLede: String(content.heroLede || "").slice(0, 400) || DEFAULT_CONTENT.heroLede,
    badges: (Array.isArray(content.badges) ? content.badges : DEFAULT_CONTENT.badges)
      .slice(0, 3).map((s) => String(s).slice(0, 40)),
    strip: (Array.isArray(content.strip) ? content.strip : DEFAULT_CONTENT.strip)
      .slice(0, 4).map((s) => String(s).slice(0, 40)),
    areas: (Array.isArray(content.areas) ? content.areas : DEFAULT_CONTENT.areas)
      .slice(0, 12).map((s) => String(s).slice(0, 40)).filter(Boolean),
    services: (Array.isArray(content.services) ? content.services : DEFAULT_CONTENT.services)
      .slice(0, 6).map((s, i) => ({
        title: String((s && s.title) || DEFAULT_CONTENT.services[i].title).slice(0, 60),
        blurb: String((s && s.blurb) || "").slice(0, 260) || DEFAULT_CONTENT.services[i].blurb,
        items: (Array.isArray(s && s.items) ? s.items : DEFAULT_CONTENT.services[i].items)
          .slice(0, 6).map((x) => String(x).slice(0, 60)),
      })),
    addons: (Array.isArray(content.addons) ? content.addons : DEFAULT_CONTENT.addons)
      .slice(0, 5).map((a, i) => ({
        label: String((a && a.label) || DEFAULT_CONTENT.addons[i].label).slice(0, 40),
        desc: String((a && a.desc) || "").slice(0, 120) || DEFAULT_CONTENT.addons[i].desc,
      })),
    announcement: {
      enabled: !!(content.announcement && content.announcement.enabled),
      text: String((content.announcement && content.announcement.text) || "").slice(0, 160),
    },
    chatExtraFacts: String(content.chatExtraFacts || "").slice(0, 1200),
    updatedAt: new Date().toISOString(),
  };
  await store().set("content", JSON.stringify(clean));
  return clean;
}

// ---------- auth (scrypt + HMAC sessions) ----------
function scryptHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

async function getAuth() {
  try { return await store().get("auth", { type: "json" }); } catch { return null; }
}

async function seedAuth(password, mustChange = true) {
  const salt = crypto.randomBytes(16).toString("hex");
  const rec = { salt, hash: scryptHash(password, salt), mustChange, updatedAt: new Date().toISOString() };
  await store().set("auth", JSON.stringify(rec));
  return rec;
}

function verifyPassword(rec, password) {
  const test = Buffer.from(scryptHash(password, rec.salt), "hex");
  const real = Buffer.from(rec.hash, "hex");
  return test.length === real.length && crypto.timingSafeEqual(test, real);
}

function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET env var not set (16+ chars required)");
  return s;
}

function signSession(hours = 12) {
  const payload = JSON.stringify({ exp: Date.now() + hours * 3600 * 1000, n: crypto.randomBytes(8).toString("hex") });
  const b = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(b).digest("base64url");
  return `${b}.${sig}`;
}

function verifySession(token) {
  try {
    const [b, sig] = String(token || "").split(".");
    const expect = crypto.createHmac("sha256", sessionSecret()).update(b).digest("base64url");
    if (sig !== expect) return false;
    const payload = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    return payload.exp > Date.now();
  } catch { return false; }
}

function bearer(event) {
  const h = event.headers.authorization || event.headers.Authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

// ---------- rate limiting (per-IP, hourly window, Blobs-backed) ----------
async function rateLimit(event, bucket, limit) {
  const ip =
    (event.headers["x-nf-client-connection-ip"] ||
      (event.headers["x-forwarded-for"] || "").split(",")[0] ||
      "unknown").trim();
  const hour = Math.floor(Date.now() / 3600000);
  const key = `rl:${bucket}:${hour}:${ip}`;
  let count = 0;
  try { count = parseInt((await store().get(key)) || "0", 10) || 0; } catch { count = 0; }
  if (count >= limit) return false;
  try { await store().set(key, String(count + 1)); } catch { /* fail open */ }
  return true;
}

// ---------- helpers ----------
const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});

module.exports = {
  init,
  DEFAULT_CONTENT, getContent, putContent,
  getAuth, seedAuth, verifyPassword,
  signSession, verifySession, bearer,
  rateLimit, json, store,
};
