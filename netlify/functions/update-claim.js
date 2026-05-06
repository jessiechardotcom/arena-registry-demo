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

  const { claimId, claimedBy, giftNote, trackingNumber } = body;
  if (!claimId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Claim ID required" }) };

  const metadata = {};
  if (claimedBy !== undefined) metadata.claimed_by = String(claimedBy).slice(0, 256);
  if (giftNote !== undefined) metadata.gift_note = String(giftNote).slice(0, 1000);
  if (trackingNumber !== undefined) metadata.tracking_number = String(trackingNumber).slice(0, 256);

  try {
    const { status, body: updated } = await arenaRequest("PUT", `/blocks/${claimId}`, { metadata });
    if (status >= 400) {
      console.error("update-claim.js error:", updated);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Failed to update claim" }) };
    }
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("update-claim.js error:", err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Failed to update claim" }) };
  }
};
