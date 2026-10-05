import { Navigate, useLocation } from "react-router-dom";

import { getUser, getToken } from "../services/auth";

function ProtectedRoute({ children, role }) {

  const location = useLocation();

  const token = getToken();
  const user = getUser();

  // ---------- 1. Not logged in ----------
  if (!token || !user) {

    // CR-005:
    // Preserve the complete requested location
    // so the user can return after successful login.
    const requestedPage =
      location.pathname +
      location.search;

    return (
      <Navigate
        to="/login"
        state={{ from: requestedPage }}
        replace
      />
    );
  }

  // ---------- 2. Logged in but wrong role ----------
  if (role && user.role !== role) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  // ---------- 3. Allowed ----------
  return children;
}

export default ProtectedRoute;