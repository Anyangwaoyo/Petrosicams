/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  User, Student, Teacher, Class, Subject, ClassSubject, 
  Session, Term, Attendance, Result, ReportCardRemark, 
  Notice, StudentAcademicHistory, DashboardStats 
} from "./src/types.js";
import { isSupabaseConfigured, loadFromSupabase, saveToSupabase } from "./src/lib/supabaseService.js";

const app = express();
const PORT = 3000;

// Enable JSON parse with higher limit for base64 passport photos
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Database file path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial/Seeded Database Schema
const initialDb = {
  users: [
    {
      id: "u1",
      username: "admin",
      name: "Administrator",
      role: "admin",
      email: "admin@petrosica.edu.ng",
      phone: "+234 803 123 4567"
    },
    {
      id: "u2",
      username: "teacher",
      name: "Mrs. Grace Okon",
      role: "teacher",
      email: "g.okon@petrosica.edu.ng",
      phone: "+234 802 987 6543",
      teacherId: "t1"
    }
  ] as User[],
  sessions: [
    { id: "ses1", name: "2025/2026", isCurrent: true }
  ] as Session[],
  terms: [
    { id: "term1", name: "First Term", isCurrent: true },
    { id: "term2", name: "Second Term", isCurrent: false },
    { id: "term3", name: "Third Term", isCurrent: false }
  ] as Term[],
  classes: [
    {
      id: "c1",
      name: "JSS 1 Gold",
      gradeLevel: "JSS 1",
      classTeacherId: "t1"
    }
  ] as Class[],
  subjects: [
    { id: "sub1", name: "Mathematics", code: "MTH" },
    { id: "sub2", name: "English Language", code: "ENG" }
  ] as Subject[],
  classSubjects: [
    { id: "cs1", classId: "c1", subjectId: "sub1", teacherId: "t1" },
    { id: "cs2", classId: "c1", subjectId: "sub2", teacherId: "t1" }
  ] as ClassSubject[],
  teachers: [
    {
      id: "t1",
      firstName: "Grace",
      lastName: "Okon",
      email: "g.okon@petrosica.edu.ng",
      phone: "+234 802 987 6543",
      gender: "Female",
      qualification: "B.Ed. Mathematics",
      dateJoined: "2024-09-01",
      assignedClassId: "c1"
    }
  ] as Teacher[],
  students: [
    {
      id: "st1",
      admissionNumber: "PET/2025/001",
      firstName: "Chidi",
      lastName: "Nwachukwu",
      gender: "Male",
      dateOfBirth: "2013-05-12",
      currentClassId: "c1",
      parentName: "Mr. Nwachukwu",
      parentPhone: "+234 803 555 1234",
      parentEmail: "parent.nwachukwu@example.com",
      address: "12 Petros Close, Lagos",
      passportPhoto: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
      status: "Active",
      enrolledSessionId: "ses1"
    }
  ] as Student[],
  attendance: [] as Attendance[],
  results: [] as Result[],
  reportRemarks: [] as ReportCardRemark[],
  academicHistory: [] as StudentAcademicHistory[],
  notices: [
    {
      id: "n1",
      title: "Welcome to 2025/2026 Session",
      content: "Welcome back all staff and students. We look forward to an excellent and productive academic term.",
      authorName: "Administrator",
      authorRole: "admin",
      datePosted: "2026-01-05"
    }
  ] as Notice[]
};

// Helper to load DB
function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf8");
    return initialDb;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading database file, returning initial schema", e);
    return initialDb;
  }
}

// Helper to save DB
function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    if (isSupabaseConfigured()) {
      saveToSupabase(data).catch((err: any) => {
        console.error("❌ SUPABASE: Background sync failed:", err.message);
      });
    }
  } catch (e) {
    console.error("Error saving database file", e);
  }
}

// Simple in-memory session store for current logged-in user
let currentSessionUser: User | null = null;

// Score calculations:
function calculateGradeAndRemark(total: number): { grade: string; remark: string } {
  if (total >= 80) return { grade: "A", remark: "Excellent" };
  if (total >= 70) return { grade: "B", remark: "Very Good" };
  if (total >= 60) return { grade: "C", remark: "Good" };
  if (total >= 50) return { grade: "D", remark: "Pass" };
  if (total >= 40) return { grade: "E", remark: "Weak Pass" };
  return { grade: "F", remark: "Fail" };
}

// REST API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Authentication
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const db = loadDb();
  
  // Clean query inputs
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  // 1. Try finding in db.users (Admin & Teachers)
  const user = db.users.find((u: User) => u.username.toLowerCase() === cleanUsername);
  if (user) {
    const customPassword = (user as any).password;
    const isCorrect = customPassword 
      ? cleanPassword === customPassword 
      : (user.role === "admin" && cleanPassword === "admin123") || 
        (user.role === "teacher" && cleanPassword === "teacher123");
    if (isCorrect) {
      let avatarUrl = user.avatarUrl;
      if (user.role === "teacher" && user.teacherId) {
        const teacher = db.teachers.find((t: Teacher) => t.id === user.teacherId);
        if (teacher && (teacher as any).avatarUrl) {
          avatarUrl = (teacher as any).avatarUrl;
        }
      }
      const loggedUser = { ...user, avatarUrl };
      currentSessionUser = loggedUser;
      return res.json({ user: loggedUser, token: `mock-token-${user.id}` });
    }
  }

  // 2. Try finding in db.students (Students logging in with Admission Number)
  const student = db.students.find((s: Student) => s.admissionNumber.toLowerCase() === cleanUsername);
  if (student) {
    const customPassword = (student as any).password;
    const isCorrect = customPassword 
      ? cleanPassword === customPassword 
      : cleanPassword === "student123" || 
        cleanPassword.toLowerCase() === student.admissionNumber.toLowerCase() ||
        cleanPassword.toLowerCase() === student.lastName.toLowerCase();
    if (isCorrect) {
      const studentUser: User = {
        id: student.id,
        username: student.admissionNumber,
        name: `${student.firstName} ${student.lastName}`,
        role: "student",
        email: student.parentEmail || "",
        phone: student.parentPhone,
        studentId: student.id,
        avatarUrl: student.passportPhoto || ""
      };
      currentSessionUser = studentUser;
      return res.json({ user: studentUser, token: `mock-token-${student.id}` });
    }
  }

  return res.status(401).json({ message: "Invalid username or password" });
});

app.post("/api/auth/logout", (req, res) => {
  currentSessionUser = null;
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: currentSessionUser });
});

// Profile upload / update
app.post("/api/profile/upload-avatar", (req, res) => {
  if (!currentSessionUser) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const { avatarUrl, email, phone } = req.body;
  if (!avatarUrl && !email && !phone) {
    return res.status(400).json({ message: "No data to update" });
  }

  const db = loadDb();

  // Update in memory session user
  if (avatarUrl) currentSessionUser.avatarUrl = avatarUrl;
  if (email) currentSessionUser.email = email;
  if (phone) currentSessionUser.phone = phone;

  // 1. If student, update student's passportPhoto
  if (currentSessionUser.role === "student" && currentSessionUser.studentId) {
    const studentIdx = db.students.findIndex((s: Student) => s.id === currentSessionUser!.studentId);
    if (studentIdx !== -1) {
      if (avatarUrl) db.students[studentIdx].passportPhoto = avatarUrl;
      if (email) db.students[studentIdx].parentEmail = email;
      if (phone) db.students[studentIdx].parentPhone = phone;
    }
  }

  // 2. If teacher, update teacher's avatarUrl/email/phone
  if (currentSessionUser.role === "teacher" && currentSessionUser.teacherId) {
    const teacherIdx = db.teachers.findIndex((t: Teacher) => t.id === currentSessionUser!.teacherId);
    if (teacherIdx !== -1) {
      if (avatarUrl) (db.teachers[teacherIdx] as any).avatarUrl = avatarUrl;
      if (email) db.teachers[teacherIdx].email = email;
      if (phone) db.teachers[teacherIdx].phone = phone;
    }
  }

  // 3. Update db.users (Admins and Teachers are in db.users)
  const userIdx = db.users.findIndex((u: User) => u.id === currentSessionUser!.id);
  if (userIdx !== -1) {
    if (avatarUrl) db.users[userIdx].avatarUrl = avatarUrl;
    if (email) db.users[userIdx].email = email;
    if (phone) db.users[userIdx].phone = phone;
  }

  saveDb(db);
  res.json({ success: true, user: currentSessionUser });
});

// Dashboard stats
app.get("/api/stats", (req, res) => {
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);
  
  const today = new Date().toISOString().split('T')[0];
  const attendanceToday = db.attendance.find((a: Attendance) => a.date === today);
  
  let todayAttendanceRate = 85; // Default/historical fallback
  if (attendanceToday && attendanceToday.records.length > 0) {
    const presentCount = attendanceToday.records.filter((r: any) => r.status === "Present" || r.status === "Late").length;
    todayAttendanceRate = Math.round((presentCount / attendanceToday.records.length) * 100);
  }

  const stats: DashboardStats = {
    totalStudents: db.students.filter((s: Student) => s.status === "Active").length,
    totalTeachers: db.teachers.length,
    totalClasses: db.classes.length,
    totalSubjects: db.subjects.length,
    todayAttendanceRate,
    noticesCount: db.notices.length
  };
  res.json(stats);
});

// Student Management
app.get("/api/students", (req, res) => {
  const db = loadDb();
  const enrichedStudents = db.students.map((s: Student) => ({
    ...s,
    password: s.password || "student123"
  }));
  res.json(enrichedStudents);
});

app.post("/api/students", (req, res) => {
  const db = loadDb();
  const studentData = req.body;
  
  // Generate Admission Number
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const yearStr = currentSession ? currentSession.name.split("/")[0] : new Date().getFullYear().toString();
  
  // Find current active counts for this session
  const enrolledThisSession = db.students.filter((s: Student) => s.enrolledSessionId === (currentSession?.id || "ses2"));
  const sequenceNum = (enrolledThisSession.length + 1).toString().padStart(3, "0");
  const admissionNumber = `PET/${yearStr}/${sequenceNum}`;

  const newStudent: Student = {
    id: "st_" + Math.random().toString(36).substring(2, 9),
    admissionNumber,
    firstName: studentData.firstName,
    lastName: studentData.lastName,
    gender: studentData.gender || "Male",
    dateOfBirth: studentData.dateOfBirth,
    currentClassId: studentData.currentClassId,
    parentName: studentData.parentName,
    parentPhone: studentData.parentPhone,
    parentEmail: studentData.parentEmail,
    address: studentData.address,
    passportPhoto: studentData.passportPhoto || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
    status: studentData.status || "Active",
    enrolledSessionId: currentSession?.id || "ses2"
  };

  db.students.push(newStudent);
  saveDb(db);
  res.status(201).json(newStudent);
});

app.put("/api/students/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const index = db.students.findIndex((s: Student) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Student not found" });
  }

  db.students[index] = { ...db.students[index], ...req.body };
  saveDb(db);
  res.json(db.students[index]);
});

app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.students = db.students.filter((s: Student) => s.id !== id);
  // clean up results, attendance, remarks, history optionally
  saveDb(db);
  res.json({ success: true });
});

// Teacher Management
app.get("/api/teachers", (req, res) => {
  const db = loadDb();
  const teachersWithUsers = db.teachers.map((t: Teacher) => {
    const u = db.users.find((user: User) => user.teacherId === t.id);
    return {
      ...t,
      username: u ? u.username : "",
      password: u ? (u as any).password || "teacher123" : "teacher123"
    };
  });
  res.json(teachersWithUsers);
});

app.post("/api/teachers", (req, res) => {
  const db = loadDb();
  const data = req.body;
  const id = "t_" + Math.random().toString(36).substring(2, 9);
  
  const newTeacher: Teacher = {
    id,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    gender: data.gender || "Male",
    qualification: data.qualification,
    dateJoined: data.dateJoined || new Date().toISOString().split('T')[0],
    assignedClassId: data.assignedClassId,
    avatarUrl: data.avatarUrl || ""
  };

  db.teachers.push(newTeacher);

  // Auto-create User account for teacher
  const username = (data.username || (data.firstName.charAt(0) + data.lastName).toLowerCase().replace(/\s+/g, "")).trim();
  const password = (data.password || "teacher123").trim();
  
  db.users.push({
    id: "u_" + Math.random().toString(36).substring(2, 9),
    username,
    password,
    name: `Mr/Mrs. ${data.firstName} ${data.lastName}`,
    role: "teacher",
    email: data.email,
    phone: data.phone,
    teacherId: id,
    avatarUrl: data.avatarUrl || ""
  });

  // If a class is assigned to this teacher, update that class's teacher id too
  if (data.assignedClassId) {
    const classIndex = db.classes.findIndex((c: Class) => c.id === data.assignedClassId);
    if (classIndex !== -1) {
      db.classes[classIndex].classTeacherId = id;
    }
  }

  saveDb(db);
  res.status(201).json(newTeacher);
});

app.put("/api/teachers/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const index = db.teachers.findIndex((t: Teacher) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  const oldAssignedClass = db.teachers[index].assignedClassId;
  const updatedTeacher = { ...db.teachers[index], ...req.body };
  db.teachers[index] = updatedTeacher;

  // Find and update corresponding user account
  const userIdx = db.users.findIndex((u: User) => u.teacherId === id);
  if (userIdx !== -1) {
    db.users[userIdx].name = `Mr/Mrs. ${updatedTeacher.firstName} ${updatedTeacher.lastName}`;
    db.users[userIdx].email = updatedTeacher.email;
    db.users[userIdx].phone = updatedTeacher.phone;
    if (req.body.username) db.users[userIdx].username = req.body.username.trim();
    if (req.body.password) (db.users[userIdx] as any).password = req.body.password.trim();
    if (updatedTeacher.avatarUrl) db.users[userIdx].avatarUrl = updatedTeacher.avatarUrl;
  }

  // Sync Class-Teacher mapping
  if (oldAssignedClass && oldAssignedClass !== updatedTeacher.assignedClassId) {
    // Remove from old class
    const oldClassIdx = db.classes.findIndex((c: Class) => c.id === oldAssignedClass);
    if (oldClassIdx !== -1 && db.classes[oldClassIdx].classTeacherId === id) {
      delete db.classes[oldClassIdx].classTeacherId;
    }
  }

  if (updatedTeacher.assignedClassId) {
    const newClassIdx = db.classes.findIndex((c: Class) => c.id === updatedTeacher.assignedClassId);
    if (newClassIdx !== -1) {
      db.classes[newClassIdx].classTeacherId = id;
    }
  }

  saveDb(db);
  res.json(updatedTeacher);
});

app.delete("/api/teachers/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.teachers = db.teachers.filter((t: Teacher) => t.id !== id);
  db.users = db.users.filter((u: User) => u.teacherId !== id);
  
  // Clear class teacher bindings
  db.classes.forEach((c: Class) => {
    if (c.classTeacherId === id) {
      delete c.classTeacherId;
    }
  });

  // Clear class subject bindings
  db.classSubjects.forEach((cs: ClassSubject) => {
    if (cs.teacherId === id) {
      delete cs.teacherId;
    }
  });

  saveDb(db);
  res.json({ success: true });
});

// Classes
app.get("/api/classes", (req, res) => {
  const db = loadDb();
  res.json(db.classes);
});

app.post("/api/classes", (req, res) => {
  const db = loadDb();
  const data = req.body;
  const newClass: Class = {
    id: "c_" + Math.random().toString(36).substring(2, 9),
    name: data.name,
    gradeLevel: data.gradeLevel,
    classTeacherId: data.classTeacherId
  };

  db.classes.push(newClass);

  // Sync teacher assigned class
  if (data.classTeacherId) {
    const teacherIdx = db.teachers.findIndex((t: Teacher) => t.id === data.classTeacherId);
    if (teacherIdx !== -1) {
      db.teachers[teacherIdx].assignedClassId = newClass.id;
    }
  }

  saveDb(db);
  res.status(201).json(newClass);
});

app.put("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const index = db.classes.findIndex((c: Class) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Class not found" });
  }

  const oldTeacherId = db.classes[index].classTeacherId;
  const updatedClass = { ...db.classes[index], ...req.body };
  db.classes[index] = updatedClass;

  // Sync teacher model
  if (oldTeacherId && oldTeacherId !== updatedClass.classTeacherId) {
    const oldTeacherIdx = db.teachers.findIndex((t: Teacher) => t.id === oldTeacherId);
    if (oldTeacherIdx !== -1 && db.teachers[oldTeacherIdx].assignedClassId === id) {
      delete db.teachers[oldTeacherIdx].assignedClassId;
    }
  }

  if (updatedClass.classTeacherId) {
    const newTeacherIdx = db.teachers.findIndex((t: Teacher) => t.id === updatedClass.classTeacherId);
    if (newTeacherIdx !== -1) {
      db.teachers[newTeacherIdx].assignedClassId = id;
    }
  }

  saveDb(db);
  res.json(updatedClass);
});

app.delete("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.classes = db.classes.filter((c: Class) => c.id !== id);
  
  // Sync teachers
  db.teachers.forEach((t: Teacher) => {
    if (t.assignedClassId === id) {
      delete t.assignedClassId;
    }
  });

  // Remove students in class or set to empty
  db.students.forEach((s: Student) => {
    if (s.currentClassId === id) {
      s.currentClassId = "";
    }
  });

  // Delete class subject assignments
  db.classSubjects = db.classSubjects.filter((cs: ClassSubject) => cs.classId !== id);

  saveDb(db);
  res.json({ success: true });
});

// Subjects
app.get("/api/subjects", (req, res) => {
  const db = loadDb();
  res.json(db.subjects);
});

app.post("/api/subjects", (req, res) => {
  const db = loadDb();
  const data = req.body;
  const newSubject: Subject = {
    id: "s_" + Math.random().toString(36).substring(2, 9),
    name: data.name,
    code: data.code
  };
  db.subjects.push(newSubject);
  saveDb(db);
  res.status(201).json(newSubject);
});

app.put("/api/subjects/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const index = db.subjects.findIndex((s: Subject) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Subject not found" });
  }
  db.subjects[index] = { ...db.subjects[index], ...req.body };
  saveDb(db);
  res.json(db.subjects[index]);
});

app.delete("/api/subjects/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.subjects = db.subjects.filter((s: Subject) => s.id !== id);
  db.classSubjects = db.classSubjects.filter((cs: ClassSubject) => cs.subjectId !== id);
  saveDb(db);
  res.json({ success: true });
});

// Class Subject Links
app.get("/api/class-subjects", (req, res) => {
  const db = loadDb();
  res.json(db.classSubjects);
});

app.post("/api/class-subjects", (req, res) => {
  const db = loadDb();
  const { classId, subjectId, teacherId } = req.body;

  // Check if exists
  const existing = db.classSubjects.find((cs: ClassSubject) => cs.classId === classId && cs.subjectId === subjectId);
  if (existing) {
    existing.teacherId = teacherId;
  } else {
    db.classSubjects.push({
      id: "cs_" + Math.random().toString(36).substring(2, 9),
      classId,
      subjectId,
      teacherId
    });
  }

  saveDb(db);
  res.status(201).json({ success: true });
});

app.delete("/api/class-subjects/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.classSubjects = db.classSubjects.filter((cs: ClassSubject) => cs.id !== id);
  saveDb(db);
  res.json({ success: true });
});

// Sessions
app.get("/api/sessions", (req, res) => {
  const db = loadDb();
  res.json(db.sessions);
});

app.post("/api/sessions", (req, res) => {
  const db = loadDb();
  const data = req.body;
  
  if (data.isCurrent) {
    db.sessions.forEach((s: Session) => s.isCurrent = false);
  }

  const newSession: Session = {
    id: "ses_" + Math.random().toString(36).substring(2, 9),
    name: data.name,
    isCurrent: !!data.isCurrent
  };
  
  db.sessions.push(newSession);
  saveDb(db);
  res.status(201).json(newSession);
});

app.put("/api/sessions/:id/current", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.sessions.forEach((s: Session) => s.isCurrent = (s.id === id));
  saveDb(db);
  res.json({ success: true });
});

// Terms
app.get("/api/terms", (req, res) => {
  const db = loadDb();
  res.json(db.terms);
});

app.post("/api/terms", (req, res) => {
  const db = loadDb();
  const data = req.body;
  
  if (data.isCurrent) {
    db.terms.forEach((t: Term) => t.isCurrent = false);
  }

  const newTerm: Term = {
    id: "term_" + Math.random().toString(36).substring(2, 9),
    name: data.name,
    isCurrent: !!data.isCurrent
  };
  
  db.terms.push(newTerm);
  saveDb(db);
  res.status(201).json(newTerm);
});

app.put("/api/terms/:id/current", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.terms.forEach((t: Term) => t.isCurrent = (t.id === id));
  saveDb(db);
  res.json({ success: true });
});

// Attendance API
app.get("/api/attendance", (req, res) => {
  const { date, classId } = req.query;
  const db = loadDb();
  
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);
  
  const record = db.attendance.find((a: Attendance) => 
    a.date === date && 
    a.classId === classId &&
    a.sessionId === (currentSession?.id || "") &&
    a.termId === (currentTerm?.id || "")
  );

  if (record) {
    return res.json(record);
  }

  // If no record, return dummy template with all studentIds in this class
  const classStudents = db.students.filter((s: Student) => s.currentClassId === classId && s.status === "Active");
  const defaultRecords = classStudents.map((s: Student) => ({
    studentId: s.id,
    status: "Present" as const
  }));

  res.json({
    id: "",
    date: date as string,
    classId: classId as string,
    sessionId: currentSession?.id || "",
    termId: currentTerm?.id || "",
    records: defaultRecords
  });
});

app.post("/api/attendance", (req, res) => {
  const db = loadDb();
  const { date, classId, records } = req.body;
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  if (!currentSession || !currentTerm) {
    return res.status(400).json({ message: "Active Session and Term are required to log attendance" });
  }

  const index = db.attendance.findIndex((a: Attendance) => 
    a.date === date && 
    a.classId === classId && 
    a.sessionId === currentSession.id && 
    a.termId === currentTerm.id
  );

  const updatedRecord: Attendance = {
    id: index !== -1 ? db.attendance[index].id : "att_" + Math.random().toString(36).substring(2, 9),
    date,
    classId,
    sessionId: currentSession.id,
    termId: currentTerm.id,
    records
  };

  if (index !== -1) {
    db.attendance[index] = updatedRecord;
  } else {
    db.attendance.push(updatedRecord);
  }

  saveDb(db);
  res.json(updatedRecord);
});

// Attendance Report
app.get("/api/attendance/report", (req, res) => {
  const { classId, studentId } = req.query;
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  const filterSessionId = currentSession?.id || "";
  const filterTermId = currentTerm?.id || "";

  // Filter attendance records
  const classAttendance = db.attendance.filter((a: Attendance) => 
    (!classId || a.classId === classId) && 
    a.sessionId === filterSessionId && 
    a.termId === filterTermId
  );

  if (studentId) {
    // Return student-specific history
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    const history = classAttendance.map((a: Attendance) => {
      const studentRec = a.records.find(r => r.studentId === studentId);
      if (studentRec) {
        if (studentRec.status === "Present") presentCount++;
        else if (studentRec.status === "Absent") absentCount++;
        else if (studentRec.status === "Late") lateCount++;
        return { date: a.date, status: studentRec.status };
      }
      return null;
    }).filter(Boolean);

    const totalDays = presentCount + absentCount + lateCount;
    const rate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

    return res.json({
      studentId,
      presentCount,
      absentCount,
      lateCount,
      totalDays,
      attendanceRate: rate,
      history
    });
  }

  // Otherwise, return summary for the class (student aggregate)
  const classStudents = db.students.filter((s: Student) => s.currentClassId === classId && s.status === "Active");
  const report = classStudents.map((student: Student) => {
    let present = 0;
    let absent = 0;
    let late = 0;

    classAttendance.forEach((a: Attendance) => {
      const rec = a.records.find(r => r.studentId === student.id);
      if (rec) {
        if (rec.status === "Present") present++;
        else if (rec.status === "Absent") absent++;
        else if (rec.status === "Late") late++;
      }
    });

    const total = present + absent + late;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      present,
      absent,
      late,
      totalDays: total,
      attendanceRate: rate
    };
  });

  res.json(report);
});

// Results and Marks API
app.get("/api/results", (req, res) => {
  const { classId, subjectId } = req.query;
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  const sessionId = currentSession?.id || "";
  const termId = currentTerm?.id || "";

  // Return results matching
  const filtered = db.results.filter((r: Result) => 
    r.classId === classId && 
    r.subjectId === subjectId && 
    r.sessionId === sessionId && 
    r.termId === termId
  );

  res.json(filtered);
});

// Save scores in Bulk
app.post("/api/results/bulk", (req, res) => {
  const db = loadDb();
  const { classId, subjectId, teacherId, scores } = req.body;
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  if (!currentSession || !currentTerm) {
    return res.status(400).json({ message: "Active Session and Term are required to enter scores" });
  }

  const sessionId = currentSession.id;
  const termId = currentTerm.id;

  scores.forEach((item: { studentId: string; caScore: number; examScore: number }) => {
    const ca = parseFloat(item.caScore as any) || 0;
    const exam = parseFloat(item.examScore as any) || 0;
    const totalScore = ca + exam;
    const { grade, remark } = calculateGradeAndRemark(totalScore);

    const index = db.results.findIndex((r: Result) => 
      r.studentId === item.studentId &&
      r.classId === classId &&
      r.subjectId === subjectId &&
      r.sessionId === sessionId &&
      r.termId === termId
    );

    const newResult: Result = {
      id: index !== -1 ? db.results[index].id : "res_" + Math.random().toString(36).substring(2, 9),
      studentId: item.studentId,
      classId,
      subjectId,
      sessionId,
      termId,
      caScore: ca,
      examScore: exam,
      totalScore,
      grade,
      remark,
      teacherId,
      isApproved: index !== -1 ? db.results[index].isApproved : false // Start as false/unapproved
    };

    if (index !== -1) {
      db.results[index] = newResult;
    } else {
      db.results.push(newResult);
    }
  });

  saveDb(db);
  res.json({ success: true });
});

// Admin approves results
app.post("/api/results/approve", (req, res) => {
  const { classId, subjectId, action } = req.body; // action: 'approve' | 'unapprove'
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  const sessionId = currentSession?.id || "";
  const termId = currentTerm?.id || "";

  db.results.forEach((r: Result) => {
    if (r.classId === classId && r.subjectId === subjectId && r.sessionId === sessionId && r.termId === termId) {
      r.isApproved = (action === "approve");
    }
  });

  saveDb(db);
  res.json({ success: true });
});

// Save class teacher & principal remarks
app.post("/api/results/remarks", (req, res) => {
  const db = loadDb();
  const { studentId, classId, classTeacherRemark, principalRemark, isPublished } = req.body;
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  if (!currentSession || !currentTerm) {
    return res.status(400).json({ message: "Active session/term not set" });
  }

  const sessionId = currentSession.id;
  const termId = currentTerm.id;

  const index = db.reportRemarks.findIndex((r: ReportCardRemark) => 
    r.studentId === studentId && r.classId === classId && r.sessionId === sessionId && r.termId === termId
  );

  const updatedRemark: ReportCardRemark = {
    id: index !== -1 ? db.reportRemarks[index].id : "rem_" + Math.random().toString(36).substring(2, 9),
    studentId,
    classId,
    sessionId,
    termId,
    classTeacherRemark: classTeacherRemark !== undefined ? classTeacherRemark : (index !== -1 ? db.reportRemarks[index].classTeacherRemark : ""),
    principalRemark: principalRemark !== undefined ? principalRemark : (index !== -1 ? db.reportRemarks[index].principalRemark : ""),
    isPublished: isPublished !== undefined ? isPublished : (index !== -1 ? db.reportRemarks[index].isPublished : false),
    updatedAt: new Date().toISOString()
  };

  if (index !== -1) {
    db.reportRemarks[index] = updatedRemark;
  } else {
    db.reportRemarks.push(updatedRemark);
  }

  saveDb(db);
  res.json(updatedRemark);
});

// Get Class Report Cards (with aggregated stats and positions)
app.get("/api/results/class-report-cards", (req, res) => {
  const { classId } = req.query;
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  const sessionId = currentSession?.id || "";
  const termId = currentTerm?.id || "";

  // Get active students in class
  const classStudents = db.students.filter((s: Student) => s.currentClassId === classId);
  
  // For each student, compute totalScore, averages, and check remarks
  const computedList = classStudents.map((student: Student) => {
    const studentResults = db.results.filter((r: Result) => 
      r.studentId === student.id && 
      r.classId === classId && 
      r.sessionId === sessionId && 
      r.termId === termId &&
      r.isApproved // Only count approved scores
    );

    const totalScore = studentResults.reduce((acc: number, r: Result) => acc + r.totalScore, 0);
    const subjectCount = studentResults.length;
    const averageScore = subjectCount > 0 ? parseFloat((totalScore / subjectCount).toFixed(2)) : 0;

    const remarks = db.reportRemarks.find((rem: ReportCardRemark) => 
      rem.studentId === student.id && 
      rem.classId === classId && 
      rem.sessionId === sessionId && 
      rem.termId === termId
    ) || { classTeacherRemark: "", principalRemark: "", isPublished: false };

    return {
      student,
      results: studentResults,
      totalScore,
      averageScore,
      subjectCount,
      remarks
    };
  });

  // Rank/Sort by totalScore to find position
  // Filter students who actually have at least one score
  const gradedStudents = computedList.filter(item => item.subjectCount > 0);
  gradedStudents.sort((a, b) => b.totalScore - a.totalScore);

  // Map back to computedList with position
  const finalList = computedList.map(item => {
    let position = 0;
    if (item.subjectCount > 0) {
      position = gradedStudents.findIndex(g => g.student.id === item.student.id) + 1;
    }
    return {
      ...item,
      position,
      totalStudentsCount: classStudents.length
    };
  });

  res.json(finalList);
});

// Single Report Card
app.get("/api/results/report-card/:studentId", (req, res) => {
  const { studentId } = req.params;
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  const sessionId = currentSession?.id || "";
  const termId = currentTerm?.id || "";

  const student = db.students.find((s: Student) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const classId = student.currentClassId;

  // Calculate stats for all students in class to compute position
  const classStudents = db.students.filter((s: Student) => s.currentClassId === classId);
  const classTotals = classStudents.map((st: Student) => {
    const res = db.results.filter((r: Result) => 
      r.studentId === st.id && 
      r.classId === classId && 
      r.sessionId === sessionId && 
      r.termId === termId &&
      r.isApproved
    );
    const sum = res.reduce((acc: number, item: Result) => acc + item.totalScore, 0);
    return { studentId: st.id, totalScore: sum, subjectCount: res.length };
  });

  // Sort descending
  const sortedClassTotals = [...classTotals].filter(c => c.subjectCount > 0).sort((a, b) => b.totalScore - a.totalScore);
  const myTotalIndex = sortedClassTotals.findIndex(c => c.studentId === studentId);
  const position = myTotalIndex !== -1 ? myTotalIndex + 1 : 0;

  const results = db.results.filter((r: Result) => 
    r.studentId === studentId && 
    r.classId === classId && 
    r.sessionId === sessionId && 
    r.termId === termId
  );

  const remarks = db.reportRemarks.find((rem: ReportCardRemark) => 
    rem.studentId === studentId && 
    rem.classId === classId && 
    rem.sessionId === sessionId && 
    rem.termId === termId
  ) || { classTeacherRemark: "", principalRemark: "", isPublished: false };

  const totalScore = results.filter(r => r.isApproved).reduce((acc: number, r: Result) => acc + r.totalScore, 0);
  const subjectCount = results.filter(r => r.isApproved).length;
  const averageScore = subjectCount > 0 ? parseFloat((totalScore / subjectCount).toFixed(2)) : 0;

  res.json({
    student,
    results,
    totalScore,
    averageScore,
    subjectCount,
    position,
    totalStudentsCount: classStudents.length,
    remarks,
    currentSession,
    currentTerm
  });
});

// Notice Board
app.get("/api/notices", (req, res) => {
  const db = loadDb();
  res.json(db.notices);
});

app.post("/api/notices", (req, res) => {
  const db = loadDb();
  const data = req.body;
  const newNotice: Notice = {
    id: "n_" + Math.random().toString(36).substring(2, 9),
    title: data.title,
    content: data.content,
    authorName: data.authorName || "Administrator",
    authorRole: data.authorRole || "admin",
    datePosted: new Date().toISOString().split('T')[0]
  };

  db.notices.unshift(newNotice); // prepend
  saveDb(db);
  res.status(201).json(newNotice);
});

app.delete("/api/notices/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  db.notices = db.notices.filter((n: Notice) => n.id !== id);
  saveDb(db);
  res.json({ success: true });
});

// Student Promotion & Academic History
app.get("/api/academic-history", (req, res) => {
  const { studentId } = req.query;
  const db = loadDb();
  let history = db.academicHistory;
  if (studentId) {
    history = history.filter((h: StudentAcademicHistory) => h.studentId === studentId);
  }
  res.json(history);
});

app.post("/api/academic-history/promote", (req, res) => {
  const { studentIds, targetClassId, action } = req.body; // action: 'promote' | 'retain' | 'graduate'
  const db = loadDb();
  const currentSession = db.sessions.find((s: Session) => s.isCurrent);
  const currentTerm = db.terms.find((t: Term) => t.isCurrent);

  if (!currentSession || !currentTerm) {
    return res.status(400).json({ message: "Active session/term not set" });
  }

  studentIds.forEach((studentId: string) => {
    const studentIndex = db.students.findIndex((s: Student) => s.id === studentId);
    if (studentIndex === -1) return;

    const student = db.students[studentIndex];
    const sourceClassId = student.currentClassId;

    // Calculate final exam records for the academic history logger
    const results = db.results.filter((r: Result) => 
      r.studentId === studentId && 
      r.classId === sourceClassId && 
      r.sessionId === currentSession.id && 
      r.termId === currentTerm.id &&
      r.isApproved
    );

    const totalScore = results.reduce((acc: number, r: Result) => acc + r.totalScore, 0);
    const subjectCount = results.length;
    const averageScore = subjectCount > 0 ? parseFloat((totalScore / subjectCount).toFixed(2)) : 0;

    // Estimate rank
    const siblings = db.students.filter((s: Student) => s.currentClassId === sourceClassId);
    const siblingTotals = siblings.map((st: Student) => {
      const res = db.results.filter((r: Result) => 
        r.studentId === st.id && 
        r.classId === sourceClassId && 
        r.sessionId === currentSession.id && 
        r.termId === currentTerm.id &&
        r.isApproved
      );
      return { totalScore: res.reduce((acc: number, item: Result) => acc + item.totalScore, 0) };
    }).sort((a, b) => b.totalScore - a.totalScore);
    
    const myRankIdx = siblingTotals.findIndex(s => s.totalScore === totalScore);
    const position = myRankIdx !== -1 ? myRankIdx + 1 : 1;

    // Log History
    db.academicHistory.push({
      id: "h_" + Math.random().toString(36).substring(2, 9),
      studentId,
      classId: sourceClassId,
      sessionId: currentSession.id,
      termId: currentTerm.id,
      averageScore,
      totalScore,
      position,
      totalStudents: siblings.length,
      status: action === "promote" ? "Promoted" : action === "graduate" ? "Completed" : "Retained"
    });

    // Update Student current state
    if (action === "promote") {
      student.currentClassId = targetClassId;
    } else if (action === "graduate") {
      student.status = "Graduated";
      student.currentClassId = "";
    } else {
      // retain in same class
    }
  });

  saveDb(db);
  res.json({ success: true });
});


// Start custom Vite server and wrap API
async function startServer() {
  // Sync with Supabase on startup if configured
  if (isSupabaseConfigured()) {
    console.log("⚡ SUPABASE: Synchronizing local cache with live Supabase database on startup...");
    try {
      const cloudDb = await loadFromSupabase();
      fs.writeFileSync(DB_PATH, JSON.stringify(cloudDb, null, 2), "utf8");
      console.log("⚡ SUPABASE: Local cache file refreshed with live records from the Cloud.");
    } catch (err: any) {
      console.error("❌ SUPABASE: Synchronous boot initialization failed. Falling back to local cache.", err.message);
    }
  } else {
    console.log("💡 INFO: Supabase is not configured yet. Running in offline JSON local mode.");
  }

  // Setup Vite development middleware or serve production static assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Petros School Management Server running on port ${PORT}`);
  });
}

startServer();
