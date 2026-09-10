"use client";

import React, { useState } from "react";
import { Shield, Sparkles, UserCheck, LogOut, Phone, Search, PlusCircle, Smartphone, QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { useTone } from "@/context/ToneContext";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  onQuickLogin: (role: string) => void;
  onLogout: () => void;
}

function AuthAdmin(pass: string) {
  return prompt("Введите пароль") === pass
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onQuickLogin,
  onLogout,
}: NavbarProps) {
  const { applicantType, setApplicantType, t } = useTone();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live public tunnel URL
  const publicMobileUrl = "https://c0644ef5def6b2.lhr.life";
  const localWifiUrl = "http://10.56.15.64:3000";

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        {/* Top Demo Helper Bar for Evaluation */}
        <div className="bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Хакатон: Сценарии С1—С8</span>
            <span className="hidden md:inline text-slate-400">• Быстрый выбор роли для проверки:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onQuickLogin("applicant")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                !currentUser && (activeTab === "create" || activeTab === "track")
                  ? "bg-teal-500 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              👤 Заявитель
            </button>
            <button
              onClick={() => AuthAdmin("Op123") && onQuickLogin("operator")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                currentUser?.role === "operator"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🎧 Оператор
            </button>
            <button
              onClick={() =>AuthAdmin("Ps123") && onQuickLogin("expert_psy")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                currentUser?.username === "expert_psy"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🧠 Психолог
            </button>
            <button
              onClick={() =>AuthAdmin("Ur123") && onQuickLogin("expert_law")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                currentUser?.username === "expert_law"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ⚖️ Юрист
            </button>
            <button
              onClick={() =>AuthAdmin("admin") && onQuickLogin("admin")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                currentUser?.role === "admin"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ⚙️ Админ
            </button>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div
            onClick={() => {
              if (!currentUser) setActiveTab("create");
            }}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-1.5">
                <span>Отклик</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/60 rounded-full">
                  Анонимно
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium -mt-0.5">
                Платформа доверительных обращений
              </div>
            </div>
          </div>

          {/* Primary Navigation / Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!currentUser ? (
              <>
                {/* Tone Switcher Indicator for Applicant */}
                <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setApplicantType("student")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      applicantType === "student"
                        ? "bg-white text-teal-800 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Школьник («ты»)
                  </button>
                  <button
                    onClick={() => setApplicantType("parent")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      applicantType !== "student"
                        ? "bg-white text-teal-800 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Взрослый («вы»)
                  </button>
                </div>
              </>
            ) : (
              /* Staff Active Header */
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-800">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[11px] text-teal-700 font-medium">
                    {currentUser.role === "operator" && "Оператор 1-й линии"}
                    {currentUser.role === "expert" && `Эксперт (${currentUser.specialization || "профильный"})`}
                    {currentUser.role === "admin" && "Администратор платформы"}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Выйти из системы"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODAL: OPEN ON PHONE WITH QR CODE */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center animate-scaleUp">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Открыть «Отклик» на телефоне
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Наведите камеру смартфона на QR-код ниже или скопируйте прямую ссылку:
            </p>

            {/* QR Code Image */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-5 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicMobileUrl)}`}
                alt="QR Code"
                className="w-48 h-48 mx-auto rounded-lg"
              />
              <span className="text-[10px] text-slate-400 block mt-2">
                Сканируйте стандартной камерой телефона
              </span>
            </div>

            {/* Public Link Box */}
            <div className="space-y-2 mb-5 text-left text-xs">
              <span className="font-bold text-slate-700 block">
                Прямая ссылка для любого телефона (мобильный интернет или Wi-Fi):
              </span>
              <div className="flex items-center gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={publicMobileUrl}
                  className="flex-1 bg-transparent font-mono text-teal-800 text-xs focus:outline-none truncate"
                />
                <button
                  onClick={() => handleCopyLink(publicMobileUrl)}
                  className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0 hover:bg-teal-700"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Скопировано" : "Копировать"}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Также в одной локальной Wi-Fi сети доступно: <code className="text-slate-600 font-mono">{localWifiUrl}</code>
              </div>
            </div>

            <button
              onClick={() => setShowMobileModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </>
  );
}
