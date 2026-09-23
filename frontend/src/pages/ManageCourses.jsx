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


// Load the course list.
async function fetchAllCourses() {
  const response = await api.get("/courses");

  return response.data.courses;
}


function ManageCourses() {

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form visibility + which course is being edited (null = adding new)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [formError, setFormError] = useState("");
  // CR-002: field-level validation errors returned by the server,
  // e.g. { title: "Title must contain at least 3 characters" }
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);


  // ---------- Load the course list once, when the page opens ----------
  useEffect(() => {

    const loadCourses = async () => {

      try {

        setCourses(await fetchAllCourses());

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


  // ---------- Reload the list after a create / update / delete ----------
  const refreshCourses = async () => {
    setCourses(await fetchAllCourses());
  };


  // ---------- Form helpers ----------

  const handleChange = (event) => {

    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear this field's error as soon as the admin starts fixing it.
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: undefined,
      });
    }
  };


  const openAddForm = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };


  const openEditForm = (course) => {
    setShowForm(true);
    setEditingId(course.id);

    // Fill the form with the existing course values.
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


  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
  };


  // ---------- Create / Update ----------
  const handleSubmit = async (event) => {

    // Stop the browser from reloading the page
    event.preventDefault();

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");


    // ---------- Lightweight client-side check ----------
    // This only gives instant feedback for empty required fields.
    // The server performs the authoritative validation (CR-002) and its
    // field-level messages are what get displayed below each input.
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


    // The backend expects price to be a number
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

        // ---------- Update an existing course ----------
        const response = await api.put(
          `/courses/${editingId}`,
          coursePayload
        );

        setSuccess(response.data.message);

      } else {

        // ---------- Create a new course ----------
        const response = await api.post("/courses", coursePayload);

        setSuccess(response.data.message);

      }

      closeForm();

      // Show fresh data from the backend
      await refreshCourses();

    } catch (error) {

      // 400 = the backend rejected the data (CR-002 structured response:
      // { message: "Validation failed", errors: { field: "message" } })
      const serverErrors = error.response?.data?.errors;

      if (serverErrors && Object.keys(serverErrors).length > 0) {
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


  // ---------- Delete ----------
  const handleDelete = async (course) => {

    // Always confirm before a destructive action
    const confirmed = window.confirm(
      `Delete "${course.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {

      const response = await api.delete(`/courses/${course.id}`);

      setSuccess(response.data.message);

      await refreshCourses();

    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Could not delete the course."
      );

    }
  };



  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Manage Courses</h1>

            <p className="page-subtitle">
              Add new courses, update the existing ones, or remove courses
              that are no longer offered.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={showForm ? closeForm : openAddForm}
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            {showForm ? "Cancel" : "Add Course"}
          </button>

        </div>


        {/* ---------- Success / error messages ---------- */}

        {success && <p className="success">{success}</p>}

        {error && <p className="error">{error}</p>}


        {/* ---------- Add / Edit form ---------- */}

        {showForm && (

          <section className="section-card">

            <div className="section-card-header">
              <h2>{editingId ? "Edit Course" : "New Course"}</h2>
            </div>


            <form className="form" onSubmit={handleSubmit}>

              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="title">Title *</label>

                  <input
                    id="title"
                    className={`input${fieldErrors.title ? " input-invalid" : ""}`}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. React"
                  />

                  {fieldErrors.title && (
                    <p className="field-error">{fieldErrors.title}</p>
                  )}
                </div>


                <div className="form-group">
                  <label htmlFor="category">Category *</label>

                  <input
                    id="category"
                    className={`input${fieldErrors.category ? " input-invalid" : ""}`}
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Frontend"
                  />

                  {fieldErrors.category && (
                    <p className="field-error">{fieldErrors.category}</p>
                  )}
                </div>

              </div>


              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="level">Level *</label>

                  <select
                    id="level"
                    className={`input${fieldErrors.level ? " input-invalid" : ""}`}
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>

                  {fieldErrors.level && (
                    <p className="field-error">{fieldErrors.level}</p>
                  )}
                </div>


                <div className="form-group">
                  <label htmlFor="duration">Duration *</label>

                  <input
                    id="duration"
                    className={`input${fieldErrors.duration ? " input-invalid" : ""}`}
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 10 Weeks"
                  />

                  {fieldErrors.duration && (
                    <p className="field-error">{fieldErrors.duration}</p>
                  )}
                </div>


                <div className="form-group">
                  <label htmlFor="price">Price (Rs.) *</label>

                  <input
                    id="price"
                    className={`input${fieldErrors.price ? " input-invalid" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 25000"
                  />

                  {fieldErrors.price && (
                    <p className="field-error">{fieldErrors.price}</p>
                  )}
                </div>

              </div>


              <div className="form-group">
                <label htmlFor="image">Image URL</label>

                <input
                  id="image"
                  className={`input${fieldErrors.image ? " input-invalid" : ""}`}
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://placehold.co/300x180?text=React"
                />

                {fieldErrors.image && (
                  <p className="field-error">{fieldErrors.image}</p>
                )}
              </div>


              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  className={`input${fieldErrors.description ? " input-invalid" : ""}`}
                  rows="4"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short summary of what students will learn."
                />

                {fieldErrors.description && (
                  <p className="field-error">{fieldErrors.description}</p>
                )}
              </div>


              {formError && <p className="error">{formError}</p>}


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



        {/* ---------- Course table ---------- */}

        <section className="section-card">

          <div className="section-card-header">
            <h2>All Courses{courses.length > 0 ? ` (${courses.length})` : ""}</h2>

            <Link to="/admin/enrollments" className="link-inline">
              <FaEye /> Manage enrollments
            </Link>
          </div>


          {loading && <p className="loading">Loading courses...</p>}


          {!loading && courses.length === 0 && (
            <p className="empty">
              No courses yet. Click "Add Course" to create the first one.
            </p>
          )}


          {!loading && courses.length > 0 && (

            <div className="table-wrapper">

              <table className="table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Duration</th>
                    <th>Price</th>
                    <th className="table-actions-column">Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {courses.map((course) => (

                    <tr key={course.id}>

                      <td>{course.id}</td>

                      <td>
                        <img
                          src={course.image}
                          alt={course.title}
                          className="table-thumb"
                        />
                      </td>

                      <td>{course.title}</td>

                      <td>{course.category}</td>

                      <td>
                        <span className="tag tag-level">
                          {course.level}
                        </span>
                      </td>

                      <td>{course.duration}</td>

                      <td>Rs. {course.price}</td>

                      <td>
                        <div className="table-actions">

                          <button
                            type="button"
                            className="btn btn-small btn-outline"
                            onClick={() => openEditForm(course)}
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(course)}
                          >
                            <FaTrash />
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>

                  ))}

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