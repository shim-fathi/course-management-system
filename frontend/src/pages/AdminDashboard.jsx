import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaChartBar,
  FaSearch,
  FaUsers,
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function AdminDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = getUser();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get("/reports/overview");
        setReport(response.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Failed to load the dashboard report"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const recentEnrollments = report?.recentEnrollments || [];
  const categories = report?.enrollmentsByCategory || [];
  const topCourses = report?.topCourses || [];
  const highestCategoryCount = Math.max(
    0,
    ...categories.map((item) => item.enrollmentCount)
  );

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString();
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {user?.full_name || user?.username}. Here is
              an overview of the system.
            </p>
          </div>
          <Link to="/admin/courses" className="btn btn-primary">
            <FaChartBar />
            Manage Courses
          </Link>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="dashboard-grid">
          {[
            ["totalCourses", "Total Courses"],
            ["totalStudents", "Total Students"],
            ["totalEnrollments", "Total Enrollments"],
            ["studentsWithEnrollments", "Students with Enrollments"],
            ["enrollmentsLast30Days", "Enrollments in Last 30 Days"],
            ["coursesWithoutEnrollments", "Courses with No Enrollments"],
          ].map(([key, label]) => (
            <div className="dashboard-card" key={key}>
              <span className="dashboard-card-value">
                {loading ? "..." : report?.[key] ?? 0}
              </span>
              <span className="dashboard-card-label">{label}</span>
            </div>
          ))}
        </div>

        <section className="section-card">
          <div className="section-card-header">
            <h2>Enrollments by Category</h2>
          </div>
          {loading ? (
            <p className="loading">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="empty">No course categories to report yet.</p>
          ) : (
            <div className="report-bars">
              {categories.map((item) => (
                <div className="report-bar-row" key={item.category}>
                  <span className="report-bar-label">{item.category}</span>
                  <div
                    className="report-bar-track"
                    role="img"
                    aria-label={`${item.category}: ${item.enrollmentCount} enrollments`}
                  >
                    <span
                      className="report-bar-fill"
                      style={{
                        width:
                          highestCategoryCount > 0
                            ? `${(item.enrollmentCount / highestCategoryCount) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <strong>{item.enrollmentCount}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h2>Top Courses by Enrollment</h2>
          </div>
          {loading ? (
            <p className="loading">Loading...</p>
          ) : topCourses.length === 0 ? (
            <p className="empty">No courses to report yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Enrollments</th>
                  </tr>
                </thead>
                <tbody>
                  {topCourses.map((course) => (
                    <tr key={course.courseId}>
                      <td>{course.title}</td>
                      <td>{course.category}</td>
                      <td>{course.enrollmentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h2>Recent Enrollments</h2>
            <Link to="/admin/enrollments" className="link-inline">
              Manage enrollments
            </Link>
          </div>
          {loading && <p className="loading">Loading...</p>}
          {!loading && recentEnrollments.length === 0 && (
            <p className="empty">No enrollments have been made yet.</p>
          )}
          {!loading && recentEnrollments.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Username</th>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Enrolled On</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEnrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.full_name}</td>
                      <td>{enrollment.username}</td>
                      <td>{enrollment.title}</td>
                      <td>{enrollment.category}</td>
                      <td>
                        <span className="tag tag-level">
                          {enrollment.level}
                        </span>
                      </td>
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
            <h2>Administration</h2>
          </div>
          <div className="quick-actions">
            <Link to="/admin/courses" className="quick-action">
              <span className="quick-action-icon"><FaBook /></span>
              <span>Add, edit and delete courses</span>
            </Link>
            <Link to="/admin/enrollments" className="quick-action">
              <span className="quick-action-icon"><FaUsers /></span>
              <span>View and remove enrollments</span>
            </Link>
            <Link to="/courses" className="quick-action">
              <span className="quick-action-icon"><FaSearch /></span>
              <span>See the public course list</span>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default AdminDashboard;
