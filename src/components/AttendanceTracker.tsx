/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ClipboardList, Calendar, CheckCircle2, Award, User, Clock, AlertCircle } from "lucide-react";
import { Student, Class, AttendanceRecord, Attendance } from "../types";

interface AttendanceTrackerProps {
  userRole: 'admin' | 'teacher';
}

type TabType = 'take' | 'reports';

export default function AttendanceTracker({ userRole }: AttendanceTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<TabType>("take");
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Report States
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId && activeSubTab === "take") {
      fetchAttendanceRoster();
    } else if (selectedClassId && activeSubTab === "reports") {
      fetchAttendanceReport();
    }
  }, [selectedClassId, selectedDate, activeSubTab]);

  const fetchInitialData = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const cls = await res.json();
        setClasses(cls);
        if (cls.length > 0) {
          setSelectedClassId(cls[0].id);
        }
      }
      const stRes = await fetch("/api/students");
      if (stRes.ok) setStudents(await stRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendanceRoster = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}&classId=${selectedClassId}`);
      if (!res.ok) throw new Error("Failed to load attendance roster");
      const data: Attendance = await res.json();
      setAttendanceRecords(data.records);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/attendance/report?classId=${selectedClassId}`);
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceRecords(prev => 
      prev.map(r => r.studentId === studentId ? { ...r, status } : r)
    );
  };

  const saveAttendance = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClassId,
          records: attendanceRecords
        })
      });
      if (!res.ok) throw new Error("Failed to save attendance logs");
      setSuccess("Attendance saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Could not log attendance");
    } finally {
      setSaving(false);
    }
  };

  const getStudentName = (sid: string) => {
    const s = students.find(stud => stud.id === sid);
    return s ? `${s.firstName} ${s.lastName}` : sid;
  };

  const getStudentAdm = (sid: string) => {
    const s = students.find(stud => stud.id === sid);
    return s ? s.admissionNumber : "";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Attendance sub tabs */}
      <div className="flex border-b text-sm font-semibold text-gray-500 bg-gray-50">
        <button
          onClick={() => setActiveSubTab("take")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "take" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Daily Attendance Register
        </button>
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "reports" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Class Attendance Reports
        </button>
      </div>

      <div className="p-6">
        {/* Selector Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Academic Class</label>
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

          {activeSubTab === "take" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-sm border p-2 bg-white rounded-lg focus:outline-none"
              />
            </div>
          )}
        </div>

        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={16} />{success}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-1"><AlertCircle size={16} />{error}</div>}

        {/* ROSTER / REGISTER VIEW */}
        {activeSubTab === "take" && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">
                No active students enrolled in this class to log attendance.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto border rounded-xl mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">Admission No</th>
                        <th className="py-3 px-4 text-left">Student Name</th>
                        <th className="py-3 px-4 text-center">Status Registration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {attendanceRecords.map(rec => (
                        <tr key={rec.studentId} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono font-bold text-gray-500">{getStudentAdm(rec.studentId)}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{getStudentName(rec.studentId)}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(rec.studentId, "Present")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all ${
                                  rec.status === "Present" ? "bg-green-100 border-green-300 text-green-800 ring-2 ring-green-100" : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <User size={12} /> Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(rec.studentId, "Late")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all ${
                                  rec.status === "Late" ? "bg-yellow-100 border-yellow-300 text-yellow-800 ring-2 ring-yellow-100" : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <Clock size={12} /> Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(rec.studentId, "Absent")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all ${
                                  rec.status === "Absent" ? "bg-red-100 border-red-300 text-red-800 ring-2 ring-red-100" : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <AlertCircle size={12} /> Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={saveAttendance}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
                  >
                    {saving ? "Saving logs..." : "Save Attendance"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORTS VIEW */}
        {activeSubTab === "reports" && (
          <div>
            {reportLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">
                No attendance reports logged for the current active Term yet.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">Admission Number</th>
                        <th className="py-3 px-4 text-left">Student Name</th>
                        <th className="py-3 px-4 text-center">Days Present</th>
                        <th className="py-3 px-4 text-center">Days Late</th>
                        <th className="py-3 px-4 text-center">Days Absent</th>
                        <th className="py-3 px-4 text-center">Total Sessions</th>
                        <th className="py-3 px-4 text-center">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {reportData.map((row: any) => (
                        <tr key={row.studentId} className="hover:bg-gray-50">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-500">{row.admissionNumber}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{row.name}</td>
                          <td className="py-3.5 px-4 text-center text-green-700 font-medium">{row.present}</td>
                          <td className="py-3.5 px-4 text-center text-yellow-700 font-medium">{row.late}</td>
                          <td className="py-3.5 px-4 text-center text-red-700 font-medium">{row.absent}</td>
                          <td className="py-3.5 px-4 text-center text-gray-500">{row.totalDays}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-bold text-xs ${
                                row.attendanceRate >= 90 ? "text-green-600" :
                                row.attendanceRate >= 75 ? "text-yellow-600" : "text-red-600"
                              }`}>{row.attendanceRate}%</span>
                              
                              <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full ${
                                    row.attendanceRate >= 90 ? "bg-green-500" :
                                    row.attendanceRate >= 75 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${row.attendanceRate}%` }}
                                ></div>
                              </div>
                            </div>
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
    </div>
  );
}
