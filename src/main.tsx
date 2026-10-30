import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminPage from "./admin/AdminPage";
import "./style.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode>{window.location.pathname === "/admin" ? <AdminPage /> : <App />}</React.StrictMode>);
