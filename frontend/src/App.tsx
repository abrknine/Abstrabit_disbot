import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { useAppDispatch, useAppSelector } from "./store";
import { restoreSession } from "./store/auth-slice";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const authenticated = useAppSelector((s) => s.auth.authenticated);
  return authenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App = () => {
  const dispatch = useAppDispatch();
  const authenticated = useAppSelector((s) => s.auth.authenticated);

  useEffect(() => {
    if (authenticated) dispatch(restoreSession());
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
};
