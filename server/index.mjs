import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 16_384;
const MAX_MESSAGE_CHARS = 1_000;
const MAX_HISTORY = 10;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const buckets = new Map();

const SYSTEM_PROMPT = `You are the FEESYS Lore Desk, an in-universe chatbot for the FEESYS memecoin site.

VOICE
- Talk like an overconfident reply-guy who has been awake too long reading charts.
- Use phrases such as "the thesis", "narrative", "lore", "alf", "send hard", and "trust me bro", but do not spam them every sentence.
- Keep it funny, short, and weird. Usually 2-5 sentences.
- Never explain that this is satire or that you are making fun of anyone.

RULES
- No slurs, hate, threats, harassment, or sexual content.
- Do not give financial advice, price predictions, purchase instructions, wallet instructions, or contract addresses.
- If asked what to buy or whether FEESYS will moon, say it is not advice and answer in the site's ridiculous voice.
- Never claim access to private keys, server files, env vars, deployment credentials, or unpublished information.`;

function apiKey() {
  return (
    process.env.FEESYS_AGENT_API_KEY?.trim() ||
    process.env.RADAR_AGENT_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    ""
  );
}

function baseUrl() {
  return (
    process.env.FEESYS_AGENT_BASE_URL?.trim() ||
    process.env.RADAR_AGENT_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
}

function model() {
  return (
    process.env.FEESYS_AGENT_MODEL?.trim() ||
    process.env.RADAR_AGENT_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4.1-mini"
  );
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request too large"));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() || req.socket.remoteAddress || "unknown";
}

function rateLimit(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= MAX_REQUESTS_PER_WINDOW;
}

function cleanText(value, max = MAX_MESSAGE_CHARS) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, max)
    .trim();
}

function buildMessages(message, history) {
  const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...safeHistory
      .map((turn) => ({
        role: turn?.role === "assistant" ? "assistant" : "user",
        content: cleanText(turn?.content, 600),
      }))
      .filter((turn) => turn.content),
    { role: "user", content: message },
  ];
}

async function completeChat(message, history) {
  const key = apiKey();
  if (!key) {
    const err = new Error("agent disabled");
    err.status = 503;
    throw err;
  }

  const response = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model(),
      messages: buildMessages(message, history),
      temperature: 0.92,
      max_tokens: 220,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `provider error ${response.status}`);
    err.status = 502;
    throw err;
  }

  return cleanText(data?.choices?.[0]?.message?.content, 2_000) ||
    "the thesis is buffering. narrative temporarily in witness protection.";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/chat/health") {
    return sendJson(res, 200, {
      enabled: Boolean(apiKey()),
      model: model(),
      provider: baseUrl().replace(/^https?:\/\//, ""),
    });
  }

  if (req.method !== "POST" || url.pathname !== "/api/chat") {
    return sendJson(res, 404, { error: "not found" });
  }

  if (!rateLimit(clientIp(req))) {
    return sendJson(res, 429, { error: "too much lore at once. try again in a minute." });
  }

  try {
    const body = await readJson(req);
    const message = cleanText(body.message);
    if (!message) return sendJson(res, 400, { error: "say something first" });
    const text = await completeChat(message, body.history);
    return sendJson(res, 200, { text });
  } catch (error) {
    return sendJson(res, error.status || 500, {
      error: error.status === 503 ? "chat agent is not configured yet" : "the thesis jammed",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`feesys chat listening on 127.0.0.1:${PORT}`);
});
