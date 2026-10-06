
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");


// Enroll in a course
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


    // Check whether course exists
    const course = await Course.getById(numericCourseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }


    // Check whether student is already enrolled
    const existingEnrollment =
      await Enrollment.findByStudentAndCourse(
        studentId,
        numericCourseId
      );

    if (existingEnrollment) {
      return res.status(409).json({
        message: "You are already enrolled in this course",
      });
    }


    /*
     * CR-007
     *
     * Create enrollment with server-side capacity
     * enforcement.
     *
     * The model method should perform the capacity
     * check and INSERT inside one database transaction.
     *
     * This prevents two students from taking the
     * final available seat at the same time.
     */
    const enrollmentId =
      await Enrollment.createWithCapacity(
        studentId,
        numericCourseId
      );


    return res.status(201).json({
      message: "Course enrollment successful",
      enrollmentId,
    });

  } catch (error) {

    console.error(
      "Error enrolling in course:",
      error.message
    );


    /*
     * CR-007
     *
     * Course capacity has been reached.
     */
    if (
      error.code === "COURSE_FULL" ||
      error.message === "COURSE_FULL"
    ) {

      return res.status(409).json({
        message: "Course is full",
      });
    }


    /*
     * Handle duplicate enrollment safely.
     */
    if (
      error.code === "DUPLICATE_ENROLLMENT" ||
      error.message === "DUPLICATE_ENROLLMENT"
    ) {

      return res.status(409).json({
        message: "You are already enrolled in this course",
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


    const enrollments =
      await Enrollment.getByCourse(numericCourseId);


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

    const enrollments =
      await Enrollment.getAll();


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


    // Enrollment does not exist
    // OR belongs to another student
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }


    /*
     * CR-007
     *
     * Cancelling an enrollment frees the seat.
     */
    return res.status(200).json({
      message: "Enrollment cancelled successfully",
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
  deleteEnrollment,
  cancelMyEnrollment,
};

