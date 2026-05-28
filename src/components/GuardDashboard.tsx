/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";
import {
  LogIn,
  LogOut,
  X,
  Camera,
  CheckCircle,
  AlertTriangle,
  Hash,
  Keyboard
} from "lucide-react";
import { User } from "../types";
import DmtcLogo from "./DmtcLogo";

interface GuardDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function GuardDashboard({ user, onLogout }: GuardDashboardProps) {
  const [activeAction, setActiveAction] = useState<'entry' | 'exit' | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(true);

  // Success Feedback Overlay
  const [successScanResult, setSuccessScanResult] = useState<{
    busId: string;
    driverName: string;
    licensePlate: string;
    action: 'entry' | 'exit';
  } | null>(null);

  // Error Feedback Overlay
  const [errorScanResult, setErrorScanResult] = useState<string | null>(null);
  const [scanProcessing, setScanProcessing] = useState(false);

  // Html5 Qr Code Ref
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Manual input state
  const [manualBusId, setManualBusId] = useState("");

  const handleStartScanner = async (action: 'entry' | 'exit') => {
    // Prevent multiple camera start
    if (activeAction) {
      await handleStopScanner();
    }

    setActiveAction(action);
    setScanProcessing(false);
    setErrorScanResult(null);

    // Wait for the container 'reader' element to render
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("reader");
        qrScannerRef.current = scanner;

        scanner.start(
          { facingMode: "environment" }, // Prioritize rear smartphone camera
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            // Found a QR Code
            handleSuccessfulQRDecode(decodedText, action);
          },
          () => {
            // Soft frame errors are ignored by default
          }
        ).catch((err) => {
          console.error("Error starting camera view:", err);
          setErrorScanResult("خطأ في تشغيل الكاميرا. يرجى التأكد من إعطاء الصلاحيات.");
          setCameraPermissionGranted(false);
        });
      } catch (err) {
        console.error("Scanner exception:", err);
      }
    }, 400);
  };

  const handleStopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        qrScannerRef.current = null;
      }
    }
    setActiveAction(null);
  };

  const handleRegisterMovement = async (decodedBusId: string, action: 'entry' | 'exit', isManual: boolean) => {
    if (scanProcessing) return; // Prevent double trigger
    setScanProcessing(true);

    if (!isManual && qrScannerRef.current) {
      // Stop scanner immediately upon successful read asynchronously.
      // We do NOT await here to avoid blocking or hanging the API fetch call on mobile devices!
      const scanner = qrScannerRef.current;
      setTimeout(() => {
        try {
          if (scanner && scanner.isScanning) {
            scanner.stop().catch(err => console.error("Error stopping scanner asynchronously:", err));
          }
        } catch (err) {
          console.error("Async camera stop exception:", err);
        }
      }, 50);
    }

    // Dynamic, robust parsing of Bus ID in case the scanned code contains a URL or messy spacing
    let busIdClean = decodedBusId.trim();
    if (busIdClean.includes("/") || busIdClean.startsWith("http")) {
      try {
        if (busIdClean.startsWith("http://") || busIdClean.startsWith("https://")) {
          const urlObj = new URL(busIdClean);
          const idParam = urlObj.searchParams.get("id") || urlObj.searchParams.get("busId");
          if (idParam) {
            busIdClean = idParam;
          } else {
            const pathSegments = urlObj.pathname.split("/").filter(Boolean);
            if (pathSegments.length > 0) {
              busIdClean = pathSegments[pathSegments.length - 1];
            }
          }
        } else {
          const pathSegments = busIdClean.split("/").filter(Boolean);
          if (pathSegments.length > 0) {
            busIdClean = pathSegments[pathSegments.length - 1];
          }
        }
      } catch (e) {
        const parts = busIdClean.split("/");
        busIdClean = parts[parts.length - 1] || busIdClean;
      }
    }

    // Remove any trailing query parameters or hashtag fragments
    if (busIdClean.includes("?")) {
      busIdClean = busIdClean.split("?")[0];
    }
    if (busIdClean.includes("#")) {
      busIdClean = busIdClean.split("#")[0];
    }
    busIdClean = busIdClean.trim().toUpperCase();

    if (!busIdClean) {
      setErrorScanResult("الرجاء إدخال رقم تشغيل حافلة صحيح.");
      setScanProcessing(false);
      return;
    }

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          busId: busIdClean,
          action: action,
          guardId: user.id
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Display beautiful success dialog with the registered specs
        setSuccessScanResult({
          busId: data.log.busId,
          driverName: data.log.driverName,
          licensePlate: data.log.licensePlate,
          action: action
        });
      } else {
        // Failed registration (Bus not in file, etc.)
        setErrorScanResult(data.error || "فشل تسجيل الحركة. قد يكون رقم التشغيل غير مسجل بالنظام.");
      }
    } catch (err) {
      setErrorScanResult("فشل الاتصال بالخادم لتسجيل الحركة.");
    } finally {
      setScanProcessing(false);
      if (!isManual) {
        setActiveAction(null); // Close camera layer
      }
    }
  };

  const handleSuccessfulQRDecode = async (decodedBusId: string, action: 'entry' | 'exit') => {
    await handleRegisterMovement(decodedBusId, action, false);
  };

  return (
    <div dir="rtl" className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/95 shadow-2xl p-6 flex flex-col gap-6 relative">
      
      {/* Branded Header */}
      <header className="bg-slate-50/70 rounded-2xl p-4 border border-slate-150 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DmtcLogo className="w-9 h-9" showText={true} textColorClass="text-slate-800" />
        </div>

        <button
          onClick={onLogout}
          className="py-1.5 px-3.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-220 hover:border-rose-200 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
        >
          <X className="w-3.5 h-3.5" />
          <span>الخروج الفوري</span>
        </button>
      </header>

      {/* Guard Badge Welcome */}
      <div className="p-4 bg-gradient-to-l from-brand-purple/[0.03] to-transparent border border-brand-purple/10 text-brand-purple rounded-2xl text-right">
        <p className="text-xs font-black flex items-center gap-1.5 text-brand-purple">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          البوابة الميدانية النشطة
        </p>
        <p className="text-[11.5px] text-slate-600 mt-1.5 font-bold">
          مرحباً بك يا كابتن: <span className="text-slate-900 font-extrabold">{user.name}</span>
        </p>
      </div>

      {/* Simplified, Clear Control Dashboard */}
      <section className="space-y-4 text-center">
        <div className="text-center pb-2">
          <h2 className="text-slate-900 font-extrabold text-sm font-display">تسجيل حركات الحافلات المباشر</h2>
          <p className="text-slate-500 text-[10.5px] mt-1.5 font-bold leading-relaxed">
            الرجاء توجيه كاميرا الهاتف لكود الحافلة (الـ QR) بعد النقر على الزر المناسب، أو إدخال رمز تشغيلها يدوياً أدناه.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => handleStartScanner('entry')}
            className="group py-4 px-4 bg-gradient-to-r from-emerald-50/50 to-white hover:from-emerald-100/50 hover:to-emerald-50/20 text-emerald-950 border border-emerald-250/70 hover:border-emerald-300 rounded-2xl font-display font-black text-sm shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
                <LogIn className="w-4.5 h-4.5" />
              </div>
              <div className="text-right">
                <span className="block font-black text-sm text-slate-900">[ تسجيل دخول حافلة ]</span>
                <span className="block text-[10px] text-emerald-800 font-bold mt-0.5">مسح كود الـ QR للساحة والباحة</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl font-black shadow-sm">موافق</span>
          </button>

          <button
            onClick={() => handleStartScanner('exit')}
            className="group py-4 px-4 bg-gradient-to-r from-amber-50/50 to-white hover:from-amber-100/50 hover:to-amber-50/20 text-amber-950 border border-amber-250/70 hover:border-amber-300 rounded-2xl font-display font-black text-sm shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-orange text-white rounded-xl flex items-center justify-center shadow-md shadow-brand-orange/20 transition-transform group-hover:scale-105">
                <LogOut className="w-4.5 h-4.5" />
              </div>
              <div className="text-right">
                <span className="block font-black text-sm text-slate-900">[ تسجيل خروج حافلة ]</span>
                <span className="block text-[10px] text-amber-800 font-bold mt-0.5">مسح كود الـ QR لمغادرة الميدان</span>
              </div>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-3 py-1 rounded-xl font-black shadow-sm">مغادرة</span>
          </button>
        </div>
      </section>

      {/* Simplified Manual Entry Section */}
      <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200/70">
          <Keyboard className="w-4 h-4 text-brand-purple shrink-0 animate-pulse" />
          <h3 className="font-display font-black text-xs text-slate-800">إدخال رقم الحافلة يدوياً</h3>
        </div>

        <p className="text-[10px] text-slate-500 mb-3 font-semibold leading-relaxed">
          إذا تعذر قراءة الباركود، يمكنك كتابة رمز تشغيل الحافلة هنا مباشرة:
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
              <Hash className="w-4 h-4 text-brand-purple" />
            </span>
            <input
              type="text"
              value={manualBusId}
              onChange={(e) => setManualBusId(e.target.value)}
              placeholder="مثال: BUS-101"
              className="w-full pr-10 pl-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-purple/5 focus:border-brand-purple transition-all text-xs font-bold text-right font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!manualBusId.trim()) {
                  setErrorScanResult("يرجى كتابة رقم تشغيل الحافلة أولاً.");
                  return;
                }
                await handleRegisterMovement(manualBusId, 'entry', true);
                setManualBusId("");
              }}
              disabled={scanProcessing}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-display font-black text-[11px] shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>تسجيل دخول</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!manualBusId.trim()) {
                  setErrorScanResult("يرجى كتابة رقم تشغيل الحافلة أولاً.");
                  return;
                }
                await handleRegisterMovement(manualBusId, 'exit', true);
                setManualBusId("");
              }}
              disabled={scanProcessing}
              className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-display font-black text-[11px] shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </form>
      </section>

      {/* DYNAMIC SCANNERS & OVERLAY VIEWS */}
      <AnimatePresence>
        
        {/* Custom Screen Full Camera Scanner Overlay with Branded Frame */}
        {activeAction && (
          <div className="fixed inset-0 z-50 flex flex-col bg-brand-purple-bg text-white select-none">
            {/* Camera Header */}
            <div className="p-5 flex justify-between items-center border-b border-brand-purple/40 shrink-0 bg-brand-purple-dark">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${activeAction === 'entry' ? 'bg-brand-cyan animate-ping' : 'bg-brand-orange animate-ping'}`} />
                <span className="text-sm font-display font-black text-slate-200">
                  {activeAction === 'entry' ? "ماسح درة المنورة: كود [الدخول]" : "ماسح درة المنورة: كود [الخروج]"}
                </span>
              </div>

              <button
                onClick={handleStopScanner}
                className="p-1 px-3 bg-brand-purple hover:bg-brand-purple-light/40 outline-none text-white border border-brand-purple-light/20 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                <span>إلغاء وإيقاف</span>
              </button>
            </div>

            {/* Scanner Canvas Placement Area */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 relative">
              <div className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-brand-purple/60 aspect-square relative shadow-2xl bg-black">
                
                {/* Embedded HTML5 Scanner target ID */}
                <div id="reader" className="w-full h-full bg-black" />

                {/* Aesthetic Focusing Reticle overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className={`w-full h-full border-2 border-dashed rounded-2xl animate-pulse opacity-75 relative ${activeAction === 'entry' ? 'border-brand-cyan' : 'border-brand-orange'}`}>
                    {/* Corner accents */}
                    <div className={`absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 ${activeAction === 'entry' ? 'border-brand-cyan' : 'border-brand-orange'}`} />
                    <div className={`absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 ${activeAction === 'entry' ? 'border-brand-cyan' : 'border-brand-orange'}`} />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 ${activeAction === 'entry' ? 'border-brand-cyan' : 'border-brand-orange'}`} />
                    <div className={`absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 ${activeAction === 'entry' ? 'border-brand-cyan' : 'border-brand-orange'}`} />
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-slate-300 text-xs max-w-xs leading-relaxed flex flex-col items-center gap-2">
                <Camera className={`w-5 h-5 animate-bounce ${activeAction === 'entry' ? 'text-brand-cyan' : 'text-brand-orange'}`} />
                <span>وجه عدسة الكاميرا إلى ملصق الاستجابة السريعة (TQR) الخاص بالحافلة ليتم اعتماده كلياً وبشكل لحظي.</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal feedback: Success Scan dialog popup */}
        {successScanResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessScanResult(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white text-slate-800 border border-slate-150 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl relative z-10 animate-fade-in"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-100">
                <CheckCircle className="w-9 h-9" />
              </div>

              <h3 className="font-display font-black text-xl text-slate-900">تم تسجيل الحركة بنجاح!</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-bold">غرفة عمليات شركة درة المنورة للنقليات</p>
              
              <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-right space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 text-[10px] font-bold">إتجاه الحركة</span>
                  {successScanResult.action === 'entry' ? (
                    <span className="text-emerald-800 bg-emerald-100 border border-emerald-200/50 px-2.5 py-0.5 rounded-lg font-black text-[11px]">
                      دخول حافلة
                    </span>
                  ) : (
                    <span className="text-amber-800 bg-amber-100 border border-amber-200/50 px-2.5 py-0.5 rounded-lg font-black text-[11px]">
                      خروج حافلة
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-bold">معرّف تشغيل الحافلة</span>
                  <span className="font-mono text-sm font-black text-slate-900 select-all block">{successScanResult.busId}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-bold">اسم السائق الكابتن</span>
                  <span className="text-slate-800 text-xs font-bold block">{successScanResult.driverName}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-bold">رقم لوحة الحافلة المعتمدة</span>
                  <span className="text-slate-700 font-mono text-xs block">{successScanResult.licensePlate}</span>
                </div>
              </div>

              <button
                onClick={() => setSuccessScanResult(null)}
                className="w-full py-3 bg-brand-orange hover:bg-brand-orange-light text-white rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer font-display active:scale-95"
              >
                متابعة تفتيش البوابات
              </button>
            </motion.div>
          </div>
        )}

        {/* Modal feedback: Error Scan alert dialog popup */}
        {errorScanResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorScanResult(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white text-slate-800 border border-slate-150 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl relative z-10"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="font-display font-black text-lg text-rose-955">تعذر إثبات الحركة</h3>
              
              <div className="my-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                <p className="text-rose-900 text-xs font-semibold leading-relaxed">
                  {errorScanResult}
                </p>
              </div>

              <button
                onClick={() => setErrorScanResult(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all cursor-pointer font-display active:scale-95"
              >
                المحاولة مرة أخرى
              </button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
