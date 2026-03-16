/// <reference types="vite/client" />

interface PlutoBootstrap {
  state: import("./App").AppState | null;
  runtime: import("./App").RuntimeState | null;
}

interface Window {
  __PLUTO_BOOTSTRAP__?: PlutoBootstrap;
}
