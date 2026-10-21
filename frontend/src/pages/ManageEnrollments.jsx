import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function ManageEnrollments() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("enrolled_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadCourseOptions = async () => {
      try {
        const response = await api.get("/courses");
        setCourses(response.data.courses);
      } catch (loadError) {
        console.error("Could not load course options:", loadError.message);
      }
    };

    loadCourseOptions();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadEnrollments = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/enrollments", {
          params: {
            q: search,
            courseId: courseId || undefined,
            from: from || undefined,
            to: to || undefined,
            sort,
            order,
            page,
            limit,
          },
          signal: controller.signal,
        });

        setEnrollments(response.data.enrollments);
        setPagination(response.data.pagination);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError.response?.data?.message ||
              "Failed to load enrollments"
          );
          setEnrollments([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadEnrollments();
    return () => controller.abort();
  }, [search, courseId, from, to, sort, order, page, limit, reloadKey]);

  const resetPage = () => {
    setPage(1);
    setSuccess("");
  };

  const handleDelete = async (enrollment) => {
    const confirmed = window.confirm(
      `Remove ${enrollment.full_name || enrollment.username} from "${enrollment.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/enrollments/${enrollment.id}`);
      setSuccess(response.data.message);

      if (enrollments.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message ||
          "Could not delete the enrollment."
      );
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };

  const firstResult =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastResult = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );
  const selectedCourse = courses.find(
    (course) => String(course.id) === courseId
  );

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Manage Enrollments</h1>
            <p className="page-subtitle">
              Search, filter, and manage student enrollments.
            </p>
          </div>
        </div>

        <div className="filter-bar enrollment-filters">
          <div className="form-group">
            <label htmlFor="studentSearch">Search student</label>
            <input
              id="studentSearch"
              className="input"
              type="search"
              placeholder="Name or username"
              value={search}
              onChange={(event) => {
                resetPage();
                setSearch(event.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="courseFilter">Course</label>
            <select
              id="courseFilter"
              className="input"
              value={courseId}
              onChange={(event) => {
                resetPage();
                setCourseId(event.target.value);
              }}
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentFrom">From</label>
            <input
              id="enrollmentFrom"
              className="input"
              type="date"
              value={from}
              onChange={(event) => {
                resetPage();
                setFrom(event.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentTo">To</label>
            <input
              id="enrollmentTo"
              className="input"
              type="date"
              value={to}
              onChange={(event) => {
                resetPage();
                setTo(event.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentSort">Sort by</label>
            <select
              id="enrollmentSort"
              className="input"
              value={sort}
              onChange={(event) => {
                resetPage();
                setSort(event.target.value);
              }}
            >
              <option value="enrolled_at">Enrollment date</option>
              <option value="student">Student</option>
              <option value="course">Course</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentOrder">Order</label>
            <select
              id="enrollmentOrder"
              className="input"
              value={order}
              onChange={(event) => {
                resetPage();
                setOrder(event.target.value);
              }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentLimit">Per page</label>
            <select
              id="enrollmentLimit"
              className="input"
              value={limit}
              onChange={(event) => {
                resetPage();
                setLimit(Number(event.target.value));
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {success && <p className="success">{success}</p>}
        {error && <p className="error">{error}</p>}

        <section className="section-card">
          <div className="section-card-header">
            <h2>
              {selectedCourse
                ? `Enrollments in "${selectedCourse.title}"`
                : "All Enrollments"}
            </h2>
            <span>{pagination.total} total</span>
          </div>

          {loading && <p className="loading">Loading enrollments...</p>}

          {!loading && !error && enrollments.length === 0 && (
            <p className="empty">
              {pagination.total === 0
                ? "No enrollments match your search."
                : "There are no enrollments on this page."}
            </p>
          )}

          {!loading && enrollments.length > 0 && (
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
                    <th className="table-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
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
                      <td>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(enrollment)}
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="enrollment-pagination">
            <span>
              Showing {firstResult}–{lastResult} of {pagination.total}
            </span>
            <div className="enrollment-pagination-controls">
              <button
                type="button"
                className="btn btn-small"
                disabled={loading || pagination.page <= 1}
                onClick={() => setPage(1)}
              >
                First
              </button>
              <button
                type="button"
                className="btn btn-small"
                disabled={loading || pagination.page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-small"
                disabled={
                  loading ||
                  pagination.totalPages === 0 ||
                  pagination.page >= pagination.totalPages
                }
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
              <button
                type="button"
                className="btn btn-small"
                disabled={
                  loading ||
                  pagination.totalPages === 0 ||
                  pagination.page >= pagination.totalPages
                }
                onClick={() => setPage(pagination.totalPages)}
              >
                Last
              </button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default ManageEnrollments;
