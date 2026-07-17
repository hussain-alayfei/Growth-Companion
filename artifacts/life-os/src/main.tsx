import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Same-origin on Vercel by default. Set VITE_API_URL only if API is hosted elsewhere.
const apiBase = import.meta.env.VITE_API_URL as string | undefined;
if (apiBase && apiBase.trim()) {
  setBaseUrl(apiBase.replace(/\/$/, ""));
}

createRoot(document.getElementById("root")!).render(<App />);
