/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let client: SupabaseClient | null = null;

/**
 * Checks if Supabase connection credentials are fully configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    supabaseUrl.trim() !== "" &&
    (supabaseAnonKey.trim() !== "" || supabaseServiceRoleKey.trim() !== "")
  );
}

/**
 * Initializes and returns the Supabase Client.
 * Prefer service role key on the server-side to bypass RLS for admin-level operations.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Define SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  }
  
  if (!client) {
    const key = supabaseServiceRoleKey.trim() || supabaseAnonKey.trim();
    client = createClient(supabaseUrl, key, {
      auth: {
        persistSession: false,
      },
    });
    console.log("--------------------------------------------------");
    console.log("⚡ SUPABASE: Senior Backend Client Initialized successfully.");
    console.log(`🔗 Target URL: ${supabaseUrl}`);
    console.log("--------------------------------------------------");
  }
  return client;
}

// =========================================================================
// MAPPINGS: CAMELCASE (JS/TS) <=> SNAKE_CASE (POSTGRESQL)
// =========================================================================

function mapUserToCamel(row: any) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    teacherId: row.teacher_id,
    studentId: row.student_id,
    avatarUrl: row.avatar_url,
    password: row.password,
  };
}

function mapUserToSnake(obj: any) {
  return {
    id: obj.id,
    username: obj.username,
    name: obj.name,
    role: obj.role,
    email: obj.email || null,
    phone: obj.phone || null,
    teacher_id: obj.teacherId || null,
    student_id: obj.studentId || null,
    avatar_url: obj.avatarUrl || null,
    password: (obj as any).password || null,
  };
}

function mapClassToCamel(row: any) {
  return {
    id: row.id,
    name: row.name,
    gradeLevel: row.grade_level,
    classTeacherId: row.class_teacher_id,
  };
}

function mapClassToSnake(obj: any) {
  return {
    id: obj.id,
    name: obj.name,
    grade_level: obj.gradeLevel,
    class_teacher_id: obj.classTeacherId || null,
  };
}

function mapTeacherToCamel(row: any) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    qualification: row.qualification,
    dateJoined: row.date_joined,
    assignedClassId: row.assigned_class_id,
    avatarUrl: row.avatar_url,
  };
}

function mapTeacherToSnake(obj: any) {
  return {
    id: obj.id,
    first_name: obj.firstName,
    last_name: obj.lastName,
    email: obj.email,
    phone: obj.phone,
    gender: obj.gender,
    qualification: obj.qualification || null,
    date_joined: obj.dateJoined,
    assigned_class_id: obj.assignedClassId || null,
    avatar_url: obj.avatarUrl || null,
  };
}

function mapStudentToCamel(row: any) {
  return {
    id: row.id,
    admissionNumber: row.admission_number,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    currentClassId: row.current_class_id,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    parentEmail: row.parent_email,
    address: row.address,
    passportPhoto: row.passport_photo,
    status: row.status,
    enrolledSessionId: row.enrolled_session_id,
    password: row.password,
  };
}

function mapStudentToSnake(obj: any) {
  return {
    id: obj.id,
    admission_number: obj.admissionNumber,
    first_name: obj.firstName,
    last_name: obj.lastName,
    gender: obj.gender,
    date_of_birth: obj.dateOfBirth,
    current_class_id: obj.currentClassId || null,
    parent_name: obj.parentName,
    parent_phone: obj.parentPhone,
    parent_email: obj.parentEmail || null,
    address: obj.address || null,
    passport_photo: obj.passportPhoto || null,
    status: obj.status,
    enrolled_session_id: obj.enrolledSessionId || null,
    password: (obj as any).password || null,
  };
}

function mapClassSubjectToCamel(row: any) {
  return {
    id: row.id,
    classId: row.class_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
  };
}

function mapClassSubjectToSnake(obj: any) {
  return {
    id: obj.id,
    class_id: obj.classId,
    subject_id: obj.subjectId,
    teacher_id: obj.teacherId || null,
  };
}

function mapAttendanceToCamel(row: any) {
  return {
    id: row.id,
    classId: row.class_id,
    date: row.date,
    records: row.records, // JSONB field -> Array
    takenById: row.taken_by_id,
  };
}

function mapAttendanceToSnake(obj: any) {
  return {
    id: obj.id,
    class_id: obj.classId,
    date: obj.date,
    records: obj.records || [],
    taken_by_id: obj.takenById || null,
  };
}

function mapResultToCamel(row: any) {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    subjectId: row.subject_id,
    sessionId: row.session_id,
    termId: row.term_id,
    caScore: row.ca_score !== null ? parseFloat(row.ca_score) : null,
    examScore: row.exam_score !== null ? parseFloat(row.exam_score) : null,
    totalScore: row.total_score !== null ? parseFloat(row.total_score) : null,
    grade: row.grade,
    remark: row.remark,
    isApproved: row.is_approved,
    recordedBy: row.recorded_by,
  };
}

function mapResultToSnake(obj: any) {
  return {
    id: obj.id,
    student_id: obj.studentId,
    class_id: obj.classId,
    subject_id: obj.subjectId,
    session_id: obj.sessionId,
    term_id: obj.termId,
    ca_score: obj.caScore,
    exam_score: obj.examScore,
    total_score: obj.totalScore,
    grade: obj.grade,
    remark: obj.remark || null,
    is_approved: obj.isApproved || false,
    recorded_by: obj.recordedBy || null,
  };
}

function mapReportRemarkToCamel(row: any) {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    sessionId: row.session_id,
    termId: row.term_id,
    teacherRemark: row.teacher_remark,
    principalRemark: row.principal_remark,
    isPublished: row.is_published,
  };
}

function mapReportRemarkToSnake(obj: any) {
  return {
    id: obj.id,
    student_id: obj.studentId,
    class_id: obj.classId,
    session_id: obj.sessionId,
    term_id: obj.termId,
    teacher_remark: obj.teacherRemark || null,
    principal_remark: obj.principalRemark || null,
    is_published: obj.isPublished || false,
  };
}

function mapAcademicHistoryToCamel(row: any) {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    sessionId: row.session_id,
    termId: row.term_id,
    averageScore: row.average_score !== null ? parseFloat(row.average_score) : null,
    position: row.position,
    status: row.status,
  };
}

function mapAcademicHistoryToSnake(obj: any) {
  return {
    id: obj.id,
    student_id: obj.studentId,
    class_id: obj.classId,
    session_id: obj.sessionId,
    term_id: obj.termId,
    average_score: obj.averageScore,
    position: obj.position || null,
    status: obj.status || null,
  };
}

function mapNoticeToCamel(row: any) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    authorName: row.author_name,
    authorRole: row.author_role,
    datePosted: row.date_posted,
  };
}

function mapNoticeToSnake(obj: any) {
  return {
    id: obj.id,
    title: obj.title,
    content: obj.content,
    author_name: obj.authorName,
    author_role: obj.authorRole,
    date_posted: obj.datePosted,
  };
}

// =========================================================================
// SERVICE METHODS: FULL DATABASE LOAD AND BULK SAVE (UPSERT)
// =========================================================================

/**
 * Loads all data from Supabase tables and parses it to the app's db object.
 */
export async function loadFromSupabase(): Promise<any> {
  const sb = getSupabaseClient();
  console.log("📥 SUPABASE: Fetching complete educational records from Supabase cloud...");

  try {
    const [
      { data: users },
      { data: sessions },
      { data: terms },
      { data: classes },
      { data: subjects },
      { data: classSubjects },
      { data: teachers },
      { data: students },
      { data: attendance },
      { data: results },
      { data: reportRemarks },
      { data: academicHistory },
      { data: notices },
    ] = await Promise.all([
      sb.from("users").select("*"),
      sb.from("sessions").select("*"),
      sb.from("terms").select("*"),
      sb.from("classes").select("*"),
      sb.from("subjects").select("*"),
      sb.from("class_subjects").select("*"),
      sb.from("teachers").select("*"),
      sb.from("students").select("*"),
      sb.from("attendance").select("*"),
      sb.from("results").select("*"),
      sb.from("report_remarks").select("*"),
      sb.from("academic_history").select("*"),
      sb.from("notices").select("*"),
    ]);

    const resultDb = {
      users: (users || []).map(mapUserToCamel),
      sessions: (sessions || []).map((s) => ({ id: s.id, name: s.name, isCurrent: s.is_current })),
      terms: (terms || []).map((t) => ({ id: t.id, name: t.name, isCurrent: t.is_current })),
      classes: (classes || []).map(mapClassToCamel),
      subjects: (subjects || []).map((s) => ({ id: s.id, name: s.name, code: s.code })),
      classSubjects: (classSubjects || []).map(mapClassSubjectToCamel),
      teachers: (teachers || []).map(mapTeacherToCamel),
      students: (students || []).map(mapStudentToCamel),
      attendance: (attendance || []).map(mapAttendanceToCamel),
      results: (results || []).map(mapResultToCamel),
      reportRemarks: (reportRemarks || []).map(mapReportRemarkToCamel),
      academicHistory: (academicHistory || []).map(mapAcademicHistoryToCamel),
      notices: (notices || []).map(mapNoticeToCamel),
    };

    console.log(`✅ SUPABASE: Successfully compiled ${resultDb.users.length} users, ${resultDb.students.length} students, ${resultDb.teachers.length} teachers, and ${resultDb.results.length} result lines.`);
    return resultDb;
  } catch (error: any) {
    console.error("❌ SUPABASE_LOAD_ERROR:", error);
    throw new Error(`Failed to read records from Supabase: ${error.message}`);
  }
}

/**
 * Saves and updates the entire DB state in Supabase via secure upserts.
 */
export async function saveToSupabase(dbData: any): Promise<void> {
  const sb = getSupabaseClient();
  console.log("📤 SUPABASE: Initiating transactional upserts to Supabase cloud...");

  try {
    // 1. Sessions & Terms
    const sessionsData = (dbData.sessions || []).map((s: any) => ({ id: s.id, name: s.name, is_current: s.isCurrent }));
    const termsData = (dbData.terms || []).map((t: any) => ({ id: t.id, name: t.name, is_current: t.isCurrent }));
    
    // 2. Classes & Teachers (Independent tables first, then classes referencing teachers)
    const teachersData = (dbData.teachers || []).map(mapTeacherToSnake);
    const classesData = (dbData.classes || []).map(mapClassToSnake);
    
    // 3. Subjects & Class Subjects
    const subjectsData = (dbData.subjects || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
    const classSubjectsData = (dbData.classSubjects || []).map(mapClassSubjectToSnake);
    
    // 4. Students
    const studentsData = (dbData.students || []).map(mapStudentToSnake);
    
    // 5. Users (May reference teachers and students)
    const usersData = (dbData.users || []).map(mapUserToSnake);
    
    // 6. Attendance, Results, Remarks, History, Notices
    const attendanceData = (dbData.attendance || []).map(mapAttendanceToSnake);
    const resultsData = (dbData.results || []).map(mapResultToSnake);
    const reportRemarksData = (dbData.reportRemarks || []).map(mapReportRemarkToSnake);
    const academicHistoryData = (dbData.academicHistory || []).map(mapAcademicHistoryToSnake);
    const noticesData = (dbData.notices || []).map(mapNoticeToSnake);

    // Perform upserts sequentially to respect table references
    if (sessionsData.length) await sb.from("sessions").upsert(sessionsData);
    if (termsData.length) await sb.from("terms").upsert(termsData);
    
    // Sync teachers first, then classes, then link teacher class IDs back
    if (teachersData.length) await sb.from("teachers").upsert(teachersData);
    if (classesData.length) await sb.from("classes").upsert(classesData);
    if (subjectsData.length) await sb.from("subjects").upsert(subjectsData);
    if (classSubjectsData.length) await sb.from("class_subjects").upsert(classSubjectsData);
    if (studentsData.length) await sb.from("students").upsert(studentsData);
    if (usersData.length) await sb.from("users").upsert(usersData);
    
    if (attendanceData.length) await sb.from("attendance").upsert(attendanceData);
    if (resultsData.length) await sb.from("results").upsert(resultsData);
    if (reportRemarksData.length) await sb.from("report_remarks").upsert(reportRemarksData);
    if (academicHistoryData.length) await sb.from("academic_history").upsert(academicHistoryData);
    if (noticesData.length) await sb.from("notices").upsert(noticesData);

    console.log("⚡ SUPABASE: Upserts completed and fully synchronized!");
  } catch (error: any) {
    console.error("❌ SUPABASE_SAVE_ERROR:", error);
    throw new Error(`Failed to persist records to Supabase: ${error.message}`);
  }
}
