/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrIcon, Check, Copy } from "lucide-react";

interface QRGeneratorProps {
  busId: string;
  driverName?: string;
  onClose?: () => void;
}

export default function QRGenerator({ busId, driverName, onClose }: QRGeneratorProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!busId) return;
    
    // Generate QR containing ONLY the Bus ID as requested: "يحتوي فقط على رقم معرف الحافلة (Bus ID)"
    QRCode.toDataURL(busId, {
      width: 400,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: "#0f172a", // slate-900
        light: "#ffffff"
      }
    })
      .then((url) => {
        setQrUrl(url);
      })
      .catch((err) => {
        console.error("Error generating QR code:", err);
      });
  }, [busId]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `QR_${busId}_${driverName || 'Bus'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(busId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="relative bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 shadow-inner mb-6">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt={`QR Code for ${busId}`}
            className="w-48 h-48 bg-white p-2 rounded-xl shadow-md border border-slate-100"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-slate-400">
            جاري توليد الرمز...
          </div>
        )}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-xs px-3 py-1 rounded-full shadow-sm font-bold select-all">
          {busId}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-display font-semibold text-slate-800 text-base">
          رقم المعرف: <span className="font-mono text-blue-600 select-all">{busId}</span>
        </h4>
        {driverName && (
          <p className="text-slate-500 text-sm mt-1">السائق: {driverName}</p>
        )}
      </div>

      <div className="flex gap-3 w-full justify-center">
        <button
          onClick={handleDownload}
          disabled={!qrUrl}
          className="flex-1 max-w-[170px] flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 cursor-pointer transition-all disabled:opacity-50"
        >
          <Download className="w-4.5 h-4.5" />
          <span>تنزيل الرمز PNG</span>
        </button>

        <button
          onClick={handleCopyId}
          className="flex-1 max-w-[170px] flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
        >
          {copied ? (
            <>
              <Check className="w-4.5 h-4.5 text-emerald-600" />
              <span className="text-emerald-700">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="w-4.5 h-4.5" />
              <span>نسخ المعرّف</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 text-[11px] text-slate-400 leading-relaxed text-center max-w-sm">
        * يتضمن الرمز المشفر رقم المعرّف الفريد للحافلة فقط. يمكن للحراس مسح هذا الرمز عبر هاتفهم لإتمام عمليتي الدخول والخروج فورياً.
      </div>
    </div>
  );
}
