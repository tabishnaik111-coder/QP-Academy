import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import "./styles/global.css";
import "./styles/navbar.css";
import "./styles/hero.css";
import "./styles/courses.css";
import "./styles/footer.css";
import "./styles/dashboard.css";
import "./styles/course-detail.css";
import "./styles/learning.css";
import "./styles/test-engine.css";
import "./styles/leaderboard.css";
import "./styles/profile.css";
import "./styles/academy.css";
import "./styles/admin.css";
import "./styles/admin-analytics.css";
import "./styles/auth.css";
import "./styles/legal-help.css";
import "./styles/email.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);