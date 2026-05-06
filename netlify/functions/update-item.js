const { TOKEN, arenaRequest, buildDesc, parseDesc } = require("./lib/arena");

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

  const { id, secret, title, imageUrl, price, productUrl, notes } = body;

  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!id) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "id is required" }) };
  }

  if (!TOKEN) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Server misconfiguration" }) };
  }

  try {
    // Fetch current block to merge metadata safely
    const { status: getStatus, body: block } = await arenaRequest("GET", `/blocks/${id}`);
    if (getStatus >= 400) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Block not found" }) };
    }

    const existingMeta = block.metadata || {};

    const updatedMeta = {
      ...existingMeta,
      ...(productUrl !== undefined ? { product_url: String(productUrl).slice(0, 5000) } : {}),
    };

    // Rebuild description if price or notes are being updated
    let descPayload = {};
    if (price !== undefined || notes !== undefined) {
      const existing = parseDesc(block.description);
      const newPrice = price !== undefined ? (price === "" || price === null ? null : parseFloat(price)) : existing.price;
      const newNotes = notes !== undefined ? String(notes).trim() : existing.notes;
      descPayload = { description: buildDesc(newPrice, newNotes) };
    }

    const payload = {
      ...(title !== undefined ? { title: String(title).slice(0, 256) } : {}),
      ...(imageUrl !== undefined ? { value: String(imageUrl).slice(0, 5000) } : {}),
      metadata: updatedMeta,
      ...descPayload,
    };

    const { status, body: result } = await arenaRequest("PUT", `/blocks/${id}`, payload);

    if (status >= 400) {
      console.error("update-item.js error:", status, JSON.stringify(result));
      const detail = JSON.stringify(result?.errors || result?.message || result);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: `Are.na ${status}: ${detail}` }) };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("update-item.js error:", err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Failed to update item" }) };
  }
};
