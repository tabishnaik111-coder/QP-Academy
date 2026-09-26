import { Navigate, useLocation } from "react-router-dom";

import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Wait until we know whether the user is logged in
  if (isLoading) {
    return (
      <div className="protected-loading">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // User is not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // User is authenticated
  return children;
};

export default ProtectedRoute;