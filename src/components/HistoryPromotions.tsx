/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Award, ClipboardList, CheckCircle2, TrendingUp, ArrowRight, UserCheck, Search, AlertCircle } from "lucide-react";
import { Student, Class, StudentAcademicHistory } from "../types";

interface HistoryPromotionsProps {
  userRole: 'admin' | 'teacher';
}

type TabType = 'promote' | 'logs';

export default function HistoryPromotions({ userRole }: HistoryPromotionsProps) {
  const [activeSubTab, setActiveSubTab] = useState<TabType>("promote");
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [histories, setHistories] = useState<StudentAcademicHistory[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [promotionAction, setPromotionAction] = useState<'promote' | 'retain' | 'graduate'>("promote");
  
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);
  const [rosterData, setRosterData] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId && activeSubTab === "promote") {
      fetchPromotionRoster();
    }
  }, [selectedClassId, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === "logs") {
      fetchHistoryLogs();
    }
  }, [activeSubTab]);

  const fetchInitialData = async () => {
    try {
      const [clsRes, stRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/students")
      ]);
      if (clsRes.ok) {
        const cls = await clsRes.json();
        setClasses(cls);
        if (cls.length > 0) {
          setSelectedClassId(cls[0].id);
          setTargetClassId(cls[1]?.id || cls[0].id);
        }
      }
      if (stRes.ok) setStudents(await stRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPromotionRoster = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/results/class-report-cards?classId=${selectedClassId}`);
      if (res.ok) {
        const roster = await res.json();
        setRosterData(roster);
        setCheckedStudentIds([]); // clear checkbox
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/academic-history");
      if (res.ok) {
        setHistories(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectStudent = (sid: string) => {
    setCheckedStudentIds(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  const toggleSelectAll = () => {
    if (checkedStudentIds.length === rosterData.length) {
      setCheckedStudentIds([]);
    } else {
      setCheckedStudentIds(rosterData.map(item => item.student.id));
    }
  };

  const handleProcessPromotion = async () => {
    if (checkedStudentIds.length === 0) {
      alert("Please check / select at least one student from the roster below.");
      return;
    }
    if (promotionAction === "promote" && !targetClassId) {
      alert("Please choose a valid target class to promote students to.");
      return;
    }

    const confirmMsg = promotionAction === "promote" ? "Are you sure you want to promote selected students to the new class?" :
                       promotionAction === "graduate" ? "Are you sure you want to graduate selected students? This marks them as Alumni." :
                       "Are you sure you want to retain selected students in the same class level?";

    if (!window.confirm(confirmMsg)) return;

    setProcessing(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/academic-history/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: checkedStudentIds,
          targetClassId: promotionAction === "promote" ? targetClassId : "",
          action: promotionAction
        })
      });

      if (!res.ok) throw new Error("Could not execute promotion/retention batch");
      setSuccess("Student promotion status processed successfully!");
      fetchPromotionRoster();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed processing promotions");
    } finally {
      setProcessing(false);
    }
  };

  const getStudentName = (sid: string) => {
    const s = students.find(stud => stud.id === sid);
    return s ? `${s.lastName}, ${s.firstName}` : sid;
  };

  const getStudentAdm = (sid: string) => {
    const s = students.find(stud => stud.id === sid);
    return s ? s.admissionNumber : "";
  };

  const getClassName = (cid: string) => {
    return classes.find(c => c.id === cid)?.name || "Unassigned / Graduated";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Sub tabs list */}
      <div className="flex border-b text-sm font-semibold text-gray-500 bg-gray-50">
        <button
          onClick={() => setActiveSubTab("promote")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "promote" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Session Promotions Board
        </button>
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeSubTab === "logs" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Academic History Logs
        </button>
      </div>

      <div className="p-6">
        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={16} />{success}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-1"><AlertCircle size={16} />{error}</div>}

        {/* SESSION PROMOTIONS TAB */}
        {activeSubTab === "promote" && (
          <div>
            {/* Promotions parameters */}
            <div className="bg-gray-50 p-4 rounded-xl border mb-6">
              <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-3">Batch Promotion Parameters (Administrator Review)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Source Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full text-sm border p-2 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Promotion Action</label>
                  <select
                    value={promotionAction}
                    onChange={(e) => setPromotionAction(e.target.value as any)}
                    className="w-full text-sm border p-2 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="promote">Promote to New Class</option>
                    <option value="retain">Retain in Current Class</option>
                    <option value="graduate">Graduate Student (Alumni)</option>
                  </select>
                </div>

                {promotionAction === "promote" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Target Promotion Class</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full text-sm border p-2 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={handleProcessPromotion}
                    disabled={processing || rosterData.length === 0 || userRole !== "admin"}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <UserCheck size={16} /> Process Batch {processing ? "..." : ""}
                  </button>
                </div>
              </div>
              {userRole !== "admin" && <p className="text-xxs text-red-500 font-semibold mt-2">Only administrators can perform promotion operations.</p>}
            </div>

            {/* Student list with status preview */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : rosterData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">No students found in this source class.</div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
                  <span>Check students you wish to apply the batch action to.</span>
                  <button onClick={toggleSelectAll} className="text-indigo-600 hover:underline font-semibold">
                    {checkedStudentIds.length === rosterData.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-center w-12">
                          <input
                            type="checkbox"
                            checked={checkedStudentIds.length > 0 && checkedStudentIds.length === rosterData.length}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                        </th>
                        <th className="py-3 px-4 text-left">Admission Number</th>
                        <th className="py-3 px-4 text-left">Student Name</th>
                        <th className="py-3 px-4 text-center">Approved Subjects</th>
                        <th className="py-3 px-4 text-center">Average Score (%)</th>
                        <th className="py-3 px-4 text-center">Suggested Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rosterData.map(item => (
                        <tr key={item.student.id} className={`hover:bg-gray-50 ${checkedStudentIds.includes(item.student.id) ? "bg-indigo-50/20" : ""}`}>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={checkedStudentIds.includes(item.student.id)}
                              onChange={() => toggleSelectStudent(item.student.id)}
                              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-500">{item.student.admissionNumber}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{item.student.lastName}, {item.student.firstName}</td>
                          <td className="py-3 px-4 text-center">{item.subjectCount}</td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-900">{item.averageScore}%</td>
                          <td className="py-3 px-4 text-center">
                            {item.averageScore >= 50 ? (
                              <span className="bg-green-100 text-green-800 text-xxs font-bold px-2 py-0.5 rounded uppercase">Recommended Promotion</span>
                            ) : (
                              <span className="bg-red-100 text-red-800 text-xxs font-bold px-2 py-0.5 rounded uppercase">Recommended Retention</span>
                            )}
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

        {/* LOGS TAB */}
        {activeSubTab === "logs" && (
          <div>
            <div className="mb-4 relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search history by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border rounded-lg focus:outline-none"
              />
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : histories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">No academic history records logged in this school system yet.</div>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-left">Admission No</th>
                      <th className="py-3 px-4 text-left">Student Name</th>
                      <th className="py-3 px-4 text-left">Historical Class</th>
                      <th className="py-3 px-4 text-center">Cumulative Total</th>
                      <th className="py-3 px-4 text-center">Terminal Average</th>
                      <th className="py-3 px-4 text-center">Class Rank</th>
                      <th className="py-3 px-4 text-center">Status Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {histories
                      .filter(h => getStudentName(h.studentId).toLowerCase().includes(search.toLowerCase()))
                      .map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono font-bold text-gray-500">{getStudentAdm(h.studentId)}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{getStudentName(h.studentId)}</td>
                          <td className="py-3 px-4">{getClassName(h.classId)}</td>
                          <td className="py-3 px-4 text-center">{h.totalScore}</td>
                          <td className="py-3 px-4 text-center text-indigo-700 font-bold">{h.averageScore}%</td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-600">
                            {h.position > 0 ? `${h.position} of ${h.totalStudents}` : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-xxs font-bold uppercase ${
                              h.status === "Promoted" ? "bg-green-100 text-green-800" :
                              h.status === "Completed" ? "bg-blue-100 text-blue-800" :
                              "bg-red-100 text-red-800"
                            }`}>{h.status}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
