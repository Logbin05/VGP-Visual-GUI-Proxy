import './index.css';
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";
import { initPreferences } from "./lib/preferences";

initPreferences();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
