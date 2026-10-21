
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

const SORT_COLUMNS = {
  date: "e.enrolled_at",
  enrolled_at: "e.enrolled_at",
  student: "u.full_name",
  course: "c.title",
};

const isScalarQueryValue = (value) => typeof value === "string";

const parsePositiveInteger = (value, name, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (!isScalarQueryValue(value) || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a safe positive integer`);
  }

  return parsed;
};

const parseDate = (value, name) => {
  if (value === undefined) {
    return null;
  }

  if (
    !isScalarQueryValue(value) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1000
  ) {
    throw new Error(`${name} must be a valid date in YYYY-MM-DD format`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${name} must be a valid date in YYYY-MM-DD format`);
  }

  return value;
};


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
    const query = req.query;
    const page = parsePositiveInteger(query.page, "page", 1);
    const limit = parsePositiveInteger(query.limit, "limit", 20);
    const courseId = parsePositiveInteger(query.courseId, "courseId", null);
    const sort = query.sort === undefined ? "enrolled_at" : query.sort;
    const order = query.order === undefined ? "desc" : query.order;
    const from = parseDate(query.from, "from");
    const to = parseDate(query.to, "to");
    const searchText = query.q === undefined ? "" : query.q;

    if (limit > 100) {
      throw new Error("limit must not exceed 100");
    }

    if (!Object.prototype.hasOwnProperty.call(SORT_COLUMNS, sort)) {
      throw new Error("sort must be one of: date, enrolled_at, student, course");
    }

    if (!isScalarQueryValue(order) || !["asc", "desc"].includes(order)) {
      throw new Error("order must be either asc or desc");
    }

    if (!isScalarQueryValue(searchText)) {
      throw new Error("q must be a single search string");
    }

    if (from && to && from > to) {
      throw new Error("from must be earlier than or equal to to");
    }

    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) {
      throw new Error("page is too large");
    }

    const escapedSearch = searchText
      .replace(/!/g, "!!")
      .replace(/%/g, "!%")
      .replace(/_/g, "!_");

    const result = await Enrollment.getAll({
      search: escapedSearch ? `%${escapedSearch}%` : "",
      courseId,
      from,
      to,
      sortColumn: SORT_COLUMNS[sort],
      order: order.toUpperCase(),
      limit,
      offset,
    });

    return res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments: result.enrollments,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });

  } catch (error) {
    if (
      error.message.startsWith("page ") ||
      error.message.startsWith("limit ") ||
      error.message.startsWith("courseId ") ||
      error.message.startsWith("from ") ||
      error.message.startsWith("to ") ||
      error.message.startsWith("sort ") ||
      error.message.startsWith("order ") ||
      error.message.startsWith("q ") ||
      error.message === "page is too large"
    ) {
      return res.status(400).json({ message: error.message });
    }

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
