const db = require("../config/db");

const Report = {
  async getAdminOverview() {
    const [summaryRows, categoryRows, topCourseRows, recentEnrollmentRows] =
      await Promise.all([
        db.execute(`
          SELECT
            (SELECT COUNT(*) FROM courses) AS total_courses,
            (
              SELECT COUNT(*)
              FROM users
              WHERE role = 'student'
            ) AS total_students,
            (SELECT COUNT(*) FROM enrollments) AS total_enrollments,
            (
              SELECT COUNT(DISTINCT student_id)
              FROM enrollments
            ) AS students_with_enrollments,
            (
              SELECT COUNT(*)
              FROM enrollments
              WHERE enrolled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ) AS enrollments_last_30_days,
            (
              SELECT COUNT(*)
              FROM courses c
              WHERE NOT EXISTS (
                SELECT 1
                FROM enrollments e
                WHERE e.course_id = c.id
              )
            ) AS courses_without_enrollments
        `),
        db.execute(`
          SELECT
            c.category,
            COUNT(e.id) AS enrollment_count
          FROM courses c
          LEFT JOIN enrollments e
            ON e.course_id = c.id
          GROUP BY c.category
          ORDER BY enrollment_count DESC, c.category ASC
        `),
        db.execute(`
          SELECT
            c.id AS course_id,
            c.title,
            c.category,
            COUNT(e.id) AS enrollment_count
          FROM courses c
          LEFT JOIN enrollments e
            ON e.course_id = c.id
          GROUP BY c.id, c.title, c.category
          ORDER BY enrollment_count DESC, c.title ASC, c.id ASC
          LIMIT 5
        `),
        db.execute(`
          SELECT
            e.id,
            e.enrolled_at,
            u.id AS student_id,
            u.username,
            u.full_name,
            c.id AS course_id,
            c.title,
            c.category,
            c.level
          FROM enrollments e
          JOIN users u
            ON u.id = e.student_id
          JOIN courses c
            ON c.id = e.course_id
          ORDER BY e.enrolled_at DESC, e.id DESC
          LIMIT 6
        `),
      ]);

    return {
      summary: summaryRows[0][0],
      enrollmentsByCategory: categoryRows[0],
      topCourses: topCourseRows[0],
      recentEnrollments: recentEnrollmentRows[0],
    };
  },

  async getStudentReport(studentId) {
    const [summaryRows, recentEnrollmentRows] = await Promise.all([
      db.execute(
        `
          SELECT
            COUNT(e.id) AS enrolled_courses,
            COUNT(DISTINCT c.category) AS distinct_categories,
            MIN(e.enrolled_at) AS earliest_enrollment,
            MAX(e.enrolled_at) AS latest_enrollment,
            COALESCE(SUM(c.price), 0) AS total_course_value
          FROM enrollments e
          JOIN courses c
            ON c.id = e.course_id
          WHERE e.student_id = ?
        `,
        [studentId]
      ),
      db.execute(
        `
          SELECT
            e.id,
            e.enrolled_at,
            c.id AS course_id,
            c.title,
            c.category,
            c.level,
            c.price
          FROM enrollments e
          JOIN courses c
            ON c.id = e.course_id
          WHERE e.student_id = ?
          ORDER BY e.enrolled_at DESC, e.id DESC
          LIMIT 3
        `,
        [studentId]
      ),
    ]);

    return {
      summary: summaryRows[0][0],
      recentEnrollments: recentEnrollmentRows[0],
    };
  },
};

module.exports = Report;
