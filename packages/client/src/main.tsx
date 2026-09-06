import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cinzel/600.css";
import "@fontsource-variable/ibm-plex-sans";
import "@chronicle/ui/tokens.css";
import "./styles.css";
import "./features/appearance.css";
import { App } from "./App";
import { AppearanceProvider } from "./features/Appearance";
import { ErrorBoundary } from "./ErrorBoundary";

const root = document.getElementById("root");
if (!root) throw new Error("App root is missing");
// Die Fehlergrenze steht außen, damit sie auch dann noch greift, wenn die Darstellungsebene
// oder eine nachgeladene Bühne beim Rendern scheitert. Ohne sie bleibt eine weiße Seite.
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AppearanceProvider>
        <App />
      </AppearanceProvider>
    </ErrorBoundary>
  </StrictMode>,
);
