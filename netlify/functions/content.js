// GET: public — merged content for the site + chat assistant.
// PUT: console session required — saves edits to Netlify Blobs.
const U = require("./_shared/util.js");

exports.handler = async (event) => {
  U.init(event);
  try {
  if (event.httpMethod === "GET") {
    const c = await U.getContent();
    return U.json(200, c);
  }
  if (event.httpMethod === "PUT") {
    if (!U.verifySession(U.bearer(event))) return U.json(401, { error: "Session expired — log in again." });
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return U.json(400, { error: "Bad request" }); }
    const saved = await U.putContent(body);
    return U.json(200, saved);
  }
  return U.json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("content handler crash", err);
    return U.json(500, { error: "Server error in content — check the function logs in Netlify." });
  }
};
