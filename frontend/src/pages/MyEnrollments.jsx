
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function MyEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [sortOption, setSortOption] = useState("newest");

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [cancellingId, setCancellingId] = useState(null);

  const user = getUser();

  // ---------- Load the logged-in student's enrollments ----------
  useEffect(() => {
    const getEnrollments = async () => {
      try {
        const response = await api.get("/enrollments/my");

        setEnrollments(response.data.enrollments || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load your enrollments"
        );
      } finally {
        setLoading(false);
      }
    };

    getEnrollments();
  }, []);

  // ---------- Cancel Enrollment ----------
const handleCancelEnrollment = async (enrollmentId) => {
  const confirmed = window.confirm(
    "Are you sure you want to cancel this pending enrollment request?"
  );

  if (!confirmed) {
    return;
  }

  setError("");
  setSuccess("");
  setCancellingId(enrollmentId);

  try {
    const response = await api.delete(
      `/enrollments/my/${enrollmentId}`
    );

    setSuccess(
      response.data.message ||
      "Enrollment cancelled successfully."
    );

    // Remove cancelled enrollment from current list
    setEnrollments((currentEnrollments) =>
      currentEnrollments.filter(
        (enrollment) =>
          enrollment.id !== enrollmentId
      )
    );

  } catch (error) {
    setError(
      error.response?.data?.message ||
      "Failed to cancel enrollment."
    );
  } finally {
    setCancellingId(null);
  }
};

  // ---------- Safe price conversion ----------
  const safePrice = (price) => {
    const value = Number(price);

    return Number.isFinite(value) ? value : 0;
  };

  // ---------- Enrollment Summary ----------
  const approvedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "approved"
  );
  const pendingCount = enrollments.filter(
    (enrollment) => enrollment.status === "pending"
  ).length;
  const rejectedCount = enrollments.filter(
    (enrollment) => enrollment.status === "rejected"
  ).length;
  const totalEnrolledCourses = approvedEnrollments.length;

  const totalCourseValue = approvedEnrollments.reduce(
    (total, enrollment) =>
      total + safePrice(enrollment.price),
    0
  );

  const averageCoursePrice =
    totalEnrolledCourses > 0
      ? totalCourseValue / totalEnrolledCourses
      : 0;

  const distinctCategories = new Set(
    approvedEnrollments
      .map((enrollment) => enrollment.category)
      .filter(Boolean)
  ).size;

  // ---------- Sorting ----------
  // Use a copy so the original API array is not modified.
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    switch (sortOption) {
      case "newest":
        return (
          new Date(b.enrolled_at || 0) -
          new Date(a.enrolled_at || 0)
        );

      case "oldest":
        return (
          new Date(a.enrolled_at || 0) -
          new Date(b.enrolled_at || 0)
        );

      case "price-high":
        return safePrice(b.price) - safePrice(a.price);

      case "price-low":
        return safePrice(a.price) - safePrice(b.price);

      case "title":
        return String(a.title || "").localeCompare(
          String(b.title || ""),
          undefined,
          { sensitivity: "base" }
        );

      default:
        return 0;
    }
  });

  // Format date
  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString();
  };

  return (
    <>
      <Navbar />

      <div className="container">

        {/* ---------- Page Header ---------- */}
        <div className="page-header">

          <div>
            <h1>My Enrollments</h1>

            <p className="page-subtitle">
              {user?.full_name
                ? `${user.full_name}, track your enrollment requests and decisions here.`
                : "Track your enrollment requests and decisions here."}
            </p>
          </div>

          <Link to="/courses" className="btn btn-primary">
            <FaSearch />
            Browse More Courses
          </Link>

        </div>

        {/* ---------- Loading ---------- */}
        {loading && (
          <p className="loading">
            Loading your enrollments...
          </p>
        )}

        {/* ---------- Error ---------- */}
        {error && !loading && (
          <p className="error">
            {error}
          </p>
        )}

        {success && !loading && (
  <p className="success">
    {success}
  </p>
)}

        {/* ---------- Enrollment Summary ---------- */}
        {!loading && !error && (
          <div className="enrollment-summary">

            <div className="summary-card">
              <h3>Approved Enrollments</h3>
              <p>{totalEnrolledCourses}</p>
            </div>

            <div className="summary-card">
              <h3>Pending Requests</h3>
              <p>{pendingCount}</p>
            </div>

            <div className="summary-card">
              <h3>Rejected Requests</h3>
              <p>{rejectedCount}</p>
            </div>

            <div className="summary-card">
              <h3>Total Course Value</h3>
              <p>
                Rs. {totalCourseValue.toFixed(2)}
              </p>
            </div>

            <div className="summary-card">
              <h3>Average Course Price</h3>
              <p>
                Rs. {averageCoursePrice.toFixed(2)}
              </p>
            </div>

            <div className="summary-card">
              <h3>Categories</h3>
              <p>{distinctCategories}</p>
            </div>

          </div>
        )}

        {/* ---------- Sorting ---------- */}
        {!loading && !error && (
          <div className="enrollment-sort">

            <label htmlFor="sortOption">
              Sort By:
            </label>

            <select
              id="sortOption"
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value)
              }
            >
              <option value="newest">
                Newest Enrolled
              </option>

              <option value="oldest">
                Oldest Enrolled
              </option>

              <option value="price-high">
                Price: High to Low
              </option>

              <option value="price-low">
                Price: Low to High
              </option>

              <option value="title">
                Course Title: A to Z
              </option>
            </select>

          </div>
        )}

        {/* ---------- Empty State ---------- */}
        {!loading &&
          !error &&
          enrollments.length === 0 && (
            <div className="empty-box">

              <p className="empty">
                You have not requested enrollment in any courses yet.
              </p>

              <Link
                to="/courses"
                className="btn btn-primary"
              >
                <FaSearch />
                Find a Course
              </Link>

            </div>
          )}

        {/* ---------- Enrollment Cards ---------- */}
        {!loading &&
          !error &&
          sortedEnrollments.length > 0 && (

            <div className="course-grid">

              {sortedEnrollments.map((enrollment) => (

                <article
                  className="course-card"
                  key={enrollment.id}
                >

                  <img
                    src={enrollment.image}
                    alt={enrollment.title}
                    className="course-card-image"
                    loading="lazy"
                  />

                  <div className="course-card-body">

                    <div className="course-card-tags">

                      <span className="tag tag-category">
                        {enrollment.category}
                      </span>

                      <span className="tag tag-level">
                        {enrollment.level}
                      </span>

                    </div>

                    <h3 className="course-card-title">
                      {enrollment.title}
                    </h3>

                    <p className="course-card-summary">
                      {enrollment.description?.slice(0, 100)}
                      {enrollment.description?.length > 100
                        ? "..."
                        : ""}
                    </p>

                    <ul className="course-card-meta">

                      <li>
                        <strong>Duration:</strong>{" "}
                        {enrollment.duration}
                      </li>

                      <li>
                        <strong>Price:</strong>{" "}
                        Rs. {safePrice(enrollment.price).toFixed(2)}
                      </li>

                      <li>
                        <strong>Requested on:</strong>{" "}
                        {formatDate(enrollment.enrolled_at)}
                      </li>
                      <li>
                        <strong>Status:</strong>{" "}
                        <span className={`tag tag-status tag-status-${enrollment.status}`}>
                          {enrollment.status}
                        </span>
                      </li>
                      {enrollment.reviewed_at && (
                        <li>
                          <strong>Decision date:</strong>{" "}
                          {formatDate(enrollment.reviewed_at)}
                        </li>
                      )}
                      {enrollment.status === "rejected" &&
                        enrollment.decision_note && (
                          <li>
                            <strong>Rejection reason:</strong>{" "}
                            {enrollment.decision_note}
                          </li>
                        )}

                    </ul>

                    <Link
  to={`/courses/${enrollment.course_id}`}
  className="btn btn-outline btn-block"
>
  View Course
</Link>

{enrollment.status === "pending" && <button
  type="button"
  className="btn btn-danger btn-block"
  onClick={() =>
    handleCancelEnrollment(enrollment.id)
  }
  disabled={cancellingId === enrollment.id}
>
  {cancellingId === enrollment.id
    ? "Cancelling..."
    : "Cancel Request"}
</button>
}

                  </div>

                </article>

              ))}

            </div>
          )}

      </div>

      <Footer />
    </>
  );
}

export default MyEnrollments;
