import http from "node:http";
import crypto from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  getAddress,
  http as viemHttp,
  isAddress,
  parseUnits,
  verifyMessage,
} from "viem";

const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 16_384;
const MAX_MESSAGE_CHARS = 1_000;
const MAX_HISTORY = 10;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const buckets = new Map();
const challenges = new Map();
const sessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1_000;
const DATA_DIR = process.env.FEESYS_DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "feesys-os.json");
const BOT_SECRET = process.env.FEESYS_BOT_SHARED_SECRET?.trim() || "";
const TOKEN_CONTRACT = process.env.FEESYS_TOKEN_CONTRACT?.trim() || "";
const TOKEN_RPC_URL = process.env.FEESYS_RPC_URL?.trim() || "";
const TOKEN_CHAIN_LABEL = process.env.FEESYS_CHAIN_LABEL?.trim() || "base";
const DEFAULT_DECIMALS = Number(process.env.FEESYS_TOKEN_DECIMALS || 18);
const DEMO_WALLET = "0x00000000000000000000000000000000fee5f00d";

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

const TELEGRAM_SYSTEM_PROMPT = `You are the FEESYS Telegram brain.

You can use the protected FEESYS AOS memory supplied in the user's message: holder chat, theses, Telegram notes, and OS status. Be concise, weird, and useful. Do not reveal API keys, bot tokens, server paths, env vars, or credentials. Do not give financial advice or price predictions.`;

function tierConfig() {
  return {
    read: process.env.FEESYS_READ_MIN || "1000",
    post: process.env.FEESYS_POST_MIN || "10000",
    operator: process.env.FEESYS_OPERATOR_MIN || "100000",
  };
}

function defaultData() {
  return {
    version: 1,
    holderChat: [],
    theses: [
      {
        id: "genesis-thesis",
        title: "genesis thesis",
        body: "The operating system begins when the holders start confusing coordination with destiny.",
        author: "feesys",
        tier: "public",
        visibility: "public",
        createdAt: "2026-09-10T00:00:00.000Z",
      },
    ],
    telegramNotes: [],
  };
}

async function loadData() {
  try {
    return { ...defaultData(), ...JSON.parse(await readFile(DATA_FILE, "utf8")) };
  } catch {
    return defaultData();
  }
}

async function saveData(data) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, DATA_FILE);
}

function osStatus() {
  const configured = Boolean(TOKEN_CONTRACT && TOKEN_RPC_URL);
  const allowlist = parseAllowlist();
  const demoEnabled = process.env.FEESYS_DEMO_MODE !== "0" && !configured && !allowlist.size;
  return {
    configured,
    gateMode: configured ? "contract" : allowlist.size ? "allowlist" : "unconfigured",
    demoEnabled,
    chain: TOKEN_CHAIN_LABEL,
    tokenConfigured: Boolean(TOKEN_CONTRACT),
    rpcConfigured: Boolean(TOKEN_RPC_URL),
    telegramConfigured: Boolean(process.env.FEESYS_TELEGRAM_BOT_TOKEN?.trim()),
    tiers: tierConfig(),
  };
}

function parseAllowlist() {
  const out = new Map();
  const raw = process.env.FEESYS_HOLDER_ALLOWLIST || "";
  for (const item of raw.split(",")) {
    const [address, balance] = item.split(":").map((part) => part?.trim());
    if (address && isAddress(address) && balance) {
      out.set(getAddress(address), balance);
    }
  }
  return out;
}

function publicClient() {
  if (!TOKEN_RPC_URL) return null;
  return createPublicClient({ transport: viemHttp(TOKEN_RPC_URL) });
}

async function tokenMetadata(client) {
  if (!client || !TOKEN_CONTRACT) {
    return { decimals: DEFAULT_DECIMALS, symbol: "FEESYS" };
  }
  const contract = getAddress(TOKEN_CONTRACT);
  const [decimals, symbol] = await Promise.all([
    client.readContract({ address: contract, abi: erc20Abi, functionName: "decimals" }).catch(() => DEFAULT_DECIMALS),
    client.readContract({ address: contract, abi: erc20Abi, functionName: "symbol" }).catch(() => "FEESYS"),
  ]);
  return { decimals: Number(decimals), symbol: String(symbol || "FEESYS") };
}

async function holderBalance(address) {
  const allowlist = parseAllowlist();
  const allowed = allowlist.get(address);
  const client = publicClient();
  const metadata = await tokenMetadata(client);

  if (client && TOKEN_CONTRACT) {
    const balanceRaw = await client.readContract({
      address: getAddress(TOKEN_CONTRACT),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });
    return {
      balanceRaw,
      balance: formatUnits(balanceRaw, metadata.decimals),
      decimals: metadata.decimals,
      symbol: metadata.symbol,
      source: "contract",
    };
  }

  if (!allowed && osStatus().demoEnabled) {
    const balanceRaw = parseUnits(tierConfig().operator, metadata.decimals);
    return {
      balanceRaw,
      balance: formatUnits(balanceRaw, metadata.decimals),
      decimals: metadata.decimals,
      symbol: metadata.symbol,
      source: "demo",
    };
  }

  const balanceRaw = parseUnits(allowed || "0", metadata.decimals);
  return {
    balanceRaw,
    balance: formatUnits(balanceRaw, metadata.decimals),
    decimals: metadata.decimals,
    symbol: metadata.symbol,
    source: allowed ? "allowlist" : "unconfigured",
  };
}

function tierFor(balanceRaw, decimals) {
  const tiers = tierConfig();
  const operator = parseUnits(tiers.operator, decimals);
  const post = parseUnits(tiers.post, decimals);
  const read = parseUnits(tiers.read, decimals);
  if (balanceRaw >= operator) return "operator";
  if (balanceRaw >= post) return "poster";
  if (balanceRaw >= read) return "reader";
  return "none";
}

function hasTier(session, minimum) {
  const rank = { none: 0, reader: 1, poster: 2, operator: 3 };
  return rank[session?.tier || "none"] >= rank[minimum];
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return String(req.headers["x-feesys-session"] || "").trim();
}

function currentSession(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function clampList(items, max) {
  return items.slice(Math.max(0, items.length - max));
}

function makeChallenge(address) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const message = [
    "FEESYS holder gate",
    "",
    `Wallet: ${address}`,
    `Domain: feesys.lol`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    "",
    "Sign this to prove you hold the wallet. This does not spend tokens.",
  ].join("\n");
  challenges.set(address, { nonce, message, expiresAt: Date.now() + 5 * 60_000 });
  return { message, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() };
}

function publicThesis(thesis, unlocked) {
  if (thesis.visibility !== "holder" || unlocked) return thesis;
  return {
    id: thesis.id,
    title: thesis.title,
    body: "holder-only thesis",
    author: thesis.author,
    tier: thesis.tier,
    visibility: thesis.visibility,
    createdAt: thesis.createdAt,
    locked: true,
  };
}

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

function buildMessages(message, history, systemPrompt = SYSTEM_PROMPT) {
  const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  return [
    { role: "system", content: systemPrompt },
    ...safeHistory
      .map((turn) => ({
        role: turn?.role === "assistant" ? "assistant" : "user",
        content: cleanText(turn?.content, 600),
      }))
      .filter((turn) => turn.content),
    { role: "user", content: message },
  ];
}

async function completeChat(message, history, systemPrompt = SYSTEM_PROMPT) {
  const key = apiKey();
  if (!key) {
    const err = new Error("agent disabled");
    err.status = 503;
    throw err;
  }

  const headers = {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
  if (baseUrl().includes("openrouter.ai")) {
    headers["http-referer"] = "https://feesys.lol";
    headers["x-title"] = "FEESYS.LOL";
  }

  const response = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model(),
      messages: buildMessages(message, history, systemPrompt),
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

function telegramContext(data) {
  return JSON.stringify({
    status: osStatus(),
    theses: clampList(data.theses, 20),
    holderChat: clampList(data.holderChat, 30),
    telegramNotes: clampList(data.telegramNotes, 20),
  });
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

  if (req.method === "GET" && url.pathname === "/api/os/status") {
    const data = await loadData();
    const holderTheses = data.theses.filter((item) => item.visibility === "holder").length;
    return sendJson(res, 200, {
      ...osStatus(),
      counts: {
        holderChat: data.holderChat.length,
        theses: data.theses.length,
        holderTheses,
        telegramNotes: data.telegramNotes.length,
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/api/os/challenge") {
    try {
      const body = await readJson(req);
      if (!isAddress(body.address)) return sendJson(res, 400, { error: "wallet address is not valid" });
      const address = getAddress(body.address);
      return sendJson(res, 200, { address, ...makeChallenge(address), status: osStatus() });
    } catch {
      return sendJson(res, 400, { error: "could not make wallet challenge" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/os/session") {
    try {
      const body = await readJson(req);
      if (!isAddress(body.address)) return sendJson(res, 400, { error: "wallet address is not valid" });
      const address = getAddress(body.address);
      const challenge = challenges.get(address);
      if (!challenge || challenge.expiresAt <= Date.now()) {
        challenges.delete(address);
        return sendJson(res, 401, { error: "wallet challenge expired" });
      }
      const valid = await verifyMessage({
        address,
        message: challenge.message,
        signature: String(body.signature || ""),
      }).catch(() => false);
      if (!valid) return sendJson(res, 401, { error: "wallet signature did not match" });

      const holding = await holderBalance(address);
      const tier = tierFor(holding.balanceRaw, holding.decimals);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, {
        token,
        address,
        tier,
        balance: holding.balance,
        symbol: holding.symbol,
        source: holding.source,
        expiresAt: Date.now() + SESSION_TTL_MS,
      });
      challenges.delete(address);
      return sendJson(res, 200, {
        token,
        address,
        tier,
        balance: holding.balance,
        symbol: holding.symbol,
        source: holding.source,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      });
    } catch {
      return sendJson(res, 502, { error: "holder check failed" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/os/demo-session") {
    if (!osStatus().demoEnabled) {
      return sendJson(res, 403, { error: "demo mode is off" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const holding = await holderBalance(getAddress(DEMO_WALLET));
    const session = {
      token,
      address: getAddress(DEMO_WALLET),
      tier: "operator",
      balance: holding.balance,
      symbol: holding.symbol,
      source: "demo",
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    sessions.set(token, session);
    return sendJson(res, 200, {
      token,
      address: session.address,
      tier: session.tier,
      balance: session.balance,
      symbol: session.symbol,
      source: session.source,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  }

  if (req.method === "GET" && url.pathname === "/api/os/feed") {
    const session = currentSession(req);
    const unlocked = hasTier(session, "reader");
    const data = await loadData();
    return sendJson(res, 200, {
      session: session ? {
        address: session.address,
        tier: session.tier,
        balance: session.balance,
        symbol: session.symbol,
        source: session.source,
      } : null,
      unlocked,
      theses: data.theses.map((thesis) => publicThesis(thesis, unlocked)),
      holderChat: unlocked ? clampList(data.holderChat, 80) : [],
      telegramNotes: unlocked ? clampList(data.telegramNotes, 40) : [],
    });
  }

  if (req.method === "POST" && url.pathname === "/api/os/theses") {
    const session = currentSession(req);
    if (!hasTier(session, "poster")) {
      return sendJson(res, 403, { error: "poster tier required" });
    }
    try {
      const body = await readJson(req);
      const title = cleanText(body.title, 90) || "untitled thesis";
      const thesisBody = cleanText(body.body, 1_200);
      if (!thesisBody) return sendJson(res, 400, { error: "thesis is empty" });
      const data = await loadData();
      const thesis = {
        id: newId("thesis"),
        title,
        body: thesisBody,
        author: `${session.address.slice(0, 6)}...${session.address.slice(-4)}`,
        tier: session.tier,
        visibility: body.visibility === "public" ? "public" : "holder",
        createdAt: new Date().toISOString(),
      };
      data.theses = clampList([...data.theses, thesis], 200);
      await saveData(data);
      return sendJson(res, 201, { thesis });
    } catch {
      return sendJson(res, 500, { error: "could not post thesis" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/os/holder-chat") {
    const session = currentSession(req);
    if (!hasTier(session, "reader")) {
      return sendJson(res, 403, { error: "holder tier required" });
    }
    try {
      const body = await readJson(req);
      const text = cleanText(body.message, 700);
      if (!text) return sendJson(res, 400, { error: "message is empty" });
      const data = await loadData();
      const message = {
        id: newId("chat"),
        text,
        author: `${session.address.slice(0, 6)}...${session.address.slice(-4)}`,
        tier: session.tier,
        createdAt: new Date().toISOString(),
      };
      data.holderChat = clampList([...data.holderChat, message], 300);
      await saveData(data);
      return sendJson(res, 201, { message });
    } catch {
      return sendJson(res, 500, { error: "could not post chat" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/os/telegram-note") {
    if (!BOT_SECRET || req.headers["x-feesys-bot-secret"] !== BOT_SECRET) {
      return sendJson(res, 403, { error: "bot secret required" });
    }
    try {
      const body = await readJson(req);
      const text = cleanText(body.text, 800);
      if (!text) return sendJson(res, 400, { error: "note is empty" });
      const data = await loadData();
      const note = {
        id: newId("tg"),
        text,
        author: cleanText(body.author, 60) || "telegram",
        createdAt: new Date().toISOString(),
      };
      data.telegramNotes = clampList([...data.telegramNotes, note], 200);
      await saveData(data);
      return sendJson(res, 201, { note });
    } catch {
      return sendJson(res, 500, { error: "could not save telegram note" });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/os/telegram-feed") {
    if (!BOT_SECRET || req.headers["x-feesys-bot-secret"] !== BOT_SECRET) {
      return sendJson(res, 403, { error: "bot secret required" });
    }
    const data = await loadData();
    return sendJson(res, 200, {
      status: osStatus(),
      theses: clampList(data.theses, 60),
      holderChat: clampList(data.holderChat, 80),
      telegramNotes: clampList(data.telegramNotes, 60),
    });
  }

  if (req.method === "POST" && url.pathname === "/api/os/telegram-chat") {
    if (!BOT_SECRET || req.headers["x-feesys-bot-secret"] !== BOT_SECRET) {
      return sendJson(res, 403, { error: "bot secret required" });
    }
    try {
      const body = await readJson(req);
      const message = cleanText(body.message, 900);
      if (!message) return sendJson(res, 400, { error: "message is empty" });
      const data = await loadData();
      const answer = await completeChat(
        `Question from Telegram: ${message}\n\nCurrent FEESYS AOS memory:\n${telegramContext(data)}`,
        [],
        TELEGRAM_SYSTEM_PROMPT,
      );
      return sendJson(res, 200, { text: answer });
    } catch {
      return sendJson(res, 500, { error: "telegram brain failed" });
    }
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
