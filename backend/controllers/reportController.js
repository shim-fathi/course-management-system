const Report = require("../models/reportModel");

const toNumber = (value) => Number(value || 0);

const getAdminOverview = async (req, res) => {
  try {
    const report = await Report.getAdminOverview();
    const summary = report.summary;

    return res.status(200).json({
      totalCourses: toNumber(summary.total_courses),
      totalStudents: toNumber(summary.total_students),
      totalEnrollments: toNumber(summary.total_enrollments),
      studentsWithEnrollments: toNumber(
        summary.students_with_enrollments
      ),
      enrollmentsLast30Days: toNumber(
        summary.enrollments_last_30_days
      ),
      coursesWithoutEnrollments: toNumber(
        summary.courses_without_enrollments
      ),
      enrollmentsByCategory: report.enrollmentsByCategory.map((row) => ({
        category: row.category,
        enrollmentCount: toNumber(row.enrollment_count),
      })),
      topCourses: report.topCourses.map((row) => ({
        courseId: row.course_id,
        title: row.title,
        category: row.category,
        enrollmentCount: toNumber(row.enrollment_count),
      })),
      recentEnrollments: report.recentEnrollments,
    });
  } catch (error) {
    console.error("Get admin report error:", error);

    return res.status(500).json({
      message: "Failed to fetch admin report",
    });
  }
};

const getMyReport = async (req, res) => {
  try {
    const report = await Report.getStudentReport(req.user.id);
    const summary = report.summary;

    return res.status(200).json({
      enrolledCourses: toNumber(summary.enrolled_courses),
      distinctCategories: toNumber(summary.distinct_categories),
      earliestEnrollment: summary.earliest_enrollment,
      latestEnrollment: summary.latest_enrollment,
      totalCourseValue: toNumber(summary.total_course_value),
      recentEnrollments: report.recentEnrollments,
    });
  } catch (error) {
    console.error("Get student report error:", error);

    return res.status(500).json({
      message: "Failed to fetch student report",
    });
  }
};

module.exports = {
  getAdminOverview,
  getMyReport,
};
