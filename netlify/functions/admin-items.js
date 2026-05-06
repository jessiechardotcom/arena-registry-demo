const { TOKEN, CHANNEL, fetchAllBlocks, parseDesc } = require("./lib/arena");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };

  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET || event.queryStringParameters?.secret !== ADMIN_SECRET) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!TOKEN || !CHANNEL) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Server misconfiguration" }) };
  }

  try {
    const blocks = await fetchAllBlocks();

    const items = blocks.map((block) => {
      const meta = block.metadata || {};
      const desc = parseDesc(block.description);
      return {
        id: String(block.id),
        arenaUrl: `https://www.are.na/block/${block.id}`,
        name: block.title || "",
        price: desc.price ?? (meta.price != null ? Number(meta.price) : null),
        url: meta.product_url || (block.type !== "Image" ? block.source?.url : "") || "",
        image: block.image?.large?.src || block.image?.medium?.src || meta.image_url || null,
        notes: desc.notes || meta.notes || "",
        claimed: meta.claimed === true,
        claimedBy: meta.claimed_by || "",
        claimedEmail: meta.claimed_email || "",
        claimedAt: meta.claimed_at || "",
        giftNote: meta.gift_note || "",
        trackingNumber: meta.tracking_number || "",
      };
    });

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ items }) };
  } catch (err) {
    console.error("admin-items.js error:", err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message || "Failed to fetch items" }) };
  }
};
