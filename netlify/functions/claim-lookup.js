const { TOKEN, fetchAllBlocks, parseDesc } = require("./lib/arena");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };

  const email = event.queryStringParameters?.email;
  if (!email) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Email required" }) };

  try {
    const blocks = await fetchAllBlocks();

    const claims = blocks
      .filter((block) => block.metadata?.claimed_email === email)
      .map((block) => {
        const meta = block.metadata || {};
        const desc = parseDesc(block.description);
        return {
          claimId: String(block.id),
          itemId: String(block.id),
          itemName: block.title || "Unknown item",
          itemPrice: desc.price ?? (meta.price != null ? Number(meta.price) : null),
          itemUrl: meta.product_url || (block.type !== "Image" ? block.source?.url : "") || "",
          itemImage: block.image?.large?.src || block.image?.medium?.src || block.image?.original?.url || meta.image_url || null,
          itemNotes: desc.notes || meta.notes || "",
          claimedBy: meta.claimed_by || "",
          quantity: 1,
          quantityWanted: 1,
          maxQuantity: 1,
          giftNote: meta.gift_note || "",
          trackingNumber: meta.tracking_number || "",
          dateClaimed: meta.claimed_at || "",
        };
      });

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ claims }) };
  } catch (err) {
    console.error("claim-lookup.js error:", err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message || "Failed to look up claims" }) };
  }
};
