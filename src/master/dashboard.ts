export function renderChatHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pluto</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #151515;
        --bg-elevated: rgba(29, 29, 29, 0.88);
        --bg-message: rgba(38, 38, 38, 0.94);
        --bg-user: rgba(245, 245, 245, 0.08);
        --line: rgba(255, 255, 255, 0.08);
        --ink: #f2f0eb;
        --muted: rgba(242, 240, 235, 0.52);
        --shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        --radius-xl: 32px;
        --radius-md: 18px;
        font-family: "Charter", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%),
          linear-gradient(180deg, #1a1a1a 0%, var(--bg) 100%);
        color: var(--ink);
        overflow: hidden;
      }

      main {
        width: min(980px, calc(100vw - 32px));
        height: 100vh;
        margin: 0 auto;
        padding: 20px 0 24px;
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 18px;
      }

      .topbar {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 56px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--line);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .brand-mark {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #d5d0c5;
        box-shadow: 0 0 0 8px rgba(213, 208, 197, 0.08);
      }

      .brand span {
        font-size: 0.92rem;
        letter-spacing: 0.02em;
      }

      .brand small {
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
        font-size: 0.72rem;
        color: var(--muted);
      }

      .chat-shell {
        position: relative;
        min-height: 0;
        display: grid;
      }

      .empty-state,
      .timeline {
        width: min(760px, 100%);
        margin: 0 auto;
      }

      .empty-state {
        place-self: center;
        text-align: center;
        display: grid;
        gap: 20px;
        padding-bottom: 10vh;
      }

      .sigil {
        width: 56px;
        height: 56px;
        margin: 0 auto;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background:
          radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), transparent 36%),
          radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.06), transparent 28%),
          rgba(255, 255, 255, 0.02);
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
      }

      .empty-state h1 {
        margin: 0;
        font-size: clamp(2.6rem, 6vw, 4.8rem);
        letter-spacing: -0.06em;
        line-height: 0.96;
        font-weight: 500;
      }

      .empty-state p {
        margin: 0 auto;
        max-width: 34rem;
        color: var(--muted);
        line-height: 1.55;
        font-size: 0.98rem;
      }

      .timeline {
        min-height: 0;
        overflow: auto;
        padding: 18px 0 8px;
        display: none;
        gap: 14px;
      }

      .timeline.visible {
        display: grid;
      }

      .bubble {
        display: grid;
        gap: 6px;
        padding: 14px 16px 15px;
        border-radius: var(--radius-md);
        background: var(--bg-message);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .bubble.user {
        background: var(--bg-user);
      }

      .bubble-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        font-size: 0.76rem;
        color: var(--muted);
      }

      .bubble p {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.55;
        font-size: 1rem;
      }

      .role {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 9px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        color: #d9d3c8;
        font: 600 0.72rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
      }

      .composer-wrap {
        width: min(760px, 100%);
        margin: 0 auto;
      }

      form {
        display: grid;
        gap: 10px;
      }

      .composer {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: end;
        padding: 12px;
        border-radius: var(--radius-xl);
        background: var(--bg-elevated);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      textarea,
      button {
        font: inherit;
      }

      textarea {
        width: 100%;
        min-height: 24px;
        max-height: 180px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--ink);
        padding: 12px 14px;
        line-height: 1.5;
      }

      textarea::placeholder {
        color: rgba(242, 240, 235, 0.34);
      }

      button {
        height: 48px;
        min-width: 48px;
        border: 0;
        border-radius: 999px;
        padding: 0 18px;
        background: #f0ece3;
        color: #141414;
        cursor: pointer;
        font-weight: 600;
      }

      .subtle {
        display: flex;
        justify-content: center;
        min-height: 1rem;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .subtle.warn {
        color: #d6aa72;
      }

      @media (max-width: 720px) {
        main {
          width: min(100vw - 20px, 760px);
          padding: 14px 0 16px;
        }

        .empty-state {
          padding-bottom: 18vh;
        }

        .empty-state h1 {
          font-size: 2.35rem;
        }

        .composer {
          border-radius: 24px;
          padding: 10px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark"></div>
          <span>Pluto</span>
          <small>single conversation</small>
        </div>
      </header>

      <section class="chat-shell">
        <section class="empty-state" id="empty-state">
          <div class="sigil"></div>
          <div>
            <h1>One assistant. One chat.</h1>
            <p>All state, routing, and execution live in the backend. This surface is only the conversation.</p>
          </div>
        </section>

        <section class="timeline" id="messages"></section>
      </section>

      <footer class="composer-wrap">
        <form id="chat-form">
          <div class="composer">
            <textarea id="message-text" placeholder="Ask Pluto" rows="1"></textarea>
            <button type="submit">Send</button>
          </div>
          <div class="subtle" id="status-line"></div>
        </form>
      </footer>
    </main>

    <script type="module">
      const messagesEl = document.getElementById("messages");
      const emptyStateEl = document.getElementById("empty-state");
      const statusLine = document.getElementById("status-line");
      const form = document.getElementById("chat-form");
      const messageTextEl = document.getElementById("message-text");
      let lastEventCount = 0;

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }

      function renderMessages(state) {
        const items = [...state.messages];
        messagesEl.innerHTML = items.map((message) => \`
          <article class="bubble \${escapeHtml(message.role)}">
            <header class="bubble-header">
              <span class="role">\${escapeHtml(message.role)}</span>
              <span>\${new Date(message.createdAt).toLocaleTimeString()}</span>
            </header>
            <p>\${escapeHtml(message.text)}</p>
          </article>
        \`).join("");

        const hasMessages = items.length > 0;
        emptyStateEl.style.display = hasMessages ? "none" : "grid";
        messagesEl.classList.toggle("visible", hasMessages);
        if (hasMessages) {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      }

      function autoSizeComposer() {
        messageTextEl.style.height = "auto";
        messageTextEl.style.height = Math.min(messageTextEl.scrollHeight, 180) + "px";
      }

      async function loadState() {
        const response = await fetch("/api/state");
        const state = await response.json();
        renderMessages(state);
        lastEventCount = state.events.length;
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = messageTextEl.value.trim();
        if (!text) {
          return;
        }

        statusLine.textContent = "";
        statusLine.className = "subtle";

        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const body = await response.json();
        if (!response.ok && response.status !== 202) {
          statusLine.textContent = body.error || "Dispatch failed.";
          statusLine.className = "subtle warn";
          return;
        }

        messageTextEl.value = "";
        autoSizeComposer();
        await loadState();
      });

      messageTextEl.addEventListener("input", autoSizeComposer);
      messageTextEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          form.requestSubmit();
        }
      });

      setInterval(async () => {
        try {
          const response = await fetch("/api/state");
          const state = await response.json();
          if (state.events.length !== lastEventCount) {
            renderMessages(state);
            lastEventCount = state.events.length;
          }
        } catch {
          // Keep the chat quiet during transient polling failures.
        }
      }, 1200);

      autoSizeComposer();
      loadState().catch((error) => {
        statusLine.textContent = error instanceof Error ? error.message : "Failed to load state.";
        statusLine.className = "subtle warn";
      });
    </script>
  </body>
</html>`;
}

export function renderAdminHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pluto Admin</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #111111;
        --panel: #1a1a1a;
        --panel-soft: #202020;
        --line: rgba(255, 255, 255, 0.08);
        --ink: #f3f1ea;
        --muted: rgba(243, 241, 234, 0.58);
        --accent: #cfc6b5;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--ink);
      }

      main {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 22px 0 28px;
        display: grid;
        gap: 18px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .header h1 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .header span {
        color: var(--muted);
        font-size: 0.84rem;
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 16px;
      }

      .stat strong {
        display: block;
        font-size: 1.5rem;
      }

      .stat span,
      .card header small {
        color: var(--muted);
      }

      .card header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .list {
        display: grid;
        gap: 10px;
        max-height: 54vh;
        overflow: auto;
      }

      .item {
        background: var(--panel-soft);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px;
      }

      .item strong,
      .item code,
      .item pre {
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
      }

      .item p,
      .item pre {
        margin: 6px 0 0;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      @media (max-width: 920px) {
        .grid,
        .stats {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="header">
        <div>
          <h1>Pluto Admin</h1>
          <span>Observability for the foundation runtime. Not part of the end-user product surface.</span>
        </div>
        <span id="updated-at">waiting for state</span>
      </section>

      <section class="stats" id="stats"></section>

      <section class="grid">
        <article class="card">
          <header>
            <strong>Hosts</strong>
            <small id="host-count"></small>
          </header>
          <div class="list" id="hosts"></div>
        </article>

        <article class="card">
          <header>
            <strong>Recent Commands</strong>
            <small id="command-count"></small>
          </header>
          <div class="list" id="commands"></div>
        </article>

        <article class="card">
          <header>
            <strong>Artifacts</strong>
            <small id="artifact-count"></small>
          </header>
          <div class="list" id="artifacts"></div>
        </article>

        <article class="card">
          <header>
            <strong>Events</strong>
            <small id="event-count"></small>
          </header>
          <div class="list" id="events"></div>
        </article>
      </section>
    </main>

    <script type="module">
      const statsEl = document.getElementById("stats");
      const hostsEl = document.getElementById("hosts");
      const commandsEl = document.getElementById("commands");
      const artifactsEl = document.getElementById("artifacts");
      const eventsEl = document.getElementById("events");

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }

      function renderStats(state) {
        const connectedHosts = state.hosts.filter((host) => host.connected).length;
        statsEl.innerHTML = [
          ["Messages", state.messages.length],
          ["Hosts", connectedHosts],
          ["Runs", state.runs.length],
          ["Artifacts", state.artifacts.length],
        ].map(([label, value]) => \`<div class="card stat"><strong>\${value}</strong><span>\${label}</span></div>\`).join("");
      }

      function renderHosts(state) {
        document.getElementById("host-count").textContent = \`\${state.hosts.length} total\`;
        hostsEl.innerHTML = state.hosts.map((host) => \`
          <article class="item">
            <div class="row">
              <strong>\${escapeHtml(host.name)}</strong>
              <span>\${host.connected ? "connected" : "offline"}</span>
            </div>
            <p><code>\${escapeHtml(host.id)}</code></p>
            <p>workspaces: \${host.workspaceIds.map((id) => escapeHtml(id)).join(", ")}</p>
          </article>
        \`).join("");
      }

      function renderCommands(state) {
        const commands = [...state.commands].slice(-12).reverse();
        document.getElementById("command-count").textContent = \`\${state.commands.length} total\`;
        commandsEl.innerHTML = commands.map((command) => \`
          <article class="item">
            <div class="row">
              <strong>\${escapeHtml(command.type)}</strong>
              <span>\${escapeHtml(command.status)}</span>
            </div>
            <p><code>\${escapeHtml(command.id)}</code></p>
            <pre>\${escapeHtml(JSON.stringify(command.payload, null, 2))}</pre>
          </article>
        \`).join("");
      }

      function renderArtifacts(state) {
        const artifacts = [...state.artifacts].slice(-12).reverse();
        document.getElementById("artifact-count").textContent = \`\${state.artifacts.length} total\`;
        artifactsEl.innerHTML = artifacts.map((artifact) => \`
          <article class="item">
            <div class="row">
              <strong>\${escapeHtml(artifact.kind)}</strong>
              <span>\${new Date(artifact.createdAt).toLocaleTimeString()}</span>
            </div>
            <p>\${escapeHtml(artifact.title)}</p>
            <pre>\${escapeHtml(JSON.stringify(artifact.metadata, null, 2))}</pre>
          </article>
        \`).join("");
      }

      function renderEvents(state) {
        const events = [...state.events].slice(-20).reverse();
        document.getElementById("event-count").textContent = \`\${state.events.length} total\`;
        eventsEl.innerHTML = events.map((event) => \`
          <article class="item">
            <div class="row">
              <strong>\${escapeHtml(event.type)}</strong>
              <span>\${new Date(event.createdAt).toLocaleTimeString()}</span>
            </div>
            <pre>\${escapeHtml(JSON.stringify(event.data, null, 2))}</pre>
          </article>
        \`).join("");
      }

      async function loadState() {
        const response = await fetch("/api/state");
        const state = await response.json();
        renderStats(state);
        renderHosts(state);
        renderCommands(state);
        renderArtifacts(state);
        renderEvents(state);
        document.getElementById("updated-at").textContent = "updated " + new Date().toLocaleTimeString();
      }

      loadState();
      setInterval(loadState, 1500);
    </script>
  </body>
</html>`;
}
