<script setup>
import { RouterLink } from 'vue-router';
import MenuLayout from '../components/MenuLayout.vue';
</script>

<template>
  <MenuLayout>
    <div class="about">
      <div class="about-card">
        <h1>About Line of Battle Online</h1>

        <section class="section" aria-labelledby="credits-heading">
          <h2 id="credits-heading">Game Credits</h2>
          <p>
            <em>South Mountain</em> (RSS #4) is published by
            <a
              href="https://www.multimanpublishing.com/line-of-battle"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="mmp-link"
            >
              Multi-Man Publishing (MMP)
            </a>
            and is based on the
            <em>Line of Battle v2.0</em> game system originally designed by
            <strong>The Gamers</strong>.
          </p>
          <p><strong>Game Designers:</strong> Dean Essig &amp; David A. Powell</p>
        </section>

        <section class="section" aria-labelledby="links-heading">
          <h2 id="links-heading">Useful Links</h2>
          <ul class="link-list" data-testid="link-list">
            <li>
              <a
                href="https://consimworld.com/gamers-archive"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="gamers-archive-link"
              >
                The Gamers Archive
              </a>
            </li>
            <li>
              <a
                href="https://www.multimanpublishing.com/line-of-battle"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="lob-series-link"
              >
                LoB Series Support (MMP)
              </a>
            </li>
            <li>
              <a
                href="https://www.multimanpublishing.com/line-of-battle"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="mmp-lob-link"
              >
                MMP Line of Battle Page
              </a>
            </li>
          </ul>
        </section>

        <section class="section" aria-labelledby="app-credit-heading">
          <h2 id="app-credit-heading">Web Application</h2>
          <p data-testid="app-credit">
            Line of Battle Online was created by Andrew Hammer using Claude and OpenAI's Codex
            tools.
          </p>
        </section>

        <section class="section disclaimer" aria-labelledby="disclaimer-heading">
          <h2 id="disclaimer-heading">Disclaimer</h2>
          <p data-testid="disclaimer">
            This is an unofficial fan implementation of <em>Line of Battle v2.0</em>. It is not
            affiliated with or endorsed by Multi-Man Publishing or The Gamers. All game rules,
            scenarios, and related intellectual property remain the property of their respective
            owners.
          </p>
        </section>

        <nav class="back-nav">
          <RouterLink to="/" class="back-link" data-testid="back-home-link">← Home</RouterLink>
        </nav>
      </div>
    </div>
  </MenuLayout>
</template>

<style scoped>
.about {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.about-card {
  background: rgba(10, 8, 5, 0.82);
  border: 1px solid #3a3020;
  border-radius: 6px;
  padding: 2.5rem 3rem;
  max-width: 680px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  font-size: 1.6rem;
  letter-spacing: 0.05em;
  color: #e8d8b8;
  margin: 0;
}

h2 {
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a89a7a;
  margin: 0 0 0.6rem;
}

.section {
  display: flex;
  flex-direction: column;
}

p {
  color: #c8b890;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 0.5rem;
}

p:last-child {
  margin-bottom: 0;
}

a {
  color: #b8a870;
  text-decoration: underline;
}

a:hover {
  color: #e8d8b0;
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.link-list li {
  font-size: 0.95rem;
}

.disclaimer p {
  color: #7a6a5a;
  font-size: 0.85rem;
  font-style: italic;
}

.back-nav {
  margin-top: 0.5rem;
}

.back-link {
  color: #8a7a6a;
  font-size: 0.85rem;
  text-decoration: none;
  letter-spacing: 0.03em;
}

.back-link:hover {
  color: #c8b890;
}
</style>
