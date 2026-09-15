"use client";

import { useEffect } from "react";
import { getProfile } from "@core/services/api/auth.api";
import { useAuthStore } from "@core/services/stores/auth.store";

export function AuthSynchronizer() {
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("oner:unauthorized", handleUnauthorized);

    if (localStorage.getItem("oner-access-token")) {
      void getProfile().then(setUser).catch(logout);
    } else {
      logout();
    }

    return () =>
      window.removeEventListener("oner:unauthorized", handleUnauthorized);
  }, [logout, setUser]);

  return null;
}
