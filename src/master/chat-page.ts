import { chatStyles } from "./chat-styles.js";
import { chatScript } from "./chat-script.js";

export function renderChatHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pluto</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/base16/material-darker.min.css" />
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
          displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        },
        options: {
          skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        },
      };
    </script>
    <script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js"></script>
    <style>${chatStyles}</style>
  </head>
  <body>
    <main>
      <header class="topbar">
        <div class="topbar-spacer" aria-hidden="true"></div>
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3.6"></circle>
              <path d="M4.5 12c2.7-3.5 12.3-3.5 15 0"></path>
              <path d="M5.7 8.2c2.9-1.7 9.7-1.7 12.6 0"></path>
              <path d="M5.7 15.8c2.9 1.7 9.7 1.7 12.6 0"></path>
            </svg>
          </div>
          <div class="brand-text">
            <strong>Pluto</strong>
            <small>single conversation</small>
          </div>
        </div>
        <div class="topbar-actions">
          <label class="model-picker" aria-label="Select model">
            <select id="model-select">
              <option value="">model</option>
            </select>
          </label>
          <a class="pill-link" href="/admin">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 17h16"></path>
            </svg>
            <span>Admin</span>
          </a>
        </div>
      </header>

      <section class="chat-shell">
        <section class="empty-state" id="empty-state">
          <div class="sigil" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3.6"></circle>
              <path d="M4.5 12c2.7-3.5 12.3-3.5 15 0"></path>
              <path d="M5.7 8.2c2.9-1.7 9.7-1.7 12.6 0"></path>
              <path d="M5.7 15.8c2.9 1.7 9.7 1.7 12.6 0"></path>
            </svg>
          </div>
          <div>
            <h1>One assistant. One chat.</h1>
            <p>All state, routing, and execution live in the backend. This surface is only the conversation.</p>
          </div>
        </section>

        <section class="timeline" id="messages"></section>
      </section>

      <section class="viewer-shell" id="embed-viewer" hidden>
        <div class="viewer-backdrop" data-action="close-viewer"></div>
        <div class="viewer-panel" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
          <header class="viewer-header">
            <div class="viewer-meta">
              <span class="viewer-kind" id="viewer-kind">preview</span>
              <strong id="viewer-title">Embed</strong>
            </div>
            <div class="viewer-actions">
              <a class="viewer-link" id="viewer-open-link" href="#" target="_blank" rel="noreferrer noopener">Open</a>
              <button class="viewer-close" id="viewer-close" type="button" aria-label="Close preview">
                <svg viewBox="0 0 24 24">
                  <path d="M6 6 18 18"></path>
                  <path d="M18 6 6 18"></path>
                </svg>
              </button>
            </div>
          </header>
          <div class="viewer-body" id="viewer-body"></div>
        </div>
      </section>

      <footer class="composer-wrap">
        <form id="chat-form">
          <div class="composer">
            <div class="composer-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3.6"></circle>
                <path d="M4.5 12c2.7-3.5 12.3-3.5 15 0"></path>
                <path d="M5.7 15.8c2.9 1.7 9.7 1.7 12.6 0"></path>
              </svg>
            </div>
            <textarea id="message-text" placeholder="Ask Pluto" rows="1"></textarea>
            <button type="submit" aria-label="Send message">
              <svg viewBox="0 0 24 24">
                <path d="M5 12h14"></path>
                <path d="m13 5 7 7-7 7"></path>
              </svg>
            </button>
          </div>
          <div class="subtle" id="status-line"></div>
        </form>
      </footer>
    </main>

    <script type="module">${chatScript}</script>
  </body>
</html>`;
}
