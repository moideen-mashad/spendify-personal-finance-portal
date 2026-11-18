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
};
const Auth = createContext<C | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .post("/auth/refresh")
      .then(async (r) => {
        setToken(r.data.accessToken);
        const me = await api.get<User>("/users/me");
        setUser(me.data);
      })
      .catch(() => setToken(""))
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    setToken(r.data.accessToken);
    setUser(r.data.user);
  };
  const logout = async () => {
    await api.post("/auth/logout");
    setToken("");
    setUser(null);
  };
  return (
    <Auth.Provider value={{ user, loading, login, logout }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => {
  const x = useContext(Auth);
  if (!x) throw new Error("AuthProvider missing");
  return x;
};
