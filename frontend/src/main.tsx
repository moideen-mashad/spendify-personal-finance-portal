import React, { lazy, Suspense, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./index.css";
import "./fintech.css";
import "./select.css";
import "./calendar.css";
import "./loading.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppSkeleton, PageSkeleton } from "./components/LoadingStates";
const Layout = lazy(() => import("./components/AppShell"));
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const BudgetsPage = lazy(() =>
  import("./pages/WorkspacePages").then((m) => ({ default: m.BudgetsPage })),
);
const AccountsPage = lazy(() =>
  import("./pages/WorkspacePages").then((m) => ({ default: m.AccountsPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/WorkspacePages").then((m) => ({ default: m.SettingsPage })),
);
const Login = lazy(() =>
  import("./pages/AuthPages").then((m) => ({ default: m.Login })),
);
const Register = lazy(() =>
  import("./pages/AuthPages").then((m) => ({ default: m.Register })),
);
const Categories = lazy(() =>
  import("./pages/AppPages").then((m) => ({ default: m.Categories })),
);
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const RecurringPage = lazy(() => import("./pages/RecurringPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
function Page({
  children,
  kind = "overview",
}: {
  children: ReactElement;
  kind?: "overview" | "table" | "settings" | "auth";
}) {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} name="This page">
      <Suspense fallback={<PageSkeleton kind={kind} />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
const secure = (x: ReactElement) => <ProtectedRoute>{x}</ProtectedRoute>;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fullPage>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<AppSkeleton />}>
            <Routes>
              <Route
                path="/login"
                element={
                  <Page kind="auth">
                    <Login />
                  </Page>
                }
              />
              <Route
                path="/register"
                element={
                  <Page kind="auth">
                    <Register />
                  </Page>
                }
              />
              <Route element={secure(<Layout />)}>
                <Route
                  path="/"
                  element={
                    <Page>
                      <OverviewPage />
                    </Page>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <Page kind="table">
                      <TransactionsPage />
                    </Page>
                  }
                />
                <Route
                  path="/categories"
                  element={
                    <Page kind="settings">
                      <CategoriesPage />
                    </Page>
                  }
                />
                <Route
                  path="/goals"
                  element={
                    <Page kind="settings">
                      <GoalsPage />
                    </Page>
                  }
                />
                <Route
                  path="/recurring"
                  element={
                    <Page kind="table">
                      <RecurringPage />
                    </Page>
                  }
                />
                <Route
                  path="/budgets"
                  element={
                    <Page kind="settings">
                      <BudgetsPage />
                    </Page>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Page>
                      <OverviewPage analytics />
                    </Page>
                  }
                />
                <Route
                  path="/accounts"
                  element={
                    <Page kind="settings">
                      <AccountsPage />
                    </Page>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Page kind="settings">
                      <SettingsPage />
                    </Page>
                  }
                />
              </Route>
              <Route
                path="*"
                element={
                  <Page kind="settings">
                    <NotFound />
                  </Page>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
