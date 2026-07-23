// Console auth: login (seeds from CONSOLE_SEED_PASSWORD on first use, forced
// change), change-password, and session issuance. LexiLou auth pattern.
const U = require("./_shared/util.js");

exports.handler = async (event) => {
  U.init(event);
  try {
  if (event.httpMethod !== "POST") return U.json(405, { error: "Method not allowed" });
  if (!(await U.rateLimit(event, "auth", 20))) return U.json(429, { error: "Too many attempts — try again later." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return U.json(400, { error: "Bad request" }); }

  const seed = process.env.CONSOLE_SEED_PASSWORD;

  if (body.action === "login") {
    const password = String(body.password || "");
    if (!password) return U.json(400, { error: "Password required" });
    let rec = await U.getAuth();

    // First run (or explicit reset): seed from env, force a change.
    if (!rec || process.env.CONSOLE_FORCE_RESET === "yes") {
      if (!seed) return U.json(500, { error: "CONSOLE_SEED_PASSWORD env var is not set." });
      if (password !== seed) return U.json(401, { error: "Invalid password" });
      rec = await U.seedAuth(seed, true);
    }

    if (!U.verifyPassword(rec, password)) return U.json(401, { error: "Invalid password" });
    return U.json(200, { token: U.signSession(), mustChange: !!rec.mustChange });
  }

  if (body.action === "change") {
    if (!U.verifySession(U.bearer(event))) return U.json(401, { error: "Session expired — log in again." });
    const next = String(body.newPassword || "");
    if (next.length < 10) return U.json(400, { error: "New password must be at least 10 characters." });
    await U.seedAuth(next, false);
    return U.json(200, { ok: true });
  }

  return U.json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("auth handler crash", err);
    return U.json(500, { error: "Server error in auth — check the function logs in Netlify." });
  }
};
