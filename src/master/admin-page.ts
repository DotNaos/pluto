import { adminStyles } from "./admin-styles.js";
import { adminScript } from "./admin-script.js";

export function renderAdminHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pluto Admin</title>
    <style>${adminStyles}</style>
  </head>
  <body>
    <main>
      <section class="shell">
        <header class="shell-header">
          <div class="back-link-wrapper">
            <a class="back-link" href="/">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
                <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"></path>
              </svg>
              <span>Chat</span>
            </a>
          </div>
          <div class="hero-meta">
            <span class="meta-pill">Iteration 001</span>
            <span class="meta-pill" id="updated-at">waiting for state</span>
          </div>
        </header>

        <div class="hero-copy">
          <h1>Pluto Admin</h1>
          <p>Connect Pluto to Codex, attach it to the right session, then inspect runtime health only when needed.</p>
        </div>

        <section class="section">
          <div class="runtime-layout">
            <div class="stack">
              <section class="subsection">
                <div class="subsection-header">
                  <strong id="auth-headline">Checking ChatGPT account</strong>
                </div>
                <p id="auth-copy">Pluto uses the local Codex app-server and its ChatGPT-managed auth flow.</p>
                <div class="actions">
                  <button class="primary" id="login-button" type="button">Connect ChatGPT</button>
                  <a class="primary" id="login-link" href="#" target="_blank" rel="noreferrer noopener" hidden>Open Auth</a>
                  <button id="cancel-login-button" type="button" hidden>Cancel Login</button>
                  <button id="logout-button" type="button" hidden>Logout</button>
                </div>
                <span class="notice" id="auth-notice" style="display:block;margin-top:8px;"></span>
              </section>

              <section class="subsection" style="margin-top: 24px;">
                <div class="subsection-header">
                  <strong>Attached Codex Thread</strong>
                  <button id="reset-thread-button" type="button">New Pluto Thread</button>
                </div>
                <div class="thread-inline" id="current-thread-card">
                  <strong id="current-thread-label">No attached thread yet</strong>
                  <code id="current-thread-id">Pluto will start a fresh Codex thread on the next reply.</code>
                </div>
              </section>
            </div>

            <section class="subsection runtime-details-block">
              <div class="subsection-header">
                <strong>Runtime Details</strong>
              </div>
              <div class="runtime-list" id="runtime-details"></div>
            </section>
          </div>
        </section>

        <section class="section">
          <header class="section-header">
            <div>
              <strong>Codex Sessions</strong>
              <p>Attach Pluto to an existing Codex thread, including currently active ones.</p>
            </div>
            <small id="session-count"></small>
          </header>
          <div class="session-list" id="sessions"></div>
        </section>

        <section class="section">
          <header class="section-header">
            <div>
              <strong>System Summary</strong>
              <p>Only the state that helps the next admin decision.</p>
            </div>
          </header>
          <div class="summary" id="system-summary"></div>
        </section>

        <section class="section">
          <header class="section-header">
            <div>
              <strong>Observability</strong>
              <p>Supporting detail only. Hosts, commands, artifacts, and events stay in one surface.</p>
            </div>
          </header>
          <div class="observability-grid">
            <section class="column">
              <div class="column-header">
                <strong>Hosts</strong>
                <small id="host-count"></small>
              </div>
              <div class="list" id="hosts"></div>
            </section>
            <section class="column">
              <div class="column-header">
                <strong>Recent Commands</strong>
                <small id="command-count"></small>
              </div>
              <div class="list" id="commands"></div>
            </section>
            <section class="column">
              <div class="column-header">
                <strong>Artifacts</strong>
                <small id="artifact-count"></small>
              </div>
              <div class="list" id="artifacts"></div>
            </section>
            <section class="column">
              <div class="column-header">
                <strong>Events</strong>
                <small id="event-count"></small>
              </div>
              <div class="list" id="events"></div>
            </section>
          </div>
        </section>
      </section>
    </main>
    <script type="module">${adminScript}</script>
  </body>
</html>`;
}

