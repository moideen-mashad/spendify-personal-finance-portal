import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
export function Login() {
  const [email, setEmail] = useState("demo@example.com"),
    [password, setPassword] = useState("Demo@1234"),
    [error, setError] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();
  return (
    <AuthShell title="Welcome back">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await login(email, password);
            nav("/");
          } catch {
            setError("Invalid email or password");
          }
        }}
      >
        <div>
          <label
            className="mb-2 block text-xs font-semibold text-slate-600"
            htmlFor="login-email"
          >
            Email address
          </label>
          <input
            id="login-email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label
            className="mb-2 block text-xs font-semibold text-slate-600"
            htmlFor="login-password"
          >
            Password
          </label>
          <input
            id="login-password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button className="mt-2 w-full py-3">Log in</button>
      </form>
      <p className="mt-4">
        New here?{" "}
        <Link className="text-indigo-600" to="/register">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
export function Register() {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  return (
    <AuthShell title="Create your account">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post("/auth/register", {
              fullName: name,
              email,
              password,
            });
            setMessage("Account created. You can now log in.");
          } catch {
            setMessage("Could not create account. Check your details.");
          }
        }}
      >
        <div>
          <label
            className="mb-2 block text-xs font-semibold text-slate-600"
            htmlFor="register-name"
          >
            Full name
          </label>
          <input
            id="register-name"
            aria-label="Full name"
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            className="mb-2 block text-xs font-semibold text-slate-600"
            htmlFor="register-email"
          >
            Email address
          </label>
          <input
            id="register-email"
            aria-label="Email"
            placeholder="you@example.com"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            className="mb-2 block text-xs font-semibold text-slate-600"
            htmlFor="register-password"
          >
            Password
          </label>
          <input
            id="register-password"
            aria-label="Password"
            placeholder="8+ characters, letter and digit"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {message && <p>{message}</p>}
        <button className="mt-2 w-full py-3">Create account</button>
      </form>
      <p className="mt-4">
        <Link className="text-indigo-600" to="/login">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-lg font-bold">
            S
          </span>
          <span className="font-bold">Spendify</span>
        </div>
        <div className="max-w-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Your money, clearly managed
          </p>
          <h2 className="text-5xl font-bold leading-tight tracking-tight">
            Build healthier financial habits.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-slate-300">
            Track spending, plan budgets, and understand where every rupee goes.
          </p>
        </div>
        <p className="text-sm text-slate-500">Personal finance, made simple.</p>
      </section>
      <section className="grid place-items-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              S
            </span>
          </div>
          <p className="mb-2 text-sm font-semibold text-indigo-600">Spendify</p>
          <h1 className="mb-7 text-3xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          {children}
        </div>
      </section>
    </main>
  );
}
