import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const EMPTY_COURSE = {
  title: "",
  category: "",
  level: "Beginner",
  duration: "",
  price: "",
  image: "",
  description: "",
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

// Load the course list
async function fetchAllCourses() {
  const response = await api.get("/courses");
  return response.data.courses;
}

function ManageCourses() {
  const [courses, setCourses] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form visibility + editing course
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // Load courses
  // --------------------------------------------------
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await fetchAllCourses();
        setCourses(data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load courses"
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // --------------------------------------------------
  // Refresh courses
  // --------------------------------------------------
  const refreshCourses = async () => {
    const data = await fetchAllCourses();
    setCourses(data);
  };

  // --------------------------------------------------
  // Filter + Sort
  // --------------------------------------------------
  const filteredAndSortedCourses = courses
    .filter((course) => {
      const search = searchTerm.toLowerCase().trim();

      if (!search) {
        return true;
      }

      return (
        String(course.id || "")
          .toLowerCase()
          .includes(search) ||
        String(course.title || "")
          .toLowerCase()
          .includes(search) ||
        String(course.category || "")
          .toLowerCase()
          .includes(search)
      );
    })
    .filter((course) => {
      if (categoryFilter === "All") {
        return true;
      }

      return course.category === categoryFilter;
    })
    .filter((course) => {
      if (levelFilter === "All") {
        return true;
      }

      return course.level === levelFilter;
    })
    .sort((a, b) => {
      if (!sortField) {
        return 0;
      }

      let valueA = a[sortField];
      let valueB = b[sortField];

      if (sortField === "price" || sortField === "id") {
        valueA = Number(valueA);
        valueB = Number(valueB);
      } else {
        valueA = String(valueA || "").toLowerCase();
        valueB = String(valueB || "").toLowerCase();
      }

      if (valueA < valueB) {
        return sortDirection === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return sortDirection === "asc" ? 1 : -1;
      }

      return 0;
    });

  // --------------------------------------------------
  // Sort
  // --------------------------------------------------
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(
        sortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // --------------------------------------------------
  // Reset filters
  // --------------------------------------------------
  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setLevelFilter("All");
    setSortField("");
    setSortDirection("asc");
  };

  // --------------------------------------------------
  // Form input change
  // --------------------------------------------------
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Remove field error when user starts fixing it
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: undefined,
      });
    }
  };

  // --------------------------------------------------
  // Open Add Form
  // --------------------------------------------------
  const openAddForm = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  // --------------------------------------------------
  // Open Edit Form
  // --------------------------------------------------
  const openEditForm = (course) => {
    setShowForm(true);
    setEditingId(course.id);

    setFormData({
      title: course.title || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      price: String(course.price ?? ""),
      image: course.image || "",
      description: course.description || "",
    });

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  // --------------------------------------------------
  // Close Form
  // --------------------------------------------------
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
  };

  // --------------------------------------------------
  // Create / Update Course
  // --------------------------------------------------
  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");

    // Basic client-side validation
    if (
      !formData.title.trim() ||
      !formData.category.trim() ||
      !formData.level ||
      !formData.duration.trim() ||
      formData.price === ""
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    // Backend payload
    const coursePayload = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      level: formData.level,
      duration: formData.duration.trim(),
      price: Number(formData.price),
      image: formData.image.trim(),
      description: formData.description.trim(),
    };

    setSaving(true);

    try {
      if (editingId) {
        // Update
        const response = await api.put(
          `/courses/${editingId}`,
          coursePayload
        );

        setSuccess(
          response.data.message || "Course updated successfully."
        );
      } else {
        // Create
        const response = await api.post(
          "/courses",
          coursePayload
        );

        setSuccess(
          response.data.message || "Course created successfully."
        );
      }

      closeForm();

      // Reload latest courses
      await refreshCourses();
    } catch (error) {
      const serverErrors = error.response?.data?.errors;

      if (
        serverErrors &&
        Object.keys(serverErrors).length > 0
      ) {
        setFieldErrors(serverErrors);
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(
          error.response?.data?.message ||
            "Could not save the course. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Delete Course
  // --------------------------------------------------
  const handleDelete = async (course) => {
    const confirmed = window.confirm(
      `Delete "${course.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/courses/${course.id}`
      );

      setSuccess(
        response.data.message || "Course deleted successfully."
      );

      await refreshCourses();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Could not delete the course."
      );
    }
  };

  // --------------------------------------------------
  // JSX
  // --------------------------------------------------
  return (
    <>
      <Navbar />

      <div className="container">
        {/* ================= PAGE HEADER ================= */}
        <div className="page-header">
          <div>
            <h1>Manage Courses</h1>

            <p className="page-subtitle">
              Add new courses, update the existing ones, or
              remove courses that are no longer offered.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={
              showForm ? closeForm : openAddForm
            }
          >
            {showForm ? <FaTimes /> : <FaPlus />}

            {showForm ? "Cancel" : "Add Course"}
          </button>
        </div>

        {/* ================= FILTER BAR ================= */}
        <div className="filter-bar">
          <input
            type="text"
            className="input"
            placeholder="Search by title, category or course ID"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

          <select
            className="input"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value)
            }
          >
            <option value="All">
              All Categories
            </option>

            {[
              ...new Set(
                courses
                  .map((course) => course.category)
                  .filter(Boolean)
              ),
            ].map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value)
            }
          >
            <option value="All">
              All Levels
            </option>

            {LEVEL_OPTIONS.map((level) => (
              <option
                key={level}
                value={level}
              >
                {level}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="clear-filter-btn"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>

        {/* ================= RESULT COUNTER ================= */}
        <p className="result-counter">
          Showing {filteredAndSortedCourses.length} of{" "}
          {courses.length} courses
        </p>

        {/* ================= SUCCESS / ERROR ================= */}
        {success && (
          <p className="success">
            {success}
          </p>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {/* ================= ADD / EDIT FORM ================= */}
        {showForm && (
          <section className="section-card">
            <div className="section-card-header">
              <h2>
                {editingId
                  ? "Edit Course"
                  : "New Course"}
              </h2>
            </div>

            <form
              className="form"
              onSubmit={handleSubmit}
            >
              {/* Title + Category */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">
                    Title *
                  </label>

                  <input
                    id="title"
                    className={`input${
                      fieldErrors.title
                        ? " input-invalid"
                        : ""
                    }`}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. React"
                  />

                  {fieldErrors.title && (
                    <p className="field-error">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="category">
                    Category *
                  </label>

                  <input
                    id="category"
                    className={`input${
                      fieldErrors.category
                        ? " input-invalid"
                        : ""
                    }`}
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Frontend"
                  />

                  {fieldErrors.category && (
                    <p className="field-error">
                      {fieldErrors.category}
                    </p>
                  )}
                </div>
              </div>

              {/* Level + Duration + Price */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="level">
                    Level *
                  </label>

                  <select
                    id="level"
                    className={`input${
                      fieldErrors.level
                        ? " input-invalid"
                        : ""
                    }`}
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                  >
                    {LEVEL_OPTIONS.map(
                      (level) => (
                        <option
                          key={level}
                          value={level}
                        >
                          {level}
                        </option>
                      )
                    )}
                  </select>

                  {fieldErrors.level && (
                    <p className="field-error">
                      {fieldErrors.level}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="duration">
                    Duration *
                  </label>

                  <input
                    id="duration"
                    className={`input${
                      fieldErrors.duration
                        ? " input-invalid"
                        : ""
                    }`}
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 10 Weeks"
                  />

                  {fieldErrors.duration && (
                    <p className="field-error">
                      {fieldErrors.duration}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="price">
                    Price (Rs.) *
                  </label>

                  <input
                    id="price"
                    className={`input${
                      fieldErrors.price
                        ? " input-invalid"
                        : ""
                    }`}
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 25000"
                  />

                  {fieldErrors.price && (
                    <p className="field-error">
                      {fieldErrors.price}
                    </p>
                  )}
                </div>
              </div>

              {/* Image */}
              <div className="form-group">
                <label htmlFor="image">
                  Image URL
                </label>

                <input
                  id="image"
                  className={`input${
                    fieldErrors.image
                      ? " input-invalid"
                      : ""
                  }`}
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://placehold.co/300x180?text=React"
                />

                {fieldErrors.image && (
                  <p className="field-error">
                    {fieldErrors.image}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  className={`input${
                    fieldErrors.description
                      ? " input-invalid"
                      : ""
                  }`}
                  rows="4"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short summary of what students will learn."
                />

                {fieldErrors.description && (
                  <p className="field-error">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* Form error */}
              {formError && (
                <p className="error">
                  {formError}
                </p>
              )}

              {/* Form buttons */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Course"
                    : "Create Course"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ================= COURSE TABLE ================= */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>
              All Courses
              {courses.length > 0
                ? ` (${courses.length})`
                : ""}
            </h2>

            <Link
              to="/admin/enrollments"
              className="link-inline"
            >
              <FaEye />
              Manage enrollments
            </Link>
          </div>

          {/* Loading */}
          {loading && (
            <p className="loading">
              Loading courses...
            </p>
          )}

          {/* No courses in database */}
          {!loading &&
            courses.length === 0 && (
              <p className="empty">
                No courses available.
              </p>
            )}

          {/* Courses exist but filters return nothing */}
          {!loading &&
            courses.length > 0 &&
            filteredAndSortedCourses.length === 0 && (
              <p className="empty">
                No courses match your search or filters.
              </p>
            )}

          {/* Course table */}
          {!loading &&
            filteredAndSortedCourses.length > 0 && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th
                        onClick={() =>
                          handleSort("id")
                        }
                      >
                        ID{" "}
                        {sortField === "id" &&
                          (sortDirection === "asc"
                            ? "↑"
                            : "↓")}
                      </th>

                      <th>Image</th>

                      <th
                        onClick={() =>
                          handleSort("title")
                        }
                      >
                        Title{" "}
                        {sortField === "title" &&
                          (sortDirection === "asc"
                            ? "↑"
                            : "↓")}
                      </th>

                      <th
                        onClick={() =>
                          handleSort("category")
                        }
                      >
                        Category{" "}
                        {sortField === "category" &&
                          (sortDirection === "asc"
                            ? "↑"
                            : "↓")}
                      </th>

                      <th
                        onClick={() =>
                          handleSort("level")
                        }
                      >
                        Level{" "}
                        {sortField === "level" &&
                          (sortDirection === "asc"
                            ? "↑"
                            : "↓")}
                      </th>

                      <th
                        onClick={() =>
                          handleSort("duration")
                        }
                      >
                        Duration{" "}
                        {sortField === "duration" &&
                          (sortDirection === "asc"
                            ? "↑"
                            : "↓")}
                      </th>

                      <th
                        onClick={() =>
                          handleSort("price")
                        }
                      >
                        Price{" "}
                        {sortField === "price" &&
                          (sortDirection === "asc"
                            ? "↑"
                            : "↓")}
                      </th>

                      <th className="table-actions-column">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAndSortedCourses.map(
                      (course) => (
                        <tr key={course.id}>
                          <td>{course.id}</td>

                          <td>
                            <img
                              src={
                                course.image ||
                                "https://placehold.co/80x50?text=No+Image"
                              }
                              alt={course.title}
                              className="table-thumb"
                            />
                          </td>

                          <td>
                            {course.title}
                          </td>

                          <td>
                            {course.category}
                          </td>

                          <td>
                            <span className="tag tag-level">
                              {course.level}
                            </span>
                          </td>

                          <td>
                            {course.duration}
                          </td>

                          <td>
                            Rs. {course.price}
                          </td>

                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-small btn-outline"
                                onClick={() =>
                                  openEditForm(
                                    course
                                  )
                                }
                              >
                                <FaEdit />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-small btn-danger"
                                onClick={() =>
                                  handleDelete(
                                    course
                                  )
                                }
                              >
                                <FaTrash />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </div>

      <Footer />
    </>
  );
}

export default ManageCourses;