/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  School,
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  Award,
  Bell,
  History,
  ShieldCheck,
  User,
  LogOut,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight
} from "lucide-react";

import StatsCard from "./components/StatsCard";
import StudentList from "./components/StudentList";
import TeacherList from "./components/TeacherList";
import AcademicsSetup from "./components/AcademicsSetup";
import AttendanceTracker from "./components/AttendanceTracker";
import ResultsManager from "./components/ResultsManager";
import NoticeBoard from "./components/NoticeBoard";
import HistoryPromotions from "./components/HistoryPromotions";
import Login from "./components/Login";
import ProfileSettings from "./components/ProfileSettings";
import { User as UserType } from "./types";

type NavigationTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'academics'
  | 'attendance'
  | 'results'
  | 'notices'
  | 'history'
  | 'profile';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  const [schoolStats, setSchoolStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    classesCount: 0,
    averagePerformance: 0,
    attendanceRate: 0,
    activeSession: "",
    activeTerm: ""
  });
  
  const [classPerformance, setClassPerformance] = useState<any[]>([]);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Student-specific metric states
  const [studentStats, setStudentStats] = useState({
    studentClass: "",
    attendanceRate: 0,
    averageScore: 0,
    gradesCount: 0
  });

  useEffect(() => {
    checkAuthSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardStats();
      if (currentUser.role === "student") {
        fetchStudentSpecificStats();
      }
    }
  }, [currentUser, activeTab]);

  const checkAuthSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
    } catch (e) {
      console.error("Error verifying login session: ", e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchStudentSpecificStats = async () => {
    if (!currentUser || currentUser.role !== "student") return;
    try {
      // Fetch report card to calculate average and attendance
      const res = await fetch(`/api/results/report-card/${currentUser.studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudentStats({
          studentClass: data.className || "N/A",
          attendanceRate: data.attendanceRate !== undefined ? data.attendanceRate : 100,
          averageScore: data.gpa !== undefined ? Math.round(data.gpa) : 0,
          gradesCount: data.results?.length || 0
        });
      }
    } catch (e) {
      console.error("Error fetching student stats: ", e);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Fetch core stats
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setSchoolStats({
          studentsCount: stats.totalStudents || 0,
          teachersCount: stats.totalTeachers || 0,
          classesCount: stats.totalClasses || 0,
          averagePerformance: stats.averagePerformance || 72,
          attendanceRate: stats.todayAttendanceRate || 85,
          activeSession: stats.activeSession || "2025/2026",
          activeTerm: stats.activeTerm || "Third Term"
        });
      }

      // Fetch class level performance averages
      const perfRes = await fetch("/api/results/class-averages");
      if (perfRes.ok) {
        setClassPerformance(await perfRes.json());
      }

      // Fetch latest notice boards
      const noticeRes = await fetch("/api/notices");
      if (noticeRes.ok) {
        const notices = await noticeRes.json();
        setRecentNotices(notices.slice(0, 3));
      }
    } catch (e) {
      console.error("Error loading school metrics: ", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: UserType) => {
    setCurrentUser(user);
    setActiveTab("dashboard");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Error logging out:", e);
    }
    setCurrentUser(null);
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin") return "Principal Administrator";
    if (role === "teacher") return "Academic Educator";
    return "Enrolled Student";
  };

  const getAvatarColor = (role: string) => {
    if (role === "admin") return "bg-amber-100 text-amber-800 border-amber-200";
    if (role === "teacher") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-semibold text-gray-500">Securing connection to Petros ICA...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner Navigation */}
      <header className="bg-indigo-950 text-white border-b border-indigo-900 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/15 shadow-inner">
              <School className="text-amber-400 h-6 w-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-none">Petros ICA</h1>
              <span className="text-xxs font-mono text-indigo-200 uppercase tracking-widest block mt-1">Secondary School Management System</span>
            </div>
          </div>

          {/* Current Academic Session & Term Indicator */}
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
            <div className="bg-indigo-900/60 border border-indigo-800/80 rounded-full px-4 py-1.5 flex items-center gap-1.5 text-indigo-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Session: <strong className="text-white">{schoolStats.activeSession}</strong></span>
              <span className="text-indigo-400">|</span>
              <span>Term: <strong className="text-white">{schoolStats.activeTerm}</strong></span>
            </div>
          </div>

          {/* User Account Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <h3 className="text-xs font-bold text-white">{currentUser.name}</h3>
              <span className="text-xxs font-mono text-indigo-300 block">{getRoleLabel(currentUser.role)}</span>
            </div>
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover border shadow-sm"
              />
            ) : (
              <div className={`h-9 w-9 rounded-full ${getAvatarColor(currentUser.role)} flex items-center justify-center font-extrabold text-sm border shadow-sm`}>
                {currentUser.name.charAt(0)}{currentUser.name.split(' ')[1]?.charAt(0) || ""}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="bg-indigo-900/60 hover:bg-red-600 text-white p-2 rounded-lg transition-all border border-indigo-800 hover:border-red-600 cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Structural Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 sm:p-6 lg:p-8">
        {/* Navigation Sidebar Drawer */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-1">
            <span className="block text-xxs font-bold text-gray-400 uppercase tracking-widest pl-3.5 mb-2.5">Core Modules</span>
            
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "dashboard" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <LayoutDashboard size={18} /> Dashboard Overview
            </button>

            {currentUser.role !== "student" && (
              <>
                <button
                  onClick={() => setActiveTab("students")}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                    activeTab === "students" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Users size={18} /> Student Records
                </button>

                <button
                  onClick={() => setActiveTab("teachers")}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                    activeTab === "teachers" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <GraduationCap size={18} /> Teacher Directory
                </button>

                <button
                  onClick={() => setActiveTab("academics")}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                    activeTab === "academics" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Calendar size={18} /> Class & Subjects
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab("attendance")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "attendance" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <ClipboardCheck size={18} /> Attendance Logs
            </button>

            <button
              onClick={() => setActiveTab("results")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "results" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Award size={18} /> Terminal Results
            </button>

            <button
              onClick={() => setActiveTab("notices")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "notices" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Bell size={18} /> Notice Board
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "profile" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <User size={18} /> My Profile Settings
            </button>

            {currentUser.role !== "student" && (
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === "history" ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <History size={18} /> Promotions History
              </button>
            )}
          </div>

          {/* Quick Account Profile Card */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950">
            <span className="font-bold text-xxs uppercase text-indigo-600 tracking-widest block mb-1">Logged In Account</span>
            <div className="space-y-1 mt-2">
              <p className="truncate">👤 Name: <strong className="font-bold">{currentUser.name}</strong></p>
              {currentUser.role === "student" ? (
                <p>🆔 Admission: <span className="font-mono bg-indigo-100/50 px-1 py-0.5 rounded text-indigo-800 font-bold">{currentUser.username}</span></p>
              ) : (
                <p className="truncate">✉️ Email: <span className="font-mono">{currentUser.email || "N/A"}</span></p>
              )}
              <p>🛡️ Role: <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">{getRoleLabel(currentUser.role)}</span></p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full mt-3 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded-lg text-xxs flex items-center justify-center gap-1 transition-colors"
            >
              Sign Out of System <LogOut size={12} />
            </button>
          </div>
        </aside>

        {/* Dynamic Display Canvas */}
        <main className="flex-1 min-w-0">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Quick Hero Notification */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 relative overflow-hidden shadow-md">
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-6">
                  <School size={200} />
                </div>
                <div className="relative z-10 max-w-lg">
                  {currentUser.role === "student" ? (
                    <>
                      <span className="bg-amber-400 text-indigo-950 font-extrabold px-2 py-0.5 rounded text-xxs uppercase tracking-wider">Student Hub</span>
                      <h2 className="text-2xl font-black mt-2 leading-tight">Welcome back, {currentUser.name}!</h2>
                      <p className="text-indigo-100 text-xs mt-1.5 leading-relaxed">
                        View your terminal scores, download your official report card transcripts, and check your daily classroom attendance directly from your student portal. Keep up the brilliant academic work!
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="bg-amber-400 text-indigo-950 font-extrabold px-2 py-0.5 rounded text-xxs uppercase tracking-wider">LMS Control Center</span>
                      <h2 className="text-2xl font-black mt-2 leading-tight">Welcome, {currentUser.name}!</h2>
                      <p className="text-indigo-100 text-xs mt-1.5 leading-relaxed">
                        You are logged in with full <span className="underline font-bold">{getRoleLabel(currentUser.role)}</span> credentials. Manage student rosters, register classes, schedule subject allocations, and sign off report transcripts from this centralized portal.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Metrics Row */}
              {currentUser.role === "student" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Enrolled Class"
                    value={studentStats.studentClass}
                    change="Registered Classroom"
                    icon={<Users size={20} />}
                  />
                  <StatsCard
                    title="Attendance Rate"
                    value={`${studentStats.attendanceRate}%`}
                    change="Overall School Attendance"
                    icon={<ClipboardCheck size={20} />}
                  />
                  <StatsCard
                    title="Average Grade Score"
                    value={`${studentStats.averageScore}%`}
                    change="Academic performance"
                    icon={<Award size={20} />}
                  />
                  <StatsCard
                    title="Recorded Term Grades"
                    value={studentStats.gradesCount}
                    change="Academic subjects tracked"
                    icon={<Calendar size={20} />}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatsCard
                    title="Registered Students"
                    value={schoolStats.studentsCount}
                    change="+10% New Admissions"
                    icon={<Users size={20} />}
                  />
                  <StatsCard
                    title="Academic Faculty"
                    value={schoolStats.teachersCount}
                    change="Fully Staffed"
                    icon={<GraduationCap size={20} />}
                  />
                  <StatsCard
                    title="Classrooms"
                    value={schoolStats.classesCount}
                    change="JSS 1 - SSS 3 Levels"
                    icon={<Calendar size={20} />}
                  />
                  <StatsCard
                    title="School Term Avg"
                    value={`${schoolStats.averagePerformance}%`}
                    change="Grade Performance"
                    icon={<Award size={20} />}
                  />
                  <StatsCard
                    title="Attendance Rate"
                    value={`${schoolStats.attendanceRate}%`}
                    change="Daily Average"
                    icon={<ClipboardCheck size={20} />}
                  />
                </div>
              )}

              {/* Content Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Charts column */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-1.5">
                        <TrendingUp className="text-indigo-600" size={18} /> Terminal Performance By Class
                      </h3>
                      <span className="text-xxs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold uppercase">Average % scores</span>
                    </div>

                    {/* Clean Pure-Tailwind Graph representation */}
                    <div className="space-y-4 my-2">
                      {classPerformance.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 italic text-xs">No grades submitted or published yet.</div>
                      ) : (
                        classPerformance.map((c, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                              <span>{c.className}</span>
                              <span className="text-indigo-600">{c.averageScore}%</span>
                            </div>
                            <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden border">
                              <div
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${c.averageScore}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4 flex justify-between items-center text-xs text-gray-400 font-semibold">
                    <span>Target passing rate threshold: 40%</span>
                    <button onClick={() => setActiveTab("results")} className="text-indigo-600 hover:underline flex items-center gap-0.5">
                      Open Grade Ledger <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Announcement side panel */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-gray-800 text-base mb-4 flex items-center gap-1.5">
                      <Bell className="text-indigo-600" size={18} /> Bulletin Announcements
                    </h3>

                    <div className="space-y-3.5">
                      {recentNotices.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 italic text-xs">No public notices published.</div>
                      ) : (
                        recentNotices.map((notice) => (
                          <div key={notice.id} className="p-3 bg-slate-50 border rounded-xl hover:border-gray-200 transition-colors">
                            <h4 className="font-bold text-gray-900 text-xs truncate" title={notice.title}>{notice.title}</h4>
                            <p className="text-xxs text-gray-500 mt-1 flex items-center gap-1 font-semibold">
                              <span>📅 {notice.datePosted}</span>
                              <span>•</span>
                              <span>👤 {notice.authorName}</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("notices")}
                    className="w-full mt-4 text-center bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-indigo-600 border font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    All Bulletins <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT LIST TAB */}
          {activeTab === "students" && <StudentList userRole={currentUser.role} />}

          {/* TEACHER LIST TAB */}
          {activeTab === "teachers" && <TeacherList userRole={currentUser.role} />}

          {/* ACADEMICS SETUP TAB */}
          {activeTab === "academics" && <AcademicsSetup userRole={currentUser.role} />}

          {/* ATTENDANCE TAB */}
          {activeTab === "attendance" && <AttendanceTracker userRole={currentUser.role} />}

          {/* RESULTS TAB */}
          {activeTab === "results" && (
            <ResultsManager
              userRole={currentUser.role}
              activeUserId={currentUser.id}
            />
          )}

          {/* NOTICE BOARD TAB */}
          {activeTab === "notices" && (
            <NoticeBoard
              userRole={currentUser.role}
              activeUserName={currentUser.name}
            />
          )}

          {/* PROMOTIONS HISTORY TAB */}
          {activeTab === "history" && <HistoryPromotions userRole={currentUser.role} />}

          {/* PROFILE SETTINGS TAB */}
          {activeTab === "profile" && (
            <ProfileSettings currentUser={currentUser} onProfileUpdate={setCurrentUser} />
          )}
        </main>
      </div>

      {/* Footer Branding details */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Petros ICA Secondary School Management System. All academic logs are secure.</p>
        </div>
      </footer>
    </div>
  );
}
