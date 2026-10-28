const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const { BCRYPT_MAX_BYTES, hashPassword } = require("../helpers/hashPassword");

const PASSWORD_FAILURE_LIMIT = 5;
const PASSWORD_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const passwordFailures = new Map();

const canAccessUser = (requestUser, userId) =>
  requestUser.role === "admin" ||
  String(requestUser.id) === String(userId);

const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!canAccessUser(req.user, user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: "User found",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error finding user:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!canAccessUser(req.user, user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({
      message: "User found",
      user,
    });
  } catch (error) {
    console.error("Error finding user:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error loading profile:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const suppliedFields = Object.keys(req.body || {});
    const unexpectedFields = suppliedFields.filter(
      (field) => field !== "full_name"
    );

    if (unexpectedFields.length > 0) {
      return res.status(400).json({
        message: "Only full_name can be updated",
        errors: {
          full_name: "Username and role cannot be changed here.",
        },
      });
    }

    if (typeof req.body?.full_name !== "string") {
      return res.status(400).json({
        message: "A valid full name is required",
        errors: { full_name: "Enter a full name." },
      });
    }

    const fullName = req.body.full_name.trim();
    const nameLength = Array.from(fullName).length;

    if (nameLength < 3 || nameLength > 100) {
      return res.status(400).json({
        message: "A valid full name is required",
        errors: {
          full_name: "Full name must be between 3 and 100 characters.",
        },
      });
    }

    const updatedRows = await User.updateFullName(req.user.id, fullName);

    if (updatedRows === 0) {
      const currentUser = await User.findById(req.user.id);

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getPasswordFailureState = (userId, now) => {
  const state = passwordFailures.get(String(userId));

  if (!state || now - state.windowStartedAt >= PASSWORD_FAILURE_WINDOW_MS) {
    return null;
  }

  return state;
};

const changeMyPassword = async (req, res) => {
  const userId = req.user.id;

  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body || {};
    const errors = {};

    if (typeof currentPassword !== "string" || !currentPassword) {
      errors.currentPassword = "Enter your current password.";
    }

    if (typeof newPassword !== "string") {
      errors.newPassword = "Enter a new password.";
    } else {
      if (Array.from(newPassword).length < 8) {
        errors.newPassword = "New password must be at least 8 characters.";
      } else if (Buffer.byteLength(newPassword, "utf8") > BCRYPT_MAX_BYTES) {
        errors.newPassword = "New password cannot exceed 72 bytes.";
      }
    }

    if (typeof confirmPassword !== "string" || !confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Please correct the password fields.",
        errors,
      });
    }

    const now = Date.now();
    let failureState = getPasswordFailureState(userId, now);

    if (failureState?.blockedUntil > now) {
      res.set("Retry-After", String(Math.ceil((failureState.blockedUntil - now) / 1000)));
      return res.status(429).json({
        message: "Too many failed attempts. Try again later.",
      });
    }

    const storedHash = await User.findPasswordById(userId);

    if (!storedHash) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentPasswordIsValid = await bcrypt.compare(
      currentPassword,
      storedHash
    );

    if (!currentPasswordIsValid) {
      if (!failureState) {
        failureState = { count: 0, windowStartedAt: now };
      }

      failureState.count += 1;

      if (failureState.count >= PASSWORD_FAILURE_LIMIT) {
        failureState.blockedUntil = now + PASSWORD_FAILURE_WINDOW_MS;
        passwordFailures.set(String(userId), failureState);
        res.set("Retry-After", String(Math.ceil(PASSWORD_FAILURE_WINDOW_MS / 1000)));
        return res.status(429).json({
          message: "Too many failed attempts. Try again later.",
        });
      }

      passwordFailures.set(String(userId), failureState);
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    passwordFailures.delete(String(userId));

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "Please choose a different password.",
        errors: { newPassword: "New password must differ from your current password." },
      });
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedRows = await User.updatePassword(userId, passwordHash);

    if (updatedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing password:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  changeMyPassword,
  getMyProfile,
  getUserById,
  getUserByUsername,
  updateMyProfile,
};
