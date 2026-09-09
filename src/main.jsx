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
            A coin for the guys who say "the thesis" like they found buried
            treasure in a Telegram screenshot. No product. No math. Just lore
            wearing a tiny fake mustache called narrative.
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
