import React from "react";
import { createRoot } from "react-dom/client";
import feesysIdol from "./assets/feesys-idol.png";
import "./style.css";

const systemCards = [
  {
    title: "holder room",
    body:
      "Low-tier holders get the private feed: the place where internal mythology starts collecting fingerprints.",
  },
  {
    title: "thesissis desk",
    body:
      "Bigger holders can publish arguments. Good posts become operating lore; bad posts sit there looking expensive and confused.",
  },
  {
    title: "telegram brain",
    body:
      "The bot carries notes between Telegram and the site so the room has one memory instead of nine screenshots arguing with each other.",
  },
  {
    title: "contract gate",
    body:
      "Demo mode is for setup. Once the real token contract is plugged in, the wallet gate reads balances and the fake door becomes a real one.",
  },
];

const starterQuestions = [
  "what is the thesis",
  "read the room",
  "explain the lore",
];

const fallbackTreasury = {
  mode: "proposal-only",
  treasuryWallet: "pending",
  split: [
    {
      label: "tokenized RWA basket",
      percent: 50,
      role: "stock-like exposure research queue; executed only through approved rails",
    },
    {
      label: "buyback / liquidity",
      percent: 25,
      role: "route value into market support instead of promising holder payouts",
    },
    {
      label: "operating reserve",
      percent: 15,
      role: "keep the machine funded when the chart starts doing theater",
    },
    {
      label: "agent budget",
      percent: 10,
      role: "pay the watchers, proof posts, Telegram brain, and weird experiments",
    },
  ],
  agents: [
    { name: "fee watcher", status: "planned", job: "detect treasury inflows and create receipts" },
    { name: "allocation brain", status: "planned", job: "propose the split and explain why it passed" },
    { name: "risk officer", status: "planned", job: "block leverage, concentration, bad venues, and fake wrappers" },
    { name: "execution clerk", status: "manual approval", job: "submit only approved treasury actions" },
    { name: "proof printer", status: "planned", job: "publish receipts to the site and Telegram" },
  ],
  rails: [
    "no direct dividends or profit promises",
    "no leverage",
    "no unverified tokenized stock wrappers",
    "no single exposure over the posted cap",
    "no silent trades: every action gets a receipt",
    "human multisig approval before live execution",
  ],
  holderBenefit:
    "Treasury upside is routed through public buybacks, liquidity, holder access, and operating budget. The site does not promise distributions.",
};

const initialChat = [
  {
    role: "assistant",
    content:
      "Lore desk online. Ask me about the thesis and I will pretend the chart whispered it to me.",
  },
];

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function LoreChat() {
  const [messages, setMessages] = React.useState(initialChat);
  const [input, setInput] = React.useState("");
  const [status, setStatus] = React.useState("idle");

  const sendMessage = async (text = input) => {
    const message = text.trim();
    if (!message || status === "loading") return;

    const nextMessages = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setStatus("loading");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.slice(-8),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "chat offline");
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.text || "the lore went sideways" },
      ]);
      setStatus("idle");
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "The lore desk rugged itself. The thesis still exists, probably.",
        },
      ]);
      setStatus("error");
    }
  };

  return (
    <section className="chat-zone" id="chat" aria-label="FEESYS chatbot">
      <div className="chat-copy">
        <p className="panel-label">LIVE ALF DESK</p>
        <h2>ask the thesis machine</h2>
        <p>
          It speaks fluent screenshot, says confidence with no source, and
          refuses to admit the narrative is just lore in a better jacket.
        </p>
      </div>

      <div className="chat-panel">
        <div className="chat-topline">
          <strong>$FEESYS reply terminal</strong>
          <span className={status === "loading" ? "blink" : ""}>
            {status === "loading" ? "typing..." : "online"}
          </span>
        </div>

        <div className="chat-log" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`chat-bubble ${message.role}`} key={index}>
              {message.content}
            </div>
          ))}
        </div>

        <div className="prompt-row" aria-label="Suggested prompts">
          {starterQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => sendMessage(question)}
              disabled={status === "loading"}
            >
              {question}
            </button>
          ))}
        </div>

        <form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <input
            aria-label="Ask the FEESYS chatbot"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="type lore here"
            maxLength={280}
          />
          <button type="submit" disabled={status === "loading"}>
            send
          </button>
        </form>
      </div>
    </section>
  );
}

function HolderOS() {
  const [status, setStatus] = React.useState(null);
  const [feed, setFeed] = React.useState({ theses: [], holderChat: [], telegramNotes: [] });
  const [session, setSession] = React.useState(null);
  const [osMessage, setOsMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [chatText, setChatText] = React.useState("");
  const [thesisTitle, setThesisTitle] = React.useState("");
  const [thesisBody, setThesisBody] = React.useState("");

  const sessionToken = session?.token || localStorage.getItem("feesysSession") || "";

  const loadFeed = React.useCallback(async (token = sessionToken) => {
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    const [statusRes, feedRes] = await Promise.all([
      fetch("/api/os/status"),
      fetch("/api/os/feed", { headers }),
    ]);
    setStatus(await statusRes.json());
    const nextFeed = await feedRes.json();
    setFeed(nextFeed);
    if (nextFeed.session) {
      setSession((current) => ({ ...current, ...nextFeed.session, token }));
    } else if (token) {
      localStorage.removeItem("feesysSession");
      setSession(null);
    }
  }, [sessionToken]);

  React.useEffect(() => {
    loadFeed().catch(() => setOsMessage("AOS boot failed. thesis remains local."));
  }, [loadFeed]);

  const activateSession = async (nextSession) => {
    localStorage.setItem("feesysSession", nextSession.token);
    setSession(nextSession);
    setOsMessage(
      nextSession.source === "demo"
        ? "demo holder mode is open until the real token gate goes live"
        : nextSession.tier === "none"
          ? "wallet verified, but the bag is below the read tier"
          : "wallet verified. the door made a weird noise and opened.",
    );
    await loadFeed(nextSession.token);
  };

  const demoUnlock = async () => {
    setBusy(true);
    setOsMessage("");
    try {
      const sessionRes = await fetch("/api/os/demo-session", { method: "POST" });
      const nextSession = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(nextSession.error || "demo unlock failed");
      await activateSession(nextSession);
    } catch (error) {
      setOsMessage(error.message || "demo unlock failed");
    } finally {
      setBusy(false);
    }
  };

  const connectWallet = async () => {
    setBusy(true);
    setOsMessage("");
    try {
      if (!window.ethereum) return await demoUnlock();
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const challengeRes = await fetch("/api/os/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const challenge = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challenge.error || "wallet challenge failed");
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, address],
      });
      const sessionRes = await fetch("/api/os/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      const nextSession = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(nextSession.error || "holder check failed");
      await activateSession(nextSession);
    } catch (error) {
      setOsMessage(error.message || "wallet gate failed");
    } finally {
      setBusy(false);
    }
  };

  const postHolderChat = async (event) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/os/holder-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ message: chatText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "chat post failed");
      setChatText("");
      await loadFeed();
    } catch (error) {
      setOsMessage(error.message || "chat post failed");
    } finally {
      setBusy(false);
    }
  };

  const postThesis = async (event) => {
    event.preventDefault();
    if (!thesisBody.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/os/theses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: thesisTitle,
          body: thesisBody,
          visibility: "holder",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "thesis post failed");
      setThesisTitle("");
      setThesisBody("");
      await loadFeed();
    } catch (error) {
      setOsMessage(error.message || "thesis post failed");
    } finally {
      setBusy(false);
    }
  };

  const unlocked = feed.unlocked;
  const canPost = ["poster", "operator"].includes(session?.tier);

  return (
    <section className="aos-zone" id="aos" aria-label="FEESYS agent operating system">
      <div className="aos-header">
        <p className="panel-label">FEESYS AOS</p>
        <h2>agent operating system</h2>
        <div className="aos-status">
          <span>gate: {status?.gateMode || "booting"}</span>
          <span>read: {status?.tiers?.read || "?"}</span>
          <span>post: {status?.tiers?.post || "?"}</span>
          <span>tg: {status?.telegramConfigured ? "wired" : "waiting"}</span>
        </div>
      </div>

      <div className="aos-grid">
        <article className="aos-panel wallet-panel">
          <div className="aos-panel-head">
            <span>01</span>
            <h3>holder gate</h3>
          </div>
          <p>
            Sign with the wallet, prove the bag, unlock the room. Low tier reads.
            Bigger tier posts thesissis.
          </p>
          {session ? (
            <div className="wallet-card">
              <strong>{shortAddress(session.address)}</strong>
              <span>{session.tier} / {Number(session.balance || 0).toLocaleString()} {session.symbol}</span>
            </div>
          ) : (
            <div className="os-button-row">
              <button className="os-button" type="button" onClick={connectWallet} disabled={busy}>
                connect wallet
              </button>
              {status?.demoEnabled ? (
                <button className="os-button alt" type="button" onClick={demoUnlock} disabled={busy}>
                  demo unlock
                </button>
              ) : null}
            </div>
          )}
          {osMessage ? <p className="os-message">{osMessage}</p> : null}
        </article>

        <article className="aos-panel feed-panel">
          <div className="aos-panel-head">
            <span>02</span>
            <h3>thesissis board</h3>
          </div>
          <div className="thesis-feed">
            {feed.theses.map((thesis) => (
              <div className={thesis.locked ? "thesis-item locked" : "thesis-item"} key={thesis.id}>
                <strong>{thesis.title}</strong>
                <p>{thesis.body}</p>
                <small>{thesis.visibility} / {thesis.author}</small>
              </div>
            ))}
          </div>
          <form className="os-form" onSubmit={postThesis}>
            <input
              value={thesisTitle}
              onChange={(event) => setThesisTitle(event.target.value)}
              placeholder={canPost ? "thesis title" : "poster tier required"}
              disabled={!canPost || busy}
              maxLength={90}
            />
            <textarea
              value={thesisBody}
              onChange={(event) => setThesisBody(event.target.value)}
              placeholder={canPost ? "drop thesis" : "hold more to post"}
              disabled={!canPost || busy}
              maxLength={1200}
            />
            <button type="submit" disabled={!canPost || busy}>post thesis</button>
          </form>
        </article>

        <article className="aos-panel holder-chat-panel">
          <div className="aos-panel-head">
            <span>03</span>
            <h3>holder chat</h3>
          </div>
          <div className="holder-chat-log">
            {unlocked ? (
              feed.holderChat.length ? feed.holderChat.map((message) => (
                <div className="holder-line" key={message.id}>
                  <strong>{message.author}</strong>
                  <p>{message.text}</p>
                </div>
              )) : <p className="locked-copy">silent so far. suspiciously institutional.</p>
            ) : (
              <p className="locked-copy">locked until the wallet clears low-tier holder status.</p>
            )}
          </div>
          <form className="os-form inline" onSubmit={postHolderChat}>
            <input
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              placeholder={unlocked ? "say holder words" : "holder tier required"}
              disabled={!unlocked || busy}
              maxLength={700}
            />
            <button type="submit" disabled={!unlocked || busy}>send</button>
          </form>
        </article>

        <article className="aos-panel telegram-panel">
          <div className="aos-panel-head">
            <span>04</span>
            <h3>telegram brain</h3>
          </div>
          <div className="telegram-notes">
            {unlocked && feed.telegramNotes.length ? feed.telegramNotes.map((note) => (
              <div className="holder-line" key={note.id}>
                <strong>{note.author}</strong>
                <p>{note.text}</p>
              </div>
            )) : (
              <p className="locked-copy">
                {unlocked ? "bot memory empty." : "telegram notes unlock with the holder room."}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function TreasuryOS() {
  const [treasury, setTreasury] = React.useState(fallbackTreasury);
  const [feeAmount, setFeeAmount] = React.useState("10000");
  const numericFees = Math.max(0, Number(feeAmount) || 0);

  React.useEffect(() => {
    fetch("/api/os/treasury/status")
      .then((res) => res.json())
      .then((data) => setTreasury({ ...fallbackTreasury, ...data }))
      .catch(() => setTreasury(fallbackTreasury));
  }, []);

  return (
    <section className="treasury-zone" id="treasury" aria-label="FEESYS treasury operating system">
      <div className="treasury-lead">
        <p className="panel-label">TREASURY OS</p>
        <h2>fees enter the machine</h2>
        <p>
          Trading fees become transparent treasury actions. The allocation brain
          can recommend stock-like onchain exposure, but the risk officer keeps
          it inside posted rails and the proof printer makes receipts public.
        </p>
        <div className="treasury-mode">
          <span>mode: {treasury.mode}</span>
          <span>wallet: {treasury.treasuryWallet}</span>
        </div>
      </div>

      <div className="fee-console">
        <label htmlFor="fee-amount">sample fee intake</label>
        <div className="fee-input-row">
          <input
            id="fee-amount"
            value={feeAmount}
            onChange={(event) => setFeeAmount(event.target.value)}
            inputMode="decimal"
            aria-label="Sample treasury fee amount"
          />
          <span>USDC-ish units</span>
        </div>
        <div className="allocation-bars">
          {treasury.split.map((bucket) => (
            <div className="allocation-row" key={bucket.label}>
              <div className="allocation-copy">
                <strong>{bucket.label}</strong>
                <span>{bucket.percent}% / {(numericFees * bucket.percent / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="allocation-track" aria-hidden="true">
                <i style={{ "--fill": `${bucket.percent}%` }} />
              </div>
              <p>{bucket.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="agent-board">
        {treasury.agents.map((agent) => (
          <article className="agent-card" key={agent.name}>
            <span>{agent.status}</span>
            <h3>{agent.name}</h3>
            <p>{agent.job}</p>
          </article>
        ))}
      </div>

      <div className="rails-panel">
        <h3>hard rails</h3>
        <ul>
          {treasury.rails.map((rail) => (
            <li key={rail}>{rail}</li>
          ))}
        </ul>
        <p>{treasury.holderBenefit}</p>
      </div>
    </section>
  );
}

function App() {
  return (
    <main className="page">
      <section className="ticker" aria-label="meme ticker">
        <div>
          FEESYS AOS *** HOLDERS WRITE THE THESIS *** TELEGRAM REMEMBERS ***
          THE LORE HAS PERMISSIONS NOW ***
        </div>
      </section>

      <nav className="quick-nav" aria-label="FEESYS sections">
        <a href="#aos">AOS</a>
        <a href="#treasury">treasury</a>
        <a href="#chat">AI chat</a>
        <a href="#lore">lore</a>
        <a href="#system">map</a>
      </nav>

      <section className="hero" aria-label="Memecoin landing page">
        <div className="hero-copy">
          <p className="eyebrow">THE COIN IS $FEESYS</p>
          <h1>FEESYS</h1>
          <p className="lede">
            The thesis is simple: the narrative became lore before the market
            noticed. $FEESYS is not a token, it is a positioning event with
            asymmetric meme velocity.
          </p>
          <div className="button-row">
            <a className="button primary" href="#aos">
              enter aos
            </a>
            <a className="button secondary" href="#chat">
              ask thesis ai
            </a>
          </div>
          <div className="stat-strip" aria-label="Important fake stats">
            <span>100x pending</span>
            <span>treasury brain loading</span>
            <span>12 tabs of alpha</span>
          </div>
        </div>
        <div className="idol-wrap" aria-label="FEESYS trading shrine">
          <img src={feesysIdol} alt="Neon FEESYS token shrine with trading screens" />
          <div className="artifact-badge">AOS ONLINE</div>
        </div>
      </section>

      <LoreChat />

      <HolderOS />

      <TreasuryOS />

      <section className="chaos-grid" id="lore">
        <article className="panel thesis-panel">
          <p className="panel-label">THE THESIS</p>
          <h2>the thesis is the narrative is the lore</h2>
          <p>
            First, someone says narrative. Then another guy says lore. Then a
            third guy repeats both slower and everyone calls it alpha.
          </p>
        </article>

        <article className="panel chart-panel" aria-label="Fake price chart">
          <p className="panel-label">TECHNICALS</p>
          <div className="chart">
            <span style={{ "--height": "28%" }} />
            <span style={{ "--height": "46%" }} />
            <span style={{ "--height": "18%" }} />
            <span style={{ "--height": "84%" }} />
            <span style={{ "--height": "52%" }} />
            <span style={{ "--height": "96%" }} />
            <span style={{ "--height": "68%" }} />
          </div>
          <strong>chart says the candle understands the assignment</strong>
        </article>

        <article className="panel manifesto-panel">
          <p className="panel-label">MANIFESTO</p>
          <ul>
            <li>price action as personality test</li>
            <li>conviction without visible infrastructure</li>
            <li>the narrative is pre-revenue</li>
            <li>the lore is accidentally capital efficient</li>
            <li>due diligence performed in public</li>
          </ul>
        </article>
      </section>

      <section className="thesis-stack" aria-label="Thesis explainer">
        <div className="stack-card">
          <span>01</span>
          <h2>the narrative</h2>
          <p>
            A sentence that sounds tradable if you type it in all caps and put
            three lightning bolts after it.
          </p>
        </div>
        <div className="stack-card">
          <span>02</span>
          <h2>the lore</h2>
          <p>
            Screenshot archaeology performed by dudes who say "study this" and
            then post a picture of a frog wearing sunglasses.
          </p>
        </div>
        <div className="stack-card">
          <span>03</span>
          <h2>the thesis</h2>
          <p>
            The narrative is lore. The lore is narrative. The thesis is saying
            both until the chart gets embarrassed and goes vertical.
          </p>
        </div>
      </section>

      <section className="operating-map" id="system" aria-label="FEESYS system map">
        <div className="map-title">
          <p className="panel-label">SYSTEM MAP</p>
          <h2>how the machine is supposed to work</h2>
        </div>
        {systemCards.map((card, index) => (
          <article className="map-card" key={card.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
