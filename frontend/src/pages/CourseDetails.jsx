
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FaChartBar,
  FaGraduationCap,
  FaSignInAlt,
} from "react-icons/fa";

import api from "../services/api";
import { isLoggedIn, isStudent, isAdmin } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function CourseDetails() {

  const { id } = useParams();
  const location = useLocation();

  const [course, setCourse] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");


  // Read the login state from localStorage.
  const loggedIn = isLoggedIn();
  const studentLoggedIn = isStudent();
  const adminLoggedIn = isAdmin();


  // ---------- Availability ----------
  const getAvailability = () => {

    // Unlimited course
    if (
      course?.max_students === null ||
      course?.max_students === undefined ||
      course?.max_students === ""
    ) {
      return "Unlimited";
    }

    const maxStudents = Number(course.max_students);
    const enrolledCount = Number(course.enrolled_count || 0);

    // Course is full
    if (
      course.is_full === true ||
      enrolledCount >= maxStudents
    ) {
      return "Course Full";
    }

    // Limited course with available seats
    return `${enrolledCount} / ${maxStudents} students`;
  };


  const isCourseFull = () => {

    if (
      course?.max_students === null ||
      course?.max_students === undefined ||
      course?.max_students === ""
    ) {
      return false;
    }

    const maxStudents = Number(course.max_students);
    const enrolledCount = Number(course.enrolled_count || 0);

    return (
      course.is_full === true ||
      enrolledCount >= maxStudents
    );
  };


  // ---------- Load the course ----------
  useEffect(() => {

    const getCourse = async () => {

      try {

        const response = await api.get(`/courses/${id}`);

        const courseData = response.data;

        setCourse(courseData);


        // Check whether the logged-in student is already enrolled
        if (studentLoggedIn) {

          try {

            const enrollmentResponse =
              await api.get("/enrollments/my");

            const myEnrollments =
              enrollmentResponse.data.enrollments || [];

            const enrollment = myEnrollments.find(
              (enrollment) =>
                String(enrollment.course_id) === String(id)
            );

            setEnrollmentStatus(enrollment?.status || null);
            setDecisionNote(enrollment?.decision_note || "");

          } catch (error) {

            console.error(
              "Failed to check enrollment:",
              error
            );

          }
        }

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load course"
        );

      } finally {

        setLoading(false);

      }
    };

    getCourse();

  }, [id, studentLoggedIn]);


  // ---------- Enroll ----------
  const handleEnroll = async () => {

    setError("");
    setSuccess("");
    setEnrolling(true);

    try {

      const response = await api.post("/enrollments", {
        // The backend reads courseId from the request body
        courseId: id,
      });


      setSuccess(response.data.message);
      setEnrollmentStatus("pending");
      setDecisionNote("");


      // Refresh course availability after enrollment
      try {

        const updatedCourseResponse =
          await api.get(`/courses/${id}`);

        setCourse(updatedCourseResponse.data);

      } catch (refreshError) {

        console.error(
          "Failed to refresh course availability:",
          refreshError
        );

      }

    } catch (error) {

      if (error.response?.status === 409) {

        const message =
          error.response?.data?.message || "";

        setError(message);
        const status = message.toLowerCase().includes("pending")
          ? "pending"
          : "approved";
        setEnrollmentStatus(status);

      } else {

        setError(
          error.response?.data?.message ||
          "Enrollment failed. Please try again."
        );

      }

    } finally {

      setEnrolling(false);

    }
  };


  // ---------- Loading ----------
  if (loading) {

    return (
      <>
        <Navbar />

        <div className="container">

          <p className="loading">
            Loading course...
          </p>

        </div>
      </>
    );
  }


  // ---------- Course not found / server error ----------
  if (error && !course) {

    return (
      <>
        <Navbar />

        <div className="container">

          <p className="error">
            {error}
          </p>

          <div className="center-actions">

            <Link
              to="/courses"
              className="btn btn-primary"
            >
              Back to Courses
            </Link>

          </div>

        </div>

        <Footer />
      </>
    );
  }


  return (

    <>
      <Navbar />

      <div className="container">

        {/* Breadcrumb */}
        <p className="breadcrumb">

          <Link to="/courses">
            Courses
          </Link>

          <span> / </span>

          <span>
            {course.title}
          </span>

        </p>


        <div className="details-layout">

          {/* ---------- Left: image ---------- */}

          <div className="details-image-wrapper">

            <img
              src={course.image}
              alt={course.title}
              className="details-image"
            />

          </div>


          {/* ---------- Right: information ---------- */}

          <div className="details-info">

            <div className="course-card-tags">

              <span className="tag tag-category">
                {course.category}
              </span>

              <span className="tag tag-level">
                {course.level}
              </span>

            </div>


            <h1>
              {course.title}
            </h1>


            <p className="details-description">
              {course.description}
            </p>


            <dl className="details-list">

              <div>
                <dt>Category</dt>

                <dd>
                  {course.category}
                </dd>
              </div>


              <div>
                <dt>Level</dt>

                <dd>
                  {course.level}
                </dd>
              </div>


              <div>
                <dt>Duration</dt>

                <dd>
                  {course.duration}
                </dd>
              </div>


              <div>
                <dt>Price</dt>

                <dd className="details-price">
                  Rs. {course.price}
                </dd>
              </div>


              {/* ---------- Course Availability ---------- */}

              <div>
                <dt>Availability</dt>

                <dd
                  className={
                    isCourseFull()
                      ? "course-full"
                      : "course-available"
                  }
                >
                  {getAvailability()}
                </dd>
              </div>

            </dl>


            {/* ---------- Messages ---------- */}

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


            {/* ---------- Action area (role based) ---------- */}

            <div className="details-actions">


              {/* Not logged in */}

              {!loggedIn && (

                <div className="notice">

                  <p>
                    Please login as a student to enroll
                    in this course.
                  </p>

                  <Link
                    to="/login"
                    state={{
                      from: location.pathname
                    }}
                    className="btn btn-primary"
                  >
                    <FaSignInAlt />

                    Login to Enroll
                  </Link>

                </div>
              )}


              {/* Logged in as a student */}

              {studentLoggedIn && (

                <>

                  {!["pending", "approved"].includes(enrollmentStatus) && (

                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >

                      <FaGraduationCap />

                      {enrolling
                        ? "Submitting..."
                        : enrollmentStatus === "rejected"
                          ? "Request Enrollment Again"
                          : "Request Enrollment"}

                    </button>
                  )}

                  {enrollmentStatus === "pending" && (
                    <p className="notice">
                      Request Pending Approval
                    </p>
                  )}

                  {enrollmentStatus === "approved" && (
                    <p className="success">Enrollment Approved</p>
                  )}

                  {enrollmentStatus === "rejected" && (
                    <div className="error">
                      <strong>Enrollment Rejected</strong>
                      {decisionNote && <p>Reason: {decisionNote}</p>}
                    </div>
                  )}


                  <Link
                    to="/my-enrollments"
                    className="btn btn-outline"
                  >

                    <FaGraduationCap />

                    My Enrollments

                  </Link>

                </>
              )}


              {/* Logged in as an admin */}

              {adminLoggedIn && (

                <div className="notice">

                  <p>
                    You are logged in as an administrator.
                    Only students can enroll in courses.
                  </p>

                  <Link
                    to="/admin/courses"
                    className="btn btn-primary"
                  >

                    <FaChartBar />

                    Manage Courses

                  </Link>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      <Footer />

    </>
  );
}

export default CourseDetails;
