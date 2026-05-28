/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User } from "./types";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import GuardDashboard from "./components/GuardDashboard";
import DmtcLogo from "./components/DmtcLogo";
import { ShieldCheck, UserCheck, Smartphone, Monitor, Info } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated user session from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem("bus_qr_user");
    const explicitLogout = localStorage.getItem("explicit_logout");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse saved user credentials", err);
      }
    } else if (explicitLogout !== "true") {
      // Auto-login as General Manager directly on launch without login screen
      const defaultManager: User = {
        id: "U-G1",
        username: "ahmad.abduljalil.sy@gmail.com",
        name: "أحمد عبد الجليل (المدير العام)",
        role: "admin",
        email: "ahmad.abduljalil.sy@gmail.com"
      };
      setUser(defaultManager);
      localStorage.setItem("bus_qr_user", JSON.stringify(defaultManager));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem("bus_qr_user", JSON.stringify(authenticatedUser));
    localStorage.removeItem("explicit_logout");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("bus_qr_user");
    localStorage.setItem("explicit_logout", "true");
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-transparent flex items-center justify-center font-sans text-slate-800">
        <div className="text-center space-y-4">
          <DmtcLogo className="w-14 h-14 mx-auto animate-pulse" />
          <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-800 text-xs font-semibold">درة المنورة للنقليات</p>
          <p className="text-slate-400 text-[10px]">جاري تهيئة النظام آلياً...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-transparent text-slate-800 flex flex-col justify-between selection:bg-brand-orange/20 selection:text-brand-purple-dark">
      
      {/* Top Main Developer Workspace Bar with Corporate Branding */}
      <div className="bg-white/90 backdrop-blur-md text-slate-700 py-3 px-6 flex items-center justify-between gap-4 shrink-0 shadow-sm border-b border-slate-200/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <DmtcLogo className="w-9 h-9" showText={true} />
          <div className="h-5 w-px bg-slate-200 hidden xs:block" />
          <span className="font-display font-extrabold text-xs md:text-sm text-slate-900 hidden xs:inline">نظام التتبع والتحقق الذكي لأسطول الحافلات (DMTC)</span>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 sm:gap-3 font-semibold text-[10px] sm:text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 p-1.5 px-3 rounded-xl border border-slate-200">
              {user.role === 'admin' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-brand-orange" />
                  <span>الوضع: المدير الرئيسي</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>الوضع: الحارس الميداني</span>
                </>
              )}
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-emerald-600 font-extrabold flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              بث حي بالتحديث التلقائي
            </span>
          </div>
        )}
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-6">
        {!user ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : user.role === "admin" ? (
          <AdminDashboard user={user} onLogout={handleLogout} />
        ) : (
          <GuardDashboard user={user} onLogout={handleLogout} />
        )}
      </main>

      {/* Persistent Information footer about simulation testing with company signature */}
      <footer className="bg-white border-t border-slate-200 py-5 px-6 text-center text-xs text-slate-500 shrink-0">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-2">
          <p className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
            <span className="text-brand-orange font-extrabold">درة المنورة للنقليات</span>
            <span className="text-slate-300">•</span>
            <span>لنقل الحجاج والمعتمرين © {new Date().getFullYear()} م</span>
          </p>

        </div>
      </footer>
    </div>
  );
}
