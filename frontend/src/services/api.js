import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});


// Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


// CR-005: Global Session Expiry Handling
api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    // Only handle actual HTTP responses
    if (!error.response) {
      // Network error - do NOT logout
      return Promise.reject(error);
    }

    const status = error.response.status;
    const requestUrl = error.config?.url || "";

    // Do not handle 401 from the login request
    if (
      status === 401 &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/users/me/password")
    ) {
      const token = localStorage.getItem("token");

      // Only handle 401 when the user was authenticated
      if (token) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Prevent multiple simultaneous redirects
        if (!window.location.pathname.startsWith("/login")) {
          const currentPath =
            window.location.pathname +
            window.location.search;

          const loginUrl =
            `/login?sessionExpired=true&redirect=${encodeURIComponent(
              currentPath
            )}`;

          window.location.href = loginUrl;
        }
      }
    }

    // 403 is NOT handled here.
    // User remains logged in.

    return Promise.reject(error);
  }
);


export default api;