"use client";

import React, { useState, useEffect } from "react";
import {
  Inbox, AlertTriangle, Clock, CheckCircle, ShieldAlert, Sparkles,
  UserCheck, XCircle, ArrowRight, RefreshCw, Eye, MessageSquare,
  Shield, UserX, UserPlus, Filter, FileText
} from "lucide-react";

interface OperatorModuleProps {
  token: string | null;
}

export default function OperatorModule({ token }: OperatorModuleProps) {
  const [queueData, setQueueData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "supervision">("queue");

  // Selected appeal for detail modal
  const [selectedAppealId, setSelectedAppealId] = useState<number | null>(null);
  const [appealDetail, setAppealDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form actions
  const [actionCategory, setActionCategory] = useState<number | null>(null);
  const [actionPriority, setActionPriority] = useState<string>("standard");
  const [actionExpertId, setActionExpertId] = useState<number | null>(null);
  const [directAnswerText, setDirectAnswerText] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [returnAction, setReturnAction] = useState<"reassign" | "return_to_same" | "close">("reassign");
  const [returnExplanation, setReturnExplanation] = useState("");
  const [newExpertId, setNewExpertId] = useState<number | null>(null);

  // Supervision
  const [supervisionList, setSupervisionList] = useState<any[]>([]);

  // Modals
  const [showDirectAnswerModal, setShowDirectAnswerModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  const fetchQueue = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/operator/queue", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQueueData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervision = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/operator/supervision", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSupervisionList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/public/categories");
      const data = await res.json();
      if (Array.isArray(data)) setCategoriesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchQueue();
      fetchSupervision();
      fetchCategories();
    }
  }, [token]);

  const openAppeal = async (id: number) => {
    setSelectedAppealId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/operator/appeals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppealDetail(data);
        setActionCategory(data.category_id);
        setActionPriority(data.priority || "standard");
        // Pre-select first available specialist matching group
        if (data.available_specialists && data.available_specialists.length > 0) {
          const match = data.available_specialists.find(
            (s: any) => s.specialization === data.suggested_specialization && !s.is_overloaded
          );
          setActionExpertId(match ? match.id : data.available_specialists[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Assign Expert (С3)
  const handleAssign = async () => {
    if (!selectedAppealId || !actionExpertId) {
      alert("Пожалуйста, выберите специалиста для назначения");
      return;
    }
    try {
      const res = await fetch(`/api/operator/appeals/${selectedAppealId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: actionCategory,
          priority: actionPriority,
          assigned_expert_id: actionExpertId,
        }),
      });
      if (res.ok) {
        alert("Обращение успешно распределено специалисту!");
        setSelectedAppealId(null);
        setAppealDetail(null);
        fetchQueue();
        fetchSupervision();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reject appeal as spam or out of scope (С3)
  const handleReject = async () => {
    if (!selectedAppealId || !rejectReason.trim()) {
      alert("Укажите причину отклонения");
      return;
    }
    try {
      const res = await fetch(`/api/operator/appeals/${selectedAppealId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        alert("Обращение отклонено с сохранением причины.");
        setShowRejectModal(false);
        setSelectedAppealId(null);
        setAppealDetail(null);
        setRejectReason("");
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Direct answer by operator
  const handleDirectAnswer = async () => {
    if (!selectedAppealId || !directAnswerText.trim()) return;
    try {
      const res = await fetch(`/api/operator/appeals/${selectedAppealId}/direct_answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer_text: directAnswerText.trim() }),
      });
      if (res.ok) {
        alert("Консультация отправлена, обращение закрыто.");
        setShowDirectAnswerModal(false);
        setSelectedAppealId(null);
        setAppealDetail(null);
        setDirectAnswerText("");
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Return (С5)
  const handleReturn = async () => {
    if (!selectedAppealId) return;
    try {
      const res = await fetch(`/api/operator/appeals/${selectedAppealId}/handle_return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: returnAction,
          new_expert_id: newExpertId,
          explanation: returnExplanation.trim(),
        }),
      });
      if (res.ok) {
        alert("Действие по возврату выполнено!");
        setSelectedAppealId(null);
        setAppealDetail(null);
        fetchQueue();
        fetchSupervision();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top Banner with Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Рабочее место оператора</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
              1-я линия поддержки
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Первичная маршрутизация, отсев спама, определение приоритета и контроль распределения.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchQueue();
              fetchSupervision();
            }}
            className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-all"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "queue" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Очередь новых ({queueData?.total_new ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("supervision")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "supervision" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Контроль распределения ({supervisionList.length})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Новых обращений в очереди</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {queueData?.total_new ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Кризисные / Срочные (С6)</div>
            <div className="text-2xl font-black text-rose-600 mt-0.5">
              {queueData?.crisis_count ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Ожидают дольше 60 мин</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              {queueData?.overdue_count ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* QUEUE TAB (С3, С6) */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Очередь необработанных обращений (старые сверху, срочные первыми)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Всего: {queueData?.queue?.length ?? 0}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Загрузка очереди...
              </div>
            ) : queueData?.queue?.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Очередь пуста. Все обращения обработаны!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {queueData?.queue?.map((item: any) => {
                  const isCrisisOrUrgent = item.is_crisis || item.priority === "urgent";
                  const isReturned = item.status === "returned";

                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50 ${
                        isCrisisOrUrgent ? "bg-rose-50/50 border-l-4 border-l-rose-500" : ""
                      } ${isReturned ? "bg-amber-50/40 border-l-4 border-l-amber-500" : ""}`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                            {item.track_number}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700">
                            {item.applicant_type === "student" && "Школьник («ты»)"}
                            {item.applicant_type === "parent" && "Родитель («вы»)"}
                            {item.applicant_type === "teacher" && "Педагог («вы»)"}
                          </span>
                          {item.is_crisis && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-rose-600 text-white animate-pulse">
                              КРИЗИСНОЕ МАРКЕР
                            </span>
                          )}
                          {isReturned && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-600 text-white">
                              ВОЗВРАТ («Это не помогло»)
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ожидание: <strong>{item.wait_minutes} мин</strong>
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-800 line-clamp-2 leading-relaxed">
                          {item.initial_text}
                        </p>

                        {/* System AI Hint */}
                        <div className="flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-lg border border-teal-200/60 max-w-fit">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>
                            Подсказка системы: <strong>{item.suggested_category}</strong> → группа <strong>{item.suggested_specialization}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => openAppeal(item.id)}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-all shadow-xs"
                        >
                          Обработать
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUPERVISION TAB (С3) */}
      {activeTab === "supervision" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Контроль распределённых обращений (без доступа к конфиденциальной переписке)
            </span>
            <span className="text-xs text-slate-500">
              Выделены обращения без ответа более 24 часов
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {supervisionList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Распределённых обращений пока нет.
              </div>
            ) : (
              supervisionList.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    item.is_stuck ? "bg-rose-50/60" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{item.track_number}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                        {item.category_name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold">
                        Статус: {item.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Назначенный эксперт: <strong>{item.assigned_expert_name}</strong>
                      {item.co_expert_name && ` + соисполнитель: ${item.co_expert_name}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">
                      В работе: <strong>{item.hours_in_progress} ч.</strong>
                    </span>
                    {item.is_stuck && (
                      <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-md font-bold text-[11px] animate-pulse">
                        Зависло &gt;24 ч!
                      </span>
                    )}
                    {item.transfer_requested && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md font-bold text-[11px]">
                        Запрос передачи: {item.transfer_reason}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* APPEAL PROCESSING DRAWER / MODAL (С3, С6) */}
      {selectedAppealId && appealDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <div className="text-xs text-slate-500 font-medium">Обработка обращения</div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {appealDetail.track_number}
                </div>
              </div>
              <button
                onClick={() => setSelectedAppealId(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Crisis Contact Display (if provided by applicant) */}
            {appealDetail.is_crisis && appealDetail.emergency_contact && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-5 text-xs text-rose-950">
                <div className="font-bold flex items-center gap-1.5 text-rose-800 mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Экстренный контакт заявителя (доступен только кризисному оператору):</span>
                </div>
                <div className="font-mono text-sm font-extrabold text-rose-900 bg-white/80 px-3 py-1.5 rounded-lg border border-rose-200">
                  {appealDetail.emergency_contact}
                </div>
              </div>
            )}

            {/* If Returned (С5) */}
            {appealDetail.status === "returned" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-xs text-amber-950">
                <div className="font-bold text-amber-800 mb-1">
                  Заявитель отметил «Это не помогло» (Возврат №{appealDetail.return_count}):
                </div>
                <p className="italic bg-white/80 p-2.5 rounded-lg border border-amber-200">
                  «{appealDetail.return_reason || "Причина не указана"}»
                </p>

                {/* Return handling actions */}
                <div className="mt-4 pt-3 border-t border-amber-200 space-y-3">
                  <div className="font-semibold text-slate-900">Решение оператора по возврату:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnAction("reassign")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        returnAction === "reassign" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700"
                      }`}
                    >
                      Переназначить другому эксперту
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnAction("return_to_same")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        returnAction === "return_to_same" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700"
                      }`}
                    >
                      Вернуть тому же на доработку
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnAction("close")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        returnAction === "close" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700"
                      }`}
                    >
                      Закрыть с объяснением
                    </button>
                  </div>

                  {returnAction === "reassign" && (
                    <select
                      value={newExpertId || ""}
                      onChange={(e) => setNewExpertId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                    >
                      <option value="">Выберите нового эксперта...</option>
                      {appealDetail.available_specialists?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.specialization}) — загрузка: {s.active_load}/{s.max_load}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Пояснение оператора (опционально)..."
                    value={returnExplanation}
                    onChange={(e) => setReturnExplanation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />

                  <button
                    onClick={handleReturn}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    Применить решение по возврату
                  </button>
                </div>
              </div>
            )}

            {/* Appeal Content */}
            <div className="space-y-4 mb-6 text-xs sm:text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Исходный текст обращения:</span>
                <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {appealDetail.initial_text}
                </p>
              </div>

              {/* Answers to Clarifying questions */}
              {appealDetail.clarification_answers && Object.keys(appealDetail.clarification_answers).length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-2">Ответы на уточняющие вопросы:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(appealDetail.clarification_answers).map(([q, a]: any) => (
                      <div key={q} className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-medium block">{q}:</span>
                        <span className="text-slate-900 font-bold">{a || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {appealDetail.attachments && appealDetail.attachments.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-2">Прикреплённые файлы (EXIF очищен):</span>
                  <div className="flex flex-wrap gap-2">
                    {appealDetail.attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.filepath}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-teal-700 hover:bg-teal-50 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{att.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Heuristic Suggestion */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs">
                <div className="font-bold text-teal-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Подсказка системы по умной маршрутизации:</span>
                </div>
                <div className="text-teal-800">
                  Рекомендуемая категория: <strong>{appealDetail.suggested_category}</strong> (группа: <strong>{appealDetail.suggested_specialization}</strong>).
                </div>
                <div className="text-[11px] text-teal-700 mt-1 italic">
                  {appealDetail.suggested_reason}
                </div>
              </div>
            </div>

            {/* TRIAGE CONTROLS (С3, С6) */}
            <div className="bg-white border-t border-slate-200 pt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Refine Category */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Категория:</label>
                  <select
                    value={actionCategory || ""}
                    onChange={(e) => setActionCategory(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Не определена</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Приоритет:</label>
                  <select
                    value={actionPriority}
                    onChange={(e) => setActionPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="urgent">Срочно (реакция немедленно)</option>
                    <option value="standard">Стандарт (по умолчанию)</option>
                    <option value="low">Низкий (информационный)</option>
                  </select>
                </div>

                {/* Assign Specialist */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Назначить эксперта:</label>
                  <select
                    value={actionExpertId || ""}
                    onChange={(e) => setActionExpertId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Выберите эксперта...</option>
                    {appealDetail.available_specialists?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.specialization}) — {s.active_load}/{s.max_load} {s.is_overloaded ? "⚠️ Перегружен" : "✓ Свободен"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Отклонить (спам/вне компетенции)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDirectAnswerModal(true)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ответить и закрыть самому</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAssign}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Назначить исполнителя</span>
                </button>
              </div>
            </div>

            {/* MODAL: REJECT (С3) */}
            {showRejectModal && (
              <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Отклонить обращение
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Укажите причину (спам, дубликат, вне компетенции сервиса). Заявитель получит корректное разъяснение и контакты профильных служб:
                  </p>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Например: обращение содержит спам / коммерческую рекламу..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleReject}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: DIRECT ANSWER */}
            {showDirectAnswerModal && (
              <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Прямой ответ оператора
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Используется, если помощь эксперта не требуется и достаточно быстрой консультации от лица сервиса:
                  </p>
                  <textarea
                    rows={4}
                    value={directAnswerText}
                    onChange={(e) => setDirectAnswerText(e.target.value)}
                    placeholder="Текст консультации заявителю..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none mb-4"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDirectAnswerModal(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleDirectAnswer}
                      className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                    >
                      Отправить и закрыть
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
