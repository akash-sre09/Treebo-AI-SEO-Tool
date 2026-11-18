import type { QueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isTreeboEmail } from "@/lib/treebo-auth";

interface AuthValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const rejecting = useRef(false);
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const refreshUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      const nextUser = error ? null : data.user;
      if (nextUser && !isTreeboEmail(nextUser.email)) {
        if (rejecting.current) return;
        rejecting.current = true;
        await queryClient.cancelQueries();
        queryClient.clear();
        setUser(null);
        setLoading(false);
        await supabase.auth.signOut();
        if (active) await navigate({ to: "/login", search: { reason: "domain" }, replace: true });
        rejecting.current = false;
        return;
      }
      setUser(nextUser);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        void router.invalidate();
        return;
      }
      // Defer Supabase calls until the auth callback has released its internal lock.
      void Promise.resolve().then(refreshUser).then(async () => {
        if (!active) return;
        await router.invalidate();
        await queryClient.invalidateQueries();
      });
    });
    void refreshUser();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate, queryClient, router]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setUser(null);
    await navigate({ to: "/login", replace: true });
  }, [navigate, queryClient]);

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useTreeboAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useTreeboAuth must be used inside AuthProvider");
  return value;
}
