const express = require("express");

const router = express.Router();

const {
  changeMyPassword,
  getMyProfile,
  getUserByUsername,
  getUserById,
  updateMyProfile,
} = require("../controllers/userController");

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.put("/me/password", changeMyPassword);

router.get(
  "/username/:username",
  getUserByUsername
);

router.get(
  "/:id",
  getUserById
);


module.exports = router;
