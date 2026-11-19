import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api, { setToken } from "../api/client";
import type { User } from "../types";
type C = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
};
const Auth = createContext<C | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const cachedRefresh =
      typeof window !== "undefined"
        ? localStorage.getItem("spendify_refresh_token")
        : null;

    api
      .post(
        "/auth/refresh",
        cachedRefresh ? { refreshToken: cachedRefresh } : {},
      )
      .then(async (r) => {
        setToken(r.data.accessToken);
        if (r.data.refreshToken && typeof window !== "undefined") {
          localStorage.setItem("spendify_refresh_token", r.data.refreshToken);
        }
        const me = await api.get<User>("/users/me");
        setUser(me.data);
      })
      .catch(() => {
        setToken("");
        if (typeof window !== "undefined") {
          localStorage.removeItem("spendify_refresh_token");
        }
      })
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    setToken(r.data.accessToken);
    if (r.data.refreshToken && typeof window !== "undefined") {
      localStorage.setItem("spendify_refresh_token", r.data.refreshToken);
    }
    setUser(r.data.user);
  };
  const logout = async () => {
    const cachedRefresh =
      typeof window !== "undefined"
        ? localStorage.getItem("spendify_refresh_token")
        : null;
    await api
      .post(
        "/auth/logout",
        cachedRefresh ? { refreshToken: cachedRefresh } : {},
      )
      .catch(() => {});
    setToken("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("spendify_refresh_token");
    }
    setUser(null);
  };
  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : (updated as User)));
  };
  return (
    <Auth.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => {
  const x = useContext(Auth);
  if (!x) throw new Error("AuthProvider missing");
  return x;
};
