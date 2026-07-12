/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Edit, Trash2, Users, User, ArrowRight, Award, Camera, UploadCloud, ShieldAlert } from "lucide-react";
import { Student, Class } from "../types";
import ReportCardModal from "./ReportCardModal";

// Beautiful Prepopulated Unsplash Student Passport Photos
const PASSPORT_PRESETS = [
  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
];

interface StudentListProps {
  userRole: 'admin' | 'teacher' | 'student';
}

export default function StudentList({ userRole }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [error, setError] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "Male" as const,
    dateOfBirth: "",
    currentClassId: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    address: "",
    passportPhoto: PASSPORT_PRESETS[0],
    status: "Active" as const,
    password: "student123"
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image size exceeds 2MB limit");
      return;
    }
    setUploadError("");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData(prev => ({ ...prev, passportPhoto: reader.result as string }));
      }
    };
    reader.onerror = () => {
      setUploadError("Could not read uploaded image file");
    };
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Failed to load students");
      setStudents(await res.json());
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const cls = await res.json();
        setClasses(cls);
        if (cls.length > 0) {
          setFormData(prev => ({ ...prev, currentClassId: cls[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Could not add student");
      setShowAddModal(false);
      fetchStudents();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Could not save student");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Could not update student");
      setShowEditModal(false);
      fetchStudents();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Could not save student changes");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this student record? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete student");
      fetchStudents();
    } catch (err: any) {
      alert(err.message || "Error deleting student");
    }
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      currentClassId: student.currentClassId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      address: student.address,
      passportPhoto: student.passportPhoto || PASSPORT_PRESETS[0],
      status: student.status,
      password: (student as any).password || "student123"
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setFormData({
      firstName: "",
      lastName: "",
      gender: "Male",
      dateOfBirth: "",
      currentClassId: classes[0]?.id || "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      address: "",
      passportPhoto: PASSPORT_PRESETS[Math.floor(Math.random() * PASSPORT_PRESETS.length)],
      status: "Active",
      password: "student123"
    });
  };

  const getClassName = (cid: string) => {
    return classes.find(c => c.id === cid)?.name || "Unassigned";
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const admNo = student.admissionNumber.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = fullName.includes(query) || admNo.includes(query);
    const matchesClass = !selectedClass || student.currentClassId === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div>
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by name or admission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {(userRole === "admin" || userRole === "teacher") && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={18} /> Add New Student
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm font-medium">No students found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
              {/* Card top */}
              <div className="p-5">
                <div className="flex items-center gap-4">
                  {/* Passport Photograph */}
                  <img
                    src={student.passportPhoto || PASSPORT_PRESETS[0]}
                    alt="Passport"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 object-cover rounded-lg border-2 border-gray-100 shadow"
                  />
                  <div>
                    <h3 className="font-extrabold text-gray-800 text-base">{student.lastName}, {student.firstName}</h3>
                    <span className="font-mono text-xs text-indigo-600 font-semibold block mt-0.5">{student.admissionNumber}</span>
                    <span className="inline-block mt-1.5 bg-gray-100 text-gray-700 text-xxs font-bold px-2 py-0.5 rounded uppercase">
                      {getClassName(student.currentClassId)}
                    </span>
                  </div>
                </div>

                {/* Details list */}
                <div className="mt-5 space-y-2 text-xs border-t pt-4 border-gray-50">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gender:</span>
                    <span className="font-semibold text-gray-700">{student.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date of Birth:</span>
                    <span className="font-semibold text-gray-700">{student.dateOfBirth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Parent/Guardian:</span>
                    <span className="font-semibold text-gray-700">{student.parentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Parent Phone:</span>
                    <span className="font-semibold text-gray-700">{student.parentPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Parent Email:</span>
                    <span className="font-semibold text-gray-700 select-all">{student.parentEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Address:</span>
                    <span className="font-semibold text-gray-700 truncate max-w-[180px]" title={student.address}>{student.address}</span>
                  </div>
                </div>
              </div>

              {/* Card Bottom / Actions */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-50 flex justify-between items-center">
                <span className={`inline-flex items-center gap-1 text-xxs font-bold px-2 py-0.5 rounded uppercase ${
                  student.status === "Active" ? "bg-green-100 text-green-700" :
                  student.status === "Suspended" ? "bg-yellow-100 text-yellow-700" :
                  student.status === "Graduated" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {student.status}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReportStudentId(student.id)}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Award size={14} /> Report Card
                  </button>

                  <button
                    onClick={() => openEditModal(student)}
                    className="text-gray-500 hover:text-indigo-600 p-1 rounded hover:bg-gray-100"
                    title="Edit Details"
                  >
                    <Edit size={16} />
                  </button>

                  {(userRole === "admin" || userRole === "teacher") && (
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                      title="Delete Student"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Student Modals */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                <User className="text-indigo-600" /> {showAddModal ? "Enroll New Student" : "Modify Student Records"}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-gray-400 hover:text-gray-600">
                <XButton />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-6">
              {/* Passport Photo Selector & Manual Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Passport Photograph Select / Manual Upload</label>
                  
                  {/* Presets List */}
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {PASSPORT_PRESETS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, passportPhoto: url })}
                        className={`relative rounded-lg overflow-hidden border-2 h-14 ${formData.passportPhoto === url ? "border-indigo-600 ring-2 ring-indigo-100" : "border-transparent"}`}
                      >
                        <img src={url} alt="preset" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  {/* Manual Drag and Drop File Uploader */}
                  <div className="border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 bg-white"
                      }`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      {formData.passportPhoto && !PASSPORT_PRESETS.includes(formData.passportPhoto) && !formData.passportPhoto.startsWith("http") ? (
                        <div className="flex flex-col items-center gap-2">
                          <img
                            src={formData.passportPhoto}
                            alt="Uploaded Passport Preview"
                            className="h-16 w-16 rounded-full object-cover border-2 border-indigo-500 shadow-sm mx-auto"
                          />
                          <span className="text-xs text-indigo-600 font-semibold underline">Click or drag to replace manual upload</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-500">
                          <UploadCloud size={24} className="text-gray-400 mb-1 mx-auto" />
                          <p className="text-xs font-semibold">Click to upload manually, or drag and drop passport photo</p>
                          <p className="text-xxs text-gray-400">PNG, JPG, JPEG up to 2MB</p>
                        </div>
                      )}
                    </div>
                    {uploadError && <p className="text-xxs text-red-600 mt-1.5 font-medium">{uploadError}</p>}
                  </div>

                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Or enter custom passport image URL..."
                      value={formData.passportPhoto}
                      onChange={(e) => setFormData({ ...formData, passportPhoto: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 border rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Current Class Room</label>
                  <select
                    value={formData.currentClassId}
                    onChange={(e) => setFormData({ ...formData, currentClassId: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {showEditModal && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Enrollment Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Graduated">Graduated</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Parent info */}
              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-3">Parent / Guardian Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chief Adebayo"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+234 ..."
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Residential Address</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-sm border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Credentials Setup */}
              <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/30 space-y-2">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                  <ShieldAlert size={14} className="text-indigo-600" /> Student Portal Credentials
                </h4>
                <div>
                  <label className="block text-xxs font-bold text-gray-500 mb-1">Student Password</label>
                  <input
                    type="text"
                    placeholder="Defaults to student123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs border p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Students log in using their <strong>Admission Number</strong> as their username.
                  </p>
                </div>
              </div>

              {/* Submit triggers */}
              <div className="border-t pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-1.5"
                >
                  {showAddModal ? "Save Enrollment" : "Save Changes"} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Card Viewer */}
      {reportStudentId && (
        <ReportCardModal
          studentId={reportStudentId}
          onClose={() => setReportStudentId(null)}
          userRole={userRole}
        />
      )}
    </div>
  );
}

// Simple vector SVG close
function XButton() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
