import React, { useState, useEffect } from "react";

export interface DmtcLogoProps {
  className?: string;
  showText?: boolean;
  textColorClass?: string;
}

export default function DmtcLogo({ className = "w-10 h-10", showText = false, textColorClass = "text-black" }: DmtcLogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = () => {
      const savedLogo = localStorage.getItem("custom_dmtc_logo");
      setCustomLogo(savedLogo);
    };

    loadLogo();

    window.addEventListener("dmtc-logo-updated", loadLogo);
    return () => {
      window.removeEventListener("dmtc-logo-updated", loadLogo);
    };
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      <div className={`relative shrink-0 ${className} flex items-center justify-center overflow-hidden`}>
        {customLogo ? (
          <img
            src={customLogo}
            alt="DMTC Logo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Top middle petal - Orange Gold */}
            <path d="M100 20 C115 50, 120 80, 100 130 C80 80, 85 50, 100 20 Z" fill="url(#orangeGoldGrad)" className="drop-shadow-sm" />
            
            {/* Top left petal */}
            <path d="M100 20 C70 45, 55 75, 78 120 C90 98, 95 70, 100 20 Z" fill="url(#orangeGoldGrad)" className="opacity-95" />
            
            {/* Top right petal */}
            <path d="M100 20 C130 45, 145 75, 122 120 C110 98, 105 70, 100 20 Z" fill="url(#orangeGoldGrad)" className="opacity-95" />
            
            {/* Left petal - Sky Blue */}
            <path d="M78 120 C50 122, 25 132, 45 152 C62 148, 72 135, 78 120 Z" fill="url(#cyanGrad)" />
            
            {/* Right petal - Sky Blue */}
            <path d="M122 120 C150 122, 175 132, 155 152 C138 148, 128 135, 122 120 Z" fill="url(#cyanGrad)" />
            
            {/* Deeper Purple Bottom Petals wrapping DMTC */}
            <path d="M78 120 C85 138, 100 148, 100 162 C92 146, 82 132, 78 120 Z" fill="url(#purpleGrad)" />
            <path d="M122 120 C115 138, 100 148, 100 162 C108 146, 118 132, 122 120 Z" fill="url(#purpleGrad)" />

            <defs>
              <linearGradient id="orangeGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f37021" />
                <stop offset="100%" stopColor="#f7943e" />
              </linearGradient>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1da1db" />
                <stop offset="100%" stopColor="#5dc2ec" />
              </linearGradient>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4c2a75" />
                <stop offset="100%" stopColor="#8056b8" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-right">
          <span className={`font-display font-black ${textColorClass} tracking-tight leading-tight text-sm sm:text-base`}>
            درة المنورة
          </span>
          <span className="font-sans font-bold text-brand-orange text-[9px] sm:text-[10px] tracking-widest leading-none">
            DMTC • للنقليات
          </span>
        </div>
      )}
    </div>
  );
}
