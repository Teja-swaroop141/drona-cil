-- =============================================================
-- dronacilFV_db — Full MySQL 8.0 Schema
-- Converted from 21 Supabase/PostgreSQL migrations
-- Run: mysql -u root -p < schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS dronacilFV_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dronacilFV_db;

-- =============================================================
-- USERS TABLE (replaces Supabase auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  email_confirmed_at DATETIME NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expires DATETIME NULL
);

-- =============================================================
-- PROFILES TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL DEFAULT '',
  email        VARCHAR(255) NOT NULL,
  first_name   VARCHAR(100) NULL,
  last_name    VARCHAR(100) NULL,
  gender       VARCHAR(20)  NULL CHECK (gender IN ('male', 'female', 'other')),
  designation  VARCHAR(100) NULL,
  phone_number VARCHAR(20)  NULL,
  prefix       VARCHAR(20)  NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================
-- USER_ROLES TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id         CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  role       ENUM('admin', 'moderator', 'user') NOT NULL DEFAULT 'user',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- =============================================================
-- COURSES TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS courses (
  id             CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  title          VARCHAR(255)   NOT NULL,
  description    TEXT           NOT NULL,
  image_url      VARCHAR(500)   NULL,
  instructor     VARCHAR(255)   NOT NULL,
  duration       VARCHAR(50)    NOT NULL,
  level          VARCHAR(20)    NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  category       VARCHAR(100)   NOT NULL,
  price          DECIMAL(10,2)  DEFAULT 0,
  enrolled_count INT            DEFAULT 0,
  rating         DECIMAL(2,1)   DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================
-- COURSE_MODULES TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS course_modules (
  id                      CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  course_id               CHAR(36)     NOT NULL,
  title                   VARCHAR(255) NOT NULL,
  description             TEXT         NULL,
  order_number            INT          NOT NULL,
  duration                VARCHAR(50)  NOT NULL,
  is_preview              TINYINT(1)   DEFAULT 0,
  video_url               VARCHAR(500) NULL,
  has_quiz                TINYINT(1)   DEFAULT 0,
  pass_percentage         INT          NULL DEFAULT 70,
  total_questions         INT          NULL DEFAULT 0,
  requires_passing        TINYINT(1)   NULL DEFAULT 0,
  allow_retries           TINYINT(1)   NULL DEFAULT 1,
  show_score_after_submission TINYINT(1) NULL DEFAULT 1,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);

-- =============================================================
-- COURSE_ROADMAP_ITEMS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS course_roadmap_items (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  course_id    CHAR(36)     NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT         NULL,
  order_number INT          NOT NULL,
  duration     VARCHAR(50)  NULL,
  item_type    VARCHAR(50)  NOT NULL DEFAULT 'milestone',
  icon         VARCHAR(50)  DEFAULT 'circle',
  is_required  TINYINT(1)   DEFAULT 1,
  video_url    VARCHAR(500) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_roadmap_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_course_roadmap_items_course_id ON course_roadmap_items(course_id);
CREATE INDEX idx_course_roadmap_items_order ON course_roadmap_items(course_id, order_number);

-- =============================================================
-- USER_ENROLLMENTS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS user_enrollments (
  id          CHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36)   NOT NULL,
  course_id   CHAR(36)   NOT NULL,
  enrolled_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  progress    INT        DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed   TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_enrollment (user_id, course_id),
  CONSTRAINT fk_enrollments_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- =============================================================
-- USER_MODULE_PROGRESS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS user_module_progress (
  id           CHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id      CHAR(36)   NOT NULL,
  module_id    CHAR(36)   NOT NULL,
  completed    TINYINT(1) DEFAULT 0,
  completed_at DATETIME   NULL,
  created_at   DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_module_progress (user_id, module_id),
  CONSTRAINT fk_progress_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

-- =============================================================
-- QUIZ_QUESTIONS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  module_id      CHAR(36)     NOT NULL,
  question_text  TEXT         NOT NULL,
  option_a       TEXT         NOT NULL,
  option_b       TEXT         NOT NULL,
  option_c       TEXT         NOT NULL,
  option_d       TEXT         NOT NULL,
  correct_answer CHAR(1)      NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  order_number   INT          NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_quiz_questions_module_id ON quiz_questions(module_id);

-- =============================================================
-- QUIZ_ATTEMPTS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id         CHAR(36)  NOT NULL,
  module_id       CHAR(36)  NOT NULL,
  score           INT       NOT NULL,
  total_questions INT       NOT NULL,
  passed          TINYINT(1) NOT NULL,
  answers         JSON      NOT NULL,
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attempts_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_quiz_attempts_user_module ON quiz_attempts(user_id, module_id);

-- =============================================================
-- CONTACT_REQUESTS TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS contact_requests (
  id                 CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  audience           VARCHAR(50)  NOT NULL,
  full_name          VARCHAR(255) NULL,
  email              VARCHAR(255) NOT NULL,
  phone_number       VARCHAR(20)  NULL,
  organization       VARCHAR(255) NULL,
  requirement        TEXT         NOT NULL,
  consent_to_contact TINYINT(1)   NOT NULL DEFAULT 1,
  status             VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contact_requests_created_at ON contact_requests(created_at DESC);
CREATE INDEX idx_contact_requests_audience   ON contact_requests(audience);
CREATE INDEX idx_contact_requests_status     ON contact_requests(status);

-- =============================================================
-- SAMPLE DATA — Courses (from original migrations)
-- =============================================================
INSERT INTO courses (title, description, image_url, instructor, duration, level, category, price, rating) VALUES
('Hindi for Beginners', 'Master the basics of Hindi language with interactive lessons, pronunciation guides, and cultural insights. Perfect for absolute beginners.', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800', 'Dr. Priya Sharma', '8 weeks', 'beginner', 'Hindi', 2999.00, 4.8),
('Advanced Sanskrit Grammar', 'Deep dive into Sanskrit grammar, syntax, and classical texts. Learn to read and understand ancient Indian literature.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800', 'Prof. Rajesh Kumar', '12 weeks', 'advanced', 'Sanskrit', 3999.00, 4.9),
('Bengali Speaking & Writing', 'Comprehensive course covering Bengali script, conversation, and literature. Includes audio lessons and practice exercises.', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', 'Ananya Chatterjee', '10 weeks', 'intermediate', 'Bengali', 2499.00, 4.7),
('Tamil Literature & Culture', 'Explore Tamil language through its rich literary tradition. Learn classical and modern Tamil with cultural context.', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', 'Dr. Meena Sundaram', '10 weeks', 'intermediate', 'Tamil', 2799.00, 4.6),
('Telugu Conversational Skills', 'Focus on practical Telugu conversation for everyday situations. Includes role-plays and real-world scenarios.', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 'Venkat Reddy', '6 weeks', 'beginner', 'Telugu', 1999.00, 4.5),
('Marathi for Business', 'Professional Marathi course designed for business communication, presentations, and formal correspondence.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800', 'Sandeep Kulkarni', '8 weeks', 'intermediate', 'Marathi', 3499.00, 4.8),
('Kannada Script Mastery', 'Learn to read and write Kannada script from scratch. Includes handwriting practice and digital typing skills.', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800', 'Lakshmi Narayana', '6 weeks', 'beginner', 'Kannada', 1799.00, 4.4),
('Urdu Poetry & Literature', 'Appreciate the beauty of Urdu through its rich poetic tradition. Learn classical and contemporary Urdu literature.', 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800', 'Dr. Farah Ahmed', '12 weeks', 'advanced', 'Urdu', 3799.00, 4.9),
('Punjabi Folk & Modern', 'Experience Punjabi language through folk traditions and modern usage. Includes music and cultural elements.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'Harpreet Singh', '8 weeks', 'intermediate', 'Punjabi', 2599.00, 4.6),
('Malayalam Advanced Reading', 'Enhance your Malayalam reading skills with newspapers, novels, and academic texts. Focus on comprehension.', 'https://images.unsplash.com/photo-1513001900722-370f803f498d?w=800', 'Dr. Suresh Menon', '10 weeks', 'advanced', 'Malayalam', 3299.00, 4.7);

-- =============================================================
-- SAMPLE DATA — Course Modules (6 per course, for all 10 courses)
-- =============================================================
INSERT INTO course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT id, CONCAT('Introduction to ', category), CONCAT('Get started with the basics and understand the foundation of ', category, ' language.'), 1, '45 min', 1 FROM courses;

INSERT INTO course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT id, 'Basic Grammar and Vocabulary', 'Learn essential grammar rules and build your vocabulary foundation.', 2, '1 hour', 0 FROM courses;

INSERT INTO course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT id, 'Reading and Writing Practice', 'Practice reading comprehension and writing exercises to reinforce your learning.', 3, '1.5 hours', 0 FROM courses;

INSERT INTO course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT id, 'Conversational Skills', 'Develop practical speaking skills through interactive conversations and role-plays.', 4, '1 hour', 0 FROM courses;

INSERT INTO course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT id, 'Cultural Context and Usage', 'Understand the cultural nuances and appropriate usage in different contexts.', 5, '1 hour', 0 FROM courses;

INSERT INTO course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT id, 'Advanced Practice and Assessment', 'Test your knowledge and practice advanced concepts through comprehensive exercises.', 6, '2 hours', 0 FROM courses;

-- Update first module of first two courses with sample YouTube urls
UPDATE course_modules SET video_url = 'https://www.youtube.com/embed/dQw4w9WgXcQ' WHERE order_number = 1 AND course_id = (SELECT id FROM courses LIMIT 1);
UPDATE course_modules SET video_url = 'https://www.youtube.com/embed/jNQXAC9IVRw' WHERE order_number = 2 AND course_id = (SELECT id FROM courses LIMIT 1);
