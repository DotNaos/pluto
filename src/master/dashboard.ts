export function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pluto</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe6;
        --panel: rgba(255, 251, 244, 0.88);
        --ink: #1d2420;
        --muted: #5f6d65;
        --line: rgba(29, 36, 32, 0.12);
        --accent: #126a52;
        --accent-soft: rgba(18, 106, 82, 0.12);
        --warn: #9d5f10;
        --shadow: 0 18px 40px rgba(33, 44, 38, 0.12);
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(18, 106, 82, 0.16), transparent 38%),
          radial-gradient(circle at top right, rgba(212, 144, 39, 0.18), transparent 30%),
          linear-gradient(180deg, #fbf8f0 0%, var(--bg) 48%, #e8e1d5 100%);
        color: var(--ink);
      }
      main {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 48px;
      }
      .hero { display: grid; gap: 20px; margin-bottom: 24px; }
      .eyebrow {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        width: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(29, 36, 32, 0.08);
        color: var(--muted);
        font: 600 12px/1.2 ui-monospace, "SFMono-Regular", "SF Mono", Menlo, monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(2.4rem, 6vw, 5rem);
        line-height: 0.94;
        letter-spacing: -0.05em;
        max-width: 10ch;
      }
      .hero p {
        margin: 0;
        max-width: 68ch;
        font-size: 1.05rem;
        line-height: 1.55;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 20px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
      }
      .stack { display: grid; gap: 18px; }
      .section { padding: 22px 22px 24px; }
      .section h2 { margin: 0 0 10px; font-size: 1.1rem; }
      .meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .stat {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid rgba(29, 36, 32, 0.08);
      }
      .stat strong { display: block; font-size: 1.5rem; }
      .stat span { color: var(--muted); font-size: 0.85rem; }
      form { display: grid; gap: 12px; }
      label { display: grid; gap: 6px; font-size: 0.9rem; color: var(--muted); }
      input, textarea, select, button { font: inherit; }
      input, textarea, select {
        width: 100%;
        border: 1px solid rgba(29, 36, 32, 0.12);
        background: rgba(255, 255, 255, 0.86);
        border-radius: 14px;
        padding: 12px 14px;
        color: var(--ink);
      }
      textarea { min-height: 110px; resize: vertical; }
      .split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      button {
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, #126a52, #194738);
        color: white;
        padding: 12px 18px;
        font-weight: 600;
        cursor: pointer;
      }
      .hint { font-size: 0.82rem; color: var(--muted); }
      .status { margin-top: 10px; min-height: 1.2em; font-size: 0.88rem; color: var(--accent); }
      .status.warn { color: var(--warn); }
      .feed, .log {
        display: grid;
        gap: 10px;
        max-height: 62vh;
        overflow: auto;
      }
      .card {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid rgba(29, 36, 32, 0.08);
      }
      .card header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
        font-size: 0.8rem;
        color: var(--muted);
      }
      .card p, .card pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font: 600 0.75rem/1 ui-monospace, "SFMono-Regular", "SF Mono", Menlo, monospace;
      }
      @media (max-width: 920px) {
        .grid, .meta, .split { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="eyebrow">Single Conversation Runtime</span>
        <h1>Pluto Foundation Console</h1>
        <p>
          This is the Iteration 001 control surface for Pluto. It shows the single conversation,
          connected host presence, delegated command execution, and persisted run state from the
          master server in realtime.
        </p>
      </section>
      <section class="grid">
        <div class="stack">
          <article class="panel section">
            <h2>Live State</h2>
            <div class="meta" id="stats"></div>
          </article>
          <article class="panel section">
            <h2>Conversation</h2>
            <div class="feed" id="messages"></div>
          </article>
        </div>
        <div class="stack">
          <article class="panel section">
            <h2>Dispatch Command</h2>
            <form id="dispatch-form">
              <label>
                Message
                <textarea id="message-text" placeholder="Tell Pluto what to do.">Read README from the laptop workspace.</textarea>
              </label>
              <div class="split">
                <label>
                  Command
                  <select id="command-type">
                    <option value="workspace.read_file">workspace.read_file</option>
                    <option value="workspace.write_file">workspace.write_file</option>
                    <option value="process.run">process.run</option>
                  </select>
                </label>
                <label>
                  Workspace
                  <input id="workspace-id" value="laptop:repo" />
                </label>
              </div>
              <label>
                JSON Payload
                <textarea id="payload-json">{
  "path": "README.md"
}</textarea>
              </label>
              <button type="submit">Dispatch Through Master</button>
              <div class="hint">This talks to <code>/api/messages</code>. The host executes only within the declared workspace root.</div>
              <div class="status" id="status-line"></div>
            </form>
          </article>
          <article class="panel section">
            <h2>Event Log</h2>
            <div class="log" id="events"></div>
          </article>
        </div>
      </section>
    </main>
    <script type="module">
      const statsEl = document.getElementById("stats");
      const messagesEl = document.getElementById("messages");
      const eventsEl = document.getElementById("events");
      const statusLine = document.getElementById("status-line");
      const form = document.getElementById("dispatch-form");
      const commandTypeEl = document.getElementById("command-type");
      const messageTextEl = document.getElementById("message-text");
      const payloadJsonEl = document.getElementById("payload-json");
      const workspaceIdEl = document.getElementById("workspace-id");

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
        ].map(([label, value]) => \`<div class="stat"><strong>\${value}</strong><span>\${label}</span></div>\`).join("");
      }

      function renderMessages(state) {
        const items = [...state.messages].slice(-12).reverse();
        messagesEl.innerHTML = items.map((message) => \`
          <article class="card">
            <header>
              <span class="pill">\${escapeHtml(message.role)}</span>
              <span>\${new Date(message.createdAt).toLocaleTimeString()}</span>
            </header>
            <p>\${escapeHtml(message.text)}</p>
          </article>
        \`).join("");
      }

      function appendEvent(event) {
        const element = document.createElement("article");
        element.className = "card";
        element.innerHTML = \`
          <header>
            <span class="pill">\${escapeHtml(event.type)}</span>
            <span>\${new Date(event.createdAt).toLocaleTimeString()}</span>
          </header>
          <pre>\${escapeHtml(JSON.stringify(event.data, null, 2))}</pre>
        \`;
        eventsEl.prepend(element);
        while (eventsEl.children.length > 16) {
          eventsEl.removeChild(eventsEl.lastElementChild);
        }
      }

      async function loadState() {
        const response = await fetch("/api/state");
        const state = await response.json();
        renderStats(state);
        renderMessages(state);
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        statusLine.textContent = "";
        statusLine.className = "status";

        let payload = {};
        try {
          payload = JSON.parse(payloadJsonEl.value || "{}");
        } catch {
          statusLine.textContent = "Payload JSON is invalid.";
          statusLine.className = "status warn";
          return;
        }

        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: messageTextEl.value,
            commandType: commandTypeEl.value,
            workspaceId: workspaceIdEl.value,
            payload,
          }),
        });

        const body = await response.json();
        if (!response.ok && response.status !== 202) {
          statusLine.textContent = body.error || "Dispatch failed.";
          statusLine.className = "status warn";
          return;
        }

        statusLine.textContent = "Command dispatched through the master.";
        await loadState();
      });

      const eventStream = new EventSource("/api/events");
      eventStream.onmessage = (nativeEvent) => {
        const event = JSON.parse(nativeEvent.data);
        appendEvent(event);
      };

      loadState().catch((error) => {
        statusLine.textContent = error instanceof Error ? error.message : "Failed to load state.";
        statusLine.className = "status warn";
      });
    </script>
  </body>
</html>`;
}
