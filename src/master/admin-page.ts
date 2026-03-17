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
          <div class="status-grid">
            <div class="status-item">
              <div class="status-header">
                <span class="status-label">ChatGPT Account</span>
                <span id="auth-notice" class="notice-text"></span>
              </div>
              <strong id="auth-headline">Checking account...</strong>
              <div class="actions mini-actions">
                <button class="primary" id="login-button" type="button">Connect</button>
                <a class="primary" id="login-link" href="#" target="_blank" rel="noreferrer noopener" hidden>Open Auth</a>
                <button id="cancel-login-button" type="button" hidden>Cancel Login</button>
                <button id="logout-button" type="button" hidden>Logout</button>
              </div>
            </div>

            <div class="status-item">
              <div class="status-header">
                <span class="status-label">Active Thread</span>
                <code id="current-thread-id" class="muted">Pluto will start a fresh thread.</code>
              </div>
              <strong id="current-thread-label">No attached thread</strong>
              <div class="actions mini-actions">
                <button id="reset-thread-button" type="button">New Thread</button>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <header class="section-header">
            <div>
              <strong>Recent Sessions</strong>
              <p>Attach Pluto to an existing Codex thread.</p>
            </div>
            <button id="btn-show-all-sessions">View all <span id="session-count"></span></button>
          </header>
          <div class="session-list" id="sessions-recent"></div>
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

    <dialog id="sessions-modal" class="modal">
      <div class="modal-header">
        <h3>All Sessions</h3>
        <button id="close-modal" class="ghost icon-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 6 6 18M6 6l12 12"></path></svg>
        </button>
      </div>
      <div class="modal-body">
        <input type="search" id="session-search" placeholder="Search sessions..." class="search-input" />
        <div class="session-list" id="sessions-all"></div>
      </div>
    </dialog>

    <script type="module">${adminScript}</script>
  </body>
</html>`;
}

