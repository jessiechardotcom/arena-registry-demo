const { arenaRequest } = require("./lib/arena");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { claimId } = body;
  if (!claimId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Claim ID required" }) };

  const metadata = {
    claimed: false,
    claimed_by: "",
    claimed_email: "",
    claimed_at: "",
    gift_note: "",
    tracking_number: "",
  };

  try {
    const { status, body: updated } = await arenaRequest("PUT", `/blocks/${claimId}`, { metadata });
    if (status >= 400) {
      console.error("unclaim.js error:", updated);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Failed to unclaim" }) };
    }
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("unclaim.js error:", err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Failed to unclaim" }) };
  }
};
