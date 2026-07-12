/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Printer, Award, BookOpen, AlertCircle, CheckCircle } from "lucide-react";
import { Student, Result, ReportCardRemark, Class, Subject, Session, Term } from "../types";

interface ReportCardModalProps {
  studentId: string;
  onClose: () => void;
  userRole: 'admin' | 'teacher' | 'student';
}

export default function ReportCardModal({ studentId, onClose, userRole }: ReportCardModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    student: Student;
    results: Result[];
    totalScore: number;
    averageScore: number;
    subjectCount: number;
    position: number;
    totalStudentsCount: number;
    remarks: ReportCardRemark;
    currentSession: Session;
    currentTerm: Term;
  } | null>(null);

  const [classTeacherRemark, setClassTeacherRemark] = useState("");
  const [principalRemark, setPrincipalRemark] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetchReportCard();
    fetchMetadata();
  }, [studentId]);

  const fetchReportCard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/results/report-card/${studentId}`);
      if (!res.ok) throw new Error("Failed to load report card");
      const json = await res.json();
      setData(json);
      setClassTeacherRemark(json.remarks?.classTeacherRemark || "");
      setPrincipalRemark(json.remarks?.principalRemark || "");
      setIsPublished(json.remarks?.isPublished || false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [clsRes, subRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/subjects")
      ]);
      if (clsRes.ok) setClasses(await clsRes.json());
      if (subRes.ok) setSubjects(await subRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const saveRemarks = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/results/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          classId: data.student.currentClassId,
          classTeacherRemark,
          principalRemark,
          isPublished
        })
      });
      if (!res.ok) throw new Error("Failed to save remarks");
      setSuccess("Remarks saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Could not save remarks");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Generating report card...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertCircle size={20} /> Error
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <p className="text-gray-600 mb-4">{error || "Could not load report card data."}</p>
          <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  const getClassName = (cid: string) => classes.find(c => c.id === cid)?.name || cid;
  const getSubjectName = (sid: string) => subjects.find(s => s.id === sid)?.name || sid;
  const getSubjectCode = (sid: string) => subjects.find(s => s.id === sid)?.code || "";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto p-4 md:p-6 print:p-0 print:absolute print:inset-0 print:bg-white print:overflow-visible">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Header - Hidden on print */}
        <div className="flex justify-between items-center bg-gray-800 text-white p-4 rounded-t-xl print:hidden">
          <div className="flex items-center gap-2">
            <Award className="text-yellow-400" size={24} />
            <h3 className="font-bold text-lg">Academic Report Card Terminal View</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer size={16} /> Print Report Card
            </button>
            <button onClick={onClose} className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-gray-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 print:p-0 print:overflow-visible">
          {/* Printable Report Card Sheet */}
          <div className="border-4 border-double border-gray-800 p-6 rounded-lg bg-white print:border-none print:p-0">
            {/* School Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 uppercase tracking-tight">
                Petros ICA Secondary School
              </h1>
              <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">
                Acre of Hope, Academic Excellence & Integrity
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Petros Campus, Lagos Nigeria | Email: info@petrosica.edu.ng | Web: www.petrosica.edu.ng
              </p>
              <h2 className="text-sm font-semibold bg-gray-100 py-1.5 px-3 rounded inline-block mt-3 uppercase tracking-wider text-gray-800 border">
                Official Student Terminal Academic Transcript
              </h2>
            </div>

            {/* Profile Block */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Passport Photo */}
              <div className="flex justify-center md:justify-start items-center">
                <img
                  src={data.student.passportPhoto || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150"}
                  alt="Student Passport"
                  referrerPolicy="no-referrer"
                  className="w-28 h-28 object-cover rounded-lg border-2 border-gray-800 shadow"
                />
              </div>

              {/* Student details */}
              <div className="md:col-span-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-semibold">Student Name:</span>
                  <span className="font-bold text-base text-gray-900">{data.student.lastName}, {data.student.firstName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-semibold">Admission Number:</span>
                  <span className="font-mono font-bold text-indigo-700">{data.student.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-semibold">Current Class:</span>
                  <span className="font-semibold">{getClassName(data.student.currentClassId)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-semibold">Academic Session:</span>
                  <span className="font-semibold">{data.currentSession?.name || "2025/2026"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-semibold">Term:</span>
                  <span className="font-semibold text-indigo-600">{data.currentTerm?.name || "First Term"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-semibold">Gender:</span>
                  <span className="font-semibold">{data.student.gender}</span>
                </div>
              </div>
            </div>

            {/* Academic Results Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800 border border-gray-800">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 uppercase text-xs tracking-wider">
                    <th className="py-2.5 px-3 text-left font-bold border-r border-gray-800">Subject Code</th>
                    <th className="py-2.5 px-3 text-left font-bold border-r border-gray-800">Subject Name</th>
                    <th className="py-2.5 px-3 text-center font-bold border-r border-gray-800">CA Score (40)</th>
                    <th className="py-2.5 px-3 text-center font-bold border-r border-gray-800">Exam Score (60)</th>
                    <th className="py-2.5 px-3 text-center font-bold border-r border-gray-800">Total (100)</th>
                    <th className="py-2.5 px-3 text-center font-bold border-r border-gray-800">Grade</th>
                    <th className="py-2.5 px-3 text-left font-bold">Teacher's Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {data.results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                        No approved scores available for this student in the current session/term.
                      </td>
                    </tr>
                  ) : (
                    data.results.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono border-r border-gray-800">{getSubjectCode(res.subjectId)}</td>
                        <td className="py-2 px-3 font-semibold text-gray-900 border-r border-gray-800">{getSubjectName(res.subjectId)}</td>
                        <td className="py-2 px-3 text-center border-r border-gray-800">{res.caScore}</td>
                        <td className="py-2 px-3 text-center border-r border-gray-800">{res.examScore}</td>
                        <td className="py-2 px-3 text-center font-bold text-gray-900 border-r border-gray-800">{res.totalScore}</td>
                        <td className="py-2 px-3 text-center border-r border-gray-800">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            res.grade === "A" ? "bg-green-100 text-green-800" :
                            res.grade === "B" ? "bg-blue-100 text-blue-800" :
                            res.grade === "C" ? "bg-yellow-100 text-yellow-800" :
                            res.grade === "D" ? "bg-amber-100 text-amber-800" :
                            res.grade === "E" ? "bg-orange-100 text-orange-800" :
                            "bg-red-100 text-red-800"
                          }`}>{res.grade}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-700 italic">{res.remark}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Overall Score Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-indigo-50 border border-indigo-200 p-4 rounded-lg mb-6 text-sm">
              <div className="text-center border-r border-indigo-100 last:border-0">
                <span className="text-gray-500 block text-xs uppercase font-medium">Subjects Taken</span>
                <span className="text-xl font-extrabold text-indigo-900">{data.subjectCount}</span>
              </div>
              <div className="text-center border-r border-indigo-100 last:border-0">
                <span className="text-gray-500 block text-xs uppercase font-medium">Cumulative Total</span>
                <span className="text-xl font-extrabold text-indigo-900">{data.totalScore}</span>
              </div>
              <div className="text-center border-r border-indigo-100 last:border-0">
                <span className="text-gray-500 block text-xs uppercase font-medium">Overall Average</span>
                <span className="text-xl font-extrabold text-indigo-900">{data.averageScore}%</span>
              </div>
              <div className="text-center last:border-0">
                <span className="text-gray-500 block text-xs uppercase font-medium">Class Position</span>
                <span className="text-xl font-extrabold text-indigo-900">
                  {data.position > 0 ? `${data.position} of ${data.totalStudentsCount}` : "N/A"}
                </span>
              </div>
            </div>

            {/* Grading System Key */}
            <div className="mb-6 p-3 bg-gray-50 border rounded-lg text-xxs text-gray-500 font-mono">
              <span className="font-bold text-gray-700 mr-2 uppercase">Grading Criteria:</span>
              <span>A: 80-100 (Excellent)  |  B: 70-79 (Very Good)  |  C: 60-69 (Good)  |  D: 50-59 (Pass)  |  E: 40-49 (Weak Pass)  |  F: 0-39 (Fail)</span>
            </div>

            {/* Remarks Section */}
            <div className="space-y-4 text-sm text-gray-800 border-t pt-4">
              <div>
                <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Class Teacher's Remark:</span>
                <div className="bg-gray-50 p-3 rounded border italic text-gray-700 min-h-[50px] print:bg-white print:border-none print:pl-0">
                  {classTeacherRemark || <span className="text-gray-400">Pending class teacher's review.</span>}
                </div>
              </div>

              <div>
                <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Principal's Remark:</span>
                <div className="bg-gray-50 p-3 rounded border italic text-gray-700 min-h-[50px] print:bg-white print:border-none print:pl-0">
                  {principalRemark || <span className="text-gray-400">Pending principal's final sign-off.</span>}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-10 text-center">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs uppercase font-semibold text-gray-500">Class Teacher's Signature</p>
                  <p className="font-serif text-sm mt-1 text-gray-600">Petros ICA Academic Staff</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs uppercase font-semibold text-gray-500">Principal's Signature & Stamp</p>
                  <p className="font-serif text-sm mt-1 text-indigo-900 italic font-bold">Office of the Principal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks editor & Controls - Admin/Teacher access only - Hidden on Print */}
        {userRole !== "student" && (
          <div className="bg-gray-50 p-5 rounded-b-xl border-t print:hidden">
          <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-1">
            <BookOpen size={16} /> Update Report Card Remarks & Publications
          </h4>
          
          {error && <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs mb-3 font-medium">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 p-2.5 rounded text-xs mb-3 font-medium flex items-center gap-1"><CheckCircle size={14} />{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Class Teacher's Remark</label>
              <textarea
                value={classTeacherRemark}
                onChange={(e) => setClassTeacherRemark(e.target.value)}
                placeholder="Type your review for this student..."
                className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
              />
              <div className="flex gap-1.5 mt-1">
                <button 
                  onClick={() => setClassTeacherRemark("An exceptionally brilliant performance, keep up the excellent work!")}
                  className="bg-gray-200 hover:bg-gray-300 text-xxs text-gray-700 font-semibold px-2 py-1 rounded"
                >
                  Brilliant Preset
                </button>
                <button 
                  onClick={() => setClassTeacherRemark("A very good terminal result. Keep focus and strive for higher heights.")}
                  className="bg-gray-200 hover:bg-gray-300 text-xxs text-gray-700 font-semibold px-2 py-1 rounded"
                >
                  Good Preset
                </button>
                <button 
                  onClick={() => setClassTeacherRemark("Needs to work harder and revise topics thoroughly in the upcoming term.")}
                  className="bg-gray-200 hover:bg-gray-300 text-xxs text-gray-700 font-semibold px-2 py-1 rounded"
                >
                  Improvement Preset
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Principal's Remark</label>
              <textarea
                value={principalRemark}
                onChange={(e) => setPrincipalRemark(e.target.value)}
                placeholder="Type your sign-off or notes..."
                disabled={userRole !== "admin"}
                className={`w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20 ${userRole !== "admin" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
              />
              {userRole === "admin" && (
                <div className="flex gap-1.5 mt-1">
                  <button 
                    onClick={() => setPrincipalRemark("Excellent. Promoted with flying colors.")}
                    className="bg-gray-200 hover:bg-gray-300 text-xxs text-gray-700 font-semibold px-2 py-1 rounded"
                  >
                    Promoted Preset
                  </button>
                  <button 
                    onClick={() => setPrincipalRemark("Outstanding. Approved for terminal honors.")}
                    className="bg-gray-200 hover:bg-gray-300 text-xxs text-gray-700 font-semibold px-2 py-1 rounded"
                  >
                    Honors Preset
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center bg-white p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pub_check"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={userRole !== "admin"}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="pub_check" className="text-xs font-bold text-gray-700">
                Publish results to parent portal and lock reports
              </label>
              {userRole !== "admin" && <span className="text-xxs text-gray-400 italic">(Admin only)</span>}
            </div>

            <button
              onClick={saveRemarks}
              disabled={saving}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {saving ? "Saving..." : "Save Remarks"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
