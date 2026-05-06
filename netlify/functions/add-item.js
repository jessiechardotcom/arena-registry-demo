const { TOKEN, CHANNEL, arenaRequest, fetchChannelId, buildDesc } = require("./lib/arena");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };

  if (!TOKEN || !CHANNEL) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Server misconfiguration: missing ARENA_TOKEN or ARENA_CHANNEL_SLUG" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { name, url, imageUrl, price, notes } = body;

  if (!name || !url || !imageUrl) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Name, URL, and image are required" }) };
  }

  try {
    const channelId = await fetchChannelId();

    const metadata = { product_url: String(url).slice(0, 5000) };

    const desc = buildDesc(price, notes);

    const payload = {
      value: String(imageUrl).slice(0, 5000),
      title: String(name).slice(0, 256),
      channel_ids: [channelId],
      metadata,
      ...(desc ? { description: desc } : {}),
    };

    const { status, body: result } = await arenaRequest("POST", `/blocks`, payload);

    if (status >= 400) {
      console.error("add-item.js Are.na error:", status, JSON.stringify(result));
      const detail = JSON.stringify(result?.errors || result?.message || result);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: `Are.na ${status}: ${detail}` }) };
    }

    const blockId = result.id;

    if (!result.metadata?.product_url) {
      const fallback = { metadata, ...(desc ? { description: desc } : {}) };
      const { status: patchStatus, body: patchResult } = await arenaRequest("PUT", `/blocks/${blockId}`, fallback);
      if (patchStatus >= 400) console.error("add-item.js metadata PATCH error:", patchStatus, JSON.stringify(patchResult));
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, id: String(blockId) }),
    };
  } catch (err) {
    console.error("add-item.js error:", err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Failed to add item" }) };
  }
};
