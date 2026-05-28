/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { KeyRound, User as UserIcon, ShieldAlert, Lock, Mail, Users, AppWindow } from "lucide-react";
import { User } from "../types";
import DmtcLogo from "./DmtcLogo";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [activeTab, setActiveTab] = useState<'admin' | 'guard'>('admin');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen for Google OAuth callback message
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Security Check
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        onLoginSuccess(event.data.user);
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        setError(event.data.message || "فشلت عملية التحقق برابط جوجل.");
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLoginSuccess]);

  // Handle standard Guard login using credentials
  const handleGuardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("الرجاء إدخال اسم المستخدم وكلمة المرور.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user.role !== 'guard') {
          setError("عذراً، هذا الحساب مخصص للإدارة. يرجى المتابعة وتسجيل الدخول كشريك عبر Google.");
          return;
        }
        onLoginSuccess(data.user);
      } else {
        setError(data.message || "اسم المستخدم أو كلمة المرور غير صحيحة.");
      }
    } catch (err) {
      setError("عذراً، فشل الاتصال بالخادم لدخول الحراس.");
    } finally {
      setLoading(false);
    }
  };

  // Handle standard Admin login using credentials
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("الرجاء إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user.role !== 'admin') {
          setError("عذراً، هذا الحساب مخصص للحراسات الميدانية. يرجى تسجيل الدخول من بوابة الحراس.");
          return;
        }
        onLoginSuccess(data.user);
      } else {
        setError(data.message || "اسم المستخدم أو كلمة المرور غير صحيحة.");
      }
    } catch (err) {
      setError("عذراً، فشل الاتصال بالخادم لدخول الإدارة.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Google Login (Opens Popup with Auth URL)
  const handleRealGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Fetch Google Client Authorization URL from our dynamic server
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) {
        throw new Error('فشل إنشاء رابط تسجيل الدخول للدعم الفني.');
      }
      const { url } = await response.json();

      // 2. Open pop up
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no`
      );

      if (!authWindow) {
        setError("تم حظر النافذة المنبثقة من قِبل المتصفّح. يرجى السماح بالنوافذ المنبثقة لإكمال تسجيل الدخول بواسطة Google.");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الاتصال المباشر بمخدمات جوجل.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Simulated Google Login (For smooth preview container evaluation)
  const handleSimulatedGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/google/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ahmad.abduljalil.sy@gmail.com",
          name: "المدير العام"
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError("فشلت المحاكاة التلقائية لعميل Google.");
      }
    } catch (err) {
      setError("فشل الاتصال بخدمة محاكاة جوجل للمطورين.");
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 relative"
      >
        {/* Decorative Top Bar with Company Branding */}
        <div className="bg-gradient-to-b from-brand-purple/[0.04] to-transparent p-6 text-center border-b border-slate-100 relative pt-8">
          <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-750 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100/80 font-bold">
            <Lock className="w-3 h-3 text-emerald-650" />
            <span>اتصال آمن مبرهن</span>
          </div>
          <div className="w-20 h-20 bg-white border border-slate-150 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <DmtcLogo className="w-14 h-14" />
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">درة المنورة للنقليات</h1>
          <p className="text-slate-500 text-xs mt-1.5 font-bold font-display">بوابة التحقق الذكي وتتبع حركات الحافلات (DMTC)</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100/50 border-b border-slate-100 p-1.5 mx-6 mt-6 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setUsername("");
              setPassword("");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-white text-brand-purple shadow-sm border border-slate-200/70 font-black'
                : 'text-slate-505 hover:text-slate-800 hover:bg-slate-200/20'
            }`}
          >
            بوابة الإدارة والشركاء
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('guard');
              setUsername("");
              setPassword("");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition-all cursor-pointer ${
              activeTab === 'guard'
                ? 'bg-white text-brand-purple shadow-sm border border-slate-200/70 font-black'
                : 'text-slate-550 hover:text-slate-800 hover:bg-slate-200/20'
            }`}
          >
            بوابة الحراس الميدانيين
          </button>
        </div>

        <div className="p-6 sm:p-8 pt-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-4 bg-rose-50 border-r-4 border-rose-500 rounded-xl flex items-start gap-2.5 text-rose-905 text-xs font-bold"
            >
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-955">تنبيه بالنظام</p>
                <p className="opacity-95 leading-relaxed mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' ? (
            /* ADMIN LOGIN SCREEN - GOOGLE AUTH OR PASSWORD CHECK */
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-black mb-1.5 font-display" htmlFor="admin-username">
                  اسم المستخدم أو البريد المعتمد للمدير
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <UserIcon className="w-4" />
                  </span>
                  <input
                    id="admin-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder=""
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple transition-all text-xs font-bold text-right text-ltr rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-black mb-1.5 font-display" htmlFor="admin-password">
                  كلمة سر مدير النظام المعتمدة
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <KeyRound className="w-4" />
                  </span>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple transition-all text-xs font-bold text-right rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-purple hover:bg-brand-purple-light text-white font-bold rounded-xl text-xs tracking-wide shadow-md shadow-brand-purple/10 focus:outline-none transition-all disabled:opacity-50 text-center cursor-pointer font-display mt-2 active:scale-95"
              >
                {loading ? "جاري التحقق والدخول إلى النظام..." : "تسجيل الدخول الإداري بكلمة المرور"}
              </button>
            </form>
          ) : (
            /* GUARD LOGIN SCREEN - STANDARD USERNAME & PASSWORD */
            <form onSubmit={handleGuardLogin} className="space-y-4">
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-100 text-right space-y-1.5">
                <p className="text-sky-900 text-xs font-extrabold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                  حسابات الميدان وبوابات الموقف
                </p>
                <p className="text-sky-850 text-[11px] leading-relaxed font-bold">
                  يقوم الحارس الميداني بتسجيل الدخول بإدخال معلومات حسابه الشخصي <span className="text-brand-purple font-black">التي يتم تزويده بها من قِبل إدارة الشركة</span> من لوحة التحكم.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-black mb-1.5 font-display" htmlFor="username">
                  اسم الحارس المستخدم
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <UserIcon className="w-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: guard1 أو الاسم المعرّف"
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple transition-all text-xs font-bold text-right rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-black mb-1.5 font-display" htmlFor="password">
                  كلمة المرور الرقمية
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <KeyRound className="w-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple transition-all text-xs font-bold text-right rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-orange hover:bg-brand-orange-light text-white font-bold rounded-xl text-xs tracking-wide shadow-md shadow-brand-orange/10 focus:outline-none transition-all disabled:opacity-50 text-center cursor-pointer font-display mt-2 active:scale-95"
              >
                {loading ? "جاري الاتصال بالنظام وبوابة الحراسات..." : "تسجيل دخول الحارس للميدان"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-center text-xs text-slate-500 font-bold font-display leading-relaxed space-y-1">
            <p>شركة درة المنورة للنقليات - إدارة الأسطول والعبور الذكي</p>
            <p className="text-[11px] text-slate-400 font-medium">صنع ومتابعة من قِبل فريق التشغيل بمقر الشركة في العكيشية</p>
            <p className="text-brand-orange-light text-[11px] font-black pt-1">تنبيه: يُرجى الحفاظ التام على سرية بيانات الاعتماد الخاصة بك</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
