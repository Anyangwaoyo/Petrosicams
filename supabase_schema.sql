-- ==========================================
-- PETROS ICA DATABASE SCHEMA FOR SUPABASE
-- Senior Software Engineer Production Blueprint
-- ==========================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean existing tables (optional, for clean runs)
-- DROP TABLE IF EXISTS notices CASCADE;
-- DROP TABLE IF EXISTS academic_history CASCADE;
-- DROP TABLE IF EXISTS report_remarks CASCADE;
-- DROP TABLE IF EXISTS results CASCADE;
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS class_subjects CASCADE;
-- DROP TABLE IF EXISTS subjects CASCADE;
-- DROP TABLE IF EXISTS classes CASCADE;
-- DROP TABLE IF EXISTS teachers CASCADE;
-- DROP TABLE IF EXISTS terms CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'student')) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    teacher_id VARCHAR(50),
    student_id VARCHAR(50),
    avatar_url TEXT,
    password VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SESSIONS TABLE
CREATE TABLE sessions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_current BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TERMS TABLE
CREATE TABLE terms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_current BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLASSES TABLE
CREATE TABLE classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    class_teacher_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TEACHERS TABLE
CREATE TABLE teachers (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    qualification TEXT,
    date_joined DATE NOT NULL,
    assigned_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add teacher constraint now that teachers table is created
ALTER TABLE classes ADD CONSTRAINT fk_class_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- 6. SUBJECTS TABLE
CREATE TABLE subjects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CLASS SUBJECTS TABLE
CREATE TABLE class_subjects (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id VARCHAR(50) REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. STUDENTS TABLE
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    current_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
    parent_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    parent_email VARCHAR(255),
    address TEXT,
    passport_photo TEXT,
    status VARCHAR(20) CHECK (status IN ('Active', 'Suspended', 'Graduated', 'Withdrawn')) DEFAULT 'Active' NOT NULL,
    enrolled_session_id VARCHAR(50) REFERENCES sessions(id),
    password VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD CONSTRAINT fk_user_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

-- 9. ATTENDANCE TABLE
CREATE TABLE attendance (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    records JSONB NOT NULL, -- Array of attendance records: [{studentId, status, remarks}]
    taken_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, date)
);

-- 10. RESULTS TABLE
CREATE TABLE results (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES terms(id) ON DELETE CASCADE,
    ca_score NUMERIC CHECK (ca_score >= 0 AND ca_score <= 40),
    exam_score NUMERIC CHECK (exam_score >= 0 AND exam_score <= 60),
    total_score NUMERIC CHECK (total_score >= 0 AND total_score <= 100),
    grade VARCHAR(5) NOT NULL,
    remark TEXT,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    recorded_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, subject_id, session_id, term_id)
);

-- 11. REPORT CARD REMARKS TABLE
CREATE TABLE report_remarks (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES terms(id) ON DELETE CASCADE,
    teacher_remark TEXT,
    principal_remark TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, session_id, term_id)
);

-- 12. ACADEMIC HISTORY TABLE
CREATE TABLE academic_history (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES terms(id) ON DELETE CASCADE,
    average_score NUMERIC,
    position INTEGER,
    status VARCHAR(50), -- e.g. Promoted, Demoted, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, session_id, term_id)
);

-- 13. NOTICES TABLE
CREATE TABLE notices (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(100) NOT NULL,
    date_posted DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ROW-LEVEL SECURITY & PUBLIC SEED DATA
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Create basic bypass policies for service role and open access (for development/easy connection)
CREATE POLICY "Allow all read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON users FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON sessions FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON terms FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON terms FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON classes FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON teachers FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON subjects FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON class_subjects FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON class_subjects FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON students FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON students FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON attendance FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON attendance FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON results FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON results FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON report_remarks FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON report_remarks FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON academic_history FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON academic_history FOR ALL WITH CHECK (true);

CREATE POLICY "Allow all read" ON notices FOR SELECT USING (true);
CREATE POLICY "Allow all write" ON notices FOR ALL WITH CHECK (true);


-- ==========================================
-- SEED INITIAL DATA
-- ==========================================

INSERT INTO users (id, username, name, role, email, phone) 
VALUES ('u1', 'admin', 'Administrator', 'admin', 'admin@petrosica.edu.ng', '+234 803 123 4567')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sessions (id, name, is_current) 
VALUES ('ses1', '2025/2026', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO terms (id, name, is_current) 
VALUES 
('term1', 'First Term', true),
('term2', 'Second Term', false),
('term3', 'Third Term', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (id, first_name, last_name, email, phone, gender, qualification, date_joined)
VALUES ('t1', 'Grace', 'Okon', 'g.okon@petrosica.edu.ng', '+234 802 987 6543', 'Female', 'B.Ed. Mathematics', '2024-09-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, name, role, email, phone, teacher_id)
VALUES ('u2', 'teacher', 'Mrs. Grace Okon', 'teacher', 'g.okon@petrosica.edu.ng', '+234 802 987 6543', 't1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, name, grade_level, class_teacher_id)
VALUES ('c1', 'JSS 1 Gold', 'JSS 1', 't1')
ON CONFLICT (id) DO NOTHING;

UPDATE teachers SET assigned_class_id = 'c1' WHERE id = 't1';

INSERT INTO subjects (id, name, code)
VALUES 
('sub1', 'Mathematics', 'MTH'),
('sub2', 'English Language', 'ENG')
ON CONFLICT (id) DO NOTHING;

INSERT INTO class_subjects (id, class_id, subject_id, teacher_id)
VALUES 
('cs1', 'c1', 'sub1', 't1'),
('cs2', 'c1', 'sub2', 't1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, admission_number, first_name, last_name, gender, date_of_birth, current_class_id, parent_name, parent_phone, parent_email, address, status, enrolled_session_id)
VALUES ('st1', 'PET/2025/001', 'Chidi', 'Nwachukwu', 'Male', '2013-05-12', 'c1', 'Mr. Nwachukwu', '+234 803 555 1234', 'parent.nwachukwu@example.com', '12 Petros Close, Lagos', 'Active', 'ses1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notices (id, title, content, author_name, author_role, date_posted)
VALUES ('n1', 'Welcome to 2025/2026 Session', 'Welcome back all staff and students. We look forward to an excellent and productive academic term.', 'Administrator', 'admin', '2026-01-05')
ON CONFLICT (id) DO NOTHING;
