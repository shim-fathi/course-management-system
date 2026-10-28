# Course Management System — Frontend

React + Vite frontend for the Course Management System backend.

## 1. Start the backend first

The frontend talks to `http://localhost:3000/api`.

```cmd
cd ..\backend
node server.js
```

You should see:

```
Server running on port 3000
MySQL database connected
```

## 2. Start the frontend

```cmd
cd frontend
npm install
npm run dev
```

Vite opens on **http://localhost:5173**.

## 3. Demo accounts

All seeded users use the same password.

| Username | Password   | Role    |
| -------- | ---------- | ------- |
| admin    | `admin123` | admin   |
| kamal    | `admin123` | student |
| nimal    | `admin123` | student |
| saman    | `admin123` | student |

## 4. Routes

| Route                 | Access          | Page               |
| --------------------- | --------------- | ------------------ |
| `/`                   | public          | Home / landing     |
| `/courses`            | public          | Courses            |
| `/courses/:id`        | public          | Course details     |
| `/login`              | public          | Login              |
| `/student`            | student only    | Student dashboard  |
| `/my-enrollments`     | student only    | My enrollments     |
| `/profile`            | authenticated   | Profile and password |
| `/admin`              | admin only      | Admin dashboard    |
| `/admin/courses`      | admin only      | Manage courses     |
| `/admin/enrollments`  | admin only      | Manage enrollments |
| anything else         | public          | 404 page           |

## 5. Folder structure

```
src/
├── assets/                 images used by the pages
├── components/
│   ├── Navbar.jsx          responsive nav, role based menu
│   ├── ProtectedRoute.jsx  login + role guard for routes
│   ├── CourseCard.jsx      reused on Home and Courses
│   └── Footer.jsx
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Courses.jsx
│   ├── CourseDetails.jsx
│   ├── StudentDashboard.jsx
│   ├── MyEnrollments.jsx
│   ├── Profile.jsx
│   ├── AdminDashboard.jsx
│   ├── ManageCourses.jsx
│   ├── ManageEnrollments.jsx
│   └── NotFound.jsx
├── services/
│   ├── api.js              one Axios instance + JWT interceptor
│   └── auth.js             all localStorage / token helpers
├── App.jsx                 all routes
├── App.css                 all styles
├── index.css               base reset
└── main.jsx                React entry point
```

## 6. How authentication works

1. `POST /api/auth/login` returns `{ message, token, user }`.
2. `auth.js` saves both in `localStorage`.
3. `api.js` has a **request interceptor** that adds
   `Authorization: Bearer <token>` to every request automatically.
4. `ProtectedRoute.jsx` blocks pages the user is not allowed to see.
5. `Navbar.jsx` shows different links for guests, students and admins.
6. `Logout` clears both values with `clearAuth()`.

> The frontend guard is only for user experience. The backend verifies the
> JWT and the role again on every protected request.

## 7. Backend endpoints used

| Method | Endpoint                          | Used by                            |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | `/api/auth/login`                 | Login                              |
| GET    | `/api/users/me`                   | Load own profile                  |
| PUT    | `/api/users/me`                   | Update own full name              |
| PUT    | `/api/users/me/password`          | Change own password               |
| GET    | `/api/courses`                    | Home, Courses, Manage Courses      |
| GET    | `/api/courses/stats`              | Home, dashboards                   |
| GET    | `/api/courses/:id`                | Course details                     |
| POST   | `/api/courses`                    | Manage courses (admin)             |
| PUT    | `/api/courses/:id`                | Manage courses (admin)             |
| DELETE | `/api/courses/:id`                | Manage courses (admin)             |
| POST   | `/api/enrollments`                | Course details (student)           |
| GET    | `/api/enrollments/my`             | Student dashboard, My enrollments  |
| GET    | `/api/enrollments`                | Admin dashboard, Manage enrollments|
| GET    | `/api/enrollments/course/:id`     | Manage enrollments (admin)         |
| DELETE | `/api/enrollments/:id`            | Manage enrollments (admin)         |

## 8. Build for production

```cmd
npm run build
npm run preview
```

## 9. Lint

```cmd
npm run lint
```
