import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import api from "../services/api";
import { updateStoredUser } from "../services/auth";

const getResponseErrors = (error) => error.response?.data?.errors || {};

function Profile() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [profileErrors, setProfileErrors] = useState({});
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/users/me");
        if (active) {
          setProfile(response.data.user);
          setFullName(response.data.user.full_name);
        }
      } catch (error) {
        if (active) {
          setProfileError(
            error.response?.data?.message || "Failed to load your profile."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileErrors({});
    setProfileMessage("");
    setProfileError("");

    const trimmedName = fullName.trim();
    const nameLength = Array.from(trimmedName).length;
    if (nameLength < 3 || nameLength > 100) {
      setProfileErrors({
        full_name: "Full name must be between 3 and 100 characters.",
      });
      return;
    }

    setSavingProfile(true);
    try {
      const response = await api.put("/users/me", {
        full_name: trimmedName,
      });
      setProfile(response.data.user);
      setFullName(response.data.user.full_name);
      updateStoredUser(response.data.user);
      setProfileMessage(response.data.message || "Profile updated successfully.");
    } catch (error) {
      setProfileErrors(getResponseErrors(error));
      setProfileError(
        error.response?.data?.message || "Failed to update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordMessage("");
    setPasswordError("");

    const errors = {};
    if (Array.from(passwords.newPassword).length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
    } else if (new TextEncoder().encode(passwords.newPassword).length > 72) {
      errors.newPassword = "New password cannot exceed 72 bytes.";
    }
    if (passwords.confirmPassword !== passwords.newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (passwords.newPassword && passwords.newPassword === passwords.currentPassword) {
      errors.newPassword = "New password must differ from your current password.";
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    try {
      const response = await api.put("/users/me/password", passwords);
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage(response.data.message || "Password changed successfully.");
    } catch (error) {
      if (error.response?.status === 401) {
        setPasswordErrors({
          ...getResponseErrors(error),
          currentPassword: error.response.data?.message || "Current password is incorrect.",
        });
      } else {
        setPasswordErrors(getResponseErrors(error));
      }
      setPasswordError(
        error.response?.data?.message || "Failed to change your password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container profile-page">
        <header className="page-header">
          <div>
            <h1>My Profile</h1>
            <p className="page-subtitle">Manage your account information and password.</p>
          </div>
        </header>

        {loading && <p className="loading">Loading your profile...</p>}
        {!loading && profileError && <p className="error">{profileError}</p>}

        {!loading && profile && (
          <div className="profile-grid">
            <section className="section-card">
              <h2>Profile information</h2>
              <dl className="profile-details">
                <div>
                  <dt>User ID</dt>
                  <dd>{profile.id}</dd>
                </div>
                <div>
                  <dt>Username</dt>
                  <dd>{profile.username}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{profile.role}</dd>
                </div>
              </dl>
            </section>

            <section className="section-card">
              <h2>Change full name</h2>
              {profileMessage && <p className="success">{profileMessage}</p>}
              {profileError && <p className="error">{profileError}</p>}
              <form onSubmit={handleProfileSubmit}>
                <div className="form-group">
                  <label htmlFor="full-name">Full name</label>
                  <input
                    id="full-name"
                    name="full_name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    minLength={3}
                    maxLength={100}
                    autoComplete="name"
                    disabled={savingProfile}
                    aria-invalid={Boolean(profileErrors.full_name)}
                    aria-describedby={profileErrors.full_name ? "full-name-error" : undefined}
                  />
                  {profileErrors.full_name && (
                    <small id="full-name-error" className="field-error">
                      {profileErrors.full_name}
                    </small>
                  )}
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save full name"}
                  </button>
                </div>
              </form>
            </section>

            <section className="section-card profile-password-card">
              <h2>Change password</h2>
              {passwordMessage && <p className="success">{passwordMessage}</p>}
              {passwordError && <p className="error">{passwordError}</p>}
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    autoComplete="current-password"
                    disabled={changingPassword}
                    aria-invalid={Boolean(passwordErrors.currentPassword)}
                    aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
                  />
                  {passwordErrors.currentPassword && (
                    <small id="current-password-error" className="field-error">
                      {passwordErrors.currentPassword}
                    </small>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="new-password">New password</label>
                    <input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      value={passwords.newPassword}
                      onChange={handlePasswordChange}
                      required
                      autoComplete="new-password"
                      disabled={changingPassword}
                      aria-invalid={Boolean(passwordErrors.newPassword)}
                      aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined}
                    />
                    {passwordErrors.newPassword && (
                      <small id="new-password-error" className="field-error">
                        {passwordErrors.newPassword}
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm-password">Confirm new password</label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      autoComplete="new-password"
                      disabled={changingPassword}
                      aria-invalid={Boolean(passwordErrors.confirmPassword)}
                      aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
                    />
                    {passwordErrors.confirmPassword && (
                      <small id="confirm-password-error" className="field-error">
                        {passwordErrors.confirmPassword}
                      </small>
                    )}
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={changingPassword}>
                    {changingPassword ? "Changing..." : "Change password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export default Profile;
