import React, { useState } from "react";
import { School, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { User as UserType } from "../types";

interface LoginProps {
  onLoginSuccess: (user: UserType) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleMode, setRoleMode] = useState<"staff" | "student">("staff");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials provided");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 px-6 py-8 text-center text-white relative">
          <div className="absolute right-4 top-4 opacity-5">
            <School size={120} />
          </div>
          <div className="inline-flex bg-white/10 p-3 rounded-xl border border-white/15 mb-3 shadow-inner">
            <School className="text-amber-400 h-8 w-8" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Petros ICA</h2>
          <p className="text-xxs font-mono text-indigo-200 uppercase tracking-widest mt-1">Secondary School Management System</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Role selector tabs */}
          <div className="flex border rounded-lg p-1 bg-slate-50 mb-6">
            <button
              type="button"
              onClick={() => {
                setRoleMode("staff");
                setUsername("");
                setPassword("");
                setError("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                roleMode === "staff"
                  ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Staff Portal (Admin / Teacher)
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleMode("student");
                setUsername("");
                setPassword("");
                setError("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                roleMode === "student"
                  ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Student Portal
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl mb-4 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {roleMode === "staff" ? "Username" : "Admission Number"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder={roleMode === "staff" ? "e.g., admin, teacher" : "e.g., PET/2025/001"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={roleMode === "staff" ? "Enter password" : "Enter student password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-indigo-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition-colors mt-6 shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                `Login as ${roleMode === "staff" ? "Staff" : "Student"}`
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
