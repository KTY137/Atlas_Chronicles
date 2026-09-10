// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cinzel/600.css";
import "@fontsource-variable/ibm-plex-sans";
import "@chronicle/ui/tokens.css";
import "./styles.css";
import "./features/appearance.css";
// Zuletzt: Zustände, Bewegung und Erhebung. Die Datei benutzt nur Token und gilt daher in
// jedem Look; die Rücknahmen aus appearance.css („Schlicht", „Hoher Kontrast",
// „Bewegung reduzieren") wiegen weiterhin schwerer und bleiben wirksam.
import "./zustaende.css";
import { registriereUebersetzer } from "@chronicle/ui";
import { t } from "./i18n";
import { App } from "./App";
import { AppearanceProvider } from "./features/Appearance";
import { ErrorBoundary } from "./ErrorBoundary";

// Die Bausteine aus `@chronicle/ui` bekommen den Uebersetzer gereicht; das Paket selbst
// haengt nicht am Client. `t` liest die Sprache erst beim Aufruf.
registriereUebersetzer(t);

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
