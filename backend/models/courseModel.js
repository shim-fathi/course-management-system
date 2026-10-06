const db = require("../config/db");

// =====================================================
// GET ALL COURSES
// =====================================================
const getAll = async () => {
  const [rows] = await db.execute(`
    SELECT
      c.id,
      c.title,
      c.category,
      c.level,
      c.duration,
      c.price,
      c.image,
      c.description,
      c.max_students,

      COUNT(e.id) AS enrolled_count,

      CASE
        WHEN c.max_students IS NULL THEN NULL
        ELSE GREATEST(
          c.max_students - COUNT(e.id),
          0
        )
      END AS seats_remaining,

      CASE
        WHEN c.max_students IS NULL THEN FALSE
        WHEN COUNT(e.id) >= c.max_students THEN TRUE
        ELSE FALSE
      END AS is_full

    FROM courses c

    LEFT JOIN enrollments e
      ON e.course_id = c.id

    GROUP BY
      c.id,
      c.title,
      c.category,
      c.level,
      c.duration,
      c.price,
      c.image,
      c.description,
      c.max_students

    ORDER BY c.id DESC
  `);

  return rows;
};

// =====================================================
// GET COURSE BY ID
// =====================================================
const getById = async (id) => {
  const [rows] = await db.execute(
    `
    SELECT
      c.id,
      c.title,
      c.category,
      c.level,
      c.duration,
      c.price,
      c.image,
      c.description,
      c.max_students,

      COUNT(e.id) AS enrolled_count,

      CASE
        WHEN c.max_students IS NULL THEN NULL
        ELSE GREATEST(
          c.max_students - COUNT(e.id),
          0
        )
      END AS seats_remaining,

      CASE
        WHEN c.max_students IS NULL THEN FALSE
        WHEN COUNT(e.id) >= c.max_students THEN TRUE
        ELSE FALSE
      END AS is_full

    FROM courses c

    LEFT JOIN enrollments e
      ON e.course_id = c.id

    WHERE c.id = ?

    GROUP BY
      c.id,
      c.title,
      c.category,
      c.level,
      c.duration,
      c.price,
      c.image,
      c.description,
      c.max_students
    `,
    [id]
  );

  return rows[0] || null;
};

// =====================================================
// NORMALIZE MAX STUDENTS
// =====================================================
const normalizeMaxStudents = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(
    String(value).trim()
  );

  if (
    !Number.isSafeInteger(number) ||
    number <= 0
  ) {
    throw new Error(
      "Maximum students must be a positive integer"
    );
  }

  return number;
};

// =====================================================
// CREATE COURSE
// =====================================================
const create = async (course) => {
  const {
    title,
    category,
    level,
    duration,
    price,
    image,
    description,
  } = course;

  const maxStudents =
    normalizeMaxStudents(
      course.max_students
    );

  console.log(
    "COURSE MODEL CREATE - max_students:",
    maxStudents
  );

  const [result] =
    await db.execute(
      `
      INSERT INTO courses (
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        category,
        level,
        duration,
        price,
        image || null,
        description || null,
        maxStudents,
      ]
    );

  return result.insertId;
};

// =====================================================
// UPDATE COURSE
// =====================================================
const update = async (
  id,
  course
) => {
  const {
    title,
    category,
    level,
    duration,
    price,
    image,
    description,
  } = course;

  const maxStudents =
    normalizeMaxStudents(
      course.max_students
    );

  console.log(
    "COURSE MODEL UPDATE - max_students:",
    maxStudents
  );

  const [result] =
    await db.execute(
      `
      UPDATE courses
      SET
        title = ?,
        category = ?,
        level = ?,
        duration = ?,
        price = ?,
        image = ?,
        description = ?,
        max_students = ?
      WHERE id = ?
      `,
      [
        title,
        category,
        level,
        duration,
        price,
        image || null,
        description || null,
        maxStudents,
        id,
      ]
    );

  return result;
};

// =====================================================
// DELETE COURSE
// =====================================================
const remove = async (id) => {
  const [result] =
    await db.execute(
      `
      DELETE FROM courses
      WHERE id = ?
      `,
      [id]
    );

  return result;
};

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
};