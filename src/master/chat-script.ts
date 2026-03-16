export const chatScript = String.raw`
      const messagesEl = document.getElementById("messages");
      const emptyStateEl = document.getElementById("empty-state");
      const statusLine = document.getElementById("status-line");
      const form = document.getElementById("chat-form");
      const messageTextEl = document.getElementById("message-text");
      const modelSelectEl = document.getElementById("model-select");
      const viewerEl = document.getElementById("embed-viewer");
      const viewerBodyEl = document.getElementById("viewer-body");
      const viewerTitleEl = document.getElementById("viewer-title");
      const viewerKindEl = document.getElementById("viewer-kind");
      const viewerOpenLinkEl = document.getElementById("viewer-open-link");
      const viewerCloseEl = document.getElementById("viewer-close");
      let lastEventCount = 0;
      let highlightQueue = Promise.resolve();
      let mathQueue = Promise.resolve();
      const icons = {
        user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.2"></circle><path d="M5.5 18.2c1.7-3 11.3-3 13 0"></path></svg>',
        assistant: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"></circle><path d="M4.5 12c2.7-3.5 12.3-3.5 15 0"></path><path d="M5.7 15.8c2.9 1.7 9.7 1.7 12.6 0"></path></svg>',
      };

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }

      function createStore() {
        return { values: [] };
      }

      function normalizeLanguage(value) {
        return String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9#+.-]/g, "");
      }

      function stash(store, html) {
        const token = "%%PLUTO_TOKEN_" + store.values.length + "%%";
        store.values.push({ token, html });
        return token;
      }

      function restoreTokens(source, store) {
        let result = source;
        for (const entry of store.values) {
          result = result.split(entry.token).join(entry.html);
        }
        return result;
      }

      function isResourceLink(value) {
        const trimmed = String(value || "").trim();
        if (!trimmed) {
          return false;
        }

        if (/^(https?:\/\/|\/Users\/|\/private\/|\/var\/|\/tmp\/|\.{1,2}\/)/i.test(trimmed)) {
          return true;
        }

        return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\-\/]+$/.test(trimmed)
          || /^[A-Za-z0-9_.-]+\.(png|jpe?g|gif|webp|svg|pdf|md|txt|json)$/i.test(trimmed);
      }

      function resolveResourceHref(target, options = {}) {
        const raw = String(target || "").trim();
        if (!raw) {
          return null;
        }

        if (/^(https?:|data:|mailto:)/i.test(raw)) {
          return raw;
        }

        if (raw === "/" || raw.startsWith("/admin") || raw.startsWith("/api/")) {
          return raw;
        }

        const params = new URLSearchParams({ path: raw });
        if (options.download) {
          params.set("download", "1");
        }
        return "/api/file?" + params.toString();
      }

      function resourcePathname(target) {
        const raw = String(target || "").trim();
        if (!raw) {
          return "";
        }

        try {
          if (/^https?:\/\//i.test(raw)) {
            return new URL(raw).pathname || raw;
          }
        } catch {
          return raw;
        }

        return raw;
      }

      function fileNameFromTarget(target) {
        const pathname = resourcePathname(target);
        const parts = pathname.split(/[\\/]/).filter(Boolean);
        return parts[parts.length - 1] || pathname || "file";
      }

      function resourceExtension(target) {
        const name = fileNameFromTarget(target).toLowerCase();
        const match = name.match(/\.([a-z0-9]+)$/i);
        return match ? "." + match[1] : "";
      }

      function detectResourceKind(target) {
        const extension = resourceExtension(target);
        if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(extension)) {
          return "image";
        }
        if (extension === ".pdf") {
          return "pdf";
        }
        if (extension) {
          return "file";
        }
        return "none";
      }

      function renderResourceBlock(target, label, options = {}) {
        const kind = options.kind || detectResourceKind(target);
        const inlineHref = resolveResourceHref(target);
        if (!inlineHref) {
          return "";
        }
        const downloadHref = kind === "file" ? resolveResourceHref(target, { download: true }) : inlineHref;

        const title = label || fileNameFromTarget(target);
        const actions = '<div class="resource-actions"><a class="resource-action" href="'
          + escapeHtml(inlineHref)
          + '" target="_blank" rel="noreferrer noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5"></path><path d="M10 14 19 5"></path><path d="M19 13v5a1 1 0 0 1-1 1h-5"></path><path d="M5 10V6a1 1 0 0 1 1-1h5"></path></svg><span>Open</span></a><button class="resource-action resource-action-button" type="button" data-action="fullscreen" data-kind="'
          + escapeHtml(kind)
          + '" data-src="'
          + escapeHtml(inlineHref)
          + '" data-title="'
          + escapeHtml(title)
          + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4"></path><path d="M16 4h4v4"></path><path d="M20 16v4h-4"></path><path d="M4 16v4h4"></path></svg><span>Full</span></button></div>';

        if (kind === "image") {
          return '<figure class="resource-card image-embed"><div class="resource-head"><div class="resource-meta"><span class="resource-kind">image</span><strong class="resource-title">'
            + escapeHtml(title)
            + "</strong></div>"
            + actions
            + '</div><div class="resource-preview"><img src="'
            + escapeHtml(inlineHref)
            + '" alt="'
            + escapeHtml(title)
            + '" loading="lazy" /></div></figure>';
        }

        if (kind === "pdf") {
          return '<div class="resource-card pdf-embed"><div class="resource-head"><div class="resource-meta"><span class="resource-kind">pdf</span><strong class="resource-title">'
            + escapeHtml(title)
            + "</strong></div>"
            + actions
            + '</div><div class="resource-preview"><iframe src="'
            + escapeHtml(inlineHref)
            + '" title="'
            + escapeHtml(title)
            + '"></iframe></div></div>';
        }

        return '<div class="resource-card file-embed"><div class="resource-head"><div class="resource-meta"><span class="resource-kind">file</span><strong class="resource-title">'
          + escapeHtml(title)
          + "</strong></div>"
          + actions.replace(escapeHtml(inlineHref), escapeHtml(downloadHref))
          + '</div><div class="file-panel"><span class="file-glyph">'
          + escapeHtml((resourceExtension(target).replace(".", "") || "file").slice(0, 4))
          + '</span><span class="file-meta"><strong>'
          + escapeHtml(title)
          + '</strong><span>'
          + escapeHtml(resourcePathname(target))
          + "</span></span></div></div>";
      }

      function renderStandaloneResource(line) {
        const trimmed = line.trim();
        if (!trimmed) {
          return null;
        }

        const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
          const kind = detectResourceKind(imageMatch[2]);
          return renderResourceBlock(imageMatch[2], imageMatch[1] || fileNameFromTarget(imageMatch[2]), {
            kind: kind === "none" ? "image" : kind,
          });
        }

        const linkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const kind = detectResourceKind(linkMatch[2]);
          if (kind !== "none") {
            return renderResourceBlock(linkMatch[2], linkMatch[1], { kind });
          }
        }

        if (isResourceLink(trimmed)) {
          const kind = detectResourceKind(trimmed);
          if (kind !== "none") {
            return renderResourceBlock(trimmed, fileNameFromTarget(trimmed), { kind });
          }
        }

        return null;
      }

      function renderInlineMarkdown(source) {
        const codeStore = createStore();
        const mathStore = createStore();

        let html = source.replace(/\`([^\`]+)\`/g, (_, code) => stash(
          codeStore,
          "<code>" + escapeHtml(code) + "</code>",
        ));

        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, label, target) => {
          const kind = detectResourceKind(target);
          if (kind !== "image") {
            return label ? escapeHtml(label) : escapeHtml(target);
          }
          return stash(codeStore, renderResourceBlock(target, label || fileNameFromTarget(target), { kind: "image" }));
        });

        html = html.replace(/(^|[^\\])\$\$([\s\S]+?)\$\$/g, (_, prefix, math) => (
          prefix + stash(mathStore, '<span class="math-block">$$' + math.trim() + '$$</span>')
        ));

        html = html.replace(/(^|[^\\])\$([^\n$]+?)\$/g, (_, prefix, math) => (
          prefix + stash(mathStore, '<span class="math-inline">\\(' + math.trim() + '\\)</span>')
        ));

        html = escapeHtml(html);
        html = restoreTokens(html, codeStore);
        html = restoreTokens(html, mathStore);

        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawUrl) => {
          const safeUrl = resolveResourceHref(rawUrl);
          if (!safeUrl) {
            return escapeHtml(label);
          }

          return '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noreferrer noopener">' + label + "</a>";
        });

        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        html = html.replace(/\n/g, "<br />");
        return html;
      }

      function renderAssistantRichText(source) {
        const blockStore = createStore();
        const lines = String(source).replaceAll("\r\n", "\n").split("\n");

        let inFence = false;
        let fenceLang = "";
        let fenceLines = [];

        const normalizedLines = [];
        for (const line of lines) {
          const fenceMatch = line.match(/^\`\`\`([a-zA-Z0-9_+-]*)\s*$/);
          if (fenceMatch) {
            if (!inFence) {
              inFence = true;
              fenceLang = normalizeLanguage(fenceMatch[1] || "");
              fenceLines = [];
            } else {
              normalizedLines.push(stash(
                blockStore,
                '<div class="code-block"><div class="code-block-head"><span>' + escapeHtml(fenceLang || "code") + '</span><button class="code-copy" type="button" data-copied="false">copy</button></div><pre><code class="language-' + escapeHtml(fenceLang || "plaintext") + '">'
                  + escapeHtml(fenceLines.join("\n")) + "</code></pre></div>",
              ));
              inFence = false;
              fenceLang = "";
              fenceLines = [];
            }
            continue;
          }

          if (inFence) {
            fenceLines.push(line);
            continue;
          }

          normalizedLines.push(line);
        }

        if (inFence) {
          normalizedLines.push(stash(
            blockStore,
            '<div class="code-block"><div class="code-block-head"><span>' + escapeHtml(fenceLang || "code") + '</span><button class="code-copy" type="button" data-copied="false">copy</button></div><pre><code class="language-' + escapeHtml(fenceLang || "plaintext") + '">'
              + escapeHtml(fenceLines.join("\n")) + "</code></pre></div>",
          ));
        }

        const output = [];
        let index = 0;

        function consumeParagraph() {
          const paragraphLines = [];
          while (index < normalizedLines.length && normalizedLines[index].trim() !== "") {
            const line = normalizedLines[index];
            if (
              line.startsWith("%%PLUTO_TOKEN_")
              || /^#{1,4}\s+/.test(line)
              || /^\s*>\s?/.test(line)
              || /^\s*[-*]\s+/.test(line)
              || /^\s*\d+\.\s+/.test(line)
              || /^\s*\$\$\s*$/.test(line)
            ) {
              break;
            }

            paragraphLines.push(line);
            index += 1;
          }

          if (paragraphLines.length > 0) {
            output.push("<p>" + renderInlineMarkdown(paragraphLines.join("\n")) + "</p>");
          }
        }

        while (index < normalizedLines.length) {
          const line = normalizedLines[index];
          const trimmed = line.trim();

          if (!trimmed) {
            index += 1;
            continue;
          }

          const standaloneResource = renderStandaloneResource(trimmed);
          if (standaloneResource) {
            output.push(standaloneResource);
            index += 1;
            continue;
          }

          if (trimmed.startsWith("%%PLUTO_TOKEN_")) {
            output.push(trimmed);
            index += 1;
            continue;
          }

          const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            output.push("<h" + level + ">" + renderInlineMarkdown(headingMatch[2]) + "</h" + level + ">");
            index += 1;
            continue;
          }

          if (/^\s*\$\$\s*$/.test(line)) {
            index += 1;
            const mathLines = [];
            while (index < normalizedLines.length && !/^\s*\$\$\s*$/.test(normalizedLines[index])) {
              mathLines.push(normalizedLines[index]);
              index += 1;
            }
            if (index < normalizedLines.length) {
              index += 1;
            }
            output.push('<div class="math-block">$$' + mathLines.join("\n").trim() + "$$</div>");
            continue;
          }

          if (/^\s*>\s?/.test(line)) {
            const quoteLines = [];
            while (index < normalizedLines.length && /^\s*>\s?/.test(normalizedLines[index])) {
              quoteLines.push(normalizedLines[index].replace(/^\s*>\s?/, ""));
              index += 1;
            }
            output.push("<blockquote>" + renderInlineMarkdown(quoteLines.join("\n")) + "</blockquote>");
            continue;
          }

          if (/^\s*[-*]\s+/.test(line)) {
            const items = [];
            while (index < normalizedLines.length && /^\s*[-*]\s+/.test(normalizedLines[index])) {
              items.push(normalizedLines[index].replace(/^\s*[-*]\s+/, ""));
              index += 1;
            }
            output.push("<ul>" + items.map((item) => "<li>" + renderInlineMarkdown(item) + "</li>").join("") + "</ul>");
            continue;
          }

          if (/^\s*\d+\.\s+/.test(line)) {
            const items = [];
            while (index < normalizedLines.length && /^\s*\d+\.\s+/.test(normalizedLines[index])) {
              items.push(normalizedLines[index].replace(/^\s*\d+\.\s+/, ""));
              index += 1;
            }
            output.push("<ol>" + items.map((item) => "<li>" + renderInlineMarkdown(item) + "</li>").join("") + "</ol>");
            continue;
          }

          consumeParagraph();
        }

        return restoreTokens(output.join(""), blockStore);
      }

      async function queueMathTypeset(elements) {
        if (!window.MathJax || typeof window.MathJax.typesetPromise !== "function") {
          return;
        }

        mathQueue = mathQueue
          .catch(() => undefined)
          .then(async () => {
            await window.MathJax.startup.promise;
            await window.MathJax.typesetPromise(elements);
          })
          .catch(() => undefined);

        await mathQueue;
      }

      async function queueSyntaxHighlight(elements) {
        if (!window.hljs || typeof window.hljs.highlightElement !== "function") {
          return;
        }

        highlightQueue = highlightQueue
          .catch(() => undefined)
          .then(async () => {
            for (const root of elements) {
              root.querySelectorAll("pre code").forEach((node) => {
                window.hljs.highlightElement(node);
              });
            }
          })
          .catch(() => undefined);

        await highlightQueue;
      }

      function openViewer(kind, src, title) {
        viewerKindEl.textContent = kind;
        viewerTitleEl.textContent = title;
        viewerOpenLinkEl.href = src;
        viewerBodyEl.innerHTML = "";

        if (kind === "image") {
          const image = document.createElement("img");
          image.className = "viewer-image";
          image.alt = title;
          image.src = src;
          viewerBodyEl.appendChild(image);
        } else {
          const frame = document.createElement("iframe");
          frame.className = "viewer-frame";
          frame.src = src;
          frame.title = title;
          viewerBodyEl.appendChild(frame);
        }

        viewerEl.hidden = false;
        document.body.style.overflow = "hidden";
      }

      function closeViewer() {
        viewerEl.hidden = true;
        viewerBodyEl.innerHTML = "";
        document.body.style.overflow = "";
      }

      function renderMessages(state) {
        const items = Array.isArray(state.messages) ? [...state.messages] : [];
        messagesEl.innerHTML = items.map((message) => {
          const role = escapeHtml(message.role);
          const time = escapeHtml(new Date(message.createdAt).toLocaleTimeString());
          const isAssistant = message.role === "assistant";
          const avatarClass = isAssistant ? "pluto" : "user";
          const avatarIcon = isAssistant ? icons.assistant : icons.user;
          const name = isAssistant ? "Pluto" : "user";
          const body = isAssistant
            ? '<div class="assistant-copy"><div class="message-copy rich-copy">' + renderAssistantRichText(message.text) + "</div></div>"
            : '<div class="message-card"><p class="message-copy">' + escapeHtml(message.text) + "</p></div>";

          return '<article class="message '
            + role
            + '"><header class="message-meta"><span class="identity"><span class="avatar '
            + avatarClass
            + '">'
            + avatarIcon
            + "</span><strong>"
            + name
            + "</strong></span><span>"
            + time
            + "</span></header>"
            + body
            + "</article>";
        }).join("");

        const hasMessages = items.length > 0;
        emptyStateEl.style.display = hasMessages ? "none" : "grid";
        messagesEl.classList.toggle("visible", hasMessages);
        if (hasMessages) {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        const assistantRoots = Array.from(messagesEl.querySelectorAll(".rich-copy"));
        void queueSyntaxHighlight(assistantRoots);
        void queueMathTypeset(assistantRoots);
      }

      function autoSizeComposer() {
        messageTextEl.style.height = "auto";
        messageTextEl.style.height = Math.min(messageTextEl.scrollHeight, 180) + "px";
      }

      async function loadRuntime() {
        const response = await fetch("/api/runtime");
        const runtime = await response.json();
        const models = Array.isArray(runtime.availableModels) ? runtime.availableModels : [];
        const currentModel = typeof runtime.model === "string" ? runtime.model : "";
        const account = typeof runtime.account === "object" && runtime.account !== null ? runtime.account : null;

        modelSelectEl.innerHTML = models.map((model) => (
          '<option value="' + escapeHtml(model) + '"' + (model === currentModel ? " selected" : "") + ">"
            + escapeHtml(model)
            + "</option>"
        )).join("");

        modelSelectEl.disabled = models.length === 0;
        if (!account) {
          statusLine.textContent = "Pluto is not signed in. Open Admin to connect ChatGPT.";
          statusLine.className = "subtle warn";
        } else if (statusLine.textContent === "Pluto is not signed in. Open Admin to connect ChatGPT.") {
          statusLine.textContent = "";
          statusLine.className = "subtle";
        }
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

      messagesEl.addEventListener("click", async (event) => {
        const fullscreenButton = event.target.closest('[data-action="fullscreen"]');
        if (fullscreenButton instanceof HTMLButtonElement) {
          openViewer(
            fullscreenButton.dataset.kind || "file",
            fullscreenButton.dataset.src || "#",
            fullscreenButton.dataset.title || "Embed",
          );
          return;
        }

        const button = event.target.closest(".code-copy");
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }

        const code = button.closest(".code-block")?.querySelector("code");
        if (!(code instanceof HTMLElement)) {
          return;
        }

        try {
          await navigator.clipboard.writeText(code.innerText);
          button.textContent = "copied";
          button.dataset.copied = "true";
          window.setTimeout(() => {
            button.textContent = "copy";
            button.dataset.copied = "false";
          }, 1400);
        } catch (error) {
          statusLine.textContent = error instanceof Error ? error.message : "Copy failed.";
          statusLine.className = "subtle warn";
        }
      });

      viewerEl.addEventListener("click", (event) => {
        const closeTarget = event.target.closest('[data-action="close-viewer"]');
        if (closeTarget || event.target === viewerEl) {
          closeViewer();
        }
      });

      viewerCloseEl.addEventListener("click", closeViewer);

      messageTextEl.addEventListener("input", autoSizeComposer);
      messageTextEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          form.requestSubmit();
        }
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !viewerEl.hidden) {
          closeViewer();
        }
      });

      modelSelectEl.addEventListener("change", async () => {
        const model = modelSelectEl.value;
        if (!model) {
          return;
        }

        modelSelectEl.disabled = true;
        try {
          const response = await fetch("/api/runtime/model", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ model }),
          });

          const body = await response.json();
          if (!response.ok) {
            statusLine.textContent = body.error || "Model switch failed.";
            statusLine.className = "subtle warn";
            return;
          }

          statusLine.textContent = "Model updated.";
          statusLine.className = "subtle";
          await loadRuntime();
        } catch (error) {
          statusLine.textContent = error instanceof Error ? error.message : "Model switch failed.";
          statusLine.className = "subtle warn";
        } finally {
          modelSelectEl.disabled = false;
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
      Promise.all([loadState(), loadRuntime()]).catch((error) => {
        statusLine.textContent = error instanceof Error ? error.message : "Failed to load state.";
        statusLine.className = "subtle warn";
      });
    `;
