export const adminScript = String.raw`
      const summaryEl = document.getElementById("system-summary");
      const hostsEl = document.getElementById("hosts");
      const commandsEl = document.getElementById("commands");
      const artifactsEl = document.getElementById("artifacts");
      const eventsEl = document.getElementById("events");
      const sessionsEl = document.getElementById("sessions");
      const sessionCountEl = document.getElementById("session-count");
      const currentThreadLabelEl = document.getElementById("current-thread-label");
      const currentThreadIdEl = document.getElementById("current-thread-id");
      const resetThreadButtonEl = document.getElementById("reset-thread-button");
      const authHeadlineEl = document.getElementById("auth-headline");
      const authCopyEl = document.getElementById("auth-copy");
      const authNoticeEl = document.getElementById("auth-notice");
      const authUpdatedEl = document.getElementById("auth-updated");
      const runtimeDetailsEl = document.getElementById("runtime-details");
      const loginButtonEl = document.getElementById("login-button");
      const loginLinkEl = document.getElementById("login-link");
      const cancelLoginButtonEl = document.getElementById("cancel-login-button");
      const logoutButtonEl = document.getElementById("logout-button");

      let latestRuntime = null;
      let latestSessions = [];

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }

      function formatTime(value) {
        if (!value) {
          return "unknown";
        }

        return new Date(value).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }

      function buildFileHref(path, download) {
        const params = new URLSearchParams({ path });
        if (download) {
          params.set("download", "1");
        }
        return "/api/file?" + params.toString();
      }

      function summarizePayload(command) {
        if (!command || typeof command !== "object") {
          return "";
        }

        if (command.type === "workspace.read_file" && command.payload && command.payload.path) {
          return "path " + command.payload.path;
        }

        if (command.type === "workspace.write_file" && command.payload && command.payload.path) {
          return "path " + command.payload.path;
        }

        if (command.type === "process.run" && command.payload && command.payload.command) {
          return String(command.payload.command);
        }

        return JSON.stringify(command.payload || {});
      }

      function renderSummary(state) {
        const connectedHosts = state.hosts.filter((host) => host.connected).length;
        const runningCommands = state.commands.filter((command) => command.status === "running" || command.status === "accepted").length;
        const attachedThread = latestRuntime && latestRuntime.threadId ? "attached" : "fresh";
        summaryEl.innerHTML = [
          ["Messages", state.messages.length],
          ["Connected Hosts", connectedHosts],
          ["In-flight Commands", runningCommands],
          ["Pluto Thread", attachedThread],
        ].map(function(entry) {
          return '<article class="summary-pill"><strong>' + escapeHtml(entry[1]) + '</strong><span>' + escapeHtml(entry[0]) + '</span></article>';
        }).join("");
      }

      function renderHosts(state) {
        document.getElementById("host-count").textContent = state.hosts.length + " total";
        hostsEl.innerHTML = state.hosts.map(function(host) {
          return '<article class="item">'
            + '<div class="row"><strong>' + escapeHtml(host.name) + '</strong><span class="chip ' + (host.connected ? "online" : "muted") + '">' + (host.connected ? "connected" : "offline") + '</span></div>'
            + '<p><code>' + escapeHtml(host.id) + '</code></p>'
            + '<p class="muted">workspaces: ' + escapeHtml(host.workspaceIds.join(", ") || "none") + '</p>'
            + '</article>';
        }).join("") || '<div class="empty">No hosts connected yet.</div>';
      }

      function renderCommands(state) {
        const commands = state.commands.slice(-10).reverse();
        document.getElementById("command-count").textContent = state.commands.length + " total";
        commandsEl.innerHTML = commands.map(function(command) {
          return '<article class="item">'
            + '<div class="row"><strong>' + escapeHtml(command.type) + '</strong><span class="chip">' + escapeHtml(command.status) + '</span></div>'
            + '<p class="muted">' + escapeHtml(summarizePayload(command)) + '</p>'
            + '<p><code>' + escapeHtml(command.targetHost + " · " + command.targetWorkspace) + '</code></p>'
            + '</article>';
        }).join("") || '<div class="empty">No commands yet.</div>';
      }

      function renderArtifacts(state) {
        const artifacts = state.artifacts.slice(-10).reverse();
        document.getElementById("artifact-count").textContent = state.artifacts.length + " total";
        artifactsEl.innerHTML = artifacts.map(function(artifact) {
          return '<article class="item">'
            + '<div class="row"><strong>' + escapeHtml(artifact.title) + '</strong><span class="chip">' + escapeHtml(artifact.kind) + '</span></div>'
            + '<p class="muted">' + escapeHtml(formatTime(artifact.createdAt)) + '</p>'
            + '</article>';
        }).join("") || '<div class="empty">No artifacts yet.</div>';
      }

      function renderEvents(state) {
        const recentEvents = state.events.slice(-10).reverse();
        document.getElementById("event-count").textContent = state.events.length + " total";
        eventsEl.innerHTML = recentEvents.map(function(event) {
          return '<article class="item">'
            + '<div class="row"><strong>' + escapeHtml(event.type) + '</strong><span class="muted">' + escapeHtml(formatTime(event.createdAt)) + '</span></div>'
            + '</article>';
        }).join("") || '<div class="empty">No events yet.</div>';
      }

      function renderCurrentThread(runtime) {
        if (!runtime || !runtime.threadId) {
          currentThreadLabelEl.textContent = "No attached thread yet";
          currentThreadIdEl.textContent = "Pluto will start a fresh Codex thread on the next reply.";
          return;
        }

        const attached = latestSessions.find(function(session) {
          return session.id === runtime.threadId;
        });
        currentThreadLabelEl.textContent = attached ? attached.title : "Attached Codex thread";
        currentThreadIdEl.textContent = runtime.threadId;
      }

      function renderRuntime(runtime) {
        latestRuntime = runtime;
        const account = typeof runtime.account === "object" && runtime.account !== null ? runtime.account : null;
        const login = typeof runtime.login === "object" && runtime.login !== null ? runtime.login : { status: "idle" };
        const model = typeof runtime.model === "string" ? runtime.model : "none";
        const availableModels = Array.isArray(runtime.availableModels) ? runtime.availableModels.length : 0;

        runtimeDetailsEl.innerHTML = [
          ["provider", runtime.chatProvider || "unknown"],
          ["model", model],
          ["visible models", String(availableModels)],
          ["thread", runtime.threadId || "fresh on next reply"],
          ["account", account ? (account.type === "chatgpt" ? account.email : account.type) : "not connected"],
          ["plan", account && account.type === "chatgpt" ? account.planType : "n/a"],
        ].map(function(entry) {
          return '<div class="runtime-row"><span>' + escapeHtml(entry[0]) + '</span><strong>' + escapeHtml(entry[1]) + '</strong></div>';
        }).join("");

        authUpdatedEl.textContent = "runtime " + new Date().toLocaleTimeString();
        renderCurrentThread(runtime);

        loginButtonEl.hidden = Boolean(account) || login.status === "pending";
        logoutButtonEl.hidden = !account;
        cancelLoginButtonEl.hidden = login.status !== "pending";
        loginLinkEl.hidden = !(login.status === "pending" && login.authUrl);

        if (login.status === "pending" && login.authUrl) {
          authHeadlineEl.textContent = "Finish ChatGPT login";
          authCopyEl.textContent = "Open the returned auth URL, complete login, then Pluto will refresh automatically.";
          authNoticeEl.textContent = login.loginId ? "login id: " + login.loginId : "";
          loginLinkEl.href = login.authUrl;
          return;
        }

        loginLinkEl.href = "#";

        if (account && account.type === "chatgpt") {
          authHeadlineEl.textContent = "ChatGPT connected";
          authCopyEl.textContent = account.email + " on plan " + account.planType + ". Pluto replies run through the local Codex app-server.";
          authNoticeEl.textContent = "";
          return;
        }

        if (login.status === "error") {
          authHeadlineEl.textContent = "ChatGPT login failed";
          authCopyEl.textContent = "Start the login flow again from here.";
          authNoticeEl.textContent = login.error || "Unknown login error.";
          return;
        }

        authHeadlineEl.textContent = "ChatGPT account required";
        authCopyEl.textContent = "Pluto does not use an API key here. Connect your ChatGPT account through Codex.";
        authNoticeEl.textContent = "";
      }

      function renderSessions(payload) {
        latestSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        sessionCountEl.textContent = latestSessions.length + " visible";
        sessionsEl.innerHTML = latestSessions.map(function(session) {
          const chips = [
            session.isAttached ? '<span class="chip attached">attached</span>' : "",
            session.isActive ? '<span class="chip online">active</span>' : '<span class="chip muted">recent</span>',
          ].join("");

          const transcriptLink = session.transcriptPath
            ? '<a class="ghost" href="' + escapeHtml(buildFileHref(session.transcriptPath, true)) + '" target="_blank" rel="noreferrer noopener">Transcript</a>'
            : "";

          const attachButton = session.isAttached
            ? '<button class="primary" type="button" disabled>Attached</button>'
            : '<button class="primary" data-action="attach" data-thread-id="' + escapeHtml(session.id) + '" type="button">Attach</button>';

          return '<article class="session-card">'
            + '<div class="row"><strong>' + escapeHtml(session.title) + '</strong><div class="row chips">' + chips + '</div></div>'
            + '<p class="muted">' + escapeHtml(formatTime(session.updatedAt)) + '</p>'
            + '<p><code>' + escapeHtml(session.id) + '</code></p>'
            + '<div class="actions">'
            + attachButton
            + '<button data-action="copy" data-thread-id="' + escapeHtml(session.id) + '" type="button">Copy ID</button>'
            + transcriptLink
            + '</div>'
            + '</article>';
        }).join("") || '<div class="empty">No local Codex sessions found.</div>';

        if (latestRuntime) {
          renderCurrentThread(latestRuntime);
        }
      }

      async function loadState() {
        const response = await fetch("/api/state");
        const state = await response.json();
        renderSummary(state);
        renderHosts(state);
        renderCommands(state);
        renderArtifacts(state);
        renderEvents(state);
        document.getElementById("updated-at").textContent = "updated " + new Date().toLocaleTimeString();
      }

      async function loadRuntime() {
        const response = await fetch("/api/runtime");
        const runtime = await response.json();
        renderRuntime(runtime);
      }

      async function loadSessions() {
        const response = await fetch("/api/codex/sessions");
        const payload = await response.json();
        renderSessions(payload);
      }

      async function refreshAll() {
        await Promise.all([loadState(), loadRuntime(), loadSessions()]);
      }

      async function attachThread(threadId) {
        const response = await fetch("/api/codex/sessions/attach", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ threadId }),
        });
        const payload = await response.json();
        if (!response.ok) {
          authNoticeEl.textContent = payload.error || "Could not attach session.";
          return;
        }

        renderRuntime(payload.runtime);
        renderSessions(payload);
        authNoticeEl.textContent = "Pluto is now attached to " + threadId + ".";
      }

      sessionsEl.addEventListener("click", async function(event) {
        const button = event.target.closest("button[data-action]");
        if (!button) {
          return;
        }

        const action = button.getAttribute("data-action");
        const threadId = button.getAttribute("data-thread-id");
        if (!threadId) {
          return;
        }

        if (action === "attach") {
          await attachThread(threadId);
          return;
        }

        if (action === "copy") {
          await navigator.clipboard.writeText(threadId);
          authNoticeEl.textContent = "Copied thread id " + threadId + ".";
        }
      });

      loginButtonEl.addEventListener("click", async function() {
        const response = await fetch("/api/auth/login", { method: "POST" });
        const body = await response.json();
        if (!response.ok) {
          authNoticeEl.textContent = body.error || "Login could not be started.";
          return;
        }

        renderRuntime({
          account: null,
          availableModels: [],
          chatProvider: "codex-app-server",
          login: body,
          model: null,
          modelOptions: [],
          requiresOpenaiAuth: true,
          threadId: null,
        });
        if (body.authUrl) {
          window.open(body.authUrl, "_blank", "noopener,noreferrer");
        }
        await refreshAll();
      });

      cancelLoginButtonEl.addEventListener("click", async function() {
        const response = await fetch("/api/auth/login/cancel", { method: "POST" });
        const body = await response.json();
        if (!response.ok) {
          authNoticeEl.textContent = body.error || "Login could not be cancelled.";
          return;
        }

        await refreshAll();
      });

      logoutButtonEl.addEventListener("click", async function() {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        const body = await response.json();
        if (!response.ok) {
          authNoticeEl.textContent = body.error || "Logout failed.";
          return;
        }

        renderRuntime(body);
        await loadSessions();
      });

      resetThreadButtonEl.addEventListener("click", async function() {
        const response = await fetch("/api/codex/sessions/reset", { method: "POST" });
        const payload = await response.json();
        if (!response.ok) {
          authNoticeEl.textContent = payload.error || "Could not reset Pluto thread.";
          return;
        }

        renderRuntime(payload.runtime);
        renderSessions(payload);
        authNoticeEl.textContent = "Pluto will use a fresh Codex thread on the next reply.";
      });

      void refreshAll();
      setInterval(function() {
        void refreshAll();
      }, 2000);
    `;
