import { Navigate, Route, Routes } from "react-router";

import { AdminProtectionRoute } from "./components/AdminProtectionRoute";
import { ProtectionRount } from "./components/ProtectionRount";
import { Homepage } from "./pages/Homepage";
import { LoginPages } from "./pages/LoginPages";
import { TicketsPage } from "./pages/TicketsPage";
import { UsersPage } from "./pages/UsersPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPages />} />
      <Route path="/" element={<ProtectionRount />}>
        <Route index element={<Homepage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="users" element={<AdminProtectionRoute />}>
          <Route index element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
