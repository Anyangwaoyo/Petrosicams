/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Calendar, User, BookOpen } from "lucide-react";
import { Notice } from "../types";

interface NoticeBoardProps {
  userRole: 'admin' | 'teacher';
  activeUserName: string;
}

export default function NoticeBoard({ userRole, activeUserName }: NoticeBoardProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: ""
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notices");
      if (res.ok) {
        setNotices(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          authorName: activeUserName,
          authorRole: userRole
        })
      });

      if (!res.ok) throw new Error("Could not publish notice");
      setSuccess("Announcement published successfully!");
      setFormData({ title: "", content: "" });
      setShowAddModal(false);
      fetchNotices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Could not publish notice");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to take down this announcement?")) return;
    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete notice");
      fetchNotices();
    } catch (err: any) {
      alert(err.message || "Error deleting notice");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
          <Bell className="text-indigo-600 animate-swing" size={20} /> Petros ICA Public Announcements
        </h3>
        {userRole === "admin" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus size={14} /> Create Announcement
          </button>
        )}
      </div>

      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium">{success}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm font-medium">No announcements published on the notice board.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {notices.map((notice) => (
            <div key={notice.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6 relative">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-extrabold text-gray-900 text-lg">{notice.title}</h4>
                  
                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {notice.datePosted}
                    </span>
                    <span className="flex items-center gap-1 uppercase font-mono tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xxs">
                      <User size={12} /> {notice.authorName} ({notice.authorRole})
                    </span>
                  </div>
                </div>

                {userRole === "admin" && (
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="text-gray-300 hover:text-red-600 p-1.5 rounded hover:bg-gray-50 transition-colors"
                    title="Take Down Announcement"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="text-sm text-gray-600 leading-relaxed mt-4 border-t pt-4 whitespace-pre-wrap">
                {notice.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4 flex items-center gap-1.5"><BookOpen className="text-indigo-600" /> Publish School Announcement</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Term Resumption Notice"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Announcement Content</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Type clear announcement details for all teachers and parents..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full text-sm border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
