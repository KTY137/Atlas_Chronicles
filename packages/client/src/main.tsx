import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cinzel/600.css";
import "@fontsource-variable/ibm-plex-sans";
import "@chronicle/ui/tokens.css";
import "./styles.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("App root is missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);
