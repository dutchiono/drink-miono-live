const TOKEN = process.env.FEESYS_TELEGRAM_BOT_TOKEN?.trim() || "";
const SECRET = process.env.FEESYS_BOT_SHARED_SECRET?.trim() || "";
const API_BASE = process.env.FEESYS_LOCAL_API || "http://127.0.0.1:8787";
const POLL_MS = Number(process.env.FEESYS_TELEGRAM_POLL_MS || 1800);

if (!TOKEN || !SECRET) {
  console.log("feesys telegram bot disabled: set FEESYS_TELEGRAM_BOT_TOKEN and FEESYS_BOT_SHARED_SECRET");
  process.exit(0);
}

let offset = 0;

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
  const text = msg.text.trim();
  const chatId = msg.chat.id;
  const author = msg.from?.username ? `@${msg.from.username}` : String(msg.from?.id || "telegram");

  if (text === "/start" || text === "/help") {
    await say(chatId, [
      "FEESYS AOS telegram terminal.",
      "/status shows the public operating-system state.",
      "/note <text> writes a Telegram note into holder memory.",
    ].join("\n"));
    return;
  }

  if (text === "/status") {
    const feed = await local("/api/os/telegram-feed", {
      headers: { "x-feesys-bot-secret": SECRET },
    });
    await say(chatId, summarizeFeed(feed));
    return;
  }

  if (text.startsWith("/note ")) {
    const note = text.slice(6).trim();
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

console.log("feesys telegram bot polling");
while (true) {
  await poll();
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
