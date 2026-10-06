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
  max_students: "",
};

const LEVEL_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

// =====================================================
// GET ALL COURSES
// =====================================================
async function fetchAllCourses() {
  const response = await api.get("/courses");

  // Backend returns array directly
  if (Array.isArray(response.data)) {
    return response.data;
  }

  // Also support { courses: [...] }
  if (Array.isArray(response.data?.courses)) {
    return response.data.courses;
  }

  return [];
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

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    ...EMPTY_COURSE,
  });

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ===================================================
  // LOAD COURSES
  // ===================================================
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await fetchAllCourses();
        setCourses(data);
      } catch (err) {
        console.error("Load courses error:", err);

        setError(
          err.response?.data?.message ||
            "Failed to load courses"
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // ===================================================
  // REFRESH COURSES
  // ===================================================
  const refreshCourses = async () => {
    try {
      const data = await fetchAllCourses();
      setCourses(data);
    } catch (err) {
      console.error("Refresh courses error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to refresh courses"
      );
    }
  };

  // ===================================================
  // AVAILABILITY
  // ===================================================
  const getAvailability = (course) => {
    const maxStudents = course?.max_students;

    // NULL / blank = Unlimited
    if (
      maxStudents === null ||
      maxStudents === undefined ||
      maxStudents === ""
    ) {
      return "Unlimited";
    }

    const max = Number(maxStudents);
    const enrolled = Number(
      course?.enrolled_count || 0
    );

    if (
      course?.is_full === true ||
      enrolled >= max
    ) {
      return "Course Full";
    }

    return `${enrolled} / ${max} students`;
  };

  // ===================================================
  // FILTER + SORT
  // ===================================================
  const filteredAndSortedCourses = [...courses]
    .filter((course) => {
      const search = searchTerm
        .toLowerCase()
        .trim();

      if (!search) return true;

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
      if (categoryFilter === "All") return true;

      return course.category === categoryFilter;
    })
    .filter((course) => {
      if (levelFilter === "All") return true;

      return course.level === levelFilter;
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      let valueA = a[sortField];
      let valueB = b[sortField];

      if (
        sortField === "price" ||
        sortField === "id" ||
        sortField === "max_students" ||
        sortField === "enrolled_count"
      ) {
        valueA = Number(valueA || 0);
        valueB = Number(valueB || 0);
      } else {
        valueA = String(valueA || "").toLowerCase();
        valueB = String(valueB || "").toLowerCase();
      }

      if (valueA < valueB) {
        return sortDirection === "asc"
          ? -1
          : 1;
      }

      if (valueA > valueB) {
        return sortDirection === "asc"
          ? 1
          : -1;
      }

      return 0;
    });

  // ===================================================
  // SORT
  // ===================================================
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ===================================================
  // RESET FILTERS
  // ===================================================
  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setLevelFilter("All");
    setSortField("");
    setSortDirection("asc");
  };

  // ===================================================
  // FORM CHANGE
  // ===================================================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  // ===================================================
  // OPEN CREATE FORM
  // ===================================================
  const openCreateForm = () => {
    setEditingId(null);

    setFormData({
      ...EMPTY_COURSE,
    });

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ===================================================
  // OPEN EDIT FORM
  // ===================================================
  const openEditForm = (course) => {
    setEditingId(course.id);

    setFormData({
      title: course.title || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      price:
        course.price === null ||
        course.price === undefined
          ? ""
          : String(course.price),
      image: course.image || "",
      description: course.description || "",

      // IMPORTANT:
      // Keep the actual capacity value
      max_students:
        course.max_students === null ||
        course.max_students === undefined
          ? ""
          : String(course.max_students),
    });

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ===================================================
  // CLOSE FORM
  // ===================================================
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);

    setFormData({
      ...EMPTY_COURSE,
    });

    setFormError("");
    setFieldErrors({});
  };

  // ===================================================
  // VALIDATE FORM
  // ===================================================
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.category.trim()) {
      errors.category = "Category is required";
    }

    if (!formData.level) {
      errors.level = "Level is required";
    }

    if (!formData.duration.trim()) {
      errors.duration = "Duration is required";
    }

    if (
      formData.price === "" ||
      formData.price === null ||
      formData.price === undefined
    ) {
      errors.price = "Price is required";
    } else if (
      Number.isNaN(Number(formData.price)) ||
      Number(formData.price) < 0
    ) {
      errors.price = "Price cannot be negative";
    }

    // ================================================
    // MAXIMUM STUDENTS
    // ================================================
    const maxStudents = String(
      formData.max_students ?? ""
    ).trim();

    if (maxStudents !== "") {
      if (!/^\d+$/.test(maxStudents)) {
        errors.max_students =
          "Maximum students must be a positive integer";
      } else if (
        parseInt(maxStudents, 10) <= 0
      ) {
        errors.max_students =
          "Maximum students must be a positive integer";
      }
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // ===================================================
  // SUBMIT FORM
  // ===================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setFormError("");

    if (!validateForm()) {
      setFormError(
        "Please correct the highlighted fields."
      );
      return;
    }

    setSaving(true);

    // ================================================
    // IMPORTANT CAPACITY CONVERSION
    // ================================================
    const maxStudentsText = String(
      formData.max_students ?? ""
    ).trim();

    const maxStudents =
      maxStudentsText === ""
        ? null
        : parseInt(maxStudentsText, 10);

    const payload = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      level: formData.level,
      duration: formData.duration.trim(),
      price: Number(formData.price),
      image: formData.image.trim(),
      description: formData.description.trim(),

      // NUMBER when supplied
      // NULL only when blank
      max_students: maxStudents,
    };

    // Debug
    console.log(
      "FINAL COURSE PAYLOAD:",
      payload
    );

    console.log(
      "FINAL MAX STUDENTS:",
      payload.max_students
    );

    try {
      if (editingId) {
        const response = await api.put(
          `/courses/${editingId}`,
          payload
        );

        setSuccess(
          response.data?.message ||
            "Course updated successfully"
        );
      } else {
        const response = await api.post(
          "/courses",
          payload
        );

        console.log(
          "CREATE RESPONSE:",
          response.data
        );

        console.log(
          "CREATED MAX STUDENTS:",
          response.data?.course?.max_students
        );

        setSuccess(
          response.data?.message ||
            "Course created successfully"
        );
      }

      closeForm();

      await refreshCourses();
    } catch (err) {
      console.error(
        "Save course error:",
        err
      );

      const responseData =
        err.response?.data;

      if (responseData?.errors) {
        setFieldErrors(
          responseData.errors
        );

        setFormError(
          responseData.message ||
            "Validation failed"
        );
      } else {
        setFormError(
          responseData?.message ||
            "Failed to save course"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // DELETE COURSE
  // ===================================================
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/courses/${id}`
      );

      setSuccess(
        response.data?.message ||
          "Course deleted successfully"
      );

      await refreshCourses();
    } catch (err) {
      console.error(
        "Delete course error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete course"
      );
    }
  };

  // ===================================================
  // CATEGORIES
  // ===================================================
  const categories = [
    "All",
    ...Array.from(
      new Set(
        courses
          .map((course) => course.category)
          .filter(Boolean)
      )
    ),
  ];

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <>
      <Navbar />

      <main className="manage-courses-page">
        <div className="page-header">
          <div>
            <h1>Manage Courses</h1>
            <p>
              Create, update and manage courses.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateForm}
          >
            <FaPlus />
            Add Course
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* =================================================
            COURSE FORM
        ================================================= */}
        {showForm && (
          <section className="form-card">
            <div className="form-card-header">
              <h2>
                {editingId
                  ? "Edit Course"
                  : "Add New Course"}
              </h2>
            </div>

            {formError && (
              <div className="alert alert-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">

                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title">
                    Course Title
                  </label>

                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                  />

                  {fieldErrors.title && (
                    <small className="field-error">
                      {fieldErrors.title}
                    </small>
                  )}
                </div>

                {/* Category */}
                <div className="form-group">
                  <label htmlFor="category">
                    Category
                  </label>

                  <input
                    id="category"
                    name="category"
                    type="text"
                    value={formData.category}
                    onChange={handleChange}
                  />

                  {fieldErrors.category && (
                    <small className="field-error">
                      {fieldErrors.category}
                    </small>
                  )}
                </div>

                {/* Level */}
                <div className="form-group">
                  <label htmlFor="level">
                    Level
                  </label>

                  <select
                    id="level"
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
                    <small className="field-error">
                      {fieldErrors.level}
                    </small>
                  )}
                </div>

                {/* Duration */}
                <div className="form-group">
                  <label htmlFor="duration">
                    Duration
                  </label>

                  <input
                    id="duration"
                    name="duration"
                    type="text"
                    value={formData.duration}
                    onChange={handleChange}
                  />

                  {fieldErrors.duration && (
                    <small className="field-error">
                      {fieldErrors.duration}
                    </small>
                  )}
                </div>

                {/* Price */}
                <div className="form-group">
                  <label htmlFor="price">
                    Price
                  </label>

                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                  />

                  {fieldErrors.price && (
                    <small className="field-error">
                      {fieldErrors.price}
                    </small>
                  )}
                </div>

                {/* =================================================
                    MAXIMUM STUDENTS
                ================================================= */}
                <div className="form-group">
                  <label htmlFor="max_students">
                    Maximum Students
                  </label>

                  <input
                    id="max_students"
                    name="max_students"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.max_students}
                    onChange={handleChange}
                    placeholder="Example: 30"
                  />

                  <small>
                    Leave blank for Unlimited.
                  </small>

                  {fieldErrors.max_students && (
                    <small className="field-error">
                      {fieldErrors.max_students}
                    </small>
                  )}
                </div>

                {/* Image */}
                <div className="form-group">
                  <label htmlFor="image">
                    Image URL
                  </label>

                  <input
                    id="image"
                    name="image"
                    type="text"
                    value={formData.image}
                    onChange={handleChange}
                  />
                </div>

                {/* Description */}
                <div className="form-group form-group-full">
                  <label htmlFor="description">
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows="5"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

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
                  className="btn btn-secondary"
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

        {/* =================================================
            FILTERS
        ================================================= */}
        <section className="filters-card">
          <div className="filter-group">
            <label htmlFor="search">
              Search
            </label>

            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search by ID, title or category"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="categoryFilter">
              Category
            </label>

            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >
              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="levelFilter">
              Level
            </label>

            <select
              id="levelFilter"
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All
              </option>

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
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetFilters}
          >
            Reset
          </button>
        </section>

        {/* =================================================
            COURSE TABLE
        ================================================= */}
        <section className="table-card">
          {loading ? (
            <p>Loading courses...</p>
          ) : filteredAndSortedCourses.length ===
            0 ? (
            <p>No courses found.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      onClick={() =>
                        handleSort("id")
                      }
                    >
                      ID
                    </th>

                    <th
                      onClick={() =>
                        handleSort("title")
                      }
                    >
                      Title
                    </th>

                    <th
                      onClick={() =>
                        handleSort("category")
                      }
                    >
                      Category
                    </th>

                    <th
                      onClick={() =>
                        handleSort("level")
                      }
                    >
                      Level
                    </th>

                    <th
                      onClick={() =>
                        handleSort("price")
                      }
                    >
                      Price
                    </th>

                    <th>
                      Availability
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAndSortedCourses.map(
                    (course) => {
                      const isLimited =
                        course.max_students !==
                          null &&
                        course.max_students !==
                          undefined &&
                        course.max_students !== "";

                      const isFull =
                        isLimited &&
                        (
                          course.is_full ===
                            true ||
                          Number(
                            course.enrolled_count ||
                              0
                          ) >=
                            Number(
                              course.max_students
                            )
                        );

                      return (
                        <tr
                          key={course.id}
                        >
                          <td>
                            {course.id}
                          </td>

                          <td>
                            <strong>
                              {course.title}
                            </strong>
                          </td>

                          <td>
                            {course.category}
                          </td>

                          <td>
                            {course.level}
                          </td>

                          <td>
                            Rs.{" "}
                            {course.price}
                          </td>

                          <td>
                            <span
                              className={
                                isFull
                                  ? "course-full"
                                  : "course-available"
                              }
                            >
                              {getAvailability(
                                course
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="table-actions">
                              <Link
                                to={`/courses/${course.id}`}
                                className="btn btn-secondary"
                              >
                                <FaEye />
                              </Link>

                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                  openEditForm(
                                    course
                                  )
                                }
                              >
                                <FaEdit />
                              </button>

                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() =>
                                  handleDelete(
                                    course.id
                                  )
                                }
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default ManageCourses;