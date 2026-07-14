/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  email: string;
  phone?: string;
  teacherId?: string; // If role is 'teacher'
  studentId?: string; // If role is 'student'
  avatarUrl?: string;
  password?: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  currentClassId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  passportPhoto: string; // URL or Base64
  status: 'Active' | 'Graduated' | 'Suspended' | 'Withdrawn';
  enrolledSessionId: string;
  password?: string;
}

export interface Teacher {
  id: string;
  title?: string; // e.g. Mr., Mrs., Dr.
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female';
  qualification: string;
  dateJoined: string;
  assignedClassId?: string; // If they are a class teacher
  avatarUrl?: string;
  password?: string;
}

export interface Class {
  id: string;
  name: string; // e.g. JSS 1 Gold, SSS 3 Science
  gradeLevel: string; // e.g. JSS 1, SSS 3
  classTeacherId?: string;
}

export interface Subject {
  id: string;
  name: string; // e.g. Mathematics
  code: string; // e.g. MTH101
}

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
}

export interface Session {
  id: string;
  name: string; // e.g. 2025/2026
  isCurrent: boolean;
}

export interface Term {
  id: string;
  name: string; // e.g. First Term, Second Term
  isCurrent: boolean;
}

export interface AttendanceRecord {
  studentId: string;
  status: 'Present' | 'Absent' | 'Late';
}

export interface Attendance {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string;
  sessionId: string;
  termId: string;
  records: AttendanceRecord[];
}

export interface Result {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  sessionId: string;
  termId: string;
  caScore: number; // max 30 or 40
  examScore: number; // max 70 or 60
  totalScore: number; // caScore + examScore
  grade: string; // A, B, C, D, E, F
  remark: string; // Excellent, Good, Pass, Fail, etc.
  teacherId: string;
  isApproved: boolean;
}

export interface ReportCardRemark {
  id: string;
  studentId: string;
  classId: string;
  sessionId: string;
  termId: string;
  classTeacherRemark: string;
  principalRemark: string;
  isPublished: boolean;
  updatedAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  datePosted: string;
}

export interface StudentAcademicHistory {
  id: string;
  studentId: string;
  classId: string;
  sessionId: string;
  termId: string;
  averageScore: number;
  totalScore: number;
  position: number;
  totalStudents: number;
  status: 'Promoted' | 'Demoted' | 'Retained' | 'Completed' | 'Active';
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  todayAttendanceRate: number;
  noticesCount: number;
}
