const { TOKEN, CHANNEL, fetchAllBlocks, parseDesc } = require("./lib/arena");

let _cache = null;
let _cacheExpiry = 0;

exports.handler = async () => {
  if (!TOKEN || !CHANNEL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server misconfiguration: missing ARENA_TOKEN or ARENA_CHANNEL_SLUG" }),
    };
  }

  if (_cache && Date.now() < _cacheExpiry) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: _cache };
  }

  try {
    const blocks = await fetchAllBlocks();

    const items = blocks
      .map((block) => {
        const meta = block.metadata || {};
        const claimed = meta.claimed === true;
        const desc = parseDesc(block.description);
        return {
          id: String(block.id),
          createdTime: block.created_at || null,
          name: block.title || "",
          price: desc.price ?? (meta.price != null ? Number(meta.price) : null),
          url: meta.product_url || (block.type !== "Image" ? block.source?.url : "") || "",
          image: block.image?.large?.src || block.image?.medium?.src || block.image?.original?.url || meta.image_url || null,
          notes: desc.notes || meta.notes || "",
          quantityWanted: 1,
          quantityClaimed: claimed ? 1 : 0,
          claimed,
        };
      });

    const body = JSON.stringify({ items });
    _cache = body;
    _cacheExpiry = Date.now() + 60_000;

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body };
  } catch (err) {
    console.error("items.js error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Failed to fetch registry items" }),
    };
  }
};
