export const adminStyles = String.raw`
  :root {
    color-scheme: dark;
    --bg: #101827;
    --surface: #141c2b;
    --surface-soft: rgba(255, 255, 255, 0.02);
    --line: #1c2231;
    --line-strong: rgba(255, 255, 255, 0.08);
    --ink: #eef3fb;
    --muted: #a8a29e;
    --soft: #d6d3d1;
    --accent: #1A2231;
    --accent-ink: #eef3fb;
    font-family: "SF Pro Text", "Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * { box-sizing: border-box; }
  [hidden] { display: none !important; }

  body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }

  main {
    width: min(960px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 32px 0 64px;
  }

  .shell {
    padding: 0;
  }

  .shell-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    margin-bottom: 24px;
  }

  .back-link-wrapper {
    grid-column: 2;
  }

  .back-link {
    appearance: none;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--line);
    border-radius: 999px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--ink);
    font: 600 0.8rem ui-sans-serif, system-ui, sans-serif;
    text-decoration: none;
    transition: all 0.2s;
    width: 320px;
  }

  .back-link:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .back-link svg {
    margin-top: 1px;
  }

  .hero-meta {
    grid-column: 3;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .meta-pill, .chip {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    font: 600 0.72rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
    color: var(--soft);
  }

  .hero-copy h1 {
    font-size: 2.1rem;
    font-weight: 700;
    margin: 0 0 12px;
    letter-spacing: -0.03em;
  }

  .hero-copy p {
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 0 0 32px;
    max-width: 38rem;
  }

  .section {
    padding: 24px 0;
    border-top: 1px solid var(--line);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .section-header strong {
    display: block;
    font-size: 0.95rem;
    margin-bottom: 4px;
  }

  .section-header p {
    color: var(--muted);
    font-size: 0.85rem;
    margin: 0;
  }

  .section-header small {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: stretch;
  }

  .status-item {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-item strong {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .status-label {
    font-size: 0.8rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .notice-text {
    font-size: 0.75rem;
    color: #eab308;
  }

  .mini-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }

  button,
  .primary,
  .ghost {
    appearance: none;
    border: 1px solid var(--line);
    border-radius: 999px;
    height: 32px;
    padding: 0 16px;
    background: transparent;
    color: var(--ink);
    text-decoration: none;
    cursor: pointer;
    font: 600 0.75rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
    transition: all 0.2s;
  }

  button:hover, .ghost:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .primary {
    background: var(--ink);
    color: var(--bg);
    border-color: transparent;
  }
  .primary:hover {
    background: #ffffff;
    opacity: 0.9;
  }

  .thread-inline strong {
    display: block;
    margin-bottom: 4px;
    font-size: 0.95rem;
  }
  .thread-inline code {
    color: var(--muted);
    font-family: ui-monospace, "SFMono-Regular", monospace;
    font-size: 0.8rem;
  }

  .session-card {
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.02);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .session-card:last-child {
    border-bottom: none;
  }
  .session-card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .session-card .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .session-card strong {
    font-size: 0.95rem;
    font-weight: 600;
  }
  .session-card .muted {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .session-card code {
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
    color: var(--soft);
  }
  .session-card .actions {
    margin-top: 0;
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .summary-pill strong {
    font-size: 1.1rem;
    display: block;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .summary-pill span {
    font-size: 0.85rem;
    color: var(--muted);
  }
  
  .observability-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
  }
  .column-header strong { font-size: 0.9rem; font-weight: 600; }
  .list { max-height: 300px; overflow-y: auto; }
  .item { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 0.85rem; }
  .item:last-child { border-bottom: none; }
  .item code { font-family: ui-monospace; font-size: 0.75rem; color: var(--soft); display: block; margin-top: 4px; }
  .item .muted { color: var(--muted); display: block; margin-top: 4px; }

  @media (max-width: 800px) {
    .status-grid, .summary, .observability-grid {
      grid-template-columns: 1fr;
    }
  }

  .modal[open] {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 0;
    width: 600px;
    max-width: 90vw;
    color: var(--ink);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
  }
  
  .modal::backdrop {
    background: rgba(16, 24, 39, 0.7);
    backdrop-filter: blur(4px);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid var(--line);
  }
  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .icon-btn {
    appearance: none;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-btn:hover {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }

  .search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line);
    padding: 10px 16px;
    border-radius: 8px;
    color: var(--ink);
    outline: none;
    font-size: 0.9rem;
  }
  .search-input:focus {
    border-color: rgba(255,255,255,0.2);
  }

  #btn-show-all-sessions {
    appearance: none;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--line);
    color: var(--ink);
    border-radius: 999px;
    padding: 6px 16px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  #btn-show-all-sessions:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;
