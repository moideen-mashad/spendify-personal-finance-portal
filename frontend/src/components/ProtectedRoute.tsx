import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppSkeleton } from "./LoadingStates";
export default function ProtectedRoute({
  children,
}: {
  children: ReactElement;
}) {
  const { user, loading } = useAuth();
  if (loading) return <AppSkeleton />;
  return user ? children : <Navigate to="/login" replace />;
}
