const Course = require("../models/courseModel");
const db = require("../config/db");
const validateCourse = require("../helpers/validateCourse");

// GET ALL COURSES
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.getAll();

    return res.status(200).json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);

    return res.status(500).json({
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

// GET COURSE BY ID
exports.getCourseById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const course = await Course.getById(id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    return res.status(200).json(course);
  } catch (error) {
    console.error("Get course error:", error);

    return res.status(500).json({
      message: "Failed to fetch course",
      error: error.message,
    });
  }
};

// GET COURSE/STUDENT STATISTICS
exports.getStats = async (req, res) => {
  try {
    const [courseRows] = await db.execute(
      "SELECT COUNT(*) AS course_count FROM courses"
    );

    const [studentRows] = await db.execute(
      "SELECT COUNT(*) AS student_count FROM users WHERE role = 'student'"
    );

    return res.status(200).json({
      courseCount: Number(courseRows[0]?.course_count || 0),
      studentCount: Number(studentRows[0]?.student_count || 0),
    });
  } catch (error) {
    console.error("Get stats error:", error);

    return res.status(500).json({
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE COURSE
// =====================================================
exports.createCourse = async (req, res) => {
  try {
    console.log("========== CREATE COURSE ==========");
    console.log("REQ.BODY:", req.body);
    console.log("MAX STUDENTS FROM FRONTEND:", req.body.max_students);

    const { errors, data } = await validateCourse(req.body);

    console.log("VALIDATED DATA:", data);
    console.log("MAX STUDENTS AFTER VALIDATION:", data.max_students);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    const courseId = await Course.create(data);

    console.log("COURSE CREATED ID:", courseId);

    const course = await Course.getById(courseId);

    console.log("CREATED COURSE FROM DATABASE:", course);
    console.log("MAX STUDENTS FROM DATABASE:", course?.max_students);

    return res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);

    return res.status(500).json({
      message: "Failed to create course",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE COURSE
// =====================================================
exports.updateCourse = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    console.log("UPDATE COURSE BODY:", req.body);
    console.log("UPDATE MAX STUDENTS:", req.body.max_students);

    const existingCourse = await Course.getById(id);

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const { errors, data } = await validateCourse(req.body, {
      isUpdate: true,
      currentId: id,
    });

    console.log("UPDATE VALIDATED DATA:", data);
    console.log(
      "UPDATE MAX STUDENTS AFTER VALIDATION:",
      data.max_students
    );

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    // Prevent reducing capacity below current enrollment
    if (data.max_students !== null) {
      const [rows] = await db.execute(
        `
        SELECT COUNT(*) AS enrolled_count
        FROM enrollments
        WHERE course_id = ?
        `,
        [id]
      );

      const enrolledCount = Number(
        rows[0]?.enrolled_count || 0
      );

      const newMaxStudents = Number(data.max_students);

      if (newMaxStudents < enrolledCount) {
        return res.status(400).json({
          message:
            "Maximum students cannot be less than the current enrollment count",
          enrolled_count: enrolledCount,
          max_students: newMaxStudents,
        });
      }
    }

    await Course.update(id, data);

    const updatedCourse = await Course.getById(id);

    console.log("UPDATED COURSE FROM DATABASE:", updatedCourse);
    console.log(
      "UPDATED MAX STUDENTS FROM DATABASE:",
      updatedCourse?.max_students
    );

    return res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Update course error:", error);

    return res.status(500).json({
      message: "Failed to update course",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE COURSE
// =====================================================
exports.deleteCourse = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const existingCourse = await Course.getById(id);

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    await Course.delete(id);

    return res.status(200).json({
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);

    return res.status(500).json({
      message: "Failed to delete course",
      error: error.message,
    });
  }
};