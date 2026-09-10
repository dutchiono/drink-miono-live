import React from "react";
import { createRoot } from "react-dom/client";
import thesisMascot from "./assets/thesis-mascot.png";
import "./style.css";

const chants = [
  "the thesis is that the narrative is lore",
  "might be alf",
  "could send hard",
  "trust me bro",
  "fee.sys",
  "roadmap pending vibes",
  "alpha? no, alf",
  "source: group chat",
  "utility is saying utility",
];

const starterQuestions = [
  "what is the thesis",
  "is this alf",
  "explain the lore",
];

const initialChat = [
  {
    role: "assistant",
    content:
      "Lore desk online. Ask me about the thesis and I will pretend the chart whispered it to me.",
  },
];

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
    <section className="chat-zone" aria-label="FEESYS chatbot">
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

function App() {
  return (
    <main className="page">
      <section className="ticker" aria-label="meme ticker">
        <div>
          THESIS IS THE NARRATIVE IS THE LORE *** TRUST ME BRO *** COULD SEND
          HARD *** MIGHT BE ALF *** SOURCE: GROUP CHAT ***
        </div>
      </section>

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
            <a className="button primary" href="#buy">
              acquire thesis
            </a>
            <a className="button secondary" href="#lore">
              inspect lore
            </a>
          </div>
          <div className="stat-strip" aria-label="Important fake stats">
            <span>100x pending</span>
            <span>0 utility detected</span>
            <span>12 tabs of alpha</span>
          </div>
        </div>
        <div className="mascot-wrap" aria-label="THESIS mascot">
          <img src={thesisMascot} alt="Cartoon mascot holding a THESIS sign" />
          <div className="speech">fee.sys</div>
        </div>
      </section>

      <LoreChat />

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
            <li>it could send hard</li>
            <li>might be alf</li>
            <li>the narrative is pre-revenue</li>
            <li>the lore is accidentally capital efficient</li>
            <li>trust me bro</li>
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

      <section className="chant-wall" id="buy" aria-label="Meme slogans">
        {chants.map((chant) => (
          <span key={chant}>{chant}</span>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
