import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./ui/App";
import "./ui/styles/tokens.css";
import "./ui/styles/app.css";

// Browser entry point, loaded by index.html. Mounts the React app into the
// #root element; everything else in the app hangs off the App component.
const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Could not find the #root element in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
