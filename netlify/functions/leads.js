// POST: public, rate-limited — callback requests from the site chat widget.
// GET: console session required — newest-first lead list.
const U = require("./_shared/util.js");

exports.handler = async (event) => {
  U.init(event);
  try {
  if (event.httpMethod === "POST") {
    if (!(await U.rateLimit(event, "lead", 5))) return U.json(429, { error: "Too many requests — please call us instead." });
    let b;
    try { b = JSON.parse(event.body || "{}"); } catch { return U.json(400, { error: "Bad request" }); }
    const name = String(b.name || "").trim().slice(0, 80);
    const phone = String(b.phone || "").trim().slice(0, 25);
    const note = String(b.note || "").trim().slice(0, 300);
    if (!name || phone.replace(/\D/g, "").length < 10) return U.json(400, { error: "Name and a full phone number are required." });

    let leads = [];
    try { leads = (await U.store().get("leads", { type: "json" })) || []; } catch { leads = []; }
    leads.unshift({ name, phone, note, ts: new Date().toISOString(), source: "site-chat" });
    await U.store().set("leads", JSON.stringify(leads.slice(0, 200)));
    return U.json(200, { ok: true });
  }

  if (event.httpMethod === "GET") {
    if (!U.verifySession(U.bearer(event))) return U.json(401, { error: "Session expired — log in again." });
    let leads = [];
    try { leads = (await U.store().get("leads", { type: "json" })) || []; } catch { leads = []; }
    return U.json(200, { leads });
  }

  return U.json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("leads handler crash", err);
    return U.json(500, { error: "Server error in leads — check the function logs in Netlify." });
  }
};
