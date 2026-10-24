import { Route, Routes } from "react-router";

import { HomePage } from "./pages/home";
import { LoginPage } from "./pages/login";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}
