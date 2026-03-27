import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      if (!window.statfolio) {
        console.error("[Statfolio] Tracker did not initialize on window after script load");
      }
    }, 3000);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
