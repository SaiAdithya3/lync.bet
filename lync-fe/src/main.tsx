import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { LyncBet } from "./LyncBet.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LyncBet />
  </StrictMode>
);
