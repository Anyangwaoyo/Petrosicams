/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Calendar, Settings, BookOpen, Link, Check, AlertCircle } from "lucide-react";
import { Class, Subject, ClassSubject, Teacher, Session, Term } from "../types";

interface AcademicsSetupProps {
  userRole: 'admin' | 'teacher' | 'student';
}

type TabType = 'classes' | 'subjects' | 'allocations' | 'sessions_terms';

export default function AcademicsSetup({ userRole }: AcademicsSetupProps) {
  const [activeTab, setActiveTab] = useState<TabType>("classes");
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allocations, setAllocations] = useState<ClassSubject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals / Form entries
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);

  // Forms state
  const [classForm, setClassForm] = useState({ id: "", name: "", gradeLevel: "", classTeacherId: "" });
  const [subjectForm, setSubjectForm] = useState({ id: "", name: "", code: "" });
  const [allocForm, setAllocForm] = useState({ id: "", classId: "", subjectId: "", teacherId: "" });
  const [sessionForm, setSessionForm] = useState({ id: "", name: "", isCurrent: false });
  const [termForm, setTermForm] = useState({ id: "", name: "", isCurrent: false });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cls, sub, teach, alloc, ses, tms] = await Promise.all([
        fetch("/api/classes").then(r => r.json()),
        fetch("/api/subjects").then(r => r.json()),
        fetch("/api/teachers").then(r => r.json()),
        fetch("/api/class-subjects").then(r => r.json()),
        fetch("/api/sessions").then(r => r.json()),
        fetch("/api/terms").then(r => r.json())
      ]);
      setClasses(cls);
      setSubjects(sub);
      setTeachers(teach);
      setAllocations(alloc);
      setSessions(ses);
      setTerms(tms);
    } catch (e: any) {
      setError("Failed to load academic settings");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Class Actions
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!classForm.id;
      const url = isEdit ? `/api/classes/${classForm.id}` : "/api/classes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm)
      });
      if (!res.ok) throw new Error("Could not save class");
      showToast(isEdit ? "Class updated successfully!" : "New Class created successfully!");
      setShowClassModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class? Student associations will be cleared.")) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete class");
      showToast("Class deleted successfully");
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Subject Actions
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!subjectForm.id;
      const url = isEdit ? `/api/subjects/${subjectForm.id}` : "/api/subjects";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm)
      });
      if (!res.ok) throw new Error("Could not save subject");
      showToast(isEdit ? "Subject updated successfully!" : "New Subject created successfully!");
      setShowSubjectModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this subject? This clears associated syllabus entries.")) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subject");
      showToast("Subject deleted successfully");
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Allocation Actions
  const handleAllocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/class-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocForm)
      });
      if (!res.ok) throw new Error("Could not assign subject teacher");
      showToast("Subject Teacher allocated successfully!");
      setShowAllocModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDeleteAlloc = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this subject teacher assignment?")) return;
    try {
      const res = await fetch(`/api/class-subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove assignment");
      showToast("Assignment removed successfully");
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Active State Toggles
  const handleActiveSession = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}/current`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to set current session");
      showToast("Active Session updated successfully!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleActiveTerm = async (id: string) => {
    try {
      const res = await fetch(`/api/terms/${id}/current`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to set current term");
      showToast("Active Academic Term updated successfully!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Session Submit
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionForm)
      });
      if (!res.ok) throw new Error("Could not create session");
      showToast("Academic Session created!");
      setShowSessionModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Term Submit
  const handleTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(termForm)
      });
      if (!res.ok) throw new Error("Could not create term");
      showToast("Academic Term created!");
      setShowTermModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const getTeacherName = (tid?: string) => {
    if (!tid) return <span className="text-gray-400 italic">None</span>;
    const t = teachers.find(teach => teach.id === tid);
    return t ? `${t.title || "Mr."} ${t.firstName} ${t.lastName}` : tid;
  };

  const getClassName = (cid: string) => classes.find(c => c.id === cid)?.name || cid;
  const getSubjectName = (sid: string) => subjects.find(s => s.id === sid)?.name || sid;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Tabs list */}
      <div className="flex border-b text-sm font-semibold text-gray-500 bg-gray-50">
        <button
          onClick={() => setActiveTab("classes")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeTab === "classes" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Classes & Class Teachers
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeTab === "subjects" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Subjects Curriculum
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeTab === "allocations" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Subject Allocations
        </button>
        <button
          onClick={() => setActiveTab("sessions_terms")}
          className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${activeTab === "sessions_terms" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:bg-gray-100"}`}
        >
          Sessions & Terms Setup
        </button>
      </div>

      <div className="p-6">
        {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium">{success}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div>
            {/* CLASSES TAB */}
            {activeTab === "classes" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-gray-800 text-base">Classroom Directory</h3>
                  {(userRole === "admin" || userRole === "teacher") && (
                    <button
                      onClick={() => { setClassForm({ id: "", name: "", gradeLevel: "JSS 1", classTeacherId: "" }); setShowClassModal(true); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> Create New Class
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map(c => (
                    <div key={c.id} className="border rounded-xl p-4 flex justify-between items-center hover:shadow-sm transition-shadow">
                      <div>
                        <h4 className="font-bold text-gray-800 text-base">{c.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-mono">Grade Level: {c.gradeLevel}</p>
                        <div className="mt-3 text-xs bg-indigo-50/50 text-indigo-700 border border-indigo-100 rounded-lg py-1 px-3.5 inline-block">
                          <strong>Form Class Teacher:</strong> {getTeacherName(c.classTeacherId)}
                        </div>
                      </div>

                      {(userRole === "admin" || userRole === "teacher") && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setClassForm({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, classTeacherId: c.classTeacherId || "" }); setShowClassModal(true); }}
                            className="p-1 text-gray-500 hover:text-indigo-600 rounded hover:bg-gray-100"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(c.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBJECTS TAB */}
            {activeTab === "subjects" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-gray-800 text-base">Curriculum Subjects</h3>
                  {(userRole === "admin" || userRole === "teacher") && (
                    <button
                      onClick={() => { setSubjectForm({ id: "", name: "", code: "" }); setShowSubjectModal(true); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> Create New Subject
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subjects.map(s => (
                    <div key={s.id} className="border rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-600 uppercase tracking-widest block">{s.code}</span>
                        <h4 className="font-extrabold text-gray-800 mt-0.5">{s.name}</h4>
                      </div>

                      {(userRole === "admin" || userRole === "teacher") && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setSubjectForm({ id: s.id, name: s.name, code: s.code }); setShowSubjectModal(true); }}
                            className="p-1 text-gray-500 hover:text-indigo-600 rounded hover:bg-gray-100"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(s.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALLOCATIONS TAB */}
            {activeTab === "allocations" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-gray-800 text-base">Allocated Class Subject Teachers</h3>
                  {(userRole === "admin" || userRole === "teacher") && (
                    <button
                      onClick={() => { setAllocForm({ id: "", classId: classes[0]?.id || "", subjectId: subjects[0]?.id || "", teacherId: teachers[0]?.id || "" }); setShowAllocModal(true); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Link size={14} /> Allocate Subject Teacher
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4 text-left">Class Name</th>
                        <th className="py-3 px-4 text-left">Subject Curriculum</th>
                        <th className="py-3 px-4 text-left">Assigned Educator</th>
                        {(userRole === "admin" || userRole === "teacher") && <th className="py-3 px-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {allocations.map(al => (
                        <tr key={al.id} className="hover:bg-gray-50">
                          <td className="py-3.5 px-4 font-bold text-gray-800">{getClassName(al.classId)}</td>
                          <td className="py-3.5 px-4 font-semibold text-indigo-700">{getSubjectName(al.subjectId)}</td>
                          <td className="py-3.5 px-4">{getTeacherName(al.teacherId)}</td>
                          {(userRole === "admin" || userRole === "teacher") && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteAlloc(al.id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SESSIONS & TERMS */}
            {activeTab === "sessions_terms" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Academic Sessions */}
                <div className="border rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5"><Calendar size={18} className="text-indigo-600" /> Academic Sessions</h4>
                    {(userRole === "admin" || userRole === "teacher") && (
                      <button
                        onClick={() => { setSessionForm({ id: "", name: "", isCurrent: false }); setShowSessionModal(true); }}
                        className="text-indigo-600 hover:text-indigo-500 text-xs font-semibold flex items-center gap-0.5"
                      >
                        <Plus size={14} /> Add Session
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {sessions.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-3 border rounded-lg bg-white hover:border-gray-300">
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{s.name} Academic Session</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!s.isCurrent ? (
                            (userRole === "admin" || userRole === "teacher") && (
                              <button
                                onClick={() => handleActiveSession(s.id)}
                                className="text-xxs font-semibold text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-2 py-1 rounded border"
                              >
                                Activate Session
                              </button>
                            )
                          ) : (
                            <span className="bg-green-100 text-green-800 font-bold text-xxs px-2 py-0.5 rounded uppercase flex items-center gap-0.5">
                              <Check size={12} /> Active Now
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Academic Terms */}
                <div className="border rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5"><Settings size={18} className="text-indigo-600" /> School Terms</h4>
                    {(userRole === "admin" || userRole === "teacher") && (
                      <button
                        onClick={() => { setTermForm({ id: "", name: "", isCurrent: false }); setShowTermModal(true); }}
                        className="text-indigo-600 hover:text-indigo-500 text-xs font-semibold flex items-center gap-0.5"
                      >
                        <Plus size={14} /> Add Term
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {terms.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg bg-white hover:border-gray-300">
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!t.isCurrent ? (
                            (userRole === "admin" || userRole === "teacher") && (
                              <button
                                onClick={() => handleActiveTerm(t.id)}
                                className="text-xxs font-semibold text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-2 py-1 rounded border"
                              >
                                Set as Active
                              </button>
                            )
                          ) : (
                            <span className="bg-green-100 text-green-800 font-bold text-xxs px-2 py-0.5 rounded uppercase flex items-center gap-0.5">
                              <Check size={12} /> Current Term
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4">{classForm.id ? "Modify Class details" : "Create School Class"}</h3>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSS 2 Science, JSS 1 Gold"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Grade Level</label>
                <select
                  value={classForm.gradeLevel}
                  onChange={(e) => setClassForm({ ...classForm, gradeLevel: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                >
                  <option value="JSS 1">JSS 1</option>
                  <option value="JSS 2">JSS 2</option>
                  <option value="JSS 3">JSS 3</option>
                  <option value="SSS 1">SSS 1</option>
                  <option value="SSS 2">SSS 2</option>
                  <option value="SSS 3">SSS 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Class Teacher</label>
                <select
                  value={classForm.classTeacherId}
                  onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.title || "Mr."} {t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowClassModal(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4">{subjectForm.id ? "Modify Subject Details" : "Add Subject to Curriculum"}</h3>
            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Civics"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MTH101, BIO201"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4">Allocate Subject Teacher</h3>
            <form onSubmit={handleAllocSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Class</label>
                <select
                  value={allocForm.classId}
                  onChange={(e) => setAllocForm({ ...allocForm, classId: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Subject</label>
                <select
                  value={allocForm.subjectId}
                  onChange={(e) => setAllocForm({ ...allocForm, subjectId: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Subject Teacher</label>
                <select
                  value={allocForm.teacherId}
                  onChange={(e) => setAllocForm({ ...allocForm, teacherId: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.title || "Mr."} {t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAllocModal(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">Assign Educator</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4">Create Academic Session</h3>
            <form onSubmit={handleSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Session Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026/2027"
                  value={sessionForm.name}
                  onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sess_curr"
                  checked={sessionForm.isCurrent}
                  onChange={(e) => setSessionForm({ ...sessionForm, isCurrent: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="sess_curr" className="text-xs font-semibold text-gray-700">Set as active current session instantly</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowSessionModal(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Term Modal */}
      {showTermModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4">Create School Term</h3>
            <form onSubmit={handleTermSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Term Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Term, Third Term"
                  value={termForm.name}
                  onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="term_curr"
                  checked={termForm.isCurrent}
                  onChange={(e) => setTermForm({ ...termForm, isCurrent: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="term_curr" className="text-xs font-semibold text-gray-700">Set as current academic term instantly</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowTermModal(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
