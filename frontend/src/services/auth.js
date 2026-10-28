const TOKEN_KEY = "token";
const USER_KEY = "user";


// Save token + user after a successful login
export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}


// Read the token
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}


// Read the logged-in user
export function getUser() {
  const userJson = localStorage.getItem(USER_KEY);

  if (!userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson);
  } catch (error) {
    // If the stored value is not valid JSON we treat it as logged out.
    console.error("Could not read user from localStorage:", error.message);

    return null;
  }
}

export function updateStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}


// Logout - remove token and user
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}


// Small convenience checks
export function isLoggedIn() {
  return Boolean(getToken() && getUser());
}

export function getUserRole() {
  const user = getUser();

  return user ? user.role : null;
}

export function isAdmin() {
  return getUserRole() === "admin";
}

export function isStudent() {
  return getUserRole() === "student";
}
