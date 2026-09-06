import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/cinzel/600.css";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/manrope";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./tokens.css";
import "./shell.css";

import { App } from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root fehlt");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
