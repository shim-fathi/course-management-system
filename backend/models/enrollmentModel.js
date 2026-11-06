const db = require("../config/db");

const Enrollment = {
  async request(studentId, courseId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [courseRows] = await connection.execute(
        `SELECT id
         FROM courses
         WHERE id = ?
         FOR UPDATE`,
        [courseId]
      );

      if (courseRows.length === 0) {
        const error = new Error("Course not found");
        error.code = "COURSE_NOT_FOUND";
        throw error;
      }

      const [existingRows] = await connection.execute(
        `SELECT id, status
         FROM enrollments
         WHERE student_id = ?
           AND course_id = ?
         FOR UPDATE`,
        [studentId, courseId]
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];

        if (existing.status !== "rejected") {
          const error = new Error(
            existing.status === "pending"
              ? "An enrollment request is already pending"
              : "You are already enrolled in this course"
          );
          error.code = "DUPLICATE_ENROLLMENT";
          throw error;
        }

        await connection.execute(
          `UPDATE enrollments
           SET status = 'pending',
               enrolled_at = CURRENT_TIMESTAMP,
               reviewed_by = NULL,
               reviewed_at = NULL,
               decision_note = NULL
           WHERE id = ?`,
          [existing.id]
        );

        await connection.commit();
        return existing.id;
      }

      const [result] = await connection.execute(
        `INSERT INTO enrollments (student_id, course_id, status)
         VALUES (?, ?, 'pending')`,
        [studentId, courseId]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async setStatus(id, status, reviewerId, decisionNote) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [enrollmentRows] = await connection.execute(
        `SELECT course_id
         FROM enrollments
         WHERE id = ?`,
        [id]
      );

      if (enrollmentRows.length === 0) {
        const error = new Error("Enrollment not found");
        error.code = "ENROLLMENT_NOT_FOUND";
        throw error;
      }

      const courseId = enrollmentRows[0].course_id;
      const [courseRows] = await connection.execute(
        `SELECT id, max_students
         FROM courses
         WHERE id = ?
         FOR UPDATE`,
        [courseId]
      );

      if (courseRows.length === 0) {
        const error = new Error("Course not found");
        error.code = "COURSE_NOT_FOUND";
        throw error;
      }

      const [lockedRows] = await connection.execute(
        `SELECT id, student_id, status
         FROM enrollments
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );

      if (lockedRows.length === 0) {
        const error = new Error("Enrollment not found");
        error.code = "ENROLLMENT_NOT_FOUND";
        throw error;
      }

      const enrollment = lockedRows[0];
      if (enrollment.status !== "pending") {
        const error = new Error(
          "Only pending enrollment requests can be reviewed"
        );
        error.code = "INVALID_ENROLLMENT_STATUS";
        throw error;
      }

      if (status === "approved") {
        const [duplicateRows] = await connection.execute(
          `SELECT id
           FROM enrollments
           WHERE student_id = ?
             AND course_id = ?
             AND status = 'approved'
             AND id <> ?
           LIMIT 1`,
          [enrollment.student_id, courseId, id]
        );

        if (duplicateRows.length > 0) {
          const error = new Error(
            "The student is already approved for this course"
          );
          error.code = "DUPLICATE_ENROLLMENT";
          throw error;
        }

        const maxStudents = courseRows[0].max_students;
        if (maxStudents !== null) {
          const [countRows] = await connection.execute(
            `SELECT COUNT(*) AS enrolled_count
             FROM enrollments
             WHERE course_id = ?
               AND status = 'approved'`,
            [courseId]
          );

          if (Number(countRows[0].enrolled_count) >= Number(maxStudents)) {
            const error = new Error("Course is full");
            error.code = "COURSE_FULL";
            throw error;
          }
        }
      }

      await connection.execute(
        `UPDATE enrollments
         SET status = ?,
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP,
             decision_note = ?
         WHERE id = ?`,
        [status, reviewerId, decisionNote, id]
      );

      await connection.commit();
      return id;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          e.status,
          e.reviewed_by,
          e.reviewed_at,
          e.decision_note,
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
              AND e2.status = 'approved'
          ) AS enrolled_count,
          CASE
            WHEN c.max_students IS NULL THEN NULL
            ELSE GREATEST(
              c.max_students - (
                SELECT COUNT(*)
                FROM enrollments e3
                WHERE e3.course_id = c.id
                  AND e3.status = 'approved'
              ),
              0
            )
          END AS seats_remaining,
          CASE
            WHEN c.max_students IS NOT NULL
             AND (
               SELECT COUNT(*)
               FROM enrollments e4
               WHERE e4.course_id = c.id
                 AND e4.status = 'approved'
             ) >= c.max_students
              THEN true
            ELSE false
          END AS is_full
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    return rows;
  },

  async getByCourse(courseId, status) {
    const statusClause = status ? "AND e.status = ?" : "";
    const parameters = status ? [courseId, status] : [courseId];
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          e.status,
          e.reviewed_by,
          e.reviewed_at,
          e.decision_note,
          u.id AS student_id,
          u.username,
          u.full_name
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
         ${statusClause}
       ORDER BY e.enrolled_at DESC`,
      parameters
    );

    return rows;
  },

  async getAll(status) {
    const statusClause = status ? "WHERE e.status = ?" : "";
    const parameters = status ? [status] : [];
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          e.status,
          e.reviewed_by,
          e.reviewed_at,
          e.decision_note,
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
              AND e2.status = 'approved'
          ) AS enrolled_count,
          CASE
            WHEN c.max_students IS NULL THEN NULL
            ELSE GREATEST(
              c.max_students - (
                SELECT COUNT(*)
                FROM enrollments e3
                WHERE e3.course_id = c.id
                  AND e3.status = 'approved'
              ),
              0
            )
          END AS seats_remaining,
          CASE
            WHEN c.max_students IS NOT NULL
             AND (
               SELECT COUNT(*)
               FROM enrollments e4
               WHERE e4.course_id = c.id
                 AND e4.status = 'approved'
             ) >= c.max_students
              THEN true
            ELSE false
          END AS is_full
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id
       ${statusClause}
       ORDER BY e.enrolled_at DESC`,
      parameters
    );

    return rows;
  },

  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?`,
      [id]
    );

    return result;
  },

  async deleteByStudent(id, studentId) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?
         AND student_id = ?
         AND status = 'pending'`,
      [id, studentId]
    );

    return result;
  },

  async findByIdAndStudent(id, studentId) {
    const [rows] = await db.execute(
      `SELECT id, status
       FROM enrollments
       WHERE id = ?
         AND student_id = ?`,
      [id, studentId]
    );

    return rows[0];
  },
};

module.exports = Enrollment;
