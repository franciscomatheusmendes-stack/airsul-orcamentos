import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminPage from "./admin/AdminPage";
import SetupPage from "./admin/SetupPage";
import "./style.css";
const enabled = import.meta.env.VITE_ADMIN_PANEL === "true";
createRoot(document.getElementById("root")!).render(<React.StrictMode>{enabled && window.location.pathname === "/setup" ? <SetupPage /> : enabled && window.location.pathname === "/admin" ? <AdminPage /> : <App />}</React.StrictMode>);
