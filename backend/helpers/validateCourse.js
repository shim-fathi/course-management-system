const Course = require("../models/courseModel");

// FR-004: Allowed course levels
const VALID_LEVELS = ["Beginner", "Intermediate", "Advanced"];

// FR-005: "<positive integer> <Days|Weeks|Months>"
const DURATION_REGEX = /^(\d+)\s+(Days|Weeks|Months)$/i;

// FR-007: http/https URL
const URL_REGEX = /^https?:\/\/.+/i;


// ---------- Field level validators ----------
// Each validator receives the RAW value and returns:
//   { value: <trimmed/normalised value>, error: <string|null> }

function validateTitle(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    return { value, error: "Title is required" };
  }

  if (value.length < 3) {
    return { value, error: "Title must contain at least 3 characters" };
  }

  if (value.length > 100) {
    return { value, error: "Title must not exceed 100 characters" };
  }

  return { value, error: null };
}


function validateCategory(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    return { value, error: "Category is required" };
  }

  if (value.length < 2) {
    return { value, error: "Category must contain at least 2 characters" };
  }

  if (value.length > 50) {
    return { value, error: "Category must not exceed 50 characters" };
  }

  return { value, error: null };
}


function validateLevel(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    return { value, error: "Level is required" };
  }

  if (!VALID_LEVELS.includes(value)) {
    return {
      value,
      error: "Level must be one of: Beginner, Intermediate, Advanced",
    };
  }

  return { value, error: null };
}


function validateDuration(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    return { value, error: "Duration is required" };
  }

  const match = value.match(DURATION_REGEX);

  if (!match) {
    return {
      value,
      error:
        "Duration must be a positive number followed by Days, Weeks or Months (e.g. 8 Weeks)",
    };
  }

  const amount = Number(match[1]);

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      value,
      error: "Duration must start with a positive whole number",
    };
  }

  // Normalise casing, e.g. "8 weeks" -> "8 Weeks"
  const unit = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
  const normalised = `${amount} ${unit}`;

  return { value: normalised, error: null };
}


function validatePrice(rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return { value: null, error: "Price is required" };
  }

  const str = String(rawValue).trim();

  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    return { value: null, error: "Price must be a valid number" };
  }

  const numericValue = Number(str);

  if (numericValue < 0) {
    return { value: numericValue, error: "Price cannot be negative" };
  }

  if (numericValue > 1000000) {
    return { value: numericValue, error: "Price cannot exceed 1,000,000" };
  }

  const decimalMatch = str.match(/\.(\d+)$/);

  if (decimalMatch && decimalMatch[1].length > 2) {
    return {
      value: numericValue,
      error: "Price cannot contain more than two decimal places",
    };
  }

  return { value: numericValue, error: null };
}


function validateImage(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  // FR-007: Image is optional
  if (!value) {
    return { value: "", error: null };
  }

  if (value.length > 500) {
    return { value, error: "Image URL must not exceed 500 characters" };
  }

  if (!URL_REGEX.test(value)) {
    return { value, error: "Image must be a valid http:// or https:// URL" };
  }

  return { value, error: null };
}


function validateDescription(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  // FR-008: Description is optional
  if (!value) {
    return { value: "", error: null };
  }

  if (value.length > 1000) {
    return { value, error: "Description must not exceed 1,000 characters" };
  }

  return { value, error: null };
}


/**
 * Reusable server-side validation for course create/update.
 * Used by both POST /api/courses and PUT /api/courses/:id (FR-012).
 *
 * @param {object} input - raw request body
 * @param {object} options
 * @param {boolean} options.isUpdate - true when validating an update
 * @param {number|string} options.currentId - id of the course being updated
 * @returns {Promise<{ errors: object, data: object }>}
 */
async function validateCourse(input = {}, { isUpdate = false, currentId = null } = {}) {
  const errors = {};

  // FR-001: trim happens inside each validator
  const title = validateTitle(input.title);
  const category = validateCategory(input.category);
  const level = validateLevel(input.level);
  const duration = validateDuration(input.duration);
  const price = validatePrice(input.price);
  const image = validateImage(input.image);
  const description = validateDescription(input.description);

  if (title.error) errors.title = title.error;
  if (category.error) errors.category = category.error;
  if (level.error) errors.level = level.error;
  if (duration.error) errors.duration = duration.error;
  if (price.error) errors.price = price.error;
  if (image.error) errors.image = image.error;
  if (description.error) errors.description = description.error;

  // FR-009: Duplicate title check (only when title itself is otherwise valid)
  if (!errors.title) {
    const existingCourse = await Course.findByTitle(title.value);

    const isSameCourse =
      isUpdate &&
      existingCourse &&
      Number(existingCourse.id) === Number(currentId);

    if (existingCourse && !isSameCourse) {
      errors.title = "A course with this title already exists";
    }
  }

  return {
    errors,
    data: {
      title: title.value,
      category: category.value,
      level: level.value,
      duration: duration.value,
      price: price.value,
      image: image.value,
      description: description.value,
    },
  };
}

module.exports = validateCourse;
