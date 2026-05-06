const https = require("https");

const TOKEN = process.env.ARENA_TOKEN;
const CHANNEL = process.env.ARENA_CHANNEL_SLUG;

function arenaRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.are.na",
      path: `/v3${path}`,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let _channelId = null;
async function fetchChannelId() {
  if (_channelId) return _channelId;
  const { status, body } = await arenaRequest("GET", `/channels/${CHANNEL}`);
  if (status >= 400) throw new Error(`Are.na ${status}: ${body?.message || JSON.stringify(body)}`);
  _channelId = body.id;
  return _channelId;
}

async function fetchAllBlocks() {
  const blocks = [];
  let page = 1;
  while (true) {
    const { status, body } = await arenaRequest("GET", `/channels/${CHANNEL}/contents?per=100&page=${page}`);
    if (status >= 400) throw new Error(`Are.na ${status}: ${body?.message || body?.title || JSON.stringify(body)}`);
    const pageBlocks = body.data || body.contents || body.blocks || [];
    blocks.push(...pageBlocks);
    if (!body.meta?.has_more_pages) break;
    page++;
  }
  return blocks;
}

function buildDesc(price, notes) {
  const parts = [];
  if (price != null && price !== "") parts.push(`price: ${parseFloat(price)}`);
  if (notes && String(notes).trim()) parts.push(String(notes).trim());
  return parts.join("\n\n");
}

function parseDesc(description) {
  const text = (description?.markdown || description?.plain || "").trim();
  const priceMatch = text.match(/^price:\s*([\d.]+)/im);
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;
  const notes = text.replace(/^price:[^\n]*\n?/im, "").trim();
  return { price, notes };
}

module.exports = { TOKEN, CHANNEL, arenaRequest, fetchChannelId, fetchAllBlocks, buildDesc, parseDesc };
