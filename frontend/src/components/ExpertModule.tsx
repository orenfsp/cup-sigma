"use client";

import React, { useState, useEffect } from "react";
import {
  Brain, Send, MessageSquare, StickyNote, UserPlus, ArrowRightLeft,
  AlertCircle, CheckCircle, Clock, ShieldAlert, FileText, Users, Eye
} from "lucide-react";

interface ExpertModuleProps {
  token: string | null;
  currentUser: any;
}

export default function ExpertModule({ token, currentUser }: ExpertModuleProps) {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  // Selected Appeal
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Active Tab inside card: 'dialogue' | 'notes' | 'collab'
  const [cardTab, setCardTab] = useState<"dialogue" | "notes" | "collab">("dialogue");

  // Inputs
  const [clarifyMessage, setClarifyMessage] = useState("");
  const [recommendationsMessage, setRecommendationsMessage] = useState("");
  const [internalNoteText, setInternalNoteText] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [selectedColleagueId, setSelectedColleagueId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAppeals = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = "/api/expert/my_appeals?";
      if (statusFilter) url += `status_filter=${statusFilter}&`;
      if (priorityFilter) url += `priority_filter=${priorityFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppeals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/expert/appeals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAppeals();
  }, [token, statusFilter, priorityFilter]);

  // Action: Take in work (С4)
  const handleTakeInWork = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/expert/appeals/${selectedId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "take_in_work" }),
      });
      if (res.ok) {
        await fetchDetail(selectedId);
        fetchAppeals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Request clarification (С4)
  const handleRequestClarification = async () => {
    if (!selectedId || !clarifyMessage.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/expert/appeals/${selectedId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "request_clarification", message: clarifyMessage.trim() }),
      });
      if (res.ok) {
        setClarifyMessage("");
        await fetchDetail(selectedId);
        fetchAppeals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Give Answer / Recommendations (С4)
  const handleGiveAnswer = async () => {
    if (!selectedId || !recommendationsMessage.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/expert/appeals/${selectedId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "give_answer", message: recommendationsMessage.trim() }),
      });
      if (res.ok) {
        setRecommendationsMessage("");
        await fetchDetail(selectedId);
        fetchAppeals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Note (С4)
  const handleAddNote = async () => {
    if (!selectedId || !internalNoteText.trim()) return;
    try {
      const res = await fetch(`/api/expert/appeals/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: internalNoteText.trim() }),
      });
      if (res.ok) {
        setInternalNoteText("");
        await fetchDetail(selectedId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Add Co-Expert (С4)
  const handleAddCoExpert = async () => {
    if (!selectedId || !selectedColleagueId) return;
    try {
      const res = await fetch(`/api/expert/appeals/${selectedId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "add_co_expert", co_expert_id: selectedColleagueId }),
      });
      if (res.ok) {
        alert("Соисполнитель успешно подключен!");
        await fetchDetail(selectedId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Request Transfer (С4)
  const handleRequestTransfer = async () => {
    if (!selectedId || !transferReason.trim()) return;
    try {
      const res = await fetch(`/api/expert/appeals/${selectedId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "request_transfer", transfer_reason: transferReason.trim() }),
      });
      if (res.ok) {
        alert("Запрос на передачу обращения отправлен оператору.");
        setTransferReason("");
        await fetchDetail(selectedId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Рабочее место эксперта</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {currentUser?.specialization === "psychology" && "Психологическая помощь"}
              {currentUser?.specialization === "law" && "Юридическая экспертиза"}
              {currentUser?.specialization === "conflictology" && "Медиация и конфликты"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Конфиденциальная работа с назначенными обращениями. Полная анонимность заявителя.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">Все статусы</option>
            <option value="assigned">Назначенные</option>
            <option value="in_progress">В работе</option>
            <option value="needs_clarification">Нужно уточнение</option>
            <option value="answer_ready">Ответ готов</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">Все приоритеты</option>
            <option value="urgent">Срочно</option>
            <option value="standard">Стандарт</option>
          </select>
        </div>
      </div>

      {/* Main Grid: List on Left, Detail Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appeals List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Мои обращения ({appeals.length})
              </span>
              <span className="text-[11px] text-slate-500">Срочные сверху</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Загрузка обращений...</div>
            ) : appeals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Назначенных обращений нет</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {appeals.map((item) => {
                  const isUrgent = item.priority === "urgent" || item.is_crisis;
                  const isSelected = selectedId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => fetchDetail(item.id)}
                      className={`p-3.5 cursor-pointer transition-all hover:bg-slate-50 text-xs ${
                        isSelected ? "bg-teal-50/70 border-l-4 border-l-teal-600" : ""
                      } ${isUrgent && !isSelected ? "bg-rose-50/40 border-l-4 border-l-rose-500" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-slate-900">{item.track_number}</span>
                        {isUrgent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-600 text-white">
                            СРОЧНО
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-teal-800 font-semibold mb-1">
                        {item.category_name}
                      </div>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">{item.preview_text}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Статус: {item.status}</span>
                        <span>{new Date(item.created_at).toLocaleDateString("ru")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Workspace (8 cols) */}
        <div className="lg:col-span-8">
          {!selectedId || !detail ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 shadow-xs h-full flex flex-col items-center justify-center">
              <Brain className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Выберите обращение из списка слева</p>
              <p className="text-xs text-slate-400 mt-1">
                Вы сможете изучить ситуацию, ответить заявителю и вести внутренние заметки.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              {/* Workspace Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900 font-mono">{detail.track_number}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                      {detail.category_name}
                    </span>
                    {detail.is_crisis && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold animate-pulse">
                        Кризис
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Заявитель: <strong>{detail.applicant_type === "student" ? "Школьник («ты»)" : "Взрослый («вы»)"}</strong> • Статус: <strong>{detail.status}</strong>
                  </div>
                </div>

                {/* Simultaneous presence indicator (С4) */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>В карточке: {currentUser?.full_name?.split(" ")[0]}</span>
                </div>
              </div>

              {/* Initial Appeal & Clarifications Accordion */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/30 text-xs space-y-3">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Текст обращения заявителя:</span>
                  <p className="text-slate-900 bg-white p-3.5 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                    {detail.initial_text}
                  </p>
                </div>

                {detail.clarification_answers && Object.keys(detail.clarification_answers).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(detail.clarification_answers).map(([k, v]: any) => (
                      <div key={k} className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">{k}:</span>
                        <span className="text-[11px] font-bold text-slate-800">{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs: Dialogue vs Notes vs Collab (С4) */}
              <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 text-xs font-bold">
                <button
                  onClick={() => setCardTab("dialogue")}
                  className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    cardTab === "dialogue"
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Диалог с заявителем</span>
                </button>

                <button
                  onClick={() => setCardTab("notes")}
                  className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    cardTab === "notes"
                      ? "border-amber-500 text-amber-800"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Внутренние заметки ({detail.internal_notes?.length || 0})</span>
                </button>

                <button
                  onClick={() => setCardTab("collab")}
                  className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    cardTab === "collab"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Совместная работа</span>
                </button>
              </div>

              {/* TAB 1: DIALOGUE (С4) */}
              {cardTab === "dialogue" && (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Messages Feed */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {detail.messages?.map((msg: any) => {
                      const isApplicant = msg.sender_type === "applicant";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isApplicant ? "items-start" : "items-end"}`}
                        >
                          <span className="text-[10px] text-slate-400 mb-0.5">
                            {isApplicant ? "Заявитель" : `Вы (${msg.sender_display_name})`} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`p-3 rounded-2xl text-xs max-w-md leading-relaxed whitespace-pre-wrap ${
                              isApplicant
                                ? "bg-slate-100 text-slate-900 rounded-tl-none"
                                : "bg-teal-600 text-white rounded-tr-none shadow-xs"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expert Workflow Actions (С4) */}
                  <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                    {/* If assigned, button to take in work */}
                    {detail.status === "assigned" && (
                      <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 flex items-center justify-between">
                        <span className="text-teal-900 font-semibold">
                          Обращение распределено вам. Нажмите, чтобы приступить к работе:
                        </span>
                        <button
                          onClick={handleTakeInWork}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                        >
                          Взять в работу
                        </button>
                      </div>
                    )}

                    {/* Clarification Input (С4) */}
                    <div className="space-y-2">
                      <label className="font-bold text-slate-700 block">
                        Задать уточняющий вопрос (переводит статус в «Нужно уточнение»):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Например: расскажи, пожалуйста, как реагируют учителя, если замечают это?"
                          value={clarifyMessage}
                          onChange={(e) => setClarifyMessage(e.target.value)}
                          className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                        <button
                          onClick={handleRequestClarification}
                          disabled={!clarifyMessage.trim() || actionLoading}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold disabled:opacity-50"
                        >
                          Задать вопрос
                        </button>
                      </div>
                    </div>

                    {/* Recommendations Input (С4) */}
                    <div className="space-y-2 pt-2">
                      <label className="font-bold text-slate-700 block">
                        Подготовить рекомендации (переводит статус в «Ответ готов»):
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Пошаговые рекомендации и план действий для заявителя..."
                        value={recommendationsMessage}
                        onChange={(e) => setRecommendationsMessage(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <button
                        onClick={handleGiveAnswer}
                        disabled={!recommendationsMessage.trim() || actionLoading}
                        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Отправить рекомендации заявителю</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERNAL NOTES (С4: заявителю не видны!) */}
              {cardTab === "notes" && (
                <div className="p-5 space-y-4 text-xs animate-fadeIn bg-amber-50/20">
                  <div className="p-3 bg-amber-100/60 border border-amber-200 rounded-xl text-amber-900 font-semibold flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Внутренние заметки видны только специалистам и оператору. Заявитель их никогда не видит!
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {detail.internal_notes?.map((n: any) => (
                      <div key={n.id} className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-slate-800">
                        <div className="flex items-center justify-between text-[11px] text-amber-800 font-bold mb-1">
                          <span>{n.author_name}</span>
                          <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{n.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <textarea
                      rows={2}
                      placeholder="Написать закрытую внутреннюю заметку..."
                      value={internalNoteText}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none mb-2"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!internalNoteText.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      Сохранить заметку
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: COLLABORATION (С4: подключение соисполнителя и передача) */}
              {cardTab === "collab" && (
                <div className="p-5 space-y-5 text-xs animate-fadeIn">
                  {/* Co-expert Section */}
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 space-y-3">
                    <div className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-indigo-700" />
                      <span>Подключить соисполнителя другого профиля</span>
                    </div>
                    <p className="text-slate-600">
                      Например: психолог работает над обращением с угрозами и подключает юриста для правовой оценки. Соисполнитель видит переписку и может отвечать.
                    </p>

                    {detail.co_expert_name ? (
                      <div className="p-2.5 bg-white rounded-xl border border-indigo-200 font-bold text-indigo-900">
                        Подключен соисполнитель: {detail.co_expert_name}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={selectedColleagueId || ""}
                          onChange={(e) => setSelectedColleagueId(Number(e.target.value))}
                          className="flex-1 p-2.5 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="">Выберите коллегу (юрист, психолог, конфликтолог)...</option>
                          {detail.colleagues?.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name} ({c.specialization})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddCoExpert}
                          disabled={!selectedColleagueId}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          Подключить
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Transfer Request Section */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-slate-700" />
                      <span>Запросить передачу обращения оператору</span>
                    </div>
                    <p className="text-slate-600">
                      Если обращение требует переназначения на другого специалиста, укажите причину. Оператор подтвердит передачу.
                    </p>

                    <input
                      type="text"
                      placeholder="Причина запроса на передачу (например: ситуация сугубо правовая, требуется юрист)..."
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                    />

                    <button
                      onClick={handleRequestTransfer}
                      disabled={!transferReason.trim()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold"
                    >
                      Отправить запрос оператору
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
