/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Edit, Trash2, Award, Mail, Phone, Calendar, UserCheck, Camera, UploadCloud, ShieldAlert } from "lucide-react";
import { Teacher, Class } from "../types";

interface TeacherListProps {
  userRole: 'admin' | 'teacher';
}

export default function TeacherList({ userRole }: TeacherListProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "Male" as const,
    qualification: "",
    dateJoined: "",
    assignedClassId: "",
    username: "",
    password: "",
    avatarUrl: ""
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
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.onerror = () => {
      setUploadError("Could not read uploaded image file");
    };
  };

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error("Failed to load teachers");
      setTeachers(await res.json());
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) setClasses(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Could not add teacher");
      setShowAddModal(false);
      fetchTeachers();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Could not add teacher");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      const res = await fetch(`/api/teachers/${selectedTeacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Could not update teacher");
      setShowEditModal(false);
      fetchTeachers();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Could not save teacher changes");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher? All assigned classes and logins will be updated.")) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete teacher");
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || "Error deleting teacher");
    }
  };

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      gender: teacher.gender,
      qualification: teacher.qualification,
      dateJoined: teacher.dateJoined,
      assignedClassId: teacher.assignedClassId || "",
      username: (teacher as any).username || "",
      password: (teacher as any).password || "",
      avatarUrl: teacher.avatarUrl || ""
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setSelectedTeacher(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "Male",
      qualification: "",
      dateJoined: new Date().toISOString().split('T')[0],
      assignedClassId: "",
      username: "",
      password: "teacher123",
      avatarUrl: ""
    });
  };

  const getClassName = (cid?: string) => {
    if (!cid) return "None (Subject Teacher Only)";
    return classes.find(c => c.id === cid)?.name || "Class Teacher";
  };

  const filteredTeachers = teachers.filter(t => {
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
    const qual = t.qualification.toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || qual.includes(query);
  });

  return (
    <div>
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by name or degree..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {userRole === "admin" && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={18} /> Register New Teacher
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      {/* Teacher List Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <UserCheck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm font-medium">No registered teachers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
              <div className="p-5">
                <div className="flex items-center gap-4">
                  {teacher.avatarUrl ? (
                    <img
                      src={teacher.avatarUrl}
                      alt={`${teacher.firstName} ${teacher.lastName}`}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-lg border">
                      {teacher.firstName.charAt(0)}{teacher.lastName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-gray-800 text-base">Mr/Mrs. {teacher.firstName} {teacher.lastName}</h3>
                    <span className="text-xxs text-gray-400 font-mono tracking-wider uppercase block mt-0.5">
                      ID: {teacher.id} { (teacher as any).username && `| User: ${(teacher as any).username}` }
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-xs border-t pt-4 border-gray-50 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-gray-400" />
                    <span><strong className="text-gray-700 font-semibold">Degree:</strong> {teacher.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <span className="select-all">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span>{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>Joined school: {teacher.dateJoined}</span>
                  </div>
                </div>
              </div>

              {/* Footer details */}
              <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-50 flex justify-between items-center text-xs">
                <div>
                  <span className="text-gray-400 block text-xxs uppercase font-semibold">Assigned Class Teacher:</span>
                  <span className="font-bold text-indigo-700">{getClassName(teacher.assignedClassId)}</span>
                </div>

                {userRole === "admin" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(teacher)}
                      className="text-gray-500 hover:text-indigo-600 p-1 rounded hover:bg-gray-100"
                      title="Edit Teacher"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                      title="Delete Teacher"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                <UserCheck className="text-indigo-600" /> {showAddModal ? "Register Faculty Member" : "Modify Faculty Record"}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-gray-400 hover:text-gray-600">
                <XButton />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date Joined</label>
                  <input
                    type="date"
                    required
                    value={formData.dateJoined}
                    onChange={(e) => setFormData({ ...formData, dateJoined: e.target.value })}
                    className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Qualification / Degree</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Sc (Ed) Mathematics, M.Sc Biology"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Class Teacher Responsibility</label>
                <select
                  value={formData.assignedClassId}
                  onChange={(e) => setFormData({ ...formData, assignedClassId: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None (Subject Teacher Only)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Manual Passport Photo Upload */}
              <div className="border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Camera size={14} className="text-indigo-500" /> Manual Passport Photo Upload
                </label>
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
                  {formData.avatarUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={formData.avatarUrl}
                        alt="Passport Preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-indigo-500 shadow-sm mx-auto"
                      />
                      <span className="text-xs text-indigo-600 font-semibold underline">Click or drag to replace photo</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500">
                      <UploadCloud size={28} className="text-gray-400 mb-1 mx-auto" />
                      <p className="text-xs font-semibold">Click to upload, or drag and drop</p>
                      <p className="text-xxs text-gray-400">PNG, JPG, JPEG up to 2MB</p>
                    </div>
                  )}
                </div>
                {uploadError && <p className="text-xxs text-red-600 mt-1.5 font-medium">{uploadError}</p>}
                
                {/* Fallback image URL input */}
                <div className="mt-3">
                  <label className="block text-xxs font-semibold text-gray-400 mb-1">Or paste photo URL directly</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full text-xs border p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Credentials Setup */}
              <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/30 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                  <ShieldAlert size={14} className="text-indigo-600" /> Portal Login Credentials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold text-gray-500 mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full text-xs border p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-gray-500 mb-1">Portal Password</label>
                    <input
                      type="text"
                      placeholder="Defaults to teacher123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full text-xs border p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-lg text-sm"
                >
                  {showAddModal ? "Register Faculty" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function XButton() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
