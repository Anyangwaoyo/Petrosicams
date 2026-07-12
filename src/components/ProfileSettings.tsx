/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { User, Mail, Phone, Shield, Camera, UploadCloud, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { User as UserType } from "../types";

interface ProfileSettingsProps {
  currentUser: UserType;
  onProfileUpdate: (updatedUser: UserType) => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"
];

export default function ProfileSettings({ currentUser, onProfileUpdate }: ProfileSettingsProps) {
  const [email, setEmail] = useState(currentUser.email || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [avatar, setAvatar] = useState(currentUser.avatarUrl || "");
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Convert File to Base64 Data URL
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size exceeds 2MB limit");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };
    reader.onerror = () => {
      setError("Could not read uploaded image file");
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSelectPreset = (url: string) => {
    setAvatar(url);
  };

  // Submit Profile Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: avatar,
          email: email.trim(),
          phone: phone.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || "Failed to update profile details");
      }

      const json = await res.json();
      setSuccess("Profile details and avatar updated successfully!");
      onProfileUpdate(json.user);
      
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Something went wrong while saving profile details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 md:p-8">
      {/* Module Title */}
      <div className="border-b pb-4 mb-8">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={22} /> Personal Profile Settings
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Customize your passport photograph/avatar and manage your official contact coordinates in the Petros ICA database.
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Photo and Upload controls */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 self-start">
            Passport Photo / Avatar
          </span>

          {/* Current Avatar Display */}
          <div className="relative group mb-6">
            <div className="h-36 w-36 rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-indigo-100">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar Preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-indigo-50 flex items-center justify-center font-extrabold text-indigo-400 text-3xl uppercase">
                  {currentUser.name.charAt(0)}{currentUser.name.split(" ")[1]?.charAt(0) || ""}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-full shadow-md transition-colors border-2 border-white focus:outline-none cursor-pointer"
              title="Upload custom image"
            >
              <Camera size={16} />
            </button>
          </div>

          {/* Drag & Drop File Upload Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-sm border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-500 bg-indigo-50/40 text-indigo-700"
                : "border-gray-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 text-gray-500"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
            <UploadCloud className="mx-auto text-gray-400 h-10 w-10 mb-2" />
            <p className="text-xs font-bold text-gray-700">Drag and drop your image here</p>
            <p className="text-xxs text-gray-400 mt-1">PNG, JPG, JPEG up to 2MB. Drag directly or click to browse files.</p>
          </div>

          {/* Preset Library Section */}
          <div className="w-full mt-6">
            <span className="block text-xxs font-extrabold text-gray-400 uppercase tracking-widest mb-3 text-center">
              Or Choose an Elegant Preset Avatar
            </span>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(url)}
                  className={`h-11 w-11 rounded-full overflow-hidden border-2 transition-all hover:scale-105 shadow-xs focus:outline-none ${
                    avatar === url ? "border-indigo-600 ring-2 ring-indigo-200" : "border-gray-100 hover:border-indigo-300"
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - User details form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Profile details
            </span>

            {/* Read-Only Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="block text-xxs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Official Full Name
                </span>
                <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                <span className="text-[10px] text-gray-400 italic">Managed by Petros Registrar</span>
              </div>

              <div>
                <span className="block text-xxs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Access Portal Role
                </span>
                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xxs uppercase mt-1">
                  <Shield size={10} /> {currentUser.role}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="block text-xxs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  {currentUser.role === "student" ? "Registered Admission Number" : "User System Username"}
                </span>
                <p className="text-sm font-mono font-bold text-slate-700">{currentUser.username}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  {currentUser.role === "student" ? "Parent's Email Address" : "Staff Contact Email Address"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@petrosica.edu.ng"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  {currentUser.role === "student" ? "Parent's Contact Phone" : "Staff Contact Phone Number"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 80 1234 5678"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {saving ? "Saving profile changes..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
