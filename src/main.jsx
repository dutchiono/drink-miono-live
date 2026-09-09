import React from "react";
import { createRoot } from "react-dom/client";
import thesisMascot from "./assets/thesis-mascot.png";
import "./style.css";

const chants = [
  "the thesis is that the narrative is lore",
  "might be alf",
  "could send hard",
  "trust me bro",
  "please bro",
  "fee.sys",
  "no roadmap just vibes",
  "alpha? no, alf",
];

function App() {
  return (
    <main className="page">
      <section className="ticker" aria-label="meme ticker">
        <div>
          THESIS IS THE NARRATIVE IS THE LORE *** TRUST ME BRO *** COULD SEND
          HARD *** PLEASE BRO *** MIGHT BE ALF ***
        </div>
      </section>

      <section className="hero" aria-label="Memecoin landing page">
        <div className="hero-copy">
          <p className="eyebrow">drink.miono.live presents</p>
          <h1>THESIS</h1>
          <p className="lede">
            The narrative is lore. The lore is narrative. The thesis is that
            the narrative is lore. You are still early because nobody knows what
            this means.
          </p>
          <div className="button-row">
            <a className="button primary" href="#buy">
              send it
            </a>
            <a className="button secondary" href="#lore">
              explain nothing
            </a>
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
          <h2>the thesis is that the narrative is lore</h2>
          <p>
            Institutional-grade sentence fragments for people who call every
            group chat a community.
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
          <strong>chart says bro please</strong>
        </article>

        <article className="panel manifesto-panel">
          <p className="panel-label">MANIFESTO</p>
          <ul>
            <li>it could send hard</li>
            <li>might be alf</li>
            <li>the narrative is</li>
            <li>the lore is</li>
            <li>trust me bro</li>
          </ul>
        </article>
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
