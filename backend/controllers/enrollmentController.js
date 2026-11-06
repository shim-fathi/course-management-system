
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");


// Submit an enrollment request
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Logged-in student's ID
    const studentId = req.user.id;


    // Check course ID
    if (!courseId) {
      return res.status(400).json({
        message: "Course ID is required",
      });
    }


    // Validate course ID
    if (!Number.isInteger(Number(courseId))) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const numericCourseId = Number(courseId);


    const enrollmentId = await Enrollment.request(
      studentId,
      numericCourseId
    );


    return res.status(201).json({
      message: "Enrollment request submitted for approval",
      enrollmentId,
      status: "pending",
    });

  } catch (error) {

    console.error(
      "Error enrolling in course:",
      error.message
    );


    if (error.code === "COURSE_NOT_FOUND") {
      return res.status(404).json({ message: "Course not found" });
    }

    if (error.code === "DUPLICATE_ENROLLMENT") {
      return res.status(409).json({
        message: error.message,
      });
    }


    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



// Get logged-in student's courses
const getMyEnrollments = async (req, res) => {
  try {

    const studentId = req.user.id;

    const enrollments =
      await Enrollment.getByStudent(studentId);


    return res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {

    console.error(
      "Error getting student enrollments:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



// Get students enrolled in a course
const getCourseEnrollments = async (req, res) => {
  try {

    const { courseId } = req.params;


    // Validate course ID
    if (!courseId || !Number.isInteger(Number(courseId))) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const numericCourseId = Number(courseId);


    // Check whether course exists
    const course =
      await Course.getById(numericCourseId);


    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }


    const status = req.query.status;
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid enrollment status",
      });
    }

    const enrollments = await Enrollment.getByCourse(
      numericCourseId,
      status
    );


    return res.status(200).json({
      message: "Course enrollments retrieved successfully",
      course,
      enrollments,
    });

  } catch (error) {

    console.error(
      "Error getting course enrollments:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



// Get all enrollments
const getAllEnrollments = async (req, res) => {
  try {

    const status = req.query.status;
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid enrollment status",
      });
    }

    const enrollments = await Enrollment.getAll(status);


    return res.status(200).json({
      message: "All enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {

    console.error(
      "Error getting all enrollments:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Admin reviews a pending enrollment request
const updateEnrollmentStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, reason = "" } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid enrollment ID" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved or rejected",
      });
    }

    if (typeof reason !== "string") {
      return res.status(400).json({ message: "Reason must be a string" });
    }

    const decisionNote = reason.trim();
    if (status === "rejected" && !decisionNote) {
      return res.status(400).json({
        message: "A reason is required to reject an enrollment",
      });
    }

    await Enrollment.setStatus(
      id,
      status,
      req.user.id,
      decisionNote || null
    );

    return res.status(200).json({
      message: `Enrollment ${status} successfully`,
      status,
    });
  } catch (error) {
    console.error("Error reviewing enrollment:", error.message);

    if (error.code === "ENROLLMENT_NOT_FOUND") {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (
      error.code === "INVALID_ENROLLMENT_STATUS" ||
      error.code === "COURSE_FULL" ||
      error.code === "DUPLICATE_ENROLLMENT"
    ) {
      return res.status(409).json({ message: error.message });
    }

    if (error.code === "COURSE_NOT_FOUND") {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};


// Delete enrollment - Admin
const deleteEnrollment = async (req, res) => {
  try {

    const { id } = req.params;


    // Validate enrollment ID
    if (!id || !Number.isInteger(Number(id))) {
      return res.status(400).json({
        message: "Invalid enrollment ID",
      });
    }


    const result =
      await Enrollment.delete(Number(id));


    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }


    /*
     * CR-007
     *
     * Deleting an enrollment automatically frees
     * the course seat because the enrollment record
     * is removed.
     */
    return res.status(200).json({
      message: "Enrollment deleted successfully",
    });

  } catch (error) {

    console.error(
      "Error deleting enrollment:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



// CR-006
// Student cancels their own enrollment
const cancelMyEnrollment = async (req, res) => {
  try {

    const { id } = req.params;


    // Student ID comes ONLY from authenticated user
    const studentId = req.user.id;


    // Validate enrollment ID
    if (!id || !Number.isInteger(Number(id))) {
      return res.status(400).json({
        message: "Invalid enrollment ID",
      });
    }


    // Delete only if enrollment belongs to
    // logged-in student
    const result =
      await Enrollment.deleteByStudent(
        Number(id),
        studentId
      );


    if (result.affectedRows === 0) {
      const enrollment = await Enrollment.findByIdAndStudent(
        Number(id),
        studentId
      );

      if (enrollment) {
        return res.status(409).json({
          message: "Only pending enrollment requests can be cancelled",
        });
      }

      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    return res.status(200).json({
      message: "Enrollment request cancelled successfully",
    });

  } catch (error) {

    console.error(
      "Error cancelling enrollment:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



module.exports = {
  enrollInCourse,
  getMyEnrollments,
  getCourseEnrollments,
  getAllEnrollments,
  updateEnrollmentStatus,
  deleteEnrollment,
  cancelMyEnrollment,
};
