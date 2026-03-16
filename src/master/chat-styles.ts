export const chatStyles = String.raw`
      :root {
        color-scheme: dark;
        --bg: #121212;
        --bg-soft: rgba(255, 255, 255, 0.03);
        --bg-elevated: rgba(31, 31, 31, 0.88);
        --bg-user: rgba(255, 255, 255, 0.055);
        --line: rgba(255, 255, 255, 0.08);
        --line-strong: rgba(255, 255, 255, 0.14);
        --ink: #f1ede4;
        --muted: rgba(241, 237, 228, 0.5);
        --shadow: 0 30px 80px rgba(0, 0, 0, 0.34);
        --radius-shell: 38px;
        --radius-pill: 999px;
        font-family: "Charter", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
      }

      * { box-sizing: border-box; }

      [hidden] { display: none !important; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.055), transparent 18%),
          radial-gradient(circle at 50% 120%, rgba(255, 255, 255, 0.045), transparent 28%),
          linear-gradient(180deg, #171717 0%, var(--bg) 100%);
        color: var(--ink);
        overflow: hidden;
      }

      main {
        width: min(920px, calc(100vw - 28px));
        height: 100vh;
        margin: 0 auto;
        padding: 18px 0 18px;
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 16px;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 56px;
        gap: 14px;
      }

      .topbar-spacer {
        min-width: 138px;
      }

      .topbar-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        min-width: 138px;
      }

      .pill-link,
      .model-picker {
        height: 42px;
        border-radius: var(--radius-pill);
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.028);
        color: var(--ink);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
      }

      .pill-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        text-decoration: none;
        font: 600 0.76rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.03em;
      }

      .pill-link svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.55;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .model-picker {
        position: relative;
        min-width: 140px;
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
      }

      .model-picker select {
        width: 100%;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--ink);
        font: 600 0.76rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.02em;
        appearance: none;
        padding-right: 20px;
        cursor: pointer;
      }

      .model-picker::after {
        content: "";
        position: absolute;
        right: 13px;
        width: 7px;
        height: 7px;
        border-right: 1.5px solid var(--muted);
        border-bottom: 1.5px solid var(--muted);
        transform: translateY(-2px) rotate(45deg);
        pointer-events: none;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        padding: 12px 18px 12px 14px;
        border-radius: var(--radius-pill);
        background: rgba(255, 255, 255, 0.028);
        border: 1px solid var(--line);
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
      }

      .brand-mark {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.055);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .brand-mark svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: #e2dbcf;
        stroke-width: 1.55;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .brand-text {
        display: grid;
        gap: 2px;
      }

      .brand-text strong {
        font-size: 0.98rem;
        letter-spacing: 0.02em;
        font-weight: 600;
      }

      .brand-text small {
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
        font-size: 0.72rem;
        color: var(--muted);
      }

      .chat-shell {
        position: relative;
        min-height: 0;
        display: grid;
      }

      .empty-state {
        width: min(760px, 100%);
        margin: 0 auto;
      }

      .empty-state {
        place-self: center;
        text-align: center;
        display: grid;
        gap: 18px;
        padding: 0 18px 10vh;
      }

      .sigil {
        width: 72px;
        height: 72px;
        margin: 0 auto;
        border-radius: 50%;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background:
          radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), transparent 34%),
          radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.06), transparent 28%),
          rgba(255, 255, 255, 0.02);
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
      }

      .sigil svg {
        width: 28px;
        height: 28px;
        fill: none;
        stroke: rgba(241, 237, 228, 0.9);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .empty-state h1 {
        margin: 0;
        font-size: clamp(2.4rem, 5vw, 4.3rem);
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
        width: 100vw;
        margin-left: calc(50% - 50vw);
        min-height: 0;
        overflow: auto;
        padding: 8px max(20px, calc((100vw - 760px) / 2)) 8px;
        display: none;
        gap: 20px;
        scrollbar-gutter: stable;
      }

      .timeline.visible {
        display: grid;
      }

      .message {
        display: grid;
        gap: 10px;
      }

      .message.user {
        justify-items: end;
      }

      .message-card {
        width: min(100%, 720px);
        display: grid;
        gap: 12px;
        padding: 16px 18px 18px;
        border-radius: 34px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.03)),
          rgba(255, 255, 255, 0.028);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .message.assistant {
        padding: 4px 2px 0;
      }

      .message-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        font-size: 0.76rem;
        color: var(--muted);
      }

      .identity {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .avatar {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        flex: none;
      }

      .avatar svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .avatar.user {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .avatar.user svg {
        stroke: #efe8dc;
        stroke-width: 1.6;
      }

      .avatar.pluto {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .avatar.pluto svg {
        stroke: #ded6ca;
        stroke-width: 1.5;
      }

      .identity strong {
        font: 600 0.76rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.03em;
        text-transform: lowercase;
      }

      .message-copy {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.62;
        font-size: 1.04rem;
      }

      .assistant-copy {
        padding-left: 40px;
      }

      .assistant-copy .message-copy {
        font-size: 1.08rem;
        line-height: 1.72;
      }

      .rich-copy {
        display: grid;
        gap: 14px;
      }

      .rich-copy > :first-child {
        margin-top: 0;
      }

      .rich-copy > :last-child {
        margin-bottom: 0;
      }

      .rich-copy p,
      .rich-copy ul,
      .rich-copy ol,
      .rich-copy blockquote,
      .rich-copy pre,
      .rich-copy h1,
      .rich-copy h2,
      .rich-copy h3,
      .rich-copy h4 {
        margin: 0;
      }

      .rich-copy h1,
      .rich-copy h2,
      .rich-copy h3,
      .rich-copy h4 {
        line-height: 1.08;
        letter-spacing: -0.035em;
        font-weight: 600;
      }

      .rich-copy h1 {
        font-size: clamp(1.9rem, 4vw, 2.8rem);
      }

      .rich-copy h2 {
        font-size: clamp(1.45rem, 3vw, 2rem);
      }

      .rich-copy h3 {
        font-size: 1.18rem;
      }

      .rich-copy h4 {
        font-size: 1rem;
      }

      .rich-copy p,
      .rich-copy li,
      .rich-copy blockquote {
        font-size: 1.08rem;
        line-height: 1.74;
      }

      .rich-copy ul,
      .rich-copy ol {
        padding-left: 1.4rem;
        display: grid;
        gap: 0.45rem;
      }

      .rich-copy li::marker {
        color: rgba(241, 237, 228, 0.7);
      }

      .rich-copy a {
        color: #f5e8c7;
        text-decoration: underline;
        text-decoration-color: rgba(245, 232, 199, 0.4);
        text-underline-offset: 0.16em;
      }

      .rich-copy strong {
        font-weight: 700;
        color: #faf6ef;
      }

      .rich-copy em {
        font-style: italic;
      }

      .rich-copy code {
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
        font-size: 0.9em;
      }

      .rich-copy p code,
      .rich-copy li code,
      .rich-copy blockquote code {
        padding: 0.14rem 0.42rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.055);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .rich-copy blockquote {
        padding: 0.95rem 1rem 0.95rem 1.1rem;
        border-left: 2px solid rgba(241, 237, 228, 0.18);
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.045), transparent);
        border-radius: 0 20px 20px 0;
        color: rgba(241, 237, 228, 0.82);
      }

      .rich-copy pre {
        overflow: auto;
      }

      .code-block {
        display: grid;
        gap: 0;
        border-radius: 26px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(10, 10, 10, 0.92);
        box-shadow: 0 22px 48px rgba(0, 0, 0, 0.26);
      }

      .code-block-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 40px;
        padding: 0 14px;
        background: rgba(255, 255, 255, 0.045);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font: 600 0.72rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.03em;
        color: rgba(241, 237, 228, 0.6);
        text-transform: lowercase;
      }

      .code-block-head::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(241, 237, 228, 0.5);
        box-shadow: 14px 0 0 rgba(241, 237, 228, 0.24), 28px 0 0 rgba(241, 237, 228, 0.14);
      }

      .code-block-head span {
        margin-left: auto;
      }

      .code-copy {
        margin-left: 10px;
        min-width: 68px;
        height: 28px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(241, 237, 228, 0.78);
        padding: 0 10px;
        font: 600 0.68rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .code-copy[data-copied="true"] {
        background: rgba(245, 232, 199, 0.9);
        color: #111111;
        border-color: rgba(245, 232, 199, 0.9);
      }

      .code-block code {
        display: block;
        padding: 16px 18px 18px;
        color: #f7f1e6;
        line-height: 1.68;
        white-space: pre;
      }

      .code-block .hljs {
        background: transparent;
        padding: 16px 18px 18px;
      }

      .math-block {
        overflow-x: auto;
        padding: 1rem 1.1rem;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .resource-card {
        display: grid;
        gap: 0;
        border-radius: 28px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.028);
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
      }

      .resource-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .resource-meta {
        min-width: 0;
        display: grid;
        gap: 6px;
      }

      .resource-kind {
        width: fit-content;
        padding: 0 10px;
        min-height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.045);
        color: rgba(241, 237, 228, 0.72);
        font: 600 0.68rem/24px ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .resource-title {
        font-size: 0.96rem;
        line-height: 1.35;
        letter-spacing: -0.01em;
      }

      .resource-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .resource-action {
        min-width: 42px;
        height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        color: var(--ink);
        text-decoration: none;
        font: 600 0.7rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.04em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .resource-action svg,
      .viewer-close svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.65;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .resource-action-button {
        cursor: pointer;
      }

      .resource-preview {
        padding: 12px;
      }

      .resource-preview img,
      .resource-preview iframe {
        width: 100%;
        display: block;
        border: 0;
        border-radius: 20px;
        background: rgba(15, 15, 15, 0.88);
      }

      .resource-preview img {
        max-height: 560px;
        object-fit: contain;
      }

      .resource-preview iframe {
        min-height: 520px;
      }

      .file-panel {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .file-glyph {
        width: 46px;
        height: 46px;
        border-radius: 18px;
        flex: none;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.055);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(241, 237, 228, 0.72);
        font: 700 0.72rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .file-meta {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .file-meta strong {
        font-size: 0.96rem;
      }

      .file-meta span {
        color: var(--muted);
        font-size: 0.8rem;
        line-height: 1.45;
        word-break: break-word;
      }

      .viewer-shell {
        position: fixed;
        inset: 0;
        z-index: 30;
      }

      .viewer-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(7, 7, 7, 0.82);
        backdrop-filter: blur(14px);
      }

      .viewer-panel {
        position: relative;
        width: min(1200px, calc(100vw - 32px));
        height: min(84vh, 900px);
        margin: 6vh auto 0;
        display: grid;
        grid-template-rows: auto 1fr;
        border-radius: 32px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(19, 19, 19, 0.96);
        box-shadow: 0 32px 90px rgba(0, 0, 0, 0.4);
      }

      .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.028);
      }

      .viewer-meta {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .viewer-kind {
        width: fit-content;
        padding: 0 10px;
        min-height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.045);
        color: rgba(241, 237, 228, 0.72);
        font: 600 0.68rem/24px ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .viewer-meta strong {
        font-size: 1rem;
        letter-spacing: -0.02em;
      }

      .viewer-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .viewer-link,
      .viewer-close {
        min-width: 42px;
        height: 38px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        color: var(--ink);
        text-decoration: none;
        font: 600 0.72rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        letter-spacing: 0.04em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .viewer-close {
        cursor: pointer;
      }

      .viewer-body {
        min-height: 0;
        padding: 16px;
      }

      .viewer-image,
      .viewer-frame {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
        border-radius: 24px;
        background: rgba(13, 13, 13, 0.94);
      }

      .viewer-image {
        object-fit: contain;
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
        grid-template-columns: auto 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 10px 10px 10px 12px;
        border-radius: var(--radius-pill);
        background: var(--bg-elevated);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .composer-mark {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--bg-soft);
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: var(--muted);
      }

      .composer-mark svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.45;
        stroke-linecap: round;
        stroke-linejoin: round;
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
        padding: 12px 2px;
        line-height: 1.5;
      }

      textarea::placeholder {
        color: rgba(242, 240, 235, 0.34);
      }

      .composer button {
        width: 52px;
        height: 52px;
        border: 0;
        border-radius: 50%;
        padding: 0;
        background: #f0ece3;
        color: #141414;
        cursor: pointer;
        display: grid;
        place-items: center;
      }

      .composer button svg {
        width: 19px;
        height: 19px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
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

        .topbar {
          flex-wrap: wrap;
          justify-content: center;
        }

        .topbar-spacer {
          display: none;
        }

        .topbar-actions {
          width: 100%;
          justify-content: center;
        }

        .empty-state {
          padding-bottom: 18vh;
        }

        .empty-state h1 {
          font-size: 2.35rem;
        }

        .assistant-copy {
          padding-left: 0;
        }

        .timeline {
          padding-inline: 10px;
        }

        .message-card {
          border-radius: 28px;
        }

        .resource-head,
        .viewer-header {
          flex-direction: column;
          align-items: stretch;
        }

        .resource-actions,
        .viewer-actions {
          width: 100%;
          justify-content: flex-end;
        }

        .resource-preview iframe {
          min-height: 380px;
        }

        .viewer-panel {
          width: min(100vw - 20px, 1200px);
          height: min(86vh, 900px);
          margin-top: 4vh;
        }

        .composer {
          grid-template-columns: 1fr auto;
          border-radius: 30px;
          padding: 10px;
        }

        .composer-mark {
          display: none;
        }
      }
    `;
