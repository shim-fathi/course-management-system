import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaEye,
  FaGraduationCap,
  FaSearch,
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function StudentDashboard() {
  const [report, setReport] = useState(null);
  const [courseCount, setCourseCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const user = getUser();

  useEffect(() => {
    const loadDashboard = async () => {
      const [reportResult, statsResult] = await Promise.allSettled([
        api.get("/reports/my"),
        api.get("/courses/stats"),
      ]);

      if (reportResult.status === "fulfilled") {
        setReport(reportResult.value.data);
      }

      if (statsResult.status === "fulfilled") {
        setCourseCount(Number(statsResult.value.data.courseCount) || 0);
      }

      const messages = [];
      if (reportResult.status === "rejected") {
        messages.push(
          reportResult.reason.response?.data?.message ||
            "Failed to load your learning report"
        );
      }
      if (statsResult.status === "rejected") {
        messages.push("Course availability could not be loaded.");
      }
      setErrors(messages);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const recentEnrollments = report?.recentEnrollments || [];

  const formatDate = (value) => {
    if (!value) return "No enrollments yet";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleDateString();
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Student Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {user?.full_name || user?.username}!
            </p>
          </div>
          <Link to="/courses" className="btn btn-primary">
            <FaSearch />
            Browse Courses
          </Link>
        </div>

        {errors.map((message) => (
          <p className="error" key={message}>{message}</p>
        ))}

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report?.enrolledCourses ?? 0}
            </span>
            <span className="dashboard-card-label">My Enrolled Courses</span>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading
                ? "..."
                : `Rs. ${(report?.totalCourseValue ?? 0).toFixed(2)}`}
            </span>
            <span className="dashboard-card-label">
              Total Enrolled Course Value
            </span>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report?.distinctCategories ?? 0}
            </span>
            <span className="dashboard-card-label">
              Categories Explored
            </span>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : courseCount ?? "-"}
            </span>
            <span className="dashboard-card-label">Courses Available</span>
          </div>
        </div>

        <section className="section-card">
          <div className="section-card-header">
            <h2>Learning Activity</h2>
          </div>
          <div className="learning-activity">
            <div>
              <span className="learning-activity-label">
                First enrollment
              </span>
              <strong>
                {loading
                  ? "..."
                  : formatDate(report?.earliestEnrollment)}
              </strong>
            </div>
            <div>
              <span className="learning-activity-label">
                Latest enrollment
              </span>
              <strong>
                {loading
                  ? "..."
                  : formatDate(report?.latestEnrollment)}
              </strong>
            </div>
          </div>
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h2>My Recent Enrollments</h2>
            <Link to="/my-enrollments" className="link-inline">
              <FaEye />
              View all
            </Link>
          </div>
          {loading && <p className="loading">Loading...</p>}
          {!loading && recentEnrollments.length === 0 && (
            <p className="empty">
              You have not enrolled in any courses yet. Head over to the
              courses page and enroll in your first course.
            </p>
          )}
          {!loading && recentEnrollments.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Enrolled On</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEnrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>
                        <Link to={`/courses/${enrollment.course_id}`}>
                          {enrollment.title}
                        </Link>
                      </td>
                      <td>{enrollment.category}</td>
                      <td>{enrollment.level}</td>
                      <td>{formatDate(enrollment.enrolled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions">
            <Link to="/courses" className="quick-action">
              <span className="quick-action-icon"><FaBook /></span>
              <span>Browse all courses</span>
            </Link>
            <Link to="/my-enrollments" className="quick-action">
              <span className="quick-action-icon">
                <FaGraduationCap />
              </span>
              <span>View my enrollments</span>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default StudentDashboard;
