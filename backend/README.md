GET    /api/courses
GET    /api/courses/:id

POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id

POST   /api/enrollments
GET    /api/enrollments/my
GET    /api/enrollments
GET    /api/enrollments/course/:courseId
DELETE /api/enrollments/:id

GET    /api/users/username/:username
GET    /api/users/:id

`GET /api/enrollments` is administrator-only and supports server-side
search, filtering, sorting, and pagination:

`q`, `courseId`, `from`, `to`, `sort` (`date`, `enrolled_at`, `student`,
or `course`), `order` (`asc` or `desc`), `page` (default `1`), and
`limit` (default `20`, maximum `100`). Dates use `YYYY-MM-DD`; the default
sort is enrollment date descending. The response includes `enrollments` and
`pagination` (`page`, `limit`, `total`, and `totalPages`).

New databases created from `schema.sql` include the enrollment date index.
For an existing database, apply
`migrations/001_add_enrollment_date_index.sql` once.
