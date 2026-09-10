"use client";

import React, { useState, useEffect } from "react";
import { ToneProvider } from "@/context/ToneContext";
import Navbar from "@/components/Navbar";
import ApplicantModule from "@/components/ApplicantModule";
import OperatorModule from "@/components/OperatorModule";
import ExpertModule from "@/components/ExpertModule";
import AdminModule from "@/components/AdminModule";
import { Shield, Lock, Phone, Heart, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("create");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore session from localStorage if available
  useEffect(() => {
    const savedToken = localStorage.getItem("otklik_token");
    const savedUser = localStorage.getItem("otklik_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        if (parsed.role === "operator") setActiveTab("operator");
        else if (parsed.role === "expert") setActiveTab("expert");
        else if (parsed.role === "admin") setActiveTab("admin");
      } catch (e) {
        localStorage.removeItem("otklik_token");
        localStorage.removeItem("otklik_user");
      }
    }
  }, []);

  // Quick Login for Jury / Demo Scenarios
  const handleQuickLogin = async (roleKey: string) => {
    if (roleKey === "applicant") {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem("otklik_token");
      localStorage.removeItem("otklik_user");
      setActiveTab("create");
      return;
    }

    let credentials = { username: "", password: "" };
    if (roleKey === "operator") credentials = { username: "operator", password: "operator123" };
    else if (roleKey === "expert_psy") credentials = { username: "expert_psy", password: "expert123" };
    else if (roleKey === "expert_law") credentials = { username: "expert_law", password: "expert123" };
    else if (roleKey === "admin") credentials = { username: "admin", password: "admin123" };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        alert("Ошибка входа по демо-аккаунту");
        return;
      }

      const data = await res.json();
      setToken(data.access_token);
      setCurrentUser(data);
      localStorage.setItem("otklik_token", data.access_token);
      localStorage.setItem("otklik_user", JSON.stringify(data));

      if (data.role === "operator") setActiveTab("operator");
      else if (data.role === "expert") setActiveTab("expert");
      else if (data.role === "admin") setActiveTab("admin");
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("otklik_token");
    localStorage.removeItem("otklik_user");
    setActiveTab("create");
  };

  return (
    <ToneProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Navigation bar with role switcher */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onQuickLogin={handleQuickLogin}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1">
          {/* APPLICANT INTERFACE (С1, С2, С5, С6) */}
          {(!currentUser || activeTab === "create" || activeTab === "track") && (
            <ApplicantModule />
          )}

          {/* OPERATOR INTERFACE (С3, С6) */}
          {currentUser && currentUser.role === "operator" && activeTab === "operator" && (
            <OperatorModule token={token} />
          )}

          {/* EXPERT INTERFACE (С4) */}
          {currentUser && currentUser.role === "expert" && activeTab === "expert" && (
            <ExpertModule token={token} currentUser={currentUser} />
          )}

          {/* ADMIN INTERFACE (С7, С8) */}
          {currentUser && currentUser.role === "admin" && activeTab === "admin" && (
            <AdminModule token={token} />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-800">«Отклик» — Платформа доверительных обращений</span>
              <span>•</span>
              <span>Open Source MVP</span>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Нулевое знание персональных данных
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                Телефон доверия: 8-800-2000-122
              </span>
            </div>
          </div>
        </footer>
      </div>
    </ToneProvider>
  );
}
