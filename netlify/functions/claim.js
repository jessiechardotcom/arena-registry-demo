const { arenaRequest } = require("./lib/arena");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { recordId, name, email, giftNote } = body;

  if (!recordId || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid email address" }) };
  }

  const { status, body: block } = await arenaRequest("GET", `/blocks/${recordId}`);

  if (status === 404 || block.error) {
    return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
  }

  if (block.metadata?.claimed === true) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: "already_claimed", message: "This item has already been fully claimed." }),
    };
  }

  const metadata = {
    claimed: true,
    claimed_email: email,
    claimed_at: new Date().toISOString().slice(0, 10),
    ...(name ? { claimed_by: String(name).trim().slice(0, 256) } : {}),
    ...(giftNote ? { gift_note: String(giftNote).slice(0, 1000) } : {}),
  };

  const { status: patchStatus, body: updated } = await arenaRequest("PUT", `/blocks/${recordId}`, { metadata });

  if (patchStatus >= 400) {
    console.error("claim.js PATCH error:", patchStatus, JSON.stringify(updated));
    return { statusCode: 500, body: JSON.stringify({ error: `Are.na ${patchStatus}: ${JSON.stringify(updated?.errors || updated?.message || updated)}` }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true }),
  };
};
