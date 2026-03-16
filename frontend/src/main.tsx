import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element for Pluto frontend.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
