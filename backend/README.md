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

GET    /api/users/me
PUT    /api/users/me
PUT    /api/users/me/password

The self-service profile routes require a valid JWT. Users can access their
own profile; the ID and username lookup routes are limited to the account owner
and administrators. Password changes are limited to five failed attempts per
account within a 15-minute window.
