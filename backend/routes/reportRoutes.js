const express = require("express");

const {
  getAdminOverview,
  getMyReport,
} = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/overview",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminOverview
);

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(["student"]),
  getMyReport
);

module.exports = router;
