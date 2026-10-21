
const db = require("../config/db");

const Enrollment = {

  // Create enrollment
  async create(studentId, courseId) {
    const [result] = await db.execute(
      `INSERT INTO enrollments
       (student_id, course_id)
       VALUES (?, ?)`,
      [studentId, courseId]
    );

    return result.insertId;
  },


  // CR-007
  // Create enrollment with server-side capacity enforcement
  //
  // Capacity check and INSERT are performed inside
  // one transaction to prevent over-enrollment
  // when multiple students enroll at the same time.
  async createWithCapacity(studentId, courseId) {

    const connection = await db.getConnection();

    try {

      // Start transaction
      await connection.beginTransaction();


      // Lock the course row until this transaction finishes
      const [courseRows] = await connection.execute(
        `SELECT
            id,
            max_students
         FROM courses
         WHERE id = ?
         FOR UPDATE`,
        [courseId]
      );


      // Course does not exist
      if (courseRows.length === 0) {

        const error = new Error("Course not found");
        error.code = "COURSE_NOT_FOUND";

        throw error;
      }


      const course = courseRows[0];


      // Check duplicate enrollment inside the transaction
      const [existingRows] = await connection.execute(
        `SELECT id
         FROM enrollments
         WHERE student_id = ?
           AND course_id = ?
         LIMIT 1`,
        [studentId, courseId]
      );


      if (existingRows.length > 0) {

        const error =
          new Error("You are already enrolled in this course");

        error.code = "DUPLICATE_ENROLLMENT";

        throw error;
      }


      /*
       * NULL max_students = unlimited course.
       *
       * Only check capacity when max_students
       * has a value.
       */
      if (course.max_students !== null) {

        const [countRows] = await connection.execute(
          `SELECT COUNT(*) AS enrolled_count
           FROM enrollments
           WHERE course_id = ?`,
          [courseId]
        );


        const enrolledCount =
          Number(countRows[0].enrolled_count || 0);

        const maxStudents =
          Number(course.max_students);


        // Course is full
        if (enrolledCount >= maxStudents) {

          const error =
            new Error("Course is full");

          error.code = "COURSE_FULL";

          throw error;
        }
      }


      // Capacity is available - create enrollment
      const [result] = await connection.execute(
        `INSERT INTO enrollments
         (student_id, course_id)
         VALUES (?, ?)`,
        [studentId, courseId]
      );


      // Commit only after successful INSERT
      await connection.commit();


      return result.insertId;

    } catch (error) {

      // Roll back the transaction if anything fails
      await connection.rollback();

      throw error;

    } finally {

      // Always release the connection
      connection.release();

    }
  },


  // Check if student is already enrolled
  async findByStudentAndCourse(studentId, courseId) {

    const [rows] = await db.execute(
      `SELECT *
       FROM enrollments
       WHERE student_id = ?
         AND course_id = ?`,
      [studentId, courseId]
    );

    return rows[0];
  },


  // Get all courses enrolled by a student
  async getByStudent(studentId) {

    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          c.id AS course_id,
          c.title,
          c.category,
          c.level,
          c.duration,
          c.price,
          c.image,
          c.description,
          c.max_students,

          (
            SELECT COUNT(*)
            FROM enrollments e2
            WHERE e2.course_id = c.id
          ) AS enrolled_count,

          CASE
            WHEN c.max_students IS NULL
              THEN NULL
            ELSE c.max_students -
              (
                SELECT COUNT(*)
                FROM enrollments e3
                WHERE e3.course_id = c.id
              )
          END AS seats_remaining,

          CASE
            WHEN c.max_students IS NOT NULL
             AND
             (
               SELECT COUNT(*)
               FROM enrollments e4
               WHERE e4.course_id = c.id
             ) >= c.max_students
              THEN true
            ELSE false
          END AS is_full

       FROM enrollments e

       JOIN courses c
         ON e.course_id = c.id

       WHERE e.student_id = ?

       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    return rows;
  },


  // Get all students enrolled in a course
  async getByCourse(courseId) {

    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          u.id AS student_id,
          u.username,
          u.full_name

       FROM enrollments e

       JOIN users u
         ON e.student_id = u.id

       WHERE e.course_id = ?

       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    return rows;
  },


  // Get a filtered page of enrollments and the matching record count.
  async getAll({
    search,
    courseId,
    from,
    to,
    sortColumn,
    order,
    limit,
    offset,
  }) {
    const conditions = [];
    const values = [];

    if (search) {
      conditions.push(
        "(u.full_name LIKE ? ESCAPE '!' OR u.username LIKE ? ESCAPE '!')"
      );
      values.push(search, search);
    }

    if (courseId !== null) {
      conditions.push("e.course_id = ?");
      values.push(courseId);
    }

    if (from) {
      conditions.push("e.enrolled_at >= ?");
      values.push(from);
    }

    if (to) {
      conditions.push("e.enrolled_at < DATE_ADD(?, INTERVAL 1 DAY)");
      values.push(to);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id
       ${whereClause}`,
      values
    );

    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,

          u.id AS student_id,
          u.username,
          u.full_name,

          c.id AS course_id,
          c.title,
          c.category,
          c.level,
          c.max_students,

          (
            SELECT COUNT(*)
            FROM enrollments e2
            WHERE e2.course_id = c.id
          ) AS enrolled_count,

          CASE
            WHEN c.max_students IS NULL
              THEN NULL
            ELSE c.max_students -
              (
                SELECT COUNT(*)
                FROM enrollments e3
                WHERE e3.course_id = c.id
              )
          END AS seats_remaining,

          CASE
            WHEN c.max_students IS NOT NULL
             AND
             (
               SELECT COUNT(*)
               FROM enrollments e4
               WHERE e4.course_id = c.id
             ) >= c.max_students
              THEN true
            ELSE false
          END AS is_full

       FROM enrollments e

       JOIN users u
         ON e.student_id = u.id

       JOIN courses c
         ON e.course_id = c.id

       ${whereClause}

       ORDER BY ${sortColumn} ${order}, e.id ${order}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return {
      enrollments: rows,
      total: Number(countRows[0].total),
    };
  },


  // Delete enrollment - Admin
  //
  // Deleting an enrollment automatically frees
  // one seat for the course.
  async delete(id) {

    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?`,
      [id]
    );

    return result;
  },


  // CR-006
  // Student can delete only their own enrollment
  //
  // Cancelling an enrollment automatically frees
  // one seat for the course.
  async deleteByStudent(id, studentId) {

    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?
         AND student_id = ?`,
      [id, studentId]
    );

    return result;
  },

};


module.exports = Enrollment;
