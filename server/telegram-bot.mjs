const TOKEN = process.env.FEESYS_TELEGRAM_BOT_TOKEN?.trim() || "";
const SECRET = process.env.FEESYS_BOT_SHARED_SECRET?.trim() || "";
const API_BASE = process.env.FEESYS_LOCAL_API || "http://127.0.0.1:8787";
const POLL_MS = Number(process.env.FEESYS_TELEGRAM_POLL_MS || 1800);

if (!TOKEN || !SECRET) {
  console.log("feesys telegram bot disabled: set FEESYS_TELEGRAM_BOT_TOKEN and FEESYS_BOT_SHARED_SECRET");
  process.exit(0);
}

let offset = 0;
let botUsername = "";

async function telegram(method, payload = {}) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.description || `telegram ${method} failed`);
  }
  return data.result;
}

async function local(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `local ${path} failed`);
  return data;
}

async function say(chatId, text) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(rawText) {
  let text = rawText.trim();
  if (botUsername) {
    text = text.replace(new RegExp(`@${escapeRegex(botUsername)}\\b`, "gi"), "").trim();
  }
  return text;
}

function isCommand(text, command) {
  const lower = text.toLowerCase();
  return lower === command || (botUsername && lower === `${command}@${botUsername}`);
}

function commandPayload(text, command) {
  const escapedCommand = escapeRegex(command);
  const suffix = botUsername ? `(?:@${escapeRegex(botUsername)})?` : "(?:@[A-Za-z0-9_]+)?";
  const match = text.match(new RegExp(`^${escapedCommand}${suffix}\\s+([\\s\\S]+)$`, "i"));
  return match?.[1]?.trim() || "";
}

function summarizeFeed(feed) {
  const thesis = feed.theses?.slice(-1)[0];
  const note = feed.telegramNotes?.slice(-1)[0];
  const chat = feed.holderChat?.slice(-1)[0];
  return [
    "FEESYS AOS status:",
    `thesissis: ${feed.theses?.length || 0}`,
    `holder chat lines: ${feed.holderChat?.length || 0}`,
    `telegram notes: ${feed.telegramNotes?.length || 0}`,
    thesis ? `latest thesis: ${thesis.title}` : "latest thesis: none",
    note ? `latest telegram note: ${note.text}` : null,
    chat ? `latest holder chat: ${chat.text}` : null,
  ].filter(Boolean).join("\n");
}

async function handleMessage(update) {
  const msg = update.message;
  if (!msg?.chat?.id || !msg.text) return;
  const rawText = msg.text.trim();
  const text = normalizeText(rawText);
  const chatId = msg.chat.id;
  const author = msg.from?.username ? `@${msg.from.username}` : String(msg.from?.id || "telegram");

  if (!text) {
    await say(chatId, "say /status, /note <text>, or ask the machine a question.");
    return;
  }

  if (isCommand(rawText, "/start") || isCommand(rawText, "/help")) {
    await say(chatId, [
      "FEESYS AOS telegram terminal.",
      "/status shows the public operating-system state.",
      "/note <text> writes a Telegram note into holder memory.",
    ].join("\n"));
    return;
  }

  if (isCommand(rawText, "/status")) {
    const feed = await local("/api/os/telegram-feed", {
      headers: { "x-feesys-bot-secret": SECRET },
    });
    await say(chatId, summarizeFeed(feed));
    return;
  }

  const note = commandPayload(rawText, "/note");
  if (note) {
    await local("/api/os/telegram-note", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-feesys-bot-secret": SECRET,
      },
      body: JSON.stringify({ text: note, author }),
    });
    await say(chatId, "noted. the lore has been placed inside the machine.");
    return;
  }

  const answer = await local("/api/os/telegram-chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-feesys-bot-secret": SECRET,
    },
    body: JSON.stringify({ message: text, author }),
  });
  await say(chatId, answer.text || "the telegram brain stared at the wall.");
}

async function poll() {
  try {
    const updates = await telegram("getUpdates", {
      timeout: 20,
      offset: offset || undefined,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      offset = update.update_id + 1;
      await handleMessage(update).catch((error) => {
        console.error("telegram update failed", error.message);
      });
    }
  } catch (error) {
    console.error("telegram poll failed", error.message);
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

await telegram("deleteWebhook", { drop_pending_updates: false }).catch((error) => {
  console.error("telegram webhook cleanup failed", error.message);
});

const me = await telegram("getMe").catch((error) => {
  console.error("telegram identity lookup failed", error.message);
  return null;
});
botUsername = me?.username?.toLowerCase() || "";

console.log(`feesys telegram bot polling${botUsername ? ` as @${botUsername}` : ""}`);
while (true) {
  await poll();
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
