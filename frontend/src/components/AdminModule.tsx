"use client";

import React, { useState, useEffect } from "react";
import {
  Settings, BarChart3, Users, FolderPlus, Download, ShieldCheck,
  AlertCircle, CheckCircle2, History, RefreshCw, Plus, Edit2, Lock
} from "lucide-react";

interface AdminModuleProps {
  token: string | null;
}

export default function AdminModule({ token }: AdminModuleProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "categories" | "rules" | "users" | "unlock" | "audit">("analytics");

  // Analytics Data (С8)
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Categories Data (С7)
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatSpec, setNewCatSpec] = useState("psychology");
  const [newCatPrio, setNewCatPrio] = useState("standard");
  const [showAddCatModal, setShowAddCatModal] = useState(false);

  // Routing Rules Data (С7)
  const [rules, setRules] = useState<any[]>([]);
  const [ruleCatId, setRuleCatId] = useState<number | null>(null);
  const [ruleGroup, setRuleGroup] = useState("psychology");
  const [ruleLimit, setRuleLimit] = useState(8);
  const [rulePrio, setRulePrio] = useState("standard");

  // Users Data (С7)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("expert");
  const [newSpec, setNewSpec] = useState("psychology");
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Stuck Appeals Unlock (С7)
  const [stuckAppeals, setStuckAppeals] = useState<any[]>([]);
  const [selectedStuckId, setSelectedStuckId] = useState<number | null>(null);
  const [interveneStatus, setInterveneStatus] = useState("assigned");
  const [intervenePriority, setIntervenePriority] = useState("urgent");
  const [interveneExpertId, setInterveneExpertId] = useState<number | null>(null);
  const [interveneReason, setInterveneReason] = useState("");

  // Audit Logs (С7)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Fetch Analytics (С8)
  const fetchAnalytics = async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${periodDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRules = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/routing_rules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/audit_logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStuckAppeals = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/operator/supervision", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStuckAppeals(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalytics();
      fetchCategories();
      fetchRules();
      fetchUsers();
      fetchAuditLogs();
      fetchStuckAppeals();
    }
  }, [token, periodDays]);

  // Create Category (С7)
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          default_specialization: newCatSpec,
          default_priority: newCatPrio,
        }),
      });
      if (res.ok) {
        alert("Категория успешно создана и зафиксирована в журнале аудита!");
        setNewCatName("");
        setNewCatDesc("");
        setShowAddCatModal(false);
        fetchCategories();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Rule (С7)
  const handleCreateRule = async () => {
    if (!ruleCatId) return;
    try {
      const res = await fetch("/api/admin/routing_rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category_id: ruleCatId,
          specialist_group: ruleGroup,
          max_load_limit: ruleLimit,
          priority_modifier: rulePrio,
        }),
      });
      if (res.ok) {
        alert("Правило маршрутизации успешно настроено!");
        fetchRules();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create User (С7)
  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      alert("Заполните все обязательные поля");
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          full_name: newFullName.trim(),
          role: newRole,
          specialization: newRole === "expert" ? newSpec : null,
          max_active_appeals: 10,
        }),
      });
      if (res.ok) {
        alert("Сотрудник успешно создан и права назначены!");
        setNewUsername("");
        setNewPassword("");
        setNewFullName("");
        setShowAddUserModal(false);
        fetchUsers();
        fetchAuditLogs();
      } else {
        const d = await res.json();
        alert(d.detail || "Ошибка создания");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Unlock Stuck Appeal (С7)
  const handleIntervene = async () => {
    if (!selectedStuckId || !interveneReason.trim()) {
      alert("Укажите причину вмешательства для журнала аудита");
      return;
    }
    try {
      const res = await fetch(`/api/admin/appeals/${selectedStuckId}/intervene`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: interveneStatus,
          priority: intervenePriority,
          assigned_expert_id: interveneExpertId,
          reason: interveneReason.trim(),
        }),
      });
      if (res.ok) {
        alert("Заявка успешно разблокирована. Запись внесена в журнал аудита!");
        setInterveneReason("");
        setSelectedStuckId(null);
        fetchStuckAppeals();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Download CSV (С8: без текстов и контактов!)
  const handleDownloadCsv = () => {
    window.open("/api/admin/export_csv", "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Администрирование платформы</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
              Центр управления
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Настройка категорий, правил маршрутизации, аудит действий и обезличенная аналитика.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "analytics" ? "bg-white text-purple-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Дашборд (С8)
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "categories" ? "bg-white text-purple-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Категории (С7)
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "rules" ? "bg-white text-purple-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Маршрутизация (С7)
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "users" ? "bg-white text-purple-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Сотрудники (С7)
          </button>
          <button
            onClick={() => setActiveTab("unlock")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "unlock" ? "bg-white text-purple-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Разблокировка (С7)
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "audit" ? "bg-white text-purple-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Журнал аудита
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS & EXPORT (С8) */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Период аналитики:</span>
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setPeriodDays(days)}
                  className={`px-2.5 py-1 rounded-lg border font-medium ${
                    periodDays === days ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {days} дней
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Выгрузить обезличенный CSV (без текстов)</span>
            </button>
          </div>

          {analytics && (
            <>
              {/* Primary KPI Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Всего обращений</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{analytics.total_appeals}</div>
                  <div className="text-[11px] text-slate-400 mt-1">за последние {periodDays} дней</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Среднее время триажа</div>
                  <div className="text-2xl font-black text-teal-700 mt-1">
                    {analytics.avg_triage_time_minutes} мин
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">до принятия оператором</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Первый ответ эксперта</div>
                  <div className="text-2xl font-black text-indigo-700 mt-1">
                    {analytics.avg_first_response_hours} ч.
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">средняя скорость реакции</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Доля возвратов («Не помогло»)</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {analytics.return_percentage}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Срочных: {analytics.urgent_percentage}% • Кризисных: {analytics.crisis_percentage}%
                  </div>
                </div>
              </div>

              {/* Distributions Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Categories */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
                    По категориям
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(analytics.by_category || {}).map(([cat, count]: any) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-slate-600 truncate mr-2">{cat}</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Applicant Types */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
                    По типу заявителя
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Школьники</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {analytics.by_applicant_type?.student || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Родители</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {analytics.by_applicant_type?.parent || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Педагоги</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {analytics.by_applicant_type?.teacher || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statuses */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
                    По статусам
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(analytics.by_status || {}).map(([st, count]: any) => (
                      <div key={st} className="flex items-center justify-between">
                        <span className="text-slate-600">{st}</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Specialist Workload Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Нагрузка на специалистов (лимиты и активность)
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {analytics.specialist_workload?.map((spec: any, idx: number) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{spec.name}</span>
                        <span className="text-slate-400 ml-2">({spec.specialization})</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500">
                          Активных: <strong>{spec.active_appeals}</strong> / Лимит: {spec.max_limit}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          spec.active_appeals >= spec.max_limit ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {spec.active_appeals >= spec.max_limit ? "Перегружен" : "В норме"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIES (С7) */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Справочник категорий обращений
            </span>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить категорию</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100 text-xs">
            {categories.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{c.description || "Без описания"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-slate-100 font-semibold text-slate-700">
                    Группа: {c.default_specialization}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-800 font-semibold">
                    Приоритет: {c.default_priority}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add Category Modal (С7) */}
          {showAddCatModal && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
                <h3 className="text-base font-bold text-slate-900 mb-3">Новая категория обращений</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Название:</label>
                    <input
                      type="text"
                      placeholder="Например: Проблемы с питанием в столовой"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Описание:</label>
                    <input
                      type="text"
                      placeholder="Краткое пояснение для заявителей"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Группа экспертов:</label>
                      <select
                        value={newCatSpec}
                        onChange={(e) => setNewCatSpec(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="psychology">Психологи</option>
                        <option value="law">Юристы</option>
                        <option value="conflictology">Конфликтологи</option>
                        <option value="social_pedagogy">Соцпедагоги</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Приоритет:</label>
                      <select
                        value={newCatPrio}
                        onChange={(e) => setNewCatPrio(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        <option value="standard">Стандарт</option>
                        <option value="urgent">Срочно</option>
                        <option value="low">Низкий</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => setShowAddCatModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    Создать категорию
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROUTING RULES (С7) */}
      {activeTab === "rules" && (
        <div className="space-y-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Настроить правило маршрутизации: категория → группа специалистов → лимит
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Категория:</label>
                <select
                  value={ruleCatId || ""}
                  onChange={(e) => setRuleCatId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Выберите категорию...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Группа специалистов:</label>
                <select
                  value={ruleGroup}
                  onChange={(e) => setRuleGroup(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="psychology">Психологи</option>
                  <option value="law">Юристы</option>
                  <option value="conflictology">Конфликтологи</option>
                  <option value="social_pedagogy">Социальные педагоги</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Лимит нагрузки:</label>
                <input
                  type="number"
                  value={ruleLimit}
                  onChange={(e) => setRuleLimit(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleCreateRule}
                  disabled={!ruleCatId}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Сохранить правило
                </button>
              </div>
            </div>
          </div>

          {/* Active Rules List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
            {rules.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{r.category_name}</span>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    Группа: {r.specialist_group}
                  </span>
                </div>
                <div className="text-slate-500">
                  Лимит активных обращений на эксперта: <strong>{r.max_load_limit}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: USERS (С7) */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Учетные записи сотрудников (операторы и эксперты)
            </span>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Завести сотрудника</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100 text-xs">
            {usersList.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{u.full_name}</div>
                  <div className="text-slate-500 text-xs font-mono mt-0.5">Логин: @{u.username}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded font-bold ${
                    u.role === "operator" ? "bg-indigo-50 text-indigo-800" :
                    u.role === "expert" ? "bg-emerald-50 text-emerald-800" : "bg-purple-50 text-purple-800"
                  }`}>
                    {u.role} {u.specialization ? `(${u.specialization})` : ""}
                  </span>
                  <span className="text-slate-400">Лимит: {u.max_active_appeals}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Add User Modal (С7) */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
                <h3 className="text-base font-bold text-slate-900 mb-3">Завести сотрудника</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ФИО сотрудника:</label>
                    <input
                      type="text"
                      placeholder="Иван Петров (Кризисный психолог)"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Логин:</label>
                      <input
                        type="text"
                        placeholder="expert_ivan"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Пароль:</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Роль:</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="expert">Эксперт</option>
                        <option value="operator">Оператор</option>
                      </select>
                    </div>
                    {newRole === "expert" && (
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Специализация:</label>
                        <select
                          value={newSpec}
                          onChange={(e) => setNewSpec(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="psychology">Психолог</option>
                          <option value="law">Юрист</option>
                          <option value="conflictology">Конфликтолог</option>
                          <option value="social_pedagogy">Соцпедагог</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateUser}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: UNLOCK STUCK APPEALS (С7: с фиксацией в аудит-логе) */}
      {activeTab === "unlock" && (
        <div className="space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 font-medium">
            <strong>Административное вмешательство:</strong> позволяет сменить статус, приоритет или исполнителя любого зависшего обращения. Обязательно обоснование причины, которое фиксируется в неизменяемом Журнале аудита. Тексты личной переписки администратору не раскрываются.
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Выбор обращения для разблокировки</h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Обращение:</label>
                <select
                  value={selectedStuckId || ""}
                  onChange={(e) => setSelectedStuckId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Выберите обращение...</option>
                  {stuckAppeals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.track_number} — {a.category_name} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Новый статус:</label>
                <select
                  value={interveneStatus}
                  onChange={(e) => setInterveneStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="assigned">Распределено</option>
                  <option value="in_progress">В работе</option>
                  <option value="needs_clarification">Нужно уточнение</option>
                  <option value="answer_ready">Ответ готов</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Новый приоритет:</label>
                <select
                  value={intervenePriority}
                  onChange={(e) => setIntervenePriority(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="urgent">Срочно</option>
                  <option value="standard">Стандарт</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Назначить эксперта:</label>
                <select
                  value={interveneExpertId || ""}
                  onChange={(e) => setInterveneExpertId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Без изменения</option>
                  {usersList.filter((u) => u.role === "expert").map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.specialization})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Обязательное обоснование разблокировки (для журнала аудита):
              </label>
              <input
                type="text"
                placeholder="Например: Эксперт ушел на больничный, обращение переназначено дежурному психологу..."
                value={interveneReason}
                onChange={(e) => setInterveneReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <button
              onClick={handleIntervene}
              disabled={!selectedStuckId || !interveneReason.trim()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50"
            >
              Разблокировать и зафиксировать в аудит-логе
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT JOURNAL (С7) */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Журнал аудита административных действий (Audit Log)
            </span>
            <span className="text-xs text-slate-500">Последние 100 записей</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Записей аудита пока нет</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded">
                        @{log.username}
                      </span>
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-400">({log.target_type} #{log.target_id || "all"})</span>
                    </div>
                    <div className="text-slate-700 font-medium">
                      Обоснование: <em>{log.reason}</em>
                    </div>
                    {log.details && (
                      <div className="text-slate-500 text-[11px]">{log.details}</div>
                    )}
                  </div>

                  <span className="text-slate-400 shrink-0 text-[11px]">
                    {new Date(log.created_at).toLocaleString("ru")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
