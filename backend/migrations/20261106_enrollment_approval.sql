USE course_management;

ALTER TABLE enrollments
    ADD COLUMN status ENUM('pending', 'approved', 'rejected')
        NOT NULL DEFAULT 'approved' AFTER enrolled_at,
    ADD COLUMN reviewed_by INT NULL AFTER status,
    ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by,
    ADD COLUMN decision_note TEXT NULL AFTER reviewed_at,
    ADD CONSTRAINT fk_enrollments_reviewed_by
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

UPDATE enrollments
SET status = 'approved';

ALTER TABLE enrollments
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected')
        NOT NULL DEFAULT 'pending';
