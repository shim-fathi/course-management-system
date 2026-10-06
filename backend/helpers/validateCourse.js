const db = require("../config/db");

// =====================================================
// VALIDATE MAXIMUM STUDENTS
// =====================================================
const validateMaxStudents = (value) => {
  // Empty means unlimited
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const text = String(value).trim();

  // Only positive integer
  if (!/^[1-9]\d*$/.test(text)) {
    return "Maximum students must be a positive integer";
  }

  const number = Number(text);

  if (
    !Number.isSafeInteger(number) ||
    number <= 0
  ) {
    return "Maximum students must be a positive integer";
  }

  return null;
};

// =====================================================
// VALIDATE COURSE
// =====================================================
const validateCourse = async (
  course,
  options = {}
) => {
  const {
    isUpdate = false,
    currentId = null,
  } = options;

  const errors = {};

  const title = String(
    course.title || ""
  ).trim();

  const category = String(
    course.category || ""
  ).trim();

  const level = String(
    course.level || ""
  ).trim();

  const duration = String(
    course.duration || ""
  ).trim();

  const image = String(
    course.image || ""
  ).trim();

  const description = String(
    course.description || ""
  ).trim();

  const price =
    course.price === "" ||
    course.price === null ||
    course.price === undefined
      ? null
      : Number(course.price);

  // ===================================================
  // TITLE
  // ===================================================
  if (!title) {
    errors.title = "Title is required";
  }

  // ===================================================
  // CATEGORY
  // ===================================================
  if (!category) {
    errors.category = "Category is required";
  }

  // ===================================================
  // LEVEL
  // ===================================================
  const allowedLevels = [
    "Beginner",
    "Intermediate",
    "Advanced",
  ];

  if (!level) {
    errors.level = "Level is required";
  } else if (
    !allowedLevels.includes(level)
  ) {
    errors.level = "Invalid level";
  }

  // ===================================================
  // DURATION
  // ===================================================
  if (!duration) {
    errors.duration = "Duration is required";
  }

  // ===================================================
  // PRICE
  // ===================================================
  if (
    price === null ||
    Number.isNaN(price)
  ) {
    errors.price = "Price is required";
  } else if (price < 0) {
    errors.price =
      "Price cannot be negative";
  }

  // ===================================================
  // MAXIMUM STUDENTS
  // ===================================================
  const maxStudentsError =
    validateMaxStudents(
      course.max_students
    );

  if (maxStudentsError) {
    errors.max_students =
      maxStudentsError;
  }

  // ===================================================
  // DUPLICATE TITLE
  // ===================================================
  if (title) {
    let query = `
      SELECT id
      FROM courses
      WHERE LOWER(title) = LOWER(?)
    `;

    const params = [title];

    if (
      isUpdate &&
      currentId
    ) {
      query += ` AND id != ?`;
      params.push(currentId);
    }

    const [rows] =
      await db.execute(
        query,
        params
      );

    if (rows.length > 0) {
      errors.title =
        "Course title already exists";
    }
  }

  // ===================================================
  // NORMALIZE MAXIMUM STUDENTS
  // ===================================================
  let maxStudents = null;

  const maxStudentsText =
    String(
      course.max_students ?? ""
    ).trim();

  if (maxStudentsText !== "") {
    maxStudents =
      parseInt(
        maxStudentsText,
        10
      );
  }

  // ===================================================
  // RETURN
  // ===================================================
  return {
    errors,

    data: {
      title,
      category,
      level,
      duration,
      price,
      image,
      description,

      // NULL = unlimited
      // NUMBER = limited
      max_students:
        maxStudents,
    },
  };
};

module.exports = validateCourse;