/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Bus as BusIcon,
  LogOut,
  Users,
  CalendarDays,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  QrCode,
  Search,
  Phone,
  FileSpreadsheet,
  Settings,
  X,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  LogIn,
  Database,
  Printer,
  Scan
} from "lucide-react";
import { User, Bus, ScanLog, DashboardStats } from "../types";
import QRCode from "qrcode";
import QRGenerator from "./QRGenerator";
import DmtcLogo from "./DmtcLogo";

interface PrintQRProps {
  busId: string;
}

function PrintQR({ busId }: PrintQRProps) {
  const [url, setUrl] = useState("");
  
  useEffect(() => {
    if (!busId) return;
    QRCode.toDataURL(busId, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    })
    .then(setUrl)
    .catch(err => console.error(err));
  }, [busId]);

  return url ? <img src={url} alt="QR" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain" /> : <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 animate-pulse mx-auto" />;
}

// Translate English digits to Eastern Arabic numerals (٠-٩)
const toEasternArabicNumerals = (numStr: string | number): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(numStr).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

// Map typical Saudi plate letters from Arabic to English
const standardLetterReverseMap: Record<string, string> = {
  'أ': 'A', 'ب': 'B', 'ج': 'G', 'د': 'D', 'هـ': 'E', 'ح': 'H', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N',
  'ر': 'R', 'س': 'S', 'ط': 'T', 'ع': 'U', 'ف': 'F', 'ص': 'X', 'ق': 'Y', 'و': 'Z'
};

const getSaudiPlateDetails = (plate: string) => {
  let englishDigits = "1234";
  let arabicDigits = "١٢٣٤";
  let englishLetters = "A B G";
  let arabicLetters = "أ ب ج";

  if (!plate) return { englishDigits, arabicDigits, englishLetters, arabicLetters };

  // 1. Digits extractor
  const matchedNumbers = plate.match(/\d+/);
  if (matchedNumbers && matchedNumbers[0]) {
    englishDigits = matchedNumbers[0];
    arabicDigits = toEasternArabicNumerals(englishDigits);
  }

  // 2. Letters extractor (Arabic and English)
  const matchedArabicLetters = plate.replace(/\d/g, "").replace(/[a-zA-Z]/g, "").trim();
  const matchedEnglishLetters = plate.replace(/\d/g, "").replace(/[^\x00-\x7F]+/g, "").trim();

  if (matchedArabicLetters) {
    // Format Arabic letters separated by nice gaps like "أ ب ج"
    arabicLetters = matchedArabicLetters.split("").filter(c => c.trim()).join(" ");
  }

  if (matchedEnglishLetters) {
    englishLetters = matchedEnglishLetters.toUpperCase().split("").filter(c => c.trim()).join(" ");
  } else if (matchedArabicLetters) {
    // Deduce English equivalents for standard Saudi plate letters if not provided in the string
    const engArr = matchedArabicLetters.split("").filter(c => c.trim()).map(c => standardLetterReverseMap[c] || c);
    englishLetters = engArr.join(" ").toUpperCase();
  }

  return { englishDigits, arabicDigits, englishLetters, arabicLetters };
};

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    busesInsideCount: 0,
    totalMovementsToday: 0,
    entriesToday: 0,
    exitsToday: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");

  // Active view tab
  const [activeTab, setActiveTab] = useState<'buses' | 'guards' | 'print_qr' | 'logs' | 'brand'>('buses');

  // Branding Customizer States
  const [logoInputUrl, setLogoInputUrl] = useState("");
  const [brandSuccess, setBrandSuccess] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrandError(null);
    setBrandSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBrandError("عذراً، يجب اختيار ملف صورة مخصص صالح (PNG، JPG، SVG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setBrandError("حجم الصورة كبير جداً؛ يرجى اختيار صورة أقل من 2 ميغابايت للحفاظ على سرعة تحميل النظام.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        localStorage.setItem("custom_dmtc_logo", base64);
        window.dispatchEvent(new Event("dmtc-logo-updated"));
        setBrandSuccess("تم استبدال وتحديث شعار أسطول درة المنورة بنجاح في كافة واجهات النظام والبطاقات الميدانية!");
      } else {
        setBrandError("فشل في قراءة ملف الصورة المستورد.");
      }
    };
    reader.onerror = () => {
      setBrandError("حدث خطأ أثناء تحميل الملف.");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBrandError(null);
    setBrandSuccess(null);
    if (!logoInputUrl.trim()) return;

    try {
      const url = new URL(logoInputUrl.trim());
      localStorage.setItem("custom_dmtc_logo", url.toString());
      window.dispatchEvent(new Event("dmtc-logo-updated"));
      setBrandSuccess("تم تحديث الشعار بالرابط المباشر للملف بنجاح!");
      setLogoInputUrl("");
    } catch (err) {
      setBrandError("الرجاء إدخال رابط ويب مباشر وصحيح مسبوقاً بـ https:// أو http://");
    }
  };

  const handleResetDefaultLogo = () => {
    setBrandError(null);
    setBrandSuccess(null);
    localStorage.removeItem("custom_dmtc_logo");
    window.dispatchEvent(new Event("dmtc-logo-updated"));
    setBrandSuccess("تم استعادة الشعار الرقمي التفاعلي الأصلي للشركة بنجاح.");
  };

  const [selectedPrintBus, setSelectedPrintBus] = useState<Bus | null>(null);
  const [badgeColor, setBadgeColor] = useState<'purple' | 'orange' | 'slate'>('purple');
  const [badgeSize, setBadgeSize] = useState<'standard' | 'compact'>('standard');

  // Bulk Print config states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBusIds, setSelectedBusIds] = useState<string[]>([]);
  const [bulkPrintLayout, setBulkPrintLayout] = useState<'one-per-page' | 'grid'>('grid');

  // Set default printable bus on load info
  useEffect(() => {
    if (buses.length > 0 && !selectedPrintBus) {
      setSelectedPrintBus(buses[0]);
    }
  }, [buses, selectedPrintBus]);

  // Color conversions cache to avoid recreating 1x1 canvas elements repeatedly and boost export speed
  const colorCache = new Map<string, string>();

  // Helper to convert any modern browser-supported color format (like oklch or oklab) to safe RGBA using a cached 1x1 canvas
  const colorToRgb = (colorStr: string): string => {
    if (!colorStr) return colorStr;
    const trimmed = colorStr.trim();
    if (colorCache.has(trimmed)) {
      return colorCache.get(trimmed)!;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = trimmed;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const [r, g, b, a] = data;
        const result = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        colorCache.set(trimmed, result);
        return result;
      }
    } catch (e) {
      // Fallback
    }
    const fallback = "rgb(80, 100, 120)";
    colorCache.set(trimmed, fallback);
    return fallback;
  };

  const convertAllModernColorsInString = (cssValue: string): string => {
    if (!cssValue) return cssValue;
    const lower = cssValue.toLowerCase();
    if (!lower.includes("oklch") && !lower.includes("oklab")) {
      return cssValue;
    }

    // Replace oklch(...) or oklab(...) with rgb/rgba equivalent
    let result = cssValue;
    const regex = /(oklch|oklab)\(([^)]+)\)/gi;
    result = result.replace(regex, (match) => {
      return colorToRgb(match);
    });
    return result;
  };

  // Helper to balance and replace nested parentheses for dynamic modern color values (like oklch/oklab)
  const sanitizeModernColors = (cssText: string): string => {
    return convertAllModernColorsInString(cssText);
  };

  // Helper to sanitize inline style attribute values recursively for an element and its descendants
  const sanitizeInlineStyles = (element: HTMLElement) => {
    const list = [element, ...Array.from(element.querySelectorAll("*"))] as HTMLElement[];
    list.forEach((el) => {
      if (el.getAttribute && el.getAttribute("style")) {
        const styleAttr = el.getAttribute("style") || "";
        if (styleAttr.toLowerCase().includes("oklch") || styleAttr.toLowerCase().includes("oklab")) {
          el.setAttribute("style", sanitizeModernColors(styleAttr));
        }
      }
    });
  };

  // Helper to temporarily sanitize CSS variables containing modern color formats that html2canvas cannot parse
  // High-performance Proxy-less and CSSOM-less version to fix Illegal Invocation & Extreme Slowness
  const executeWithSanitizedStyles = async (callback: () => Promise<void>) => {
    const originalGetComputedStyle = window.getComputedStyle;
    const originalStyles = new Map<HTMLStyleElement, string>();

    try {
      // 1. Monkey-patch window.getComputedStyle to intercept modern colors dynamically without Proxies or Illegal Invocations
      window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
        const style = originalGetComputedStyle(elt, pseudoElt);
        
        // Fast path: skip proxying/cloning if not part of our print target
        const isTarget = elt && (typeof elt.closest === 'function') && elt.closest('[data-is-printing="true"]');
        if (!isTarget) {
          return style;
        }

        // Return a custom plain object implementing necessary styling getters.
        // This avoids native constructor checks, illegal invocations, and proxy overheads.
        const clonedStyle: any = {};
        const commonProps = [
          'color', 'backgroundColor', 'borderColor', 'borderWidth', 'borderStyle',
          'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
          'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
          'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
          'boxShadow', 'textShadow', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
          'letterSpacing', 'lineHeight', 'textAlign', 'textDecoration', 'textTransform',
          'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
          'width', 'height', 'top', 'right', 'bottom', 'left', 'position', 'display',
          'visibility', 'opacity', 'overflow', 'zIndex', 'transform', 'transformOrigin',
          'boxSizing', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
          'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'
        ];

        for (const prop of commonProps) {
          const val = (style as any)[prop];
          if (typeof val === 'string') {
            clonedStyle[prop] = val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab')
              ? convertAllModernColorsInString(val)
              : val;
          } else {
            clonedStyle[prop] = val;
          }
        }

        // Standard custom fallback for getPropertyValue to keep html2canvas 100% stable
        clonedStyle.getPropertyValue = function (propName: string) {
          const camel = propName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          if (clonedStyle[camel] !== undefined) {
            return clonedStyle[camel];
          }
          const val = style.getPropertyValue(propName);
          if (typeof val === 'string' && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
            return convertAllModernColorsInString(val);
          }
          return val;
        };

        return clonedStyle as CSSStyleDeclaration;
      };

      // 2. Sanitize standard style tags (much faster than walking CSSOM rules)
      document.querySelectorAll("style").forEach((styleTag) => {
        const content = styleTag.textContent || "";
        if (content.toLowerCase().includes("oklch") || content.toLowerCase().includes("oklab")) {
          originalStyles.set(styleTag, content);
          styleTag.textContent = sanitizeModernColors(content);
        }
      });

      await callback();
    } finally {
      // Restore window.getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

      // Restore style tags
      originalStyles.forEach((originalContent, styleTag) => {
        try {
          styleTag.textContent = originalContent;
        } catch (err) {
          // Safe restore fallback
        }
      });
    }
  };

  const handleTriggerPrint = async () => {
    const badgeElement = document.getElementById("printable-badge");
    if (!badgeElement || !selectedPrintBus) {
      alert("لم يتم العثور على البطاقة القابلة للتصدير.");
      return;
    }

    setIsExportingPdf(true);
    setPdfProgress("جاري تهيئة بطاقة الحافلة...");

    try {
      // Create a clean offscreen wrapper for html2canvas
      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "-9999px";
      wrapper.style.width = badgeSize === 'standard' ? '540px' : '450px';
      wrapper.style.height = badgeSize === 'standard' ? '330px' : '280px';
      wrapper.style.background = "#ffffff";
      
      const clone = badgeElement.cloneNode(true) as HTMLElement;
      clone.setAttribute("data-is-printing", "true"); // Critical for scoped, high-performance getComputedStyle sanitizer
      clone.style.margin = "0";
      clone.style.transform = "none";
      clone.style.boxShadow = "none";
      clone.style.borderColor = 
        badgeColor === 'purple' ? '#152e5a' :
        badgeColor === 'orange' ? '#f37021' :
        '#334155';
      
      // Inject CSS overrides inside the clone to reset letterSpacing to normal / 0 to prevent disjointed Arabic characters
      const inlineStyle = document.createElement("style");
      inlineStyle.textContent = `
        * {
          letter-spacing: 0px !important;
          letter-spacing: normal !important;
        }
      `;
      clone.appendChild(inlineStyle);
      
      sanitizeInlineStyles(clone);
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      setPdfProgress("جاري توليد الصورة عالية الدقة (HD)...");

      // Set timeout to ensure CSS and QR Base64 load/render cleanly in the cloned element
      await new Promise(resolve => setTimeout(resolve, 300));

      let imgData = "";
      let pageW = 0;
      let pageH = 0;

      await executeWithSanitizedStyles(async () => {
        const canvas = await html2canvas(clone, {
          scale: 3, // Excellent quality for crystal-clear prints
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        imgData = canvas.toDataURL("image/png");
        pageW = canvas.width / 3;
        pageH = canvas.height / 3;
      });

      document.body.removeChild(wrapper);

      setPdfProgress("جاري توليد ملف الـ PDF الـذكي...");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [pageW, pageH],
      });

      pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
      pdf.save(`بطاقة_حافلة_${selectedPrintBus.id}.pdf`);

      setIsExportingPdf(false);
      setPdfProgress("");
    } catch (err) {
      console.error("Single PDF Export failed:", err);
      alert("فشل تصدير بطاقة الـ PDF. الرجاء المحاولة مرة أخرى.");
      setIsExportingPdf(false);
      setPdfProgress("");
    }
  };

  const handleTriggerBulkPrint = async () => {
    const bulkElement = document.getElementById("bulk-printable-area");
    if (!bulkElement || !selectedBusIds.length) {
      alert("الرجاء تحديد حافلة واحدة على الأقل من القائمة للتصدير الجماعي.");
      return;
    }

    setIsExportingPdf(true);
    setPdfProgress(`جاري البدء وتجهيز ${selectedBusIds.length} بطاقة...`);

    try {
      // Find all nested cards with class name bulk-badge-card
      const cards = bulkElement.getElementsByClassName("bulk-badge-card");
      if (cards.length === 0) {
        setIsExportingPdf(false);
        setPdfProgress("");
        alert("لم يتم العثور على بطاقات لتصديرها.");
        return;
      }

      const badgeImages: { imgData: string; originalW: number; originalH: number }[] = [];

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const busId = selectedBusIds[i] || `bus-${i}`;
        
        setPdfProgress(`جاري معالجة وتصوير بطاقة الحافلة ${i + 1} من أصل ${cards.length} (رقم الحافلة: ${busId})...`);

        // Render card cleanly offscreen
        const wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.left = "-9999px";
        wrapper.style.top = "-9999px";
        wrapper.style.width = badgeSize === 'standard' ? '600px' : '500px';
        wrapper.style.height = badgeSize === 'standard' ? '375px' : '315px';
        wrapper.style.background = "#ffffff";

        const clone = card.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-is-printing", "true"); // Critical for scoped, high-performance getComputedStyle sanitizer
        clone.style.margin = "0";
        clone.style.transform = "none";
        clone.style.boxShadow = "none";
        clone.style.borderColor = 
          badgeColor === 'purple' ? '#152e5a' :
          badgeColor === 'orange' ? '#f37021' :
          '#334155';

        // Inject CSS overrides inside the clone to reset letterSpacing to normal / 0 to prevent disjointed Arabic characters
        const inlineStyle = document.createElement("style");
        inlineStyle.textContent = `
          * {
            letter-spacing: 0px !important;
            letter-spacing: normal !important;
          }
        `;
        clone.appendChild(inlineStyle);

        sanitizeInlineStyles(clone);
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // Allow layout to stabilize
        await new Promise(resolve => setTimeout(resolve, 150));

        let imgData = "";
        let pageW = 0;
        let pageH = 0;

        await executeWithSanitizedStyles(async () => {
          const canvas = await html2canvas(clone, {
            scale: 3, // HD quality
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          imgData = canvas.toDataURL("image/png");
          pageW = canvas.width / 3;
          pageH = canvas.height / 3;
        });

        document.body.removeChild(wrapper);
        badgeImages.push({ imgData, originalW: pageW, originalH: pageH });
      }

      let pdfInstance: jsPDF | null = null;

      if (bulkPrintLayout === 'one-per-page') {
        // Individual sequential landscape mode
        for (let i = 0; i < badgeImages.length; i++) {
          const { imgData, originalW, originalH } = badgeImages[i];
          if (!pdfInstance) {
            pdfInstance = new jsPDF({
              orientation: "landscape",
              unit: "pt",
              format: [originalW, originalH],
            });
          } else {
            pdfInstance.addPage([originalW, originalH], "landscape");
          }
          pdfInstance.addImage(imgData, "PNG", 0, 0, originalW, originalH, undefined, "FAST");
        }
      } else {
        // 6 Badges per A4 page Layout (Portrait)
        // Two columns, 3 rows = 6 cards total.
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const cellW = A4_WIDTH / 2;     // 297.64 pt
        const cellH = A4_HEIGHT / 3;    // 280.63 pt

        const cardsPerPage = 6;
        const pagesCount = Math.ceil(badgeImages.length / cardsPerPage);

        for (let p = 0; p < pagesCount; p++) {
          setPdfProgress(`جاري دمج وتنظيم الصفحة رقم ${p + 1} من أصل ${pagesCount} في ملف التصدير...`);

          if (p === 0) {
            pdfInstance = new jsPDF({
              orientation: "portrait",
              unit: "pt",
              format: "a4",
              compress: true,
            });
          } else {
            pdfInstance.addPage("a4", "portrait");
          }

          // 1. Draw cut bounds/helpers
          pdfInstance.setDrawColor(220, 224, 230); // Soft layout border
          pdfInstance.setLineWidth(0.5);

          // Vertical middle dividing line
          pdfInstance.line(A4_WIDTH / 2, 0, A4_WIDTH / 2, A4_HEIGHT);

          // Horizontal grid dividing lines - 2 horizontal lines divider for 3 equal rows
          for (let r = 1; r < 3; r++) {
            const yPos = r * cellH;
            pdfInstance.line(0, yPos, A4_WIDTH, yPos);
          }

          // 2. Add up to 6 cards onto this page
          const startIndex = p * cardsPerPage;
          const endIndex = Math.min(startIndex + cardsPerPage, badgeImages.length);

          for (let idx = startIndex; idx < endIndex; idx++) {
            const { imgData, originalW, originalH } = badgeImages[idx];
            const localIdx = idx - startIndex;

            // Column: left = 0, right = 1
            const col = localIdx % 2;
            // Row: 0, 1, 2
            const row = Math.floor(localIdx / 2);

            const cellX = col * cellW;
            const cellY = row * cellH;

            // Fit card dimensions beautifully inside the half cell width and height with larger bounds
            const paddingX = 4;
            const paddingY = 4;
            const maxTargetW = cellW - paddingX * 2;
            const maxTargetH = cellH - paddingY * 2;

            let drawW = maxTargetW;
            let drawH = (originalH / originalW) * drawW;

            if (drawH > maxTargetH) {
              drawH = maxTargetH;
              drawW = (originalW / originalH) * drawH;
            }

            // Center card inside the cell bounds
            const drawX = cellX + (cellW - drawW) / 2;
            const drawY = cellY + (cellH - drawH) / 2;

            pdfInstance.addImage(imgData, "PNG", drawX, drawY, drawW, drawH, undefined, "FAST");
          }
        }
      }

      if (pdfInstance) {
        setPdfProgress("جاري حفظ وتخزين الملف النهائي الخاص بك...");
        const dateStamp = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
        pdfInstance.save(`تصاريح_حافلات_مجمعة_${dateStamp}.pdf`);
      }

      setIsExportingPdf(false);
      setPdfProgress("");
    } catch (err) {
      console.error("Bulk PDF Export failed:", err);
      alert("فشل تصدير البطاقات المجمعة كـ PDF. الرجاء المحاولة مرة أخرى.");
      setIsExportingPdf(false);
      setPdfProgress("");
    }
  };

  // Guards state list & search
  const [guards, setGuards] = useState<(User & { password?: string })[]>([]);
  const [guardSearch, setGuardSearch] = useState("");
  const [showAddGuardModal, setShowAddGuardModal] = useState(false);
  const [showEditGuardModal, setShowEditGuardModal] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<(User & { password?: string }) | null>(null);

  // Guard form input values
  const [guardFormName, setGuardFormName] = useState("");
  const [guardFormUsername, setGuardFormUsername] = useState("");
  const [guardFormPassword, setGuardFormPassword] = useState("");
  const [guardFormError, setGuardFormError] = useState<string | null>(null);
  const [guardFormSuccess, setGuardFormSuccess] = useState<string | null>(null);

  // Search & Filter state
  const [busSearch, setBusSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside' | 'outside'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  // Form Fields State
  const [formId, setFormId] = useState("");
  const [formDriverName, setFormDriverName] = useState("");
  const [formLicensePlate, setFormLicensePlate] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Log deletion state
  const [logToDelete, setLogToDelete] = useState<ScanLog | null>(null);
  const [showDeleteLogConfirm, setShowDeleteLogConfirm] = useState(false);
  const [deleteLogError, setDeleteLogError] = useState<string | null>(null);

  // Custom bus deletion state
  const [busToDelete, setBusToDelete] = useState<Bus | null>(null);
  const [showDeleteBusConfirm, setShowDeleteBusConfirm] = useState(false);
  const [deleteBusError, setDeleteBusError] = useState<string | null>(null);

  // Guard deletion state
  const [guardToDelete, setGuardToDelete] = useState<User | null>(null);
  const [showDeleteGuardConfirm, setShowDeleteGuardConfirm] = useState(false);
  const [deleteGuardError, setDeleteGuardError] = useState<string | null>(null);

  // Excel Importing states
  const [importingExcel, setImportingExcel] = useState(false);
  const [xlsxFeedbackModal, setXlsxFeedbackModal] = useState<{
    show: boolean;
    importedCount: number;
    skippedCount: number;
    skippedDetails: string[];
  } | null>(null);

  // Fetch all dashboard data
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // Parallel fetches for responsiveness
      const [resBuses, resLogs, resStats, resGuards] = await Promise.all([
        fetch("/api/buses"),
        fetch("/api/logs"),
        fetch("/api/stats"),
        fetch("/api/guards")
      ]);

      if (resBuses.ok && resLogs.ok && resStats.ok && resGuards.ok) {
        const busesData = await resBuses.json();
        const logsData = await resLogs.json();
        const statsData = await resStats.json();
        const guardsData = await resGuards.json();

        setBuses(busesData);
        setLogs(logsData);
        setStats(statsData);
        setGuards(guardsData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh every 2 seconds to catch scans from gate guards live or on-the-spot!
    const interval = setInterval(() => {
      fetchData(true);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Handle adding a bus
  const handleAddBusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formId.trim() || !formDriverName.trim() || !formLicensePlate.trim()) {
      setFormError("الرجاء ملء كافة الحقول الإجبارية المطلوبة.");
      return;
    }

    try {
      const response = await fetch("/api/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formId.trim().toUpperCase(),
          driverName: formDriverName.trim(),
          licensePlate: formLicensePlate.trim(),
          phone: formPhone.trim(),
          model: formModel.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFormSuccess("تمت إضافة الحافلة إلى النظام بنجاح!");
        // Clear fields
        setFormId("");
        setFormDriverName("");
        setFormLicensePlate("");
        setFormPhone("");
        setFormModel("");
        // Reload table
        fetchData(true);
        // Close after delayed exit
        setTimeout(() => {
          setShowAddModal(false);
          setFormSuccess(null);
        }, 1500);
      } else {
        setFormError(data.error || "فشل إضافة الحافلة. قد يكون المعرّف مسجلاً مسبقاً.");
      }
    } catch (err) {
      setFormError("عذراً، حدث خطأ أثناء الاتصال بالخادم.");
    }
  };

  // Open Edit modal with bus details pre-filled
  const openEditModal = (bus: Bus) => {
    setSelectedBus(bus);
    setFormDriverName(bus.driverName);
    setFormLicensePlate(bus.licensePlate);
    setFormPhone(bus.phone);
    setFormModel(bus.model || "");
    setFormError(null);
    setShowEditModal(true);
  };

  // Handle editing a bus
  const handleEditBusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;
    setFormError(null);
    setFormSuccess(null);

    if (!formDriverName.trim() || !formLicensePlate.trim()) {
      setFormError("الرجاء ملء الحقول الإجبارية.");
      return;
    }

    try {
      const response = await fetch(`/api/buses/${selectedBus.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: formDriverName.trim(),
          licensePlate: formLicensePlate.trim(),
          phone: formPhone.trim(),
          model: formModel.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFormSuccess("تم تعديل معلومات الحافلة بنجاح!");
        fetchData(true);
        setTimeout(() => {
          setShowEditModal(false);
          setFormSuccess(null);
          setSelectedBus(null);
        }, 1500);
      } else {
        setFormError(data.error || "تعذر إجراء التعديل.");
      }
    } catch (err) {
      setFormError("حدث خطأ أثناء الاتصال بالخادم للتعديل.");
    }
  };

  // Initiate deleting a bus (opens custom confirmation modal)
  const handleInitiateDeleteBus = (bus: Bus) => {
    setBusToDelete(bus);
    setDeleteBusError(null);
    setShowDeleteBusConfirm(true);
  };

  // Confirm deleting a bus from the custom modal
  const handleConfirmDeleteBus = async () => {
    if (!busToDelete) return;
    try {
      const response = await fetch(`/api/buses/${busToDelete.id}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (response.ok && data.success) {
        fetchData(true);
        setShowDeleteBusConfirm(false);
        setBusToDelete(null);
      } else {
        setDeleteBusError(data.error || "فشل حذف الحافلة.");
      }
    } catch (err) {
      setDeleteBusError("عذراً، فشل الاتصال بالخادم لإتمام عملية الحذف.");
    }
  };

  // Handle importing buses from Excel file
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          setImportingExcel(false);
          alert("فشل تحميل محتوى الملف.");
          return;
        }
        
        // Read workbook as array buffer (much safer and universally supported)
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet rows to JSON formats
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!jsonData || jsonData.length === 0) {
          setImportingExcel(false);
          alert("الملف فارغ أو لا يحتوي على أوراق بيانات صالحة لتتبع الحافلات.");
          return;
        }

        // Map columns correctly across common Arabic or English synonyms
        const mappedBuses = jsonData.map((row) => {
          const findVal = (possibleKeys: string[]) => {
            for (const key of Object.keys(row)) {
              if (possibleKeys.some(pk => key.toLowerCase().trim().includes(pk))) {
                return row[key] !== undefined ? String(row[key]).trim() : "";
              }
            }
            return "";
          };

          const id = findVal(["id", "معرف", "رقم الحافلة", "الباص", "رقم التشغيل", "رقم الباص"]);
          const driverName = findVal(["driver", "سائق", "اسم السائق", "السائق"]);
          const licensePlate = findVal(["plate", "لوحة", "رقم اللوحة", "اللوحه"]);
          const phone = findVal(["phone", "هاتف", "جوال", "رقم الهاتف", "رقم الجوال", "الهاتف"]);
          const model = findVal(["model", "موديل", "طراز", "سنة الصنع", "الموديل"]);

          return { id, driverName, licensePlate, phone, model };
        });

        // Bulk request
        const apiResponse = await fetch("/api/buses/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ busesList: mappedBuses })
        });

        const resData = await apiResponse.json();
        setImportingExcel(false);

        if (apiResponse.ok && resData.success) {
          setXlsxFeedbackModal({
            show: true,
            importedCount: resData.importedCount,
            skippedCount: resData.skippedCount,
            skippedDetails: resData.skippedDetails || []
          });
          fetchData(true);
        } else {
          alert(resData.error || "عذراً، تعذر استيراد وتخزين بيانات ملف الإكسل.");
        }
      } catch (err) {
        setImportingExcel(false);
        console.error("Excel import processing error:", err);
        alert("حدث خطأ غير متوقع أثناء تفكيك وقراءة ملف إكسل. الرجاء التأكد من سلامة وصيغة الملف جيداً.");
      }
    };

    reader.onerror = () => {
      setImportingExcel(false);
      alert("حدث خطأ أثناء تحميل الملف.");
    };

    reader.readAsArrayBuffer(file);
    // Reset file input so same file can be uploaded again if needed
    e.target.value = "";
  };

  // Export gate movement logs to Excel file
  const handleExportLogsExcel = () => {
    if (filteredLogs.length === 0) {
      alert("لا توجد حركات لتصديرها.");
      return;
    }

    try {
      // Map logs to readable objects with Arabic keys
      const dataToExport = filteredLogs.map((log) => {
        const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString("ar-SA") : "";
        return {
          "نوع العبور": log.action === "entry" ? "دخول" : "خروج",
          "معرّف الحافلة": log.busId,
          "اسم كابتن الحافلة (السائق)": log.driverName,
          "لوحة المركبة المعتمدة": log.licensePlate,
          "بواسطة (حارس البوابة)": log.guardName,
          "وقت وتاريخ الحركة": dateStr || log.timestamp
        };
      });

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Create a workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "سجل حركة البوابات");

      // Generate file and trigger download
      XLSX.writeFile(workbook, `سجل_حركة_درة_المنورة_البوابات_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Error exporting logs to Excel:", err);
      alert("حدث خطأ أثناء رغبتكم في تصدير البيانات إلى ملف إكسل من المتصفح.");
    }
  };

  // --- Guards Management Handlers ---

  const handleAddGuardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardFormError(null);
    setGuardFormSuccess(null);

    if (!guardFormName.trim() || !guardFormUsername.trim() || !guardFormPassword.trim()) {
      setGuardFormError("الرجاء ملء كافة الحقول لإتمام تسجيل الحارس.");
      return;
    }

    try {
      const response = await fetch("/api/guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guardFormName.trim(),
          username: guardFormUsername.trim().toLowerCase(),
          password: guardFormPassword.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setGuardFormSuccess("تمت إضافة وتفعيل حساب الحارس الميداني بنجاح!");
        setGuardFormName("");
        setGuardFormUsername("");
        setGuardFormPassword("");
        fetchData(true);
        setTimeout(() => {
          setShowAddGuardModal(false);
          setGuardFormSuccess(null);
        }, 1500);
      } else {
        setGuardFormError(data.error || "تعذرت إضافة الحارس الميداني.");
      }
    } catch (err) {
      setGuardFormError("فشل الاتصال بالخادم أثناء تسجيل الحارس.");
    }
  };

  const openEditGuardModal = (guard: User & { password?: string }) => {
    setSelectedGuard(guard);
    setGuardFormName(guard.name);
    setGuardFormUsername(guard.username);
    setGuardFormPassword(guard.password || "123");
    setGuardFormError(null);
    setShowEditGuardModal(true);
  };

  const handleEditGuardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuard) return;
    setGuardFormError(null);
    setGuardFormSuccess(null);

    if (!guardFormName.trim() || !guardFormUsername.trim() || !guardFormPassword.trim()) {
      setGuardFormError("جميع الحقول إجبارية.");
      return;
    }

    try {
      const response = await fetch(`/api/guards/${selectedGuard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guardFormName.trim(),
          username: guardFormUsername.trim().toLowerCase(),
          password: guardFormPassword.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setGuardFormSuccess("تمت مزامنة وحفظ التعديلات فورياً بنجاح!");
        fetchData(true);
        setTimeout(() => {
          setShowEditGuardModal(false);
          setGuardFormSuccess(null);
          setSelectedGuard(null);
        }, 1500);
      } else {
        setGuardFormError(data.error || "فشل تعديل بيانات الحارس.");
      }
    } catch (err) {
      setGuardFormError("حدث خطأ أثناء الاتصال بالخادم لتعديل بيانات الحارس.");
    }
  };

  const handleInitiateDeleteGuard = (guard: User) => {
    setGuardToDelete(guard);
    setDeleteGuardError(null);
    setShowDeleteGuardConfirm(true);
  };

  const handleConfirmDeleteGuard = async () => {
    if (!guardToDelete) return;
    try {
      const response = await fetch(`/api/guards/${guardToDelete.id}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (response.ok && data.success) {
        fetchData(true);
        setShowDeleteGuardConfirm(false);
        setGuardToDelete(null);
      } else {
        setDeleteGuardError(data.error || "تعذر حذف الحارس من النظام.");
      }
    } catch (err) {
      setDeleteGuardError("فشل الاتصال لتنفيذ أمر مسح الحارس.");
    }
  };

  const handleInitiateDeleteLog = (log: ScanLog) => {
    setLogToDelete(log);
    setDeleteLogError(null);
    setShowDeleteLogConfirm(true);
  };

  const handleConfirmDeleteLog = async () => {
    if (!logToDelete) return;
    try {
      const response = await fetch(`/api/logs/${logToDelete.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchData(true);
        setShowDeleteLogConfirm(false);
        setLogToDelete(null);
      } else {
        setDeleteLogError(data.error || "تعذر حذف حركة العبور.");
      }
    } catch (err) {
      setDeleteLogError("فشل الاتصال لتنفيذ أمر حذف الحركة.");
    }
  };

  // Reset dummy database to explore clean status logs
  const handleResetData = async () => {
    if (window.confirm("تنبيه: سيؤدي هذا الإجراء إلى إعادة تعيين الحافلات وسجلات الدخول والخروج لقيمها الافتراضية الأولية. هل تريد المتابعة؟")) {
      try {
        const response = await fetch("/api/system/reset", { method: "POST" });
        if (response.ok) {
          fetchData(true);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Open QR modal
  const openQRModal = (bus: Bus) => {
    setSelectedBus(bus);
    setShowQRModal(true);
  };

  // Filter and Search calculations
  const filteredBuses = buses.filter((bus) => {
    const matchesSearch =
      bus.id.toLowerCase().includes(busSearch.toLowerCase()) ||
      bus.driverName.toLowerCase().includes(busSearch.toLowerCase()) ||
      bus.licensePlate.toLowerCase().includes(busSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : bus.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredGuards = guards.filter((guard) => {
    return (
      guard.name.toLowerCase().includes(guardSearch.toLowerCase()) ||
      guard.username.toLowerCase().includes(guardSearch.toLowerCase())
    );
  });

  const filteredLogs = logs.filter((log) => {
    // 1. Search text filter
    const matchesSearch =
      log.busId.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.driverName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.licensePlate.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.guardName.toLowerCase().includes(logSearch.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Start date filter
    if (logStartDate) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(logStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (logDate < startDate) return false;
    }

    // 3. End date filter
    if (logEndDate) {
      const logDate = new Date(log.timestamp);
      const endDate = new Date(logEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) return false;
    }

    return true;
  });

  // Calculate local timing for labels
  const getArabicFormattedTime = (isoString: string) => {
    try {
      const gDate = new Date(isoString);
      return gDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) + " - " + gDate.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
    } catch {
      return isoString;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen text-slate-800 p-2 md:p-6 selection:bg-brand-orange/20 selection:text-brand-purple-dark pb-16">
      {/* PDF Export Progress Modal */}
      <AnimatePresence>
        {isExportingPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 text-right"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col items-center text-center"
            >
              <div className="relative flex items-center justify-center w-16 h-16 bg-brand-purple/5 text-brand-purple rounded-2xl mb-4">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="font-display font-black text-slate-900 text-sm sm:text-base mb-1.5">جاري تصدير بطاقات الـ PDF</h3>
              <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                يرجى الانتظار، لا تغلق هذه الصفحة أثناء إعداد المستندات عالية الدقة.
              </p>
              <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <p className="text-xs font-bold text-brand-orange animate-pulse">
                  {pdfProgress || "جاري تجميع البيانات..."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Navigation branded as Drat Al-Munawarah Co. (DMTC) */}
      <header className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle background brand glow built with CSS */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-150 flex items-center justify-center text-brand-orange shrink-0 shadow-md">
            <DmtcLogo className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="font-display text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                درة المنورة للنقليات
              </h1>
              <span className="text-[9px] md:text-[10px] font-black px-2.5 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20">تتبع الحافلات الذكي (DMTC)</span>
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                النظام نشط ومؤمن
              </span>
            </div>
            <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium font-display">
              مرحبا بك في شركة درة المنورة للنقليات - مركز إدارة الاسطول من قبل فريق التشغيل
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 relative z-10">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 rounded-xl text-xs font-black cursor-pointer transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث المراقبة</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-rose-50/90 hover:bg-rose-100/90 border border-rose-200/80 text-rose-600 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </header>

      {/* Statistics Panels (Bento Grid) with Corporate Gradient Indicators */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Stat 1 - Current inside (Cyan / Orange) */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-gradient-to-br from-white via-white to-brand-cyan/[0.02] p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 h-1 w-full bg-brand-cyan" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-500 text-xs font-bold font-display">الحافلات بالداخل حالياً</span>
            <div className="bg-brand-cyan/10 p-2 rounded-xl text-brand-cyan border border-brand-cyan/10 transition-colors group-hover:bg-brand-cyan group-hover:text-white">
              <BusIcon className="w-4.5 h-4.5" />
            </div>
          </div>
          <h3 className="font-display text-4xl font-black text-slate-900 tracking-tight">
            {loading ? "..." : stats.busesInsideCount}
          </h3>
          <p className="text-slate-500 text-[10px] mt-2.5 flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping shrink-0" />
            متواجدة حالياً بمقر الشركة بالتحديد بالعكيشية
          </p>
        </motion.div>

        {/* Stat 2 - Total Movements */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-gradient-to-br from-white via-white to-brand-purple/[0.02] p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 h-1 w-full bg-brand-purple" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-500 text-xs font-bold font-display">حركات اليوم مجملاً</span>
            <div className="bg-brand-purple/10 p-2 rounded-xl text-brand-purple border border-brand-purple/10 transition-colors group-hover:bg-brand-purple group-hover:text-white">
              <RefreshCw className="w-4.5 h-4.5 text-brand-purple" />
            </div>
          </div>
          <h3 className="font-display text-4xl font-black text-slate-900 tracking-tight">
            {loading ? "..." : stats.totalMovementsToday}
          </h3>
          <p className="text-slate-500 text-[10px] mt-2.5 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple shrink-0 animate-pulse" />
            شاملة الدخول والخروج المسجل يدوياً وبالـ QR
          </p>
        </motion.div>

        {/* Stat 3 - Entries Today */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-gradient-to-br from-white via-white to-emerald-50/[0.05] p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-500 text-xs font-bold font-display">دخول</span>
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <LogIn className="w-4.5 h-4.5" />
            </div>
          </div>
          <h3 className="font-display text-4xl font-black text-slate-900 tracking-tight">
            {loading ? "..." : stats.entriesToday}
          </h3>
          <p className="text-emerald-600 text-[10px] mt-2.5 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            حافلات مرخصة بالعبور المعتمد اليوم
          </p>
        </motion.div>

        {/* Stat 4 - Exits Today */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-gradient-to-br from-white via-white to-brand-orange/[0.02] p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 h-1 w-full bg-brand-orange" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-500 text-xs font-bold font-display">خروج</span>
            <div className="bg-brand-orange/10 p-2 rounded-xl text-brand-orange border border-brand-orange/10 transition-colors group-hover:bg-brand-orange group-hover:text-white">
              <LogOut className="w-4.5 h-4.5" />
            </div>
          </div>
          <h3 className="font-display text-4xl font-black text-slate-900 tracking-tight">
            {loading ? "..." : stats.exitsToday}
          </h3>
          <p className="text-brand-orange text-[10px] mt-2.5 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
            مغادرة معتمدة للمسارات المقررة اليوم
          </p>
        </motion.div>
      </section>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Right Sidebar: Corporate Navigation Tabs (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 sticky top-6">
          <div className="border-b border-slate-100 pb-3 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-brand-orange-light">لوحة التحكّم والقيادة</span>
            <h3 className="font-display font-black text-slate-800 text-sm mt-0.5">أقسام التنقّل المباشر</h3>
          </div>
          
          <div className="flex flex-col gap-2.5 font-sans">
            {/* Tab 1: Buses */}
            <motion.button
              whileHover={{ scale: 1.01, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('buses')}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-between cursor-pointer border relative overflow-hidden group ${
                activeTab === 'buses'
                  ? 'bg-gradient-to-l from-brand-purple to-brand-purple/90 text-white font-extrabold shadow-md shadow-brand-purple/20 border-brand-purple'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors duration-200 ${
                  activeTab === 'buses' 
                    ? 'bg-white/15 text-brand-cyan-light font-bold' 
                    : 'bg-white text-slate-500 border border-slate-150 group-hover:border-slate-300'
                }`}>
                  <BusIcon className="w-4 h-4" />
                </div>
                <span className="font-display text-xs">إدارة أسطول الحافلات</span>
              </div>
              {/* Dynamic indicator dot/line */}
              {activeTab === 'buses' ? (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-brand-cyan rounded-l-full"
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </motion.button>

            {/* Tab 2: Logs */}
            <motion.button
              whileHover={{ scale: 1.01, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('logs')}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-between cursor-pointer border relative overflow-hidden group ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-l from-emerald-600 to-emerald-600/90 text-white font-extrabold shadow-md shadow-emerald-600/20 border-emerald-600'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors duration-200 ${
                  activeTab === 'logs' 
                    ? 'bg-white/15 text-emerald-300' 
                    : 'bg-white text-slate-500 border border-slate-150 group-hover:border-slate-300'
                }`}>
                  <FileSpreadsheet className="w-4 h-4 font-bold" />
                </div>
                <span className="font-display text-xs">سجل حركة البوابات (كلي)</span>
              </div>
              {activeTab === 'logs' ? (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-emerald-300 rounded-l-full"
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </motion.button>

            {/* Tab 3: Guards */}
            <motion.button
              whileHover={{ scale: 1.01, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('guards')}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-between cursor-pointer border relative overflow-hidden group ${
                activeTab === 'guards'
                  ? 'bg-gradient-to-l from-cyan-600 to-cyan-600/90 text-white font-extrabold shadow-md shadow-cyan-600/20 border-cyan-600'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors duration-200 ${
                  activeTab === 'guards' 
                    ? 'bg-white/15 text-cyan-200' 
                    : 'bg-white text-slate-500 border border-slate-150 group-hover:border-slate-300'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-display text-xs">إدارة الحراس وبوابات الميدان</span>
              </div>
              {activeTab === 'guards' ? (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-cyan-300 rounded-l-full"
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </motion.button>

            {/* Tab 4: QR */}
            <motion.button
              whileHover={{ scale: 1.01, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('print_qr')}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-between cursor-pointer border relative overflow-hidden group ${
                activeTab === 'print_qr'
                  ? 'bg-gradient-to-l from-brand-orange to-brand-orange/90 text-white font-extrabold shadow-md shadow-brand-orange/20 border-brand-orange'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors duration-200 ${
                  activeTab === 'print_qr' 
                    ? 'bg-white/15 text-brand-orange-light' 
                    : 'bg-white text-slate-500 border border-slate-150 group-hover:border-slate-300'
                }`}>
                  <Printer className="w-4 h-4" />
                </div>
                <span className="font-display text-xs">طباعة رموز الـ QR</span>
              </div>
              {activeTab === 'print_qr' ? (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-brand-orange-light rounded-l-full"
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </motion.button>

            {/* Tab 5: Visual Identity and Logo */}
            <motion.button
              whileHover={{ scale: 1.01, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('brand')}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-between cursor-pointer border relative overflow-hidden group ${
                activeTab === 'brand'
                  ? 'bg-gradient-to-l from-brand-purple to-brand-purple/90 text-white font-extrabold shadow-md shadow-brand-purple/20 border-brand-purple'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors duration-200 ${
                  activeTab === 'brand' 
                    ? 'bg-white/15 text-brand-purple-light' 
                    : 'bg-white text-slate-500 border border-slate-150 group-hover:border-slate-300'
                }`}>
                  <Settings className="w-4 h-4" />
                </div>
                <span className="font-display text-xs">الهوية البصرية والشعار</span>
              </div>
              {activeTab === 'brand' ? (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-brand-purple rounded-l-full"
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </motion.button>
          </div>

          {/* Quick System Statistics inside Sidebar */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-sans">
            <span className="text-[10px] font-extrabold text-slate-400">ملخص سريع للحالة</span>
            <div className="mt-2.5 space-y-2 text-[11px] text-slate-600 font-bold font-display leading-normal">
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                <span>أسطول الحافلات:</span>
                <span className="text-brand-orange font-extrabold">{buses.length} حافلة</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                <span>الحراس الميدانيين:</span>
                <span className="text-brand-purple font-extrabold">{guards.length} حراس</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                <span>حركات بوابات اليوم:</span>
                <span className="text-emerald-600 font-extrabold">{stats.totalMovementsToday} حركة</span>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'print_qr' ? (
          /* "طباعة الـ QR" Tab View */
          <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px] text-right">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-purple shrink-0" />
                <h2 className="font-display font-black text-slate-900 text-md">بوابة تصميم وطباعة بطاقات الحافلات الذكية (QR)</h2>
              </div>
              <span className="bg-brand-purple/15 text-brand-purple text-[10px] px-2.5 py-1 rounded-md font-bold border border-brand-purple/25 animate-pulse">
                تجهيز فوري للطباعة الفردية والجماعية
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
              
              {/* Left Column (Desktop 5/12): Bus Selector list */}
              <div className="md:col-span-5 border border-slate-200 rounded-2xl flex flex-col overflow-hidden bg-slate-50/50 h-[520px]">
                <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="block text-slate-700 text-xs font-black font-display">قائمة حافلات الأسطول</label>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkMode(!bulkMode);
                        setSelectedBusIds([]);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        bulkMode
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/10'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                      {bulkMode ? "✓ نمط الاستيراد والتحديد المتعدد نشط" : "⚙ الانتقال لنمط الطباعة الجماعية (دفعة كاملة)"}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="ابحث برقم الحافلة أو السائق..."
                      value={busSearch}
                      onChange={(e) => setBusSearch(e.target.value)}
                      className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold"
                    />
                  </div>

                  {bulkMode && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const filteredIds = filteredBuses.map(b => b.id);
                          setSelectedBusIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                        }}
                        className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black cursor-pointer transition-all text-center"
                      >
                        تحديد الكل بالبحث ({filteredBuses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const filteredIds = filteredBuses.map(b => b.id);
                          setSelectedBusIds(prev => prev.filter(id => !filteredIds.includes(id)));
                        }}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black cursor-pointer transition-all text-center"
                      >
                        إلغاء تحديد الكل
                      </button>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-slate-150 overflow-y-auto flex-1">
                  {filteredBuses.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">لا حافلات تطابق بحثك.</div>
                  ) : (
                    filteredBuses.map((bus) => {
                      const isSelected = selectedBusIds.includes(bus.id);
                      return (
                        <button
                          key={bus.id}
                          type="button"
                          onClick={() => {
                            if (bulkMode) {
                              setSelectedBusIds(prev =>
                                prev.includes(bus.id)
                                  ? prev.filter(id => id !== bus.id)
                                  : [...prev, bus.id]
                              );
                            } else {
                              setSelectedPrintBus(bus);
                            }
                          }}
                          className={`w-full p-3.5 text-right flex items-center justify-between hover:bg-slate-100 transition-all cursor-pointer ${
                            !bulkMode && selectedPrintBus?.id === bus.id
                              ? 'bg-brand-purple/5 border-r-4 border-brand-purple'
                              : bulkMode && isSelected
                              ? 'bg-emerald-50/40 border-r-4 border-emerald-500 font-extrabold'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {bulkMode && (
                              <div className={`w-4.5 h-4.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <span className="text-[10px] font-bold">✓</span>}
                              </div>
                            )}
                            <div className="min-w-0 text-right">
                              <p className={`text-xs font-black ${(!bulkMode && selectedPrintBus?.id === bus.id) || (bulkMode && isSelected) ? 'text-brand-purple' : 'text-slate-800'}`}>
                                {bus.driverName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">{bus.id}</p>
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <span className="inline-block bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 font-mono">
                              {bus.licensePlate}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column (Desktop 7/12): Interactive Badge Customizer & Print Preview */}
              <div className="md:col-span-7 flex flex-col gap-6 justify-between h-[520px]">
                
                {bulkMode ? (
                  /* BULK PRINT LAYOUT VIEW */
                  <div className="flex flex-col gap-5 h-full justify-between">
                    
                    {/* Style Configurator */}
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h4 className="font-display font-black text-emerald-800 text-xs flex items-center gap-1.5">
                          <span>⚙ خيارات مظهر الطباعة الجماعية</span>
                        </h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-black">
                          تم تحديد {selectedBusIds.length} حافلة للتصدير
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-500 text-[9px] font-extrabold mb-1">لون الحدود السائد:</label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setBadgeColor('purple')}
                              className={`w-5 h-5 rounded-full bg-brand-purple border-2 transition-all cursor-pointer ${badgeColor === 'purple' ? 'border-brand-orange scale-110' : 'border-transparent'}`}
                              title="بنفسجي درة"
                            />
                            <button
                              type="button"
                              onClick={() => setBadgeColor('orange')}
                              className={`w-5 h-5 rounded-full bg-brand-orange border-2 transition-all cursor-pointer ${badgeColor === 'orange' ? 'border-brand-purple scale-110' : 'border-transparent'}`}
                              title="برتقالي درة"
                            />
                            <button
                              type="button"
                              onClick={() => setBadgeColor('slate')}
                              className={`w-5 h-5 rounded-full bg-slate-700 border-2 transition-all cursor-pointer ${badgeColor === 'slate' ? 'border-orange-400 scale-110' : 'border-transparent'}`}
                              title="فحمي هادئ"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-500 text-[9px] font-extrabold mb-1">المقاس المعياري التخيلي:</label>
                          <select
                            value={badgeSize}
                            onChange={(e) => setBadgeSize(e.target.value as 'standard' | 'compact')}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] text-slate-750 font-bold w-full outline-none focus:border-brand-purple cursor-pointer leading-tight h-8"
                          >
                            <option value="standard">بطاقة مرور بج</option>
                            <option value="compact">ملصق زجاج صغير</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-500 text-[9px] font-extrabold mb-1">توزيع الصفحات عند الطباعة:</label>
                          <select
                            value={bulkPrintLayout}
                            onChange={(e) => setBulkPrintLayout(e.target.value as 'one-per-page' | 'grid')}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] text-slate-750 font-bold w-full outline-none focus:border-brand-purple cursor-pointer leading-tight h-8"
                          >
                            <option value="one-per-page">بطاقة واحدة بكل صفحة (منفصل)</option>
                            <option value="grid">كروت متتالية (6 بطاقات بصفحة A4 مدمجة)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* BULK PREVIEW CAROUSEL / GRID DUMMY DECK */}
                    <div className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-50/50 rounded-2xl border border-slate-150 overflow-hidden px-4">
                      {selectedBusIds.length === 0 ? (
                        <div className="text-center p-6 space-y-2">
                          <Printer className="w-10 h-10 text-slate-300 mx-auto animate-bounce" />
                          <h5 className="font-display font-black text-slate-800 text-xs">بانتظار تحديد الحافلات المعنية</h5>
                          <p className="text-slate-400 text-[10px] leading-relaxed max-w-[280px] mx-auto font-medium">
                            الرجاء تحديد الحافلات المراد طباعة تصاريحها معاً بالضغط عليها من القائمة الجانبية (أو اضغط زر تحديد الكل بالبحث لتحديدها جميعاً).
                          </p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col justify-between">
                          <div className="text-right pb-1">
                            <span className="text-[10px] text-slate-500 font-extrabold leading-none">
                              معاينة تفاعلية مسخّرة لدورات الطباعة المجدولة (يتم عرض أول {Math.min(3, selectedBusIds.length)} حافلات)
                            </span>
                          </div>

                          {/* Deck list containing preview instances */}
                          <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center justify-start gap-4 py-2 scrollbar-none">
                            {selectedBusIds.slice(0, 3).map((busId) => {
                              const b = buses.find(x => x.id === busId);
                              if (!b) return null;
                              return (
                                <div
                                  key={b.id}
                                  className={`bg-white text-right border-3 rounded-2xl p-3 shadow-md shrink-0 select-none flex flex-col justify-between ${
                                    badgeColor === 'purple' ? 'border-[#152e5a]' :
                                    badgeColor === 'orange' ? 'border-brand-orange' :
                                    'border-slate-700'
                                  } w-[220px] h-[140px] relative`}
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                    <div className="text-[9px] font-black text-[#152e5a]">نقل درة المنورة</div>
                                    <div className="text-[7px] text-slate-400 font-mono font-bold leading-none">{b.licensePlate}</div>
                                  </div>

                                  <div className="flex gap-2 items-center my-1.5 min-w-0">
                                    <div className="w-11 h-11 border border-slate-200 bg-slate-50 p-1 rounded-lg shrink-0 flex items-center justify-center">
                                      <PrintQR busId={b.id} />
                                    </div>
                                    <div className="min-w-0 text-right space-y-1">
                                      <p className="text-slate-500 text-[8px] font-black leading-none">الرقم التشغيلي:</p>
                                      <p className="font-mono text-[9px] text-[#152e5a] font-extrabold truncate">{b.id}</p>
                                      <p className="text-slate-400 text-[8px] truncate font-extrabold">{b.driverName}</p>
                                    </div>
                                  </div>

                                  <div className="text-left">
                                    <span className="text-[7px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                                      {b.model || "البطاقة جاهزة"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {selectedBusIds.length > 3 && (
                              <div className="bg-slate-105/80 border border-dashed border-slate-250 rounded-2xl p-6 shadow-sm shrink-0 flex items-center justify-center w-[120px] h-[140px] text-center flex-col gap-1">
                                <span className="text-brand-purple font-black text-sm">+{selectedBusIds.length - 3}</span>
                                <span className="text-slate-500 text-[8px] font-extrabold">حافلة إضافية بالصف</span>
                              </div>
                            )}
                          </div>

                          <div className="bg-emerald-50 border border-emerald-150 p-2 rounded-xl text-[9px] text-emerald-800 font-semibold leading-relaxed">
                            💡 <b>نصيحة التشغيل الميداني:</b> يفضّل تحديد خيار "كروت متتالية (6 بطاقات)" لتسريع إخراج الملصقات وتوفير مساحات الأوراق بحجم أكبر وأوضح، أو "بطاقة واحدة" لفصل البطاقات القياسية للأسطول.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Operational Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleTriggerBulkPrint}
                        disabled={selectedBusIds.length === 0}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        <span>تصدير وتجهيز ملف PDF مجمع لـ ({selectedBusIds.length}) حافلة</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  /* SINGLE PRINT MODEL VIEW */
                  selectedPrintBus ? (
                    <div className="flex flex-col gap-5 h-full justify-between">
                      
                      {/* Style Configurator */}
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                        <h4 className="font-display font-bold text-slate-800 text-xs mb-3">خيارات مظهر البطاقة</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-500 text-[10px] font-bold mb-1">اللون السائد للحدود:</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setBadgeColor('purple')}
                                className={`w-6 h-6 rounded-full bg-brand-purple border-2 transition-all cursor-pointer ${badgeColor === 'purple' ? 'border-brand-orange scale-110' : 'border-transparent'}`}
                                title="بنفسجي درة"
                              />
                              <button
                                type="button"
                                onClick={() => setBadgeColor('orange')}
                                className={`w-6 h-6 rounded-full bg-brand-orange border-2 transition-all cursor-pointer ${badgeColor === 'orange' ? 'border-brand-purple scale-110' : 'border-transparent'}`}
                                title="برتقالي درة"
                              />
                              <button
                                type="button"
                                onClick={() => setBadgeColor('slate')}
                                className={`w-6 h-6 rounded-full bg-slate-700 border-2 transition-all cursor-pointer ${badgeColor === 'slate' ? 'border-orange-400 scale-110' : 'border-transparent'}`}
                                title="فحمي هادئ"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-550 text-[10px] font-bold mb-1">حجم البطاقة المجهزة:</label>
                            <select
                              value={badgeSize}
                              onChange={(e) => setBadgeSize(e.target.value as 'standard' | 'compact')}
                              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-750 font-bold w-full outline-none focus:border-brand-purple cursor-pointer"
                            >
                              <option value="standard">بطاقة مرور معيارية (بج)</option>
                              <option value="compact">ملصق زجاج صغير</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* LIVE PREVIEW BADGE */}
                      <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
                        
                        {/* Printable Area targeting ID - Rounded Golden Ratio Landscape Card */}
                        <div
                          id="printable-badge"
                          className={`bg-white text-right border-[5px] transition-all overflow-hidden relative shadow-xl ${
                            badgeColor === 'purple' ? 'border-[#152e5a]' :
                            badgeColor === 'orange' ? 'border-brand-orange' :
                            'border-slate-800'
                          } ${
                            badgeSize === 'standard' ? 'w-[600px] h-[375px] rounded-[28px] py-[13px] px-[25px] shadow-xl' : 'w-[500px] h-[315px] rounded-[22px] py-[11px] px-[21px] shadow-lg'
                          }`}
                          style={{ direction: 'rtl' }}
                        >
                          {/* Inner double border for official public transit aesthetic */}
                          <div
                            className={`absolute pointer-events-none border-[1.5px] z-20 ${
                              badgeColor === 'purple' ? 'border-[#152e5a] opacity-90' :
                              badgeColor === 'orange' ? 'border-brand-orange opacity-90' :
                              'border-slate-800'
                            }`}
                            style={{
                              top: '4px',
                              left: '4px',
                              right: '4px',
                              bottom: '4px',
                              borderRadius: badgeSize === 'standard' ? '22px' : '16px',
                            }}
                          />
                          <div className="flex h-full w-full gap-5 relative z-10" style={{ direction: 'rtl' }}>
                            
                            {/* Left Column = Map pattern, QR Viewfinder, Scan instructions */}
                            <div className="w-[42%] h-full flex flex-col items-center justify-center relative bg-slate-100/40 border border-slate-300/80 rounded-2xl p-3 overflow-hidden shrink-0 select-none">
                              
                              {/* Abstract faint network lines to match Riyadh/Duran transport style background */}
                              <div className="absolute inset-0 opacity-15 pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <path d="M0,35 H100 M0,65 H150 M35,0 V100 M65,0 V100" stroke="#102a5a" strokeWidth="0.5" fill="none" />
                                  <path d="M-10,-10 L110,110 M110,-10 L-10,110" stroke="#102a5a" strokeWidth="0.3" fill="none" />
                                  <circle cx="35" cy="35" r="1.5" fill="#102a5a" />
                                  <circle cx="65" cy="65" r="1.5" fill="#102a5a" />
                                  <circle cx="35" cy="65" r="1" fill="#102a5a" />
                                  <circle cx="65" cy="35" r="1" fill="#102a5a" />
                                </svg>
                              </div>

                              {/* Viewfinder focus box with active corners around QR code */}
                              <div
                                className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-300 flex items-center justify-center"
                                style={{
                                  width: badgeSize === 'standard' ? '140px' : '125px',
                                  height: badgeSize === 'standard' ? '140px' : '125px'
                                }}
                              >
                                {/* 4 Stylized focus brackets matching the image exactly */}
                                <div className="w-4.5 h-4.5 border-t-[2.5px] border-r-[2.5px] border-[#152e5a] absolute -top-1.5 -right-1.5 rounded-tr-md" />
                                <div className="w-4.5 h-4.5 border-t-[2.5px] border-l-[2.5px] border-[#152e5a] absolute -top-1.5 -left-1.5 rounded-tl-md" />
                                <div className="w-4.5 h-4.5 border-b-[2.5px] border-r-[2.5px] border-[#152e5a] absolute -bottom-1.5 -right-1.5 rounded-br-md" />
                                <div className="w-4.5 h-4.5 border-b-[2.5px] border-l-[2.5px] border-[#152e5a] absolute -bottom-1.5 -left-1.5 rounded-tl-md" />
                                
                                {/* Print QR Code */}
                                <div className={`w-full h-full flex items-center justify-center ${badgeSize === 'standard' ? '[&>img]:!w-[115px] [&>img]:!h-[115px]' : '[&>img]:!w-[100px] [&>img]:!h-[100px]'}`}>
                                  <PrintQR busId={selectedPrintBus.id} />
                                </div>
                              </div>

                              {/* Action Instruction */}
                              <p className={`text-center text-slate-600 font-extrabold font-sans leading-tight mt-3 ${badgeSize === 'standard' ? 'text-[12px] max-w-[150px]' : 'text-[10px] max-w-[130px]'}`}>
                                امسح الرمز للحصول على التفاصيل
                              </p>
                            </div>

                            {/* Thin elegant solid divider matching the image */}
                            <div className="w-[1.5px] bg-[#152e5a]/30 self-stretch shrink-0" />

                            {/* Right Column = Corporate Identity logo, Bus detailed specs - Fully expanded and spaced */}
                            <div className={`flex-1 h-full flex flex-col justify-between text-right ${badgeSize === 'standard' ? 'py-2' : 'py-1'}`}>
                              
                              {/* Brand Header: Durat Al Munwarah */}
                              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                                <div className="text-right">
                                  <h3 className={`font-display font-black text-[#152e5a] leading-none mb-1 ${badgeSize === 'standard' ? 'text-[20px]' : 'text-[17px]'}`}>نقل عام درة المنورة</h3>
                                  <p className={`text-slate-500 font-bold tracking-wider leading-none ${badgeSize === 'standard' ? 'text-[10px]' : 'text-[8.5px]'}`}>DURAT AL-MUNAWRAH TRANSPORT</p>
                                </div>
                                
                                {/* Branded Company Logo */}
                                <div className={`flex items-center justify-center rounded-xl bg-[#1d1d1f]/5 border border-[#152e5a]/5 select-none shrink-0 ${badgeSize === 'standard' ? 'w-12 h-12 p-1' : 'w-10 h-10 p-0.5'}`}>
                                  <DmtcLogo className={badgeSize === 'standard' ? 'w-10 h-10' : 'w-8 h-8'} />
                                </div>
                              </div>

                              {/* Details Row: Fully expanded text to fill the card height and width beautifully */}
                              <div className={`flex-1 flex flex-col justify-center ${badgeSize === 'standard' ? 'py-2' : 'py-1.5'}`}>
                                <h2 className={`text-[#152e5a] font-[#152e5a] font-display font-black tracking-normal ${badgeSize === 'standard' ? 'text-[19px] mb-5' : 'text-[16px] mb-3.5'}`}>بيانات الحافلة المعتمدة</h2>
                                
                                <div className={`text-slate-800 font-bold ${badgeSize === 'standard' ? 'space-y-4 text-[16px]' : 'space-y-3.5 text-[14px]'}`}>
                                  <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                                    <span className="text-slate-600 font-extrabold">رقم التشغيل الذكي :</span>
                                    <span className={`font-mono text-[#152e5a] font-black leading-none select-all ${badgeSize === 'standard' ? 'text-[22px]' : 'text-[19px]'}`}>{toEasternArabicNumerals(selectedPrintBus.id)}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                                    <span className="text-slate-600 font-extrabold">رقم اللوحة المرخصة :</span>
                                    <span className={`text-[#102a5a] font-black leading-none ${badgeSize === 'standard' ? 'text-[22px]' : 'text-[19px]'}`}>{selectedPrintBus.licensePlate}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="text-slate-600 font-extrabold">سنة الصنع :</span>
                                    <span className={`font-sans text-slate-800 font-black leading-none ${badgeSize === 'standard' ? 'text-[18px]' : 'text-[15px]'}`}>{selectedPrintBus.model || "غير محدد"}</span>
                                  </div>
                                </div>
                              </div>

                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Operational Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleTriggerPrint}
                          className="flex-1 py-3 px-4 bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          <span>تصدير البطاقة كـ PDF وتحميلها</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
                      <Printer className="w-12 h-12 text-slate-200 mb-3" />
                      <p className="text-xs font-bold font-display">الرجاء اختيار حافلة من القائمة لبدء تصميم كرت الـ QR وإصدار الطباعة.</p>
                    </div>
                  )
                )}

              </div>

            </div>

          </div>
        ) : activeTab === 'buses' ? (
          /* Left Section: Buses Management (9 cols) */
          <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BusIcon className="w-5 h-5 text-brand-orange shrink-0" />
                <h2 className="font-display font-black text-slate-900 text-md">دليل أسطول الحافلات</h2>
                <span className="bg-brand-orange/15 text-brand-orange text-[10px] px-2 py-0.5 rounded-md font-bold border border-brand-orange/25">
                  {buses.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Excel Import button */}
                <label className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-600/10 active:scale-[0.99]">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{importingExcel ? "جاري الاستيراد..." : "استيراد من إكسل"}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    disabled={importingExcel}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    setFormError(null);
                    setFormSuccess(null);
                    setFormId("");
                    setFormDriverName("");
                    setFormLicensePlate("");
                    setFormPhone("");
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 py-2 px-3.5 bg-brand-orange hover:bg-brand-orange-light text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-brand-orange/10 active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل حافلة</span>
                </button>
              </div>
            </div>

            {/* Search bar inside Buses Section */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ابحث برقم الحافلة، اسم السائق..."
                  value={busSearch}
                  onChange={(e) => setBusSearch(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-505 shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">الكل ({buses.length})</option>
                  <option value="inside">بالداخل ({buses.filter(b=>b.status==='inside').length})</option>
                  <option value="outside">بالخارج ({buses.filter(b=>b.status==='outside').length})</option>
                </select>
              </div>
            </div>

            {/* Buses Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-slate-405 text-xs font-bold animate-pulse">جاري تحميل سجلات الحافلات لشركة درة المنورة...</div>
              ) : filteredBuses.length === 0 ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-brand-orange/60 animate-bounce" />
                  <p className="text-xs font-bold">لا توجد حافلات مطابقة لبحثك.</p>
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 text-slate-705 border-b border-slate-200 font-bold font-display">
                      <th className="py-3 px-4 font-extrabold">رقم الباص</th>
                      <th className="py-3 px-4 font-extrabold">السائق</th>
                      <th className="py-3 px-4 font-extrabold">اللوحة</th>
                      <th className="py-3 px-4 font-extrabold">سنة الصنع</th>
                      <th className="py-3 px-4 font-extrabold">الهاتف</th>
                      <th className="py-3 px-4 font-extrabold">الحالة</th>
                      <th className="py-3 px-4 text-center font-extrabold">الإجراءات والرموز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBuses.map((bus) => (
                      <tr key={bus.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-orange">{bus.id}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-905">{bus.driverName}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{bus.licensePlate}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-bold">{bus.model || <span className="text-slate-300">-</span>}</td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {bus.phone ? (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-brand-cyan shrink-0" />
                              {bus.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {bus.status === 'inside' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>بالداخل</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 font-bold border border-slate-200 text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-405" />
                              <span>بالخارج</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openQRModal(bus)}
                              title="عرض وتنزيل رمز QR"
                              className="bg-brand-cyan/10 hover:bg-brand-cyan/25 text-brand-cyan p-1.5 rounded-lg border border-brand-cyan/20 cursor-pointer transition-all"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => openEditModal(bus)}
                              title="تعديل الحافلة"
                              className="bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange p-1.5 rounded-lg border border-brand-orange/20 cursor-pointer transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleInitiateDeleteBus(bus)}
                              title="حذف الحافلة"
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border border-rose-250/20 cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === 'guards' ? (
          /* Left Section: Guards Management (9 cols) */
          <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-cyan shrink-0" />
                <h2 className="font-display font-black text-slate-900 text-md">الحراس الميدانيين للبوابات</h2>
                <span className="bg-brand-cyan/15 text-brand-cyan text-[10px] px-2.5 py-0.5 rounded-md font-extrabold border border-brand-cyan/20">
                  {guards.length}
                </span>
              </div>

              <button
                onClick={() => {
                  setGuardFormError(null);
                  setGuardFormSuccess(null);
                  setGuardFormName("");
                  setGuardFormUsername("");
                  setGuardFormPassword("");
                  setShowAddGuardModal(true);
                }}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-brand-cyan hover:bg-brand-cyan-light text-slate-900 rounded-xl text-xs font-black cursor-pointer transition-all shadow-md shadow-brand-cyan/10 active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حارس</span>
              </button>
            </div>

            {/* Search bar inside Guards Section */}
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ابحث باسم الحارس الميداني..."
                  value={guardSearch}
                  onChange={(e) => setGuardSearch(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold"
                />
              </div>
            </div>

            {/* Guards Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-slate-405 text-xs font-bold animate-pulse">جاري تحميل سجلات الحراس الميدانيين...</div>
              ) : filteredGuards.length === 0 ? (
                <div className="p-12 text-center text-slate-505 flex flex-col items-center justify-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-brand-cyan/60 animate-bounce" />
                  <p className="text-xs font-bold">لا يوجد حراس مسجلين يطابقون بحثك.</p>
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 text-slate-705 border-b border-slate-200 font-bold font-display">
                      <th className="py-3 px-4 font-bold">اسم الحارس</th>
                      <th className="py-3 px-4 font-bold">اسم المستخدم للميدان</th>
                      <th className="py-3 px-4 font-bold">صلاحية النظام الميداني</th>
                      <th className="py-3 px-4 font-mono font-bold">كلمة المرور الرقمية</th>
                      <th className="py-3 px-4 text-center font-bold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGuards.map((guard) => (
                      <tr key={guard.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse shrink-0" />
                          <span>{guard.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-cyan">{guard.username}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">حارس البوابات والميدان (دخول ومسح)</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{guard.password || "••••••••"}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditGuardModal(guard)}
                              title="تعديل الحارس"
                              className="bg-brand-cyan/10 hover:bg-brand-cyan/25 text-brand-cyan p-1.5 rounded-lg border border-brand-cyan/20 cursor-pointer transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleInitiateDeleteGuard(guard)}
                              title="إزالة الحارس"
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border border-rose-250/20 cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === 'brand' ? (
          /* "إدارة الهوية والشعار" Tab View (9 cols) */
          <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px] text-right">
             <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
               <div className="flex items-center gap-2">
                 <Settings className="w-5 h-5 text-brand-purple shrink-0" />
                 <h2 className="font-display font-black text-slate-900 text-md">إدارة الهوية البصرية وبطاقات الشركة</h2>
               </div>
               <span className="bg-brand-orange/15 text-brand-orange text-[10px] px-2.5 py-1 rounded-md font-extrabold border border-brand-orange/20">
                 لوحة إعدادات شعار النظام
               </span>
             </div>

             <div className="p-6 md:p-8 space-y-8">
               
               {/* Informational Hero Card */}
               <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-purple/5 to-transparent border-r-4 border-brand-purple rounded-2xl">
                 <h3 className="text-slate-900 font-extrabold text-sm sm:text-base mb-1">تخصيص الهوية والشعار الوطني</h3>
                 <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                   مرحباً بك في وحدة التحكم البصرية المخصصة لشركة درة المنورة للنقليات. يتيح لك هذا المحرك استبدال الشعار الافتراضي للنظام بشعارك المخصص فورياً. بمجرد تعديله، سيتم تطبيق الشعار الجديد تلقائياً في كافة مفاصل النظام، وبطاقات المرور الذكية التي يتم تصديرها أو طباعتها للحافلات.
                 </p>
               </div>

               {/* Notifications */}
               {brandSuccess && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold leading-normal flex items-center gap-3"
                 >
                   <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                   <span>{brandSuccess}</span>
                 </motion.div>
               )}

               {brandError && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="p-4 bg-rose-50 border border-rose-150 text-rose-700 rounded-2xl text-xs font-bold leading-normal flex items-center gap-3"
                 >
                   <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                   <span>{brandError}</span>
                 </motion.div>
               )}

               {/* Dual Layout Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 
                 {/* Right: logo actions and inputs */}
                 <div className="space-y-6">
                   
                   {/* Option 1: File Upload */}
                   <div className="p-5 rounded-2xl border border-slate-150 bg-slate-50/20 shadow-sm space-y-4">
                     <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                       <h4 className="font-display font-black text-slate-800 text-xs">الخيار الأول: رفع الشعار من جهازك</h4>
                     </div>
                     <p className="text-slate-400 text-[10px] leading-relaxed">
                       اختر صورة رسمية من حاسوبك أو هاتفك الذكي (يدعم صيغ PNG, JPG, JPEG, SVG) وسيتم تكويدها داخلياً فوراً.
                     </p>

                     <div>
                       <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 hover:border-brand-purple rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all">
                         <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                           <Settings className="w-7 h-7 text-slate-400 mb-2" />
                           <p className="text-[11px] text-slate-600 font-bold mb-1">اضغط هنا لتحديد الشعار الجديد...</p>
                           <p className="text-[9px] text-slate-400 font-semibold">ملفات الصور فقط (بحد أقصى 2MB)</p>
                         </div>
                         <input
                           type="file"
                           accept="image/*"
                           onChange={handleLogoFileChange}
                           className="hidden"
                         />
                       </label>
                     </div>
                   </div>

                   {/* Option 2: Live URL */}
                   <div className="p-5 rounded-2xl border border-slate-150 bg-slate-50/20 shadow-sm space-y-4">
                     <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                       <h4 className="font-display font-black text-slate-800 text-xs">الخيار الثاني: رابط صورة مباشر</h4>
                     </div>
                     <p className="text-slate-400 text-[10px] leading-relaxed">
                       في حال حفظك للشعار في مخزن سحابي أو موقع على الويب، يمكنك تغذية النظام بربطها فوراً.
                     </p>
                     
                     <form onSubmit={handleLogoUrlSubmit} className="flex gap-2">
                       <input
                         type="url"
                         placeholder="مثال: https://mycompany.com/logo.png"
                         value={logoInputUrl}
                         onChange={(e) => setLogoInputUrl(e.target.value)}
                         className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple font-mono"
                       />
                       <button
                         type="submit"
                         className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0"
                       >
                         تطبيق الرابط
                       </button>
                     </form>
                   </div>

                   {/* Reset default action */}
                   <div className="flex justify-start">
                     <button
                       type="button"
                       onClick={handleResetDefaultLogo}
                       className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[11px] font-extrabold cursor-pointer transition-all"
                     >
                       استعادة الشعار الافتراضي والمقاسات القياسية
                     </button>
                   </div>
                 </div>

                 {/* Left: Previews in real layouts */}
                 <div className="space-y-6">
                   
                   {/* Logo Live Monitor Preview */}
                   <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center text-center space-y-4">
                     <div className="w-full flex items-center justify-between border-b border-indigo-50/50 pb-2">
                       <span className="text-[10px] text-slate-400 font-extrabold">المعاينة الحية الفورية للهوية</span>
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     </div>
                     
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-150 inline-flex items-center justify-center min-w-[120px] min-h-[120px]">
                       <DmtcLogo className="w-20 h-20" />
                     </div>
                     
                     <div>
                       <h5 className="font-display font-bold text-slate-800 text-xs text-center">شعار شركة درة المنورة للنقليات</h5>
                       <p className="text-slate-400 text-[10px] mt-1 text-center font-semibold">
                         هذا هو الشكل الذي سيظهر به الشعار في الزاوية العلوية، وصفحة تسجيل الدخول، والمصادقة الميدانية.
                       </p>
                     </div>
                   </div>

                   {/* Badge Thumbnail Preview */}
                   <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-3.5">
                     <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">سيموليشن لبطاقة المرور المطبوعة (QR Badge Mockup)</span>
                     
                     {/* Replica of the printable card */}
                     <div className="bg-white border-2 border-[#152e5a]/15 rounded-2xl p-4 flex gap-4 min-h-[100px] items-center relative shadow-sm">
                       <div className="flex-1 text-right space-y-1">
                         <div className="text-[12px] font-display font-bold text-[#152e5a]">نقل عام درة المنورة</div>
                         <div className="text-[9px] text-[#f7943e] font-sans font-black tracking-widest uppercase">DMTC • للنقليات</div>
                         <div className="text-[9px] text-slate-400 font-bold mt-1 leading-none">تصريح حافلة معتمد لعام 2026م</div>
                       </div>
                       
                       <div className="w-12 h-12 flex items-center justify-center p-1 rounded-xl bg-[#1d1d1f]/5 border border-[#152e5a]/5 select-none font-sans shrink-0">
                         <DmtcLogo className="w-10 h-10" />
                       </div>
                     </div>
                     <p className="text-slate-400 text-[10px] leading-relaxed font-semibold">
                       الشعار المعتمد سيقوم بملء بطاقة الـ QR الميدانية المصاحبة للباصات تلقائياً عند طباعة أي بطاقة ترخيص.
                     </p>
                   </div>

                 </div>

               </div>

             </div>
          </div>
        ) : (
          /* "سجل حركة البوابات (كلي)" Tab View (9 cols) */
          <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px] text-right font-sans">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-orange shrink-0" />
                <h2 className="font-display font-black text-slate-900 text-md">سجل حركة البوابات (كلي)</h2>
              </div>
              {refreshing && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-emerald-100 font-bold animate-pulse font-display">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  بث حي ومباشر
                </span>
              )}
            </div>

            <div className="p-5 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/25">
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end justify-between">
                {/* Search field */}
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 right-1 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="ابحث بالحارس، السائق أو رقم الحافلة..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pr-9 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all font-bold"
                  />
                </div>

                {/* Date range picker */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/70 p-1 rounded-xl border border-slate-150">
                    <div className="flex items-center gap-1 px-2">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-bold font-display">من:</span>
                    </div>
                    <input
                      type="date"
                      value={logStartDate}
                      onChange={(e) => setLogStartDate(e.target.value)}
                      className="bg-transparent border-0 text-xs font-bold text-slate-800 focus:ring-0 focus:outline-none p-1"
                    />

                    <div className="h-4 w-px bg-slate-200" />

                    <div className="flex items-center gap-1 px-2">
                      <span className="text-[10px] text-slate-500 font-bold font-display">إلى:</span>
                    </div>
                    <input
                      type="date"
                      value={logEndDate}
                      onChange={(e) => setLogEndDate(e.target.value)}
                      className="bg-transparent border-0 text-xs font-bold text-slate-800 focus:ring-0 focus:outline-none p-1"
                    />
                  </div>

                  {/* Reset Button */}
                  {(logStartDate || logEndDate || logSearch) && (
                    <button
                      onClick={() => {
                        setLogStartDate("");
                        setLogEndDate("");
                        setLogSearch("");
                      }}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
                      title="إعادة تعيين الفلاتر"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="text-[10px]">مسح الفلترة</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold font-display flex items-center gap-2">
                  <span>
                    {logStartDate || logEndDate 
                      ? "إجمالي الحركات المقيدة في الفترة المحددة:" 
                      : "إجمالي الحركات المقيدة لليوم:"}
                  </span>
                  <span className="text-brand-orange text-xs font-black bg-brand-orange/10 px-2.5 py-1 rounded-md border border-brand-orange/20">
                    {filteredLogs.length} حركة عبور
                  </span>
                </div>

                <button
                  onClick={handleExportLogsExcel}
                  className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-600/10 active:scale-[0.99]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير الحركة إلى إكسل ({filteredLogs.length})</span>
                </button>
              </div>
            </div>

            {/* Activity Table Feed */}
            <div className="flex-1 overflow-x-auto min-h-[450px]">
              {loading ? (
                <div className="p-10 text-center text-slate-400 text-sm font-bold animate-pulse">جاري تحميل السجلات والعمليات...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Clock className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold font-display">
                    {logStartDate || logEndDate || logSearch
                      ? "لا توجد سجلات تطابق الفترة الزمنية أو معايير البحث المحددة."
                      : "لا حركات مسجلة لأسطول درة المنورة اليوم."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 text-slate-705 border-b border-slate-150 font-bold font-display">
                      <th className="py-3.5 px-4 font-bold">نمط العبور</th>
                      <th className="py-3.5 px-4 font-bold">الحافلة (ID)</th>
                      <th className="py-3.5 px-4 font-bold">اسم كابتن الحافلة (السائق)</th>
                      <th className="py-3.5 px-4 font-bold">رقم هوية اللوحة</th>
                      <th className="py-3.5 px-4 font-bold">بواسطة (حارس البوابة)</th>
                      <th className="py-3.5 px-4 font-bold">وقت وتاريخ الحركة</th>
                      <th className="py-3.5 px-4 font-bold text-center">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors font-bold text-slate-705">
                        <td className="py-3.5 px-4">
                          {log.action === 'entry' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black font-display">
                              <LogIn className="w-3.5 h-3.5" />
                              <span>تفويج دخول الباحة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-brand-orange border border-amber-200 text-[10px] font-black font-display">
                              <LogOut className="w-3.5 h-3.5" />
                              <span>تفويج تفريغ/مغادرة</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-brand-orange text-xs font-extrabold">{log.busId}</td>
                        <td className="py-3.5 px-4 text-slate-900 font-extrabold">{log.driverName}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{log.licensePlate}</td>
                        <td className="py-3.5 px-4 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-extrabold">
                            {log.guardName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[10px] font-medium">{getArabicFormattedTime(log.timestamp)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleInitiateDeleteLog(log)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 text-[10px] font-black font-display cursor-pointer transition-all hover:scale-105 active:scale-95"
                            title="حذف تفويج هذه الحركة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 text-center text-[10px] text-slate-500 border-t border-slate-200 font-bold font-display">
              ⚡ يتم تحديث هذه القائمة تلقائياً وفورياً عند قيام أي حرس بمسح رمز QR لشركة درة المنورة
            </div>
          </div>
        )}

      </div>

      {/* MODALS SECTION (AnimatePresence) */}
      <AnimatePresence>
        
        {/* Modal: Confirm Delete Log Movement */}
        {showDeleteLogConfirm && logToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteLogConfirm(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10 text-right font-display"
              style={{ direction: 'rtl' }}
            >
              <div className="bg-rose-50 p-5 text-rose-800 flex justify-between items-center border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <h3 className="font-display font-black text-sm text-rose-950">تأكيد حذف حركة العبور</h3>
                </div>
                <button
                  onClick={() => setShowDeleteLogConfirm(false)}
                  className="bg-rose-100/50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-200 text-rose-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {deleteLogError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {deleteLogError}
                  </div>
                )}

                <div className="text-sm font-bold text-slate-700 leading-relaxed font-display">
                  هل أنت متأكد من رغبتك في حذف حركة العبور المحددة؟
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2.5 text-xs text-slate-700 font-bold font-display">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500">الحافلة المستهدفة:</span>
                    <span className="font-mono text-brand-orange text-xs font-black">{logToDelete.busId}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500">نوع الحركة:</span>
                    <span>
                      {logToDelete.action === "entry" ? (
                        <span className="text-emerald-700 font-black">تفويج دخول الباحة</span>
                      ) : (
                        <span className="text-brand-orange font-black">تفويج تفريغ/مغادرة</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500">اسم كابتن الحافلة:</span>
                    <span className="text-slate-900">{logToDelete.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">وقت وتاريخ الحركة:</span>
                    <span className="font-mono text-slate-500 text-[10px]">{getArabicFormattedTime(logToDelete.timestamp)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed font-bold font-display">
                  💡 تنبيه: سيتم حذف حركة العبور هذه نهائياً وبشكل قطعي من سجلات اليوم، وسيُعاد تحديث حالة الحافلة في قائمة الحافلات والملخصات لتعود كما كانت سابقاً بشكل تلقائي.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmDeleteLog}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-250"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، حذف الحركة نهائياً</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteLogConfirm(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl text-xs cursor-pointer transition-all border border-slate-200"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Custom Bus Deletion Confirmation */}
        {showDeleteBusConfirm && busToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteBusConfirm(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10 text-right font-sans"
              style={{ direction: 'rtl' }}
            >
              <div className="bg-rose-50 p-5 flex justify-between items-center border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                  <h3 className="font-display font-black text-sm text-slate-900">تأكيد حذف الحافلة من السجل</h3>
                </div>
                <button
                  onClick={() => setShowDeleteBusConfirm(false)}
                  className="bg-rose-100/50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-200/50 text-rose-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {deleteBusError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {deleteBusError}
                  </div>
                )}

                <p className="text-xs text-slate-600 font-bold leading-relaxed font-display">
                  هل أنت متأكد من رغبتك في حذف هذه الحافلة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه وسيلغي صلاحية الحافلة وكود الـ QR الخاص بها بالكامل.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 font-display">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">رقم تشغيل الحافلة:</span>
                    <span className="font-mono text-brand-orange font-black text-sm leading-none">{busToDelete.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">اسم كابتن الحافلة:</span>
                    <span className="text-slate-900 font-bold">{busToDelete.driverName}</span>
                  </div>
                  {busToDelete.model && (
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-bold">سنة الصنع:</span>
                      <span className="text-slate-800 font-bold">{busToDelete.model}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">لوحة المركبة المعتمدة:</span>
                    <span className="font-mono text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{busToDelete.licensePlate}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmDeleteBus}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-250"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، حذف الحافلة والرمز</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteBusConfirm(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl text-xs cursor-pointer transition-all border border-slate-200"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Custom Guard Deletion Confirmation */}
        {showDeleteGuardConfirm && guardToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteGuardConfirm(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10 text-right font-sans"
              style={{ direction: 'rtl' }}
            >
              <div className="bg-rose-50 p-5 flex justify-between items-center border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                  <h3 className="font-display font-black text-sm text-slate-900">تأكيد حذف حساب الحارس</h3>
                </div>
                <button
                  onClick={() => setShowDeleteGuardConfirm(false)}
                  className="bg-rose-100/50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-200/50 text-rose-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {deleteGuardError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {deleteGuardError}
                  </div>
                )}

                <p className="text-xs text-slate-600 font-bold leading-relaxed font-display">
                  تنبيه: هل أنت متأكد من رغبتك في حذف حساب الحارس الميداني وقطع صلاحية دخوله المباشر تماماً؟ هذا الإجراء فوري ولا يمكن التراجع عنه.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 font-display">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">اسم الحارس الميداني:</span>
                    <span className="text-slate-900 font-bold text-sm leading-none">{guardToDelete.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">اسم المستخدم للميدان:</span>
                    <span className="font-mono text-brand-cyan font-bold">{guardToDelete.username}</span>
                  </div>
                  {guardToDelete.password && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">كلمة المرور الرقمية:</span>
                      <span className="font-mono text-slate-800 font-bold">{guardToDelete.password}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmDeleteGuard}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-250"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، حذف حساب الحارس</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteGuardConfirm(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl text-xs cursor-pointer transition-all border border-slate-200"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: XLSX Importing Result Feedback Card */}
        {xlsxFeedbackModal?.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setXlsxFeedbackModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden relative z-10 text-right font-sans"
              style={{ direction: 'rtl' }}
            >
              <div className="bg-emerald-50 p-5 flex justify-between items-center border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-display font-black text-sm text-slate-900">تقرير استيراد الحافلات من الإكسل</h3>
                </div>
                <button
                  onClick={() => setXlsxFeedbackModal(null)}
                  className="bg-emerald-100/50 hover:bg-emerald-100 p-1.5 rounded-lg border border-emerald-200/50 text-emerald-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-[10px] text-emerald-600 font-extrabold block">تم استيرادها بنجاح</span>
                    <span className="font-display text-2xl font-black text-emerald-800">{xlsxFeedbackModal.importedCount}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 text-center">
                    <span className="text-[10px] text-slate-500 font-extrabold block">تم تخطيها / مكررة</span>
                    <span className="font-display text-2xl font-black text-slate-700">{xlsxFeedbackModal.skippedCount}</span>
                  </div>
                </div>

                {xlsxFeedbackModal.skippedDetails.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-600 block mb-2 font-display">تفاصيل السجلات المتخطاة (أول 5 ملاحظات):</span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 max-h-40 overflow-y-auto font-sans text-[11px] text-slate-550 leading-relaxed font-bold space-y-1.5">
                      {xlsxFeedbackModal.skippedDetails.map((detail, index) => (
                        <div key={index} className="flex gap-2 items-start text-right">
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded shrink-0 font-mono">#{index + 1}</span>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-bold leading-normal text-center">
                  سيقوم النظام فورياً بتجهيز وإصدار رموز فحص الـ QR لجميع الباصات المستوردة بنجاح، ويمكنكم الوصول إليها الآن من قائمة تتبع الحافلات.
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setXlsxFeedbackModal(null)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-550 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-emerald-50/20 text-center"
                  >
                    حسناً، إغلاق وقبول المزامنة
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 1: Add new Bus */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="bg-slate-50 p-5 text-slate-805 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <BusIcon className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-display font-black text-sm text-slate-900">تسجيل حافلة جديدة بالنظام</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddBusSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 rounded-lg text-emerald-700 text-xs font-bold font-display">
                    {formSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    معرف الحافلة الفريد (Bus ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: BUS-505"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1.5 font-bold">
                    * يجب أن يكون مميزاً لأنه سيتم طباعته بداخل رمز الاستجابة السريعة (QR)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    اسم السائق ثلاثي *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: صالح بن عبدالله الدوسري"
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                      رقم اللوحة *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أ ب ج 9876"
                      value={formLicensePlate}
                      onChange={(e) => setFormLicensePlate(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1.5">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      placeholder="مثال: 05xxxxxxx"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    سنة الموديل (سنة الصنع)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="مثال: 2024"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                   <button
                     type="submit"
                     className="flex-1 py-2.5 px-4 bg-brand-orange hover:bg-brand-orange-light text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-[0.99] font-display"
                   >
                     إضافة وتسجيل الحافلة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Edit Bus */}
        {showEditModal && selectedBus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false);
                setSelectedBus(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="bg-slate-50 p-5 text-slate-800 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-display font-black text-sm text-slate-900">تعديل معلومات الحافلة: {selectedBus.id}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedBus(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditBusSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 rounded-lg text-emerald-700 text-xs font-bold font-display">
                    {formSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    اسم السائق ثلاثي *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اسم السائق"
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                      رقم اللوحة *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="رقم اللوحة"
                      value={formLicensePlate}
                      onChange={(e) => setFormLicensePlate(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1.5">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      placeholder="رقم الهاتف"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    سنة الموديل (سنة الصنع)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="مثال: 2024"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/5 focus:border-brand-orange transition-all font-bold"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-brand-orange hover:bg-brand-orange-light text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-[0.99] font-display"
                  >
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedBus(null);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal 3: Generate and preview QR Code */}
        {showQRModal && selectedBus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowQRModal(false);
                setSelectedBus(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="bg-slate-50 p-5 text-slate-850 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-display font-black text-sm text-slate-900">ترميز الاستجابة السريعة (QR Code)</h3>
                </div>
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setSelectedBus(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white">
                <QRGenerator
                  busId={selectedBus.id}
                  driverName={selectedBus.driverName}
                  onClose={() => {
                    setShowQRModal(false);
                    setSelectedBus(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 4: Add New Guard */}
        {showAddGuardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowAddGuardModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10 text-right font-display"
            >
              <div className="bg-slate-50 p-5 text-slate-800 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-purple" />
                  <h3 className="font-display font-black text-sm text-slate-900">تسجيل حارس ميداني جديد</h3>
                </div>
                <button
                  onClick={() => setShowAddGuardModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200 text-slate-605 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddGuardSubmit} className="p-6 space-y-4">
                {guardFormError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {guardFormError}
                  </div>
                )}
                {guardFormSuccess && (
                  <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 rounded-lg text-emerald-700 text-xs font-bold font-display">
                    {guardFormSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5">
                    الاسم الكامل للحارس الميداني *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: صالح أحمد الغامدي"
                    value={guardFormName}
                    onChange={(e) => { setGuardFormError(null); setGuardFormName(e.target.value); }}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold text-right"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    اسم مستخدم دخول الحارس (ميداني) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: guard_east (بالأحرف الإنجليزية فقط)"
                    value={guardFormUsername}
                    onChange={(e) => { setGuardFormError(null); setGuardFormUsername(e.target.value); }}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold font-mono text-left"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    كلمة المرور الرقمية والميدانية *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="أدخل كلمة مرور لا تقل عن 3 خانات"
                    value={guardFormPassword}
                    onChange={(e) => { setGuardFormError(null); setGuardFormPassword(e.target.value); }}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold font-mono text-left"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-[0.99] font-display"
                  >
                    تفعيل وتمكين الحارس
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddGuardModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 rounded-xl text-xs font-bold cursor-pointer transition-all font-display"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal 5: Edit Guard */}
        {showEditGuardModal && selectedGuard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => {
                setShowEditGuardModal(false);
                setSelectedGuard(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10 text-right font-display"
            >
              <div className="bg-slate-50 p-5 text-slate-800 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-brand-purple" />
                  <h3 className="font-display font-black text-sm text-slate-900">تعديل معلومات الحارس الميداني</h3>
                </div>
                <button
                  onClick={() => {
                    setShowEditGuardModal(false);
                    setSelectedGuard(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200 text-slate-605 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditGuardSubmit} className="p-6 space-y-4">
                {guardFormError && (
                  <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs font-bold font-display">
                    {guardFormError}
                  </div>
                )}
                {guardFormSuccess && (
                  <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 rounded-lg text-emerald-700 text-xs font-bold font-display">
                    {guardFormSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    الاسم الكامل للحارس *
                  </label>
                  <input
                    type="text"
                    required
                    value={guardFormName}
                    onChange={(e) => setGuardFormName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold text-right font-display"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    اسم مستخدم الميدان *
                  </label>
                  <input
                    type="text"
                    required
                    value={guardFormUsername}
                    onChange={(e) => setGuardFormUsername(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold font-mono text-left"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 font-display">
                    كلمة المرور الرقمية *
                  </label>
                  <input
                    type="text"
                    required
                    value={guardFormPassword}
                    onChange={(e) => setGuardFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/5 focus:border-brand-purple transition-all font-bold font-mono text-left"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-[0.99] font-display"
                  >
                    حفظ التعديلات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditGuardModal(false);
                      setSelectedGuard(null);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 rounded-xl text-xs font-bold cursor-pointer transition-all font-display"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* Hidden bulk printable container */}
      <div id="bulk-printable-area" style={{ display: 'none' }}>
        {selectedBusIds.map((busId) => {
          const bus = buses.find((b) => b.id === busId);
          if (!bus) return null;
          return (
            <div key={bus.id} className="bulk-badge-page">
              <div
                className={`bg-white text-right border-[5px] overflow-hidden relative bulk-badge-card ${
                  badgeColor === 'purple' ? 'border-[#152e5a]' :
                  badgeColor === 'orange' ? 'border-brand-orange' :
                  'border-slate-800'
                }`}
                style={{
                  direction: 'rtl',
                  width: badgeSize === 'standard' ? '600px' : '500px',
                  height: badgeSize === 'standard' ? '375px' : '315px',
                  borderRadius: badgeSize === 'standard' ? '28px' : '22px',
                  padding: badgeSize === 'standard' ? '13px 25px' : '11px 21px',
                  boxShadow: 'none',
                }}
              >
                {/* Inner double border for official public transit aesthetic */}
                <div
                  className={`absolute pointer-events-none border-[1.5px] z-20 ${
                    badgeColor === 'purple' ? 'border-[#152e5a] opacity-90' :
                    badgeColor === 'orange' ? 'border-brand-orange opacity-90' :
                    'border-slate-800'
                  }`}
                  style={{
                    top: '4px',
                    left: '4px',
                    right: '4px',
                    bottom: '4px',
                    borderRadius: badgeSize === 'standard' ? '22px' : '16px',
                  }}
                />
                <div className="flex h-full w-full gap-5 relative z-10" style={{ direction: 'rtl' }}>
                  
                  {/* Left Column = Map pattern, QR Viewfinder, Scan instructions */}
                  <div className="w-[42%] h-full flex flex-col items-center justify-center relative bg-slate-100/40 border border-slate-300/80 rounded-2xl p-3 overflow-hidden shrink-0 select-none">
                    
                    <div className="absolute inset-0 opacity-15 pointer-events-none">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,35 H100 M0,65 H150 M35,0 V100 M65,0 V100" stroke="#102a5a" strokeWidth="0.5" fill="none" />
                        <path d="M-10,-10 L110,110 M110,-10 L-10,110" stroke="#102a5a" strokeWidth="0.3" fill="none" />
                        <circle cx="35" cy="35" r="1.5" fill="#102a5a" />
                        <circle cx="65" cy="65" r="1.5" fill="#102a5a" />
                        <circle cx="35" cy="65" r="1" fill="#102a5a" />
                        <circle cx="65" cy="35" r="1" fill="#102a5a" />
                      </svg>
                    </div>

                    <div
                      className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-300 flex items-center justify-center"
                      style={{
                        width: badgeSize === 'standard' ? '140px' : '125px',
                        height: badgeSize === 'standard' ? '140px' : '125px'
                      }}
                    >
                      <div className="w-4.5 h-4.5 border-t-[2.5px] border-r-[2.5px] border-[#152e5a] absolute -top-1.5 -right-1.5 rounded-tr-md" />
                      <div className="w-4.5 h-4.5 border-t-[2.5px] border-l-[2.5px] border-[#152e5a] absolute -top-1.5 -left-1.5 rounded-tl-md" />
                      <div className="w-4.5 h-4.5 border-b-[2.5px] border-r-[2.5px] border-[#152e5a] absolute -bottom-1.5 -right-1.5 rounded-br-md" />
                      <div className="w-4.5 h-4.5 border-b-[2.5px] border-l-[2.5px] border-[#152e5a] absolute -bottom-1.5 -left-1.5 rounded-tl-md" />
                      
                      <div className={`w-full h-full flex items-center justify-center ${badgeSize === 'standard' ? '[&>img]:!w-[115px] [&>img]:!h-[115px]' : '[&>img]:!w-[100px] [&>img]:!h-[100px]'}`}>
                        <PrintQR busId={bus.id} />
                      </div>
                    </div>

                    <div className={`text-center text-slate-600 font-extrabold font-sans leading-tight mt-3 ${badgeSize === 'standard' ? 'text-[12px] max-w-[150px]' : 'text-[10px] max-w-[130px]'}`}>
                      امسح الرمز للحصول على التفاصيل
                    </div>
                  </div>

                  <div className="w-[1.5px] bg-[#152e5a]/30 self-stretch shrink-0" />

                  {/* Right Column = Corporate Identity logo, Bus detailed specs */}
                  <div className={`flex-1 h-full flex flex-col justify-between text-right ${badgeSize === 'standard' ? 'py-2' : 'py-1'}`}>
                    
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                      <div className="text-right">
                        <h3 className={`font-display font-black text-[#152e5a] leading-none mb-1 ${badgeSize === 'standard' ? 'text-[20px]' : 'text-[17px]'}`}>نقل عام درة المنورة</h3>
                        <p className={`text-slate-500 font-bold tracking-wider leading-none ${badgeSize === 'standard' ? 'text-[10px]' : 'text-[8.5px]'}`}>DURAT AL-MUNAWRAH TRANSPORT</p>
                      </div>
                      
                      {/* Branded Company Logo */}
                      <div className={`flex items-center justify-center rounded-xl bg-[#1d1d1f]/5 border border-[#152e5a]/5 select-none shrink-0 ${badgeSize === 'standard' ? 'w-12 h-12 p-1' : 'w-10 h-10 p-0.5'}`}>
                        <DmtcLogo className={badgeSize === 'standard' ? 'w-10 h-10' : 'w-8 h-8'} />
                      </div>
                    </div>

                    <div className={`flex-1 flex flex-col justify-center ${badgeSize === 'standard' ? 'py-2' : 'py-1.5'}`}>
                      <h2 className={`text-[#152e5a] font-display font-black tracking-normal ${badgeSize === 'standard' ? 'text-[19px] mb-5' : 'text-[16px] mb-3.5'}`}>بيانات الحافلة المعتمدة</h2>
                      
                      <div className={`text-slate-800 font-bold ${badgeSize === 'standard' ? 'space-y-4 text-[16px]' : 'space-y-3.5 text-[14px]'}`}>
                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                          <span className="text-slate-600 font-extrabold">رقم التشغيل الذكي :</span>
                          <span className={`font-mono text-[#152e5a] font-black leading-none ${badgeSize === 'standard' ? 'text-[22px]' : 'text-[19px]'}`}>{toEasternArabicNumerals(bus.id)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                          <span className="text-slate-600 font-extrabold">رقم اللوحة المرخصة :</span>
                          <span className={`text-[#102a5a] font-black leading-none ${badgeSize === 'standard' ? 'text-[22px]' : 'text-[19px]'}`}>{bus.licensePlate}</span>
                        </div>
                        
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-slate-600 font-extrabold">سنة الصنع :</span>
                          <span className={`font-sans text-slate-800 font-black leading-none ${badgeSize === 'standard' ? 'text-[18px]' : 'text-[15px]'}`}>{bus.model || "غير محدد"}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
