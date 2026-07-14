/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Award, BookOpen, CheckCircle, ClipboardList, Printer, AlertCircle, ShieldAlert } from "lucide-react";
import { Student, Class, Subject, ClassSubject, Result, Teacher } from "../types";
import ReportCardModal from "./ReportCardModal";

interface ResultsManagerProps {
  userRole: 'admin' | 'teacher' | 'student';
  activeUserId: string;
}

type TabType = 'entry' | 'approval' | 'report_cards';

export default function ResultsManager({ userRole, activeUserId }: ResultsManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<TabType>("entry");
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  
  // Selection Filters
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Entry roster
  const [studentRoster, setStudentRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Report cards overview
  const [reportCardsOverview, setReportCardsOverview] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [activeReportStudentId, setActiveReportStudentId] = useState<string | null>(null);

  // Student specific states
  const [studentReportData, setStudentReportData] = useState<any | null>(null);
  const [studentReportLoading, setStudentReportLoading] = useState(false);
  const [studentReportError, setStudentReportError] = useState("");

  useEffect(() => {
    fetchMetadata();
    if (userRole === "student") {
      fetchStudentReport();
    }
  }, []);

  const fetchStudentReport = async () => {
    setStudentReportLoading(true);
    setStudentReportError("");
    try {
      const res = await fetch(`/api/results/report-card/${activeUserId}`);
      if (!res.ok) throw new Error("Could not find your terminal transcript. Contact the administration.");
      const data = await res.json();
      setStudentReportData(data);
    } catch (err: any) {
      setStudentReportError(err.message || "Failed to load report card");
    } finally {
      setStudentReportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && selectedSubjectId && activeSubTab === "entry") {
      fetchScoreRoster();
    }
  }, [selectedClassId, selectedSubjectId, activeSubTab]);

  useEffect(() => {
    if (selectedClassId && activeSubTab === "report_cards") {
      fetchReportCardsOverview();
    }
  }, [selectedClassId, activeSubTab]);

  const fetchMetadata = async () => {
    try {
      const [cls, sub, teach, cs] = await Promise.all([
        fetch("/api/classes").then(r => r.json()),
        fetch("/api/subjects").then(r => r.json()),
        fetch("/api/teachers").then(r => r.json()),
        fetch("/api/class-subjects").then(r => r.json())
      ]);
      setClasses(cls);
      setSubjects(sub);
      setTeachers(teach);
      setClassSubjects(cs);

      if (cls.length > 0) setSelectedClassId(cls[0].id);
      if (sub.length > 0) setSelectedSubjectId(sub[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScoreRoster = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // 1. Get students in class
      const stdRes = await fetch("/api/students");
      const students: Student[] = await stdRes.json();
      const classStudents = students.filter(s => s.currentClassId === selectedClassId && s.status === "Active");

      // 2. Get existing results for this subject/class
      const resRes = await fetch(`/api/results?classId=${selectedClassId}&subjectId=${selectedSubjectId}`);
      const existingResults: Result[] = await resRes.json();

      // Combine rosters
      const combined = classStudents.map(student => {
        const result = existingResults.find(r => r.studentId === student.id);
        return {
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          caScore: result ? result.caScore : "",
          examScore: result ? result.examScore : "",
          isApproved: result ? result.isApproved : false
        };
      });

      setStudentRoster(combined);
    } catch (err: any) {
      setError("Failed to load roster: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCardsOverview = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/results/class-report-cards?classId=${selectedClassId}`);
      if (res.ok) {
        setReportCardsOverview(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, field: 'caScore' | 'examScore', val: string) => {
    setStudentRoster(prev =>
      prev.map(item => {
        if (item.studentId === studentId) {
          const num = parseFloat(val);
          // Boundary validations: Max CA is 40, Exam is 60
          if (field === "caScore" && num > 40) return item;
          if (field === "examScore" && num > 60) return item;
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  const submitScores = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Get assigned teacher ID or admin default
      const teacher = teachers.find(t => t.email === "albert.einstein@petrosica.edu.ng");
      const teacherId = teacher ? teacher.id : "t1";

      const scores = studentRoster.map(item => ({
        studentId: item.studentId,
        caScore: parseFloat(item.caScore) || 0,
        examScore: parseFloat(item.examScore) || 0
      }));

      const res = await fetch("/api/results/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          teacherId,
          scores
        })
      });

      if (!res.ok) throw new Error("Could not submit scores");
      setSuccess("Scores submitted successfully! Pending Administrator final approval.");
      fetchScoreRoster();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Could not save scores");
    } finally {
      setSaving(false);
    }
  };

  // Admin approves results
  const approveScores = async (action: 'approve' | 'unapprove') => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/results/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          action
        })
      });

      if (!res.ok) throw new Error("Approval request failed");
      setSuccess(action === "approve" ? "Academic results approved & published successfully!" : "Academic results set back to draft!");
      fetchScoreRoster();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Automatic Grading preview calculations
  const getPreviewTotal = (ca: string | number, exam: string | number) => {
    const c = parseFloat(ca as any) || 0;
    const e = parseFloat(exam as any) || 0;
    return c + e;
  };

  const getPreviewGrade = (total: number) => {
    if (total >= 70) return "A";
    if (total >= 60) return "B";
    if (total >= 50) return "C";
    if (total >= 45) return "D";
    if (total >= 40) return "E";
    return "F";
  };

  if (userRole === "student") {
    if (studentReportLoading) {
      return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-semibold text-sm">Retrieving your terminal results...</p>
        </div>
      );
    }

    if (studentReportError || !studentReportData) {
      return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex bg-red-50 p-3 rounded-full mb-4">
            <AlertCircle className="text-red-600 h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Academic Report Card Unavailable</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            {studentReportError || "We could not find any active, published academic transcripts for your account in this session. Your class teacher may still be compiling terminal grades."}
          </p>
          <button
            onClick={fetchStudentReport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Refresh Grade Sync
          </button>
        </div>
      );
    }

    const { student, results, totalScore, averageScore, subjectCount, position, totalStudentsCount, remarks, currentSession, currentTerm } = studentReportData;

    // Check if the administrator has published results
    const isPublished = remarks?.isPublished;

    return (
      <div className="space-y-6">
        {/* Student Results Overview Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="bg-indigo-800 text-indigo-200 border border-indigo-700/50 text-xxs font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider">
                My Academic Portal
              </span>
              <h2 className="text-xl md:text-2xl font-black mt-2">Terminal Results & Report Card</h2>
              <p className="text-xs text-indigo-200 mt-1">
                Academic Session: <strong className="text-white">{currentSession?.name || "2025/2026"}</strong> | {currentTerm?.name || "First Term"}
              </p>
            </div>

            <button
              onClick={() => setActiveReportStudentId(activeUserId)}
              disabled={!isPublished}
              className={`font-semibold text-sm px-5 py-3 rounded-xl shadow-md flex items-center gap-2 transition-all ${
                isPublished
                  ? "bg-amber-400 hover:bg-amber-300 text-indigo-950 cursor-pointer"
                  : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
              }`}
            >
              <Printer size={16} />
              {isPublished ? "Download PDF Report Card" : "Report Pending Release"}
            </button>
          </div>

          <div className="p-6 md:p-8">
            {/* Status Alert */}
            {!isPublished ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-amber-900">
                <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-950">Result Pending Official Release</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Your grades have been submitted by the class instructors and are currently undergoing the administrative sign-off process. The formal "Download PDF" transcript option will activate immediately once approved and signed by the School Principal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-emerald-900">
                <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-950">Terminal Transcript Published</h4>
                  <p className="text-xs text-gray-600 mt-1 font-medium">
                    Congratulations! Your terminal results have been approved and published by the school administration. Click "Download PDF Report Card" above to print or save your official signed report card.
                  </p>
                </div>
              </div>
            )}

            {/* Performance Widgets Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50/50 border rounded-xl p-4 text-center">
                <span className="text-gray-400 block text-xxs font-bold uppercase tracking-wider mb-1">Subjects Tracked</span>
                <span className="text-2xl font-black text-slate-800">{subjectCount}</span>
              </div>
              <div className="bg-slate-50/50 border rounded-xl p-4 text-center">
                <span className="text-gray-400 block text-xxs font-bold uppercase tracking-wider mb-1">Cumulative Total</span>
                <span className="text-2xl font-black text-slate-800">{totalScore}</span>
              </div>
              <div className="bg-slate-50/50 border rounded-xl p-4 text-center">
                <span className="text-gray-400 block text-xxs font-bold uppercase tracking-wider mb-1">Terminal Average</span>
                <span className="text-2xl font-black text-indigo-700">{averageScore}%</span>
              </div>
              <div className="bg-slate-50/50 border rounded-xl p-4 text-center">
                <span className="text-gray-400 block text-xxs font-bold uppercase tracking-wider mb-1">Class Position</span>
                <span className="text-2xl font-black text-emerald-700">
                  {isPublished && position > 0 ? `${position} of ${totalStudentsCount}` : "Pending"}
                </span>
              </div>
            </div>

            {/* Results Roster */}
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Subject-by-Subject Grade sheet</h3>
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-slate-50 text-xxs font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 text-left">Subject Code</th>
                      <th className="py-3 px-4 text-left">Subject Name</th>
                      <th className="py-3 px-4 text-center">Continuous Ass. (40)</th>
                      <th className="py-3 px-4 text-center">Examination (60)</th>
                      <th className="py-3 px-4 text-center">Total (100)</th>
                      <th className="py-3 px-4 text-center">Letter Grade</th>
                      <th className="py-3 px-4 text-left">Teacher's Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                          No score data recorded for your account yet.
                        </td>
                      </tr>
                    ) : (
                      results.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-gray-500 font-bold">
                            {subjects.find((s: any) => s.id === res.subjectId)?.code || "SUB"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {subjects.find((s: any) => s.id === res.subjectId)?.name || res.subjectId}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-600">
                            {res.isApproved ? res.caScore : <span className="text-gray-400 font-normal italic">Pending</span>}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-600">
                            {res.isApproved ? res.examScore : <span className="text-gray-400 font-normal italic">Pending</span>}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-indigo-950">
                            {res.isApproved ? res.totalScore : <span className="text-gray-400 font-normal">--</span>}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {res.isApproved ? (
                              <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                res.grade === "A" ? "bg-green-100 text-green-800" :
                                res.grade === "B" ? "bg-blue-100 text-blue-800" :
                                res.grade === "C" ? "bg-yellow-100 text-yellow-800" :
                                res.grade === "D" ? "bg-amber-100 text-amber-800" :
                                res.grade === "E" ? "bg-orange-100 text-orange-800" :
                                "bg-red-100 text-red-800"
                              }`}>{res.grade}</span>
                            ) : (
                              <span className="text-gray-400 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 italic text-xs max-w-xs truncate">
                            {res.isApproved ? res.remark : <span className="text-gray-400 font-normal font-sans">Scores are draft format</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal for actual print view */}
        {activeReportStudentId && (
          <ReportCardModal
            studentId={activeReportStudentId}
            onClose={() => setActiveReportStudentId(null)}
            userRole={userRole}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Sub Tabs */}
      <div className="flex border-b text-sm font-semibold text-gray-500 bg-gray-50">
        <button
          onClick={() => setActiveSubTab("entry")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "entry" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Grade Entry Portal
        </button>
        {userRole === "admin" && (
          <button
            onClick={() => setActiveSubTab("approval")}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "approval" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
          >
            Admin Sign-Off Dashboard
          </button>
        )}
        <button
          onClick={() => setActiveSubTab("report_cards")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "report_cards" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Report Card Center
        </button>
      </div>

      <div className="p-6">
        {/* Selector Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-sm border p-2 bg-white rounded-lg focus:outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {activeSubTab !== "report_cards" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Select Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full text-sm border p-2 bg-white rounded-lg focus:outline-none"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-1"><CheckCircle size={16} />{success}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-1"><AlertCircle size={16} />{error}</div>}

        {/* GRADE ENTRY PORTAL */}
        {activeSubTab === "entry" && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : studentRoster.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">No students found in this class.</div>
            ) : (
              <div>
                <div className="overflow-x-auto border rounded-xl mb-6">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">Admission No</th>
                        <th className="py-3 px-4 text-left">Student Name</th>
                        <th className="py-3 px-4 text-center w-28">Continuous Ass. (40)</th>
                        <th className="py-3 px-4 text-center w-28">Examination (60)</th>
                        <th className="py-3 px-4 text-center w-20">Total (100)</th>
                        <th className="py-3 px-4 text-center w-16">Grade</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {studentRoster.map(item => {
                        const total = getPreviewTotal(item.caScore, item.examScore);
                        return (
                          <tr key={item.studentId} className="hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono font-bold text-gray-500">{item.admissionNumber}</td>
                            <td className="py-3 px-4 font-semibold text-gray-800">{item.name}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="40"
                                value={item.caScore}
                                disabled={item.isApproved}
                                onChange={(e) => handleScoreChange(item.studentId, "caScore", e.target.value)}
                                className={`w-20 border rounded-lg p-1.5 text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none ${item.isApproved ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="60"
                                value={item.examScore}
                                disabled={item.isApproved}
                                onChange={(e) => handleScoreChange(item.studentId, "examScore", e.target.value)}
                                className={`w-20 border rounded-lg p-1.5 text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none ${item.isApproved ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                              />
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-indigo-900">{total}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                total >= 70 ? "bg-green-100 text-green-800" :
                                total >= 50 ? "bg-blue-100 text-blue-800" :
                                total >= 40 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }`}>{getPreviewGrade(total)}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.isApproved ? (
                                <span className="bg-green-100 text-green-800 font-bold text-xxs px-2 py-0.5 rounded uppercase">Approved</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 font-bold text-xxs px-2 py-0.5 rounded uppercase">Draft / Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={submitScores}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm"
                  >
                    {saving ? "Submitting scores..." : "Submit Student Scores"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN SIGN OFF / APPROVALS */}
        {activeSubTab === "approval" && userRole === "admin" && (
          <div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 flex items-start gap-3">
              <ShieldAlert className="text-indigo-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-indigo-950 text-sm">Syllabus Approval Control</h4>
                <p className="text-xs text-gray-600 mt-1">
                  As an Administrator, you have the authority to review submitted grades from teachers, sign off on their scores, and publish them immediately onto the student report cards. Approved scores are locked and cannot be edited by teachers.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : studentRoster.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">No scores submitted for this class.</div>
            ) : (
              <div>
                <div className="mb-4 bg-gray-50 p-3 rounded-lg flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-600">
                    Syllabus Overview: Class: <strong className="text-gray-900">{classes.find(c => c.id === selectedClassId)?.name}</strong> | Subject: <strong className="text-gray-900">{subjects.find(s => s.id === selectedSubjectId)?.name}</strong>
                  </span>
                  <span className="font-mono text-gray-500 font-bold">{studentRoster.length} Records</span>
                </div>

                {/* Score Preview list */}
                <div className="overflow-x-auto border rounded-xl mb-6">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Student Name</th>
                        <th className="py-2.5 px-4 text-center">CA (40)</th>
                        <th className="py-2.5 px-4 text-center">Exam (60)</th>
                        <th className="py-2.5 px-4 text-center">Total (100)</th>
                        <th className="py-2.5 px-4 text-center">Grade</th>
                        <th className="py-2.5 px-4 text-center">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {studentRoster.map(item => {
                        const total = getPreviewTotal(item.caScore, item.examScore);
                        return (
                          <tr key={item.studentId}>
                            <td className="py-2.5 px-4 font-semibold text-gray-800">{item.name}</td>
                            <td className="py-2.5 px-4 text-center">{item.caScore || 0}</td>
                            <td className="py-2.5 px-4 text-center">{item.examScore || 0}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-gray-900">{total}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-indigo-700">{getPreviewGrade(total)}</td>
                            <td className="py-2.5 px-4 text-center">
                              {item.isApproved ? (
                                <span className="bg-green-100 text-green-800 text-xxs font-bold px-2 py-0.5 rounded uppercase">Approved</span>
                              ) : (
                                <span className="bg-yellow-100 text-yellow-800 text-xxs font-bold px-2 py-0.5 rounded uppercase">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => approveScores("unapprove")}
                    disabled={saving}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-5 py-2.5 rounded-lg border transition-colors"
                  >
                    Unapprove / Set to Draft
                  </button>
                  <button
                    onClick={() => approveScores("approve")}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
                  >
                    {saving ? "Processing sign-off..." : "Approve & Sign-off Scores"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORT CARD CENTER */}
        {activeSubTab === "report_cards" && (
          <div>
            {reportsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : reportCardsOverview.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">No academic data found for this class. Please enter and approve scores first.</div>
            ) : (
              <div>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">Admission Number</th>
                        <th className="py-3 px-4 text-left">Student Name</th>
                        <th className="py-3 px-4 text-center">Approved Subjects</th>
                        <th className="py-3 px-4 text-center">Total Score</th>
                        <th className="py-3 px-4 text-center">Average Score (%)</th>
                        <th className="py-3 px-4 text-center">Class Position</th>
                        <th className="py-3 px-4 text-center">Publication State</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportCardsOverview.map((item: any) => (
                        <tr key={item.student.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono font-bold text-gray-500">{item.student.admissionNumber}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{item.student.lastName}, {item.student.firstName}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{item.subjectCount}</td>
                          <td className="py-3 px-4 text-center text-gray-800 font-medium">{item.totalScore}</td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-900">{item.averageScore}%</td>
                          <td className="py-3 px-4 text-center font-bold">
                            {item.position > 0 ? `${item.position} of ${item.totalStudentsCount}` : <span className="text-gray-400 italic font-normal">N/A</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.remarks?.isPublished ? (
                              <span className="bg-indigo-100 text-indigo-800 font-bold text-xxs px-2 py-0.5 rounded uppercase">Published</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 font-bold text-xxs px-2 py-0.5 rounded uppercase">Draft</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setActiveReportStudentId(item.student.id)}
                              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto"
                            >
                              <Printer size={14} /> Open Transcript
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Card Sheet Modal */}
      {activeReportStudentId && (
        <ReportCardModal
          studentId={activeReportStudentId}
          onClose={() => {
            setActiveReportStudentId(null);
            if (activeSubTab === "report_cards") {
              fetchReportCardsOverview();
            }
          }}
          userRole={userRole}
        />
      )}
    </div>
  );
}
