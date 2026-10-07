import { Route, Routes, Navigate } from "react-router";
import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";

import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";

function App() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const loggedUserJSON = window.localStorage.getItem("user");
      if (loggedUserJSON) {
        const user = JSON.parse(loggedUserJSON);
        setUser(user);
      }
    } catch (error) {
      console.error("Error parsing loggedUser data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  if (isLoading) return null;

  return (
    <Routes>
      <Route
        path='/login'
        element={!user ? <LoginPage /> : <Navigate to='/' replace />}
      />
      <Route
        path='/*'
        element={user ? <HomePage /> : <Navigate to='/login' replace />}
      />
    </Routes>
  );
}

export default App;
