const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;


// Middleware
app.use(cors());


// Parse JSON request bodies
app.use(express.json());


// API Routes
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");

// Public auth routes (login)
app.use("/api/auth", authRoutes);

// Course routes - public GET, protected POST/PUT/DELETE (auth per-route)
app.use("/api/courses", courseRoutes);

// Protected routes - require valid JWT
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/enrollments", enrollmentRoutes);


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
