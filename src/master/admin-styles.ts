export const adminStyles = String.raw`
      :root {
        color-scheme: dark;
        --bg: #0d0d0e;
        --surface: rgba(255, 255, 255, 0.035);
        --surface-soft: rgba(255, 255, 255, 0.02);
        --line: rgba(255, 255, 255, 0.08);
        --line-strong: rgba(255, 255, 255, 0.12);
        --ink: #f3efe7;
        --muted: rgba(243, 239, 231, 0.58);
        --soft: rgba(243, 239, 231, 0.84);
        --accent: #ece4d3;
        --accent-ink: #161513;
        font-family: "SF Pro Text", "Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * { box-sizing: border-box; }
      [hidden] { display: none !important; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 26%),
          linear-gradient(180deg, #141415 0%, #0e0e0f 34%, #0b0b0c 100%);
        color: var(--ink);
      }

      main {
        width: min(1240px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 18px 0 36px;
      }

      .shell {
        border: 1px solid var(--line);
        border-radius: 30px;
        background: var(--surface);
        box-shadow: 0 28px 72px rgba(0, 0, 0, 0.22);
        backdrop-filter: blur(20px);
        overflow: hidden;
      }

      .hero,
      .section {
        padding: 18px 20px;
      }

      .section {
        border-top: 1px solid var(--line);
      }

      .hero {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
      }

      .hero-copy {
        display: grid;
        gap: 10px;
        max-width: 42rem;
      }

      .hero h1 {
        margin: 0;
        font-size: clamp(1.9rem, 2.6vw, 2.5rem);
        font-weight: 650;
        letter-spacing: -0.05em;
        line-height: 1;
      }

      .hero p,
      .section-header p,
      .muted,
      .notice,
      .empty {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
      }

      .hero-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }

      .meta-pill,
      .chip {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 11px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
        font: 600 0.72rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
        color: var(--soft);
      }

      .chip.online { color: #d5ebce; }
      .chip.attached { color: var(--accent-ink); background: var(--accent); border-color: transparent; }
      .chip.muted { color: var(--muted); }
      .chips { gap: 8px; }

      .back-link,
      button,
      .ghost,
      .primary {
        appearance: none;
        border: 1px solid var(--line);
        border-radius: 999px;
        min-height: 38px;
        padding: 0 14px;
        background: transparent;
        color: var(--ink);
        text-decoration: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font: 600 0.76rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
      }

      .primary {
        background: var(--accent);
        color: var(--accent-ink);
        border-color: transparent;
      }

      button:disabled {
        opacity: 0.7;
        cursor: default;
      }

      .back-link svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.55;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .section-header,
      .row,
      .subsection-header,
      .column-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .section-header strong,
      .subsection strong,
      .column strong,
      .thread-inline strong {
        display: block;
        font-size: 0.95rem;
      }

      .section-header small,
      .column-header small {
        color: var(--muted);
        white-space: nowrap;
      }

      .runtime-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
        gap: 24px;
        margin-top: 16px;
      }

      .stack {
        display: grid;
      }

      .stack > .subsection + .subsection,
      .runtime-details-block,
      .column + .column {
        border-top: 1px solid var(--line);
      }

      .subsection {
        padding: 14px 0;
      }

      .thread-inline {
        display: grid;
        gap: 6px;
        margin-top: 14px;
      }

      .thread-inline code,
      .item code,
      .session-card code {
        display: block;
        font: 500 0.73rem/1.55 ui-monospace, "SFMono-Regular", Menlo, monospace;
        color: var(--soft);
        word-break: break-all;
      }

      .runtime-list {
        display: grid;
        margin-top: 14px;
      }

      .runtime-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        color: var(--muted);
      }

      .runtime-row:last-child {
        border-bottom: 0;
      }

      .runtime-row strong {
        color: var(--ink);
        text-align: right;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 12px;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .summary-pill {
        display: grid;
        gap: 3px;
        padding: 2px 0;
      }

      .summary-pill strong {
        font-size: 1.05rem;
        font-weight: 650;
        letter-spacing: -0.03em;
      }

      .summary-pill span {
        color: var(--muted);
        font-size: 0.8rem;
      }

      .session-list,
      .list {
        display: grid;
      }

      .session-card,
      .item {
        padding: 14px 0;
      }

      .session-card + .session-card,
      .item + .item {
        border-top: 1px solid var(--line);
      }

      .session-card .row {
        align-items: center;
      }

      .session-card .muted,
      .item .muted {
        margin-top: 6px;
      }

      .observability-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 24px;
        margin-top: 16px;
      }

      .column {
        min-width: 0;
      }

      .column-header {
        padding-bottom: 12px;
        border-bottom: 1px solid var(--line);
      }

      .list {
        max-height: 44vh;
        overflow: auto;
      }

      .empty {
        padding: 10px 0 2px;
      }

      @media (max-width: 1100px) {
        .runtime-layout,
        .observability-grid,
        .summary {
          grid-template-columns: 1fr;
        }

        .runtime-details-block,
        .column {
          border-top: 1px solid var(--line);
          padding-top: 14px;
        }
      }

      @media (max-width: 760px) {
        main {
          width: min(100vw - 18px, 100%);
          padding-top: 10px;
        }

        .shell {
          border-radius: 24px;
        }

        .hero,
        .section-header,
        .subsection-header,
        .row,
        .column-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-meta {
          justify-content: flex-start;
        }
      }
    `;
