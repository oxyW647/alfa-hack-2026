import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ApplicationView } from "@/features/applications/ApplicationView";
import { ApplicationsLayout } from "@/features/applications/ApplicationsLayout";
import { NewApplicationPage } from "@/features/applications/NewApplicationPage";
import { errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { signInAs } from "@/lib/session";

function Session() {
  const token = useAuth((s) => s.token);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (token) return;
    setError(null);
    signInAs("client").catch((e) => setError(errorText(e)));
  }, [token, attempt]);

  if (token) return <Outlet />;
  if (!error) return null;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
      <div className="text-sm text-red-600">{error}</div>
      <button className="btn" onClick={() => setAttempt(attempt + 1)}>
        Повторить
      </button>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Session />}>
        <Route element={<ApplicationsLayout />}>
          <Route index element={<Navigate to="/new" replace />} />
          <Route path="/new" element={<NewApplicationPage />} />
          <Route path="/applications/:id" element={<ApplicationView />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
