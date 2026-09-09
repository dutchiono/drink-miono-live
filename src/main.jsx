import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return (
    <main className="page">
      <section className="hero" aria-label="Drink site landing page">
        <div className="hero-copy">
          <p className="eyebrow">drink.miono.live</p>
          <h1>Fresh page, ready for edits.</h1>
          <p className="lede">
            This site is wired to GitHub. Change the repo, push to main, and the
            server publishes the new version automatically.
          </p>
          <a className="button" href="https://github.com/dutchiono/drink-miono-live">
            Edit on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
