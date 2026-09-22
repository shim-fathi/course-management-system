
import { useEffect, useState } from "react";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CourseCard from "../components/CourseCard";

function Courses() {
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------- CR-001 Filters ----------
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // ---------- Load courses ----------
  useEffect(() => {
    const getCourses = async () => {
      try {
        const response = await api.get("/courses");

        setCourses(response.data.courses || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load courses"
        );
      } finally {
        setLoading(false);
      }
    };

    getCourses();
  }, []);

  // ---------- Category list ----------
  const categories = [
    "All",
    ...new Set(
      courses
        .map((course) => course.category)
        .filter(Boolean)
    ),
  ];

  // ---------- Fixed level list ----------
  const levels = [
    "All",
    "Beginner",
    "Intermediate",
    "Advanced",
  ];

  // ---------- CR-001 Advanced Filtering ----------
  const filteredCourses = courses.filter((course) => {
    const search = searchText.trim().toLowerCase();

    /*
      Null-safe values.
      If description or duration is null,
      it becomes an empty string instead of causing an error.
    */
    const title = String(course.title || "").toLowerCase();
    const category = String(course.category || "").toLowerCase();
    const level = String(course.level || "").toLowerCase();
    const description = String(
      course.description || ""
    ).toLowerCase();
    const duration = String(
      course.duration || ""
    ).toLowerCase();

    // Search title, category, level, description and duration
    const matchesSearch =
      search === "" ||
      title.includes(search) ||
      category.includes(search) ||
      level.includes(search) ||
      description.includes(search) ||
      duration.includes(search);

    // Category filter
    const matchesCategory =
      selectedCategory === "All" ||
      course.category === selectedCategory;

    // Level filter
    const matchesLevel =
      selectedLevel === "All" ||
      course.level === selectedLevel;

    // Minimum price
    const matchesMinPrice =
      minPrice === "" ||
      Number(course.price) >= Number(minPrice);

    // Maximum price
    const matchesMaxPrice =
      maxPrice === "" ||
      Number(course.price) <= Number(maxPrice);

    /*
      AND logic:
      Course must satisfy ALL selected filters.
    */
    return (
      matchesSearch &&
      matchesCategory &&
      matchesLevel &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });

  // ---------- Check whether any filter is active ----------
  const hasActiveFilters =
    searchText.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedLevel !== "All" ||
    minPrice !== "" ||
    maxPrice !== "";

  // ---------- Clear All Filters ----------
  const clearAllFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <>
      <Navbar />

      <div className="container">

        {/* ---------- Page Header ---------- */}
        <div className="page-header">
          <div>
            <h1>Our Courses</h1>

            <p className="page-subtitle">
              Browse the full catalogue and find the
              course that suits you.
            </p>
          </div>
        </div>

        {/* ---------- CR-001 Filters ---------- */}
        {!loading && !error && courses.length > 0 && (
          <div className="filter-bar">

            {/* Search */}
            <input
              type="text"
              className="input"
              placeholder="Search title, category, level, description or duration..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />

            {/* Category */}
            <select
              className="input"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
            >
              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            {/* Level */}
            <select
              className="input"
              value={selectedLevel}
              onChange={(event) =>
                setSelectedLevel(event.target.value)
              }
            >
              {levels.map((level) => (
                <option
                  key={level}
                  value={level}
                >
                  {level}
                </option>
              ))}
            </select>

            {/* Minimum Price */}
            <input
              type="number"
              className="input"
              placeholder="Minimum price"
              min="0"
              value={minPrice}
              onChange={(event) =>
                setMinPrice(event.target.value)
              }
            />

            {/* Maximum Price */}
            <input
              type="number"
              className="input"
              placeholder="Maximum price"
              min="0"
              value={maxPrice}
              onChange={(event) =>
                setMaxPrice(event.target.value)
              }
            />

            {/* Clear All */}
            {hasActiveFilters && (
              <button
                type="button"
                className="clear-filter-btn"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* ---------- Active Filter Chips ---------- */}
        {!loading &&
          !error &&
          courses.length > 0 &&
          hasActiveFilters && (
            <div className="active-filters">

              <span className="active-filter-title">
                Active Filters:
              </span>

              {searchText.trim() !== "" && (
                <span className="filter-chip">
                  Search: {searchText}
                </span>
              )}

              {selectedCategory !== "All" && (
                <span className="filter-chip">
                  Category: {selectedCategory}
                </span>
              )}

              {selectedLevel !== "All" && (
                <span className="filter-chip">
                  Level: {selectedLevel}
                </span>
              )}

              {minPrice !== "" && (
                <span className="filter-chip">
                  Min Price: {minPrice}
                </span>
              )}

              {maxPrice !== "" && (
                <span className="filter-chip">
                  Max Price: {maxPrice}
                </span>
              )}
            </div>
          )}

        {/* ---------- Loading ---------- */}
        {loading && (
          <p className="loading">
            Loading courses...
          </p>
        )}

        {/* ---------- Error ---------- */}
        {error && !loading && (
          <p className="error">
            {error}
          </p>
        )}

        {/* ---------- No courses exist ---------- */}
        {!loading &&
          !error &&
          courses.length === 0 && (
            <p className="empty">
              There are no courses available at the moment.
            </p>
          )}

        {/* ---------- Courses exist but no match ---------- */}
        {!loading &&
          !error &&
          courses.length > 0 &&
          filteredCourses.length === 0 && (
            <p className="empty">
              No courses match your selected filters.
              Try changing or clearing your filters.
            </p>
          )}

        {/* ---------- Course list ---------- */}
        {!loading &&
          !error &&
          filteredCourses.length > 0 && (
            <>
              {/* Result Counter */}
              <p className="result-count">
                Showing {filteredCourses.length} of{" "}
                {courses.length} courses
              </p>

              <div className="course-grid">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                  />
                ))}
              </div>
            </>
          )}

      </div>

      <Footer />
    </>
  );
}

export default Courses;