"use client";

import React, { useState, useEffect } from "react";
import {
  Shield, Send, FileText, CheckCircle2, AlertCircle, Copy, Check,
  Download, ArrowRight, MessageSquare, Clock, Star, ThumbsUp, ThumbsDown,
  Paperclip, RefreshCw, AlertTriangle, EyeOff, Lock, User
} from "lucide-react";
import { useTone } from "@/context/ToneContext";
import EmergencyBanner from "./EmergencyBanner";

interface Category {
  id: number;
  name: string;
  description: string;
}

const BANNED_WORDS = [
  // ===== Русские прямые термины =====
  "суицид",
  "суицида",
  "суициду",
  "суицидом",
  "суициде",
  "суицидальный",
  "суицидальная",
  "суицидальное",
  "суицидальные",
  "суицидальных",
  "суицидник",
  "суицидница",
  "суицидники",
  "суицидницы",
  "суициднуться",
  "суициднулся",
  "суициднулась",
  "суициднулись",
  "самоубийство",
  "самоубийства",
  "самоубийству",
  "самоубийством",
  "самоубийстве",
  "самоубийца",
  "самоубийцы",
  "самоубийц",
  "самоубийственный",
  "самоубийственная",
  "самоубийственное",
  "самоубийственные",
  "самоубиться",
  "самоубьюсь",
  "самоубьешься",
  "самоубьёшься",
  "самоубьется",
  "самоубьётся",
  "самоубьемся",
  "самоубьёмся",
  "самоубьются",
  "самоубился",
  "самоубилась",
  "самоубились",

  // ===== Убить себя / покончить с собой =====
  "убить себя",
  "убью себя",
  "убьешь себя",
  "убьёшь себя",
  "убьет себя",
  "убьёт себя",
  "убьем себя",
  "убьём себя",
  "убьют себя",
  "убил себя",
  "убила себя",
  "убили себя",
  "убиваю себя",
  "убиваешь себя",
  "убивает себя",
  "убиваем себя",
  "убивают себя",
  "убей себя",
  "убейте себя",
  "убейся",
  "убейтесь",
  "убейся об стену",
  "убейтесь об стену",
  "убей себя ап стену",
  "убейся ап стену",
  "покончить с собой",
  "покончил с собой",
  "покончила с собой",
  "покончили с собой",
  "покончу с собой",
  "покончишь с собой",
  "покончит с собой",
  "покончим с собой",
  "покончат с собой",
  "покончить жизнь самоубийством",
  "покончил жизнь самоубийством",
  "покончила жизнь самоубийством",
  "покончили жизнь самоубийством",
  "свести счеты с жизнью",
  "свести счёты с жизнью",
  "свел счеты с жизнью",
  "свёл счёты с жизнью",
  "свела счеты с жизнью",
  "свела счёты с жизнью",
  "свели счеты с жизнью",
  "свели счёты с жизнью",
  "сведу счеты с жизнью",
  "сведу счёты с жизнью",
  "лишить себя жизни",
  "лишил себя жизни",
  "лишила себя жизни",
  "лишили себя жизни",
  "лишу себя жизни",
  "наложить на себя руки",
  "наложил на себя руки",
  "наложила на себя руки",
  "наложили на себя руки",
  "наложу на себя руки",
  "руки на себя наложить",

  // ===== Самоповреждение / порезы =====
  "вскрыть вены",
  "вскрыл вены",
  "вскрыла вены",
  "вскрыли вены",
  "вскрою вены",
  "вскрытие вен",
  "порезать вены",
  "порезал вены",
  "порезала вены",
  "порезали вены",
  "порежу вены",
  "резать вены",
  "режу вены",
  "режет вены",
  "режут вены",
  "перерезать вены",
  "перерезал вены",
  "перерезала вены",
  "перерезали вены",
  "перережу вены",
  "вены",
  "вена",
  "вскрытые вены",
  "порезы",
  "порез",
  "порезался",
  "порезалась",
  "порезались",
  "порежусь",
  "резать себя",
  "режу себя",
  "режешь себя",
  "режет себя",
  "режем себя",
  "режут себя",
  "порезать себя",
  "порезал себя",
  "порезала себя",
  "порезали себя",
  "порежу себя",
  "наносить себе вред",
  "наношу себе вред",
  "наносит себе вред",
  "наносил себе вред",
  "нанес себе вред",
  "нанёс себе вред",
  "причинять себе боль",
  "причиняю себе боль",
  "причиняет себе боль",
  "причинил себе боль",
  "причинила себе боль",
  "самоповреждение",
  "самоповреждения",
  "самопорезы",
  "селфхарм",
  "selfharm",
  "self-harm",
  "self harm",
  "шрам",
  "шрамы",

  // ===== Способы / эвфемизмы =====
  "передозировка",
  "передоз",
  "передознуться",
  "передознулся",
  "передознулась",
  "передознулись",
  "отравиться",
  "отравился",
  "отравилась",
  "отравились",
  "отравлюсь",
  "травануться",
  "траванулся",
  "траванулась",
  "траванулись",
  "травлюсь",
  "повеситься",
  "повесился",
  "повесилась",
  "повесились",
  "повешусь",
  "удавиться",
  "удавился",
  "удавилась",
  "удавились",
  "удавлюсь",
  "застрелиться",
  "застрелился",
  "застрелилась",
  "застрелились",
  "застрелюсь",
  "утопиться",
  "утопился",
  "утопилась",
  "утопились",
  "утоплюсь",
  "сжечь себя",
  "сжег себя",
  "сжёг себя",
  "сожгу себя",
  "поджечь себя",
  "поджег себя",
  "поджёг себя",
  "подожгу себя",
  "спрыгнуть",
  "спрыгнул",
  "спрыгнула",
  "спрыгнули",
  "спрыгну",
  "прыгнуть с крыши",
  "прыгнул с крыши",
  "прыгнула с крыши",
  "прыгнули с крыши",
  "прыгну с крыши",
  "прыгнуть с моста",
  "прыгнул с моста",
  "прыгнула с моста",
  "прыгнули с моста",
  "прыгну с моста",
  "прыгнуть под поезд",
  "прыгнул под поезд",
  "прыгнула под поезд",
  "прыгнули под поезд",
  "прыгну под поезд",
  "прыгнуть под электричку",
  "прыгнул под электричку",
  "броситься под поезд",
  "бросился под поезд",
  "бросилась под поезд",
  "бросились под поезд",
  "брошусь под поезд",
  "сигануть",
  "сиганул",
  "сиганула",
  "сиганули",
  "сигану",

  // ===== Уход из жизни / эвфемизмы =====
  "уйти из жизни",
  "ушел из жизни",
  "ушёл из жизни",
  "ушла из жизни",
  "ушли из жизни",
  "уйду из жизни",
  "уйти в мир иной",
  "ушел в мир иной",
  "ушёл в мир иной",
  "ушла в мир иной",
  "ушли в мир иной",
  "уйду в мир иной",
  "отправиться на тот свет",
  "отправился на тот свет",
  "отправилась на тот свет",
  "отправились на тот свет",
  "отправлюсь на тот свет",
  "на тот свет",
  "мир иной",
  "загробный мир",
  "царство мертвых",
  "царство мёртвых",
  "прощай навсегда",
  "прощайте навсегда",
  "не поминайте лихом",
  "я все",
  "я всё",
  "мне конец",
  "мне крышка",
  "мне хана",
  "мне капут",
  "мне амба",
  "всё кончено",
  "все кончено",
  "я не жилец",
  "не жилец",
  "долго не протяну",
  "протяну ноги",
  "отбросить коньки",
  "откинуть коньки",
  "откинул коньки",
  "отбросил коньки",
  "сыграть в ящик",
  "сыграл в ящик",
  "дать дуба",
  "дал дуба",
  "окочуриться",
  "окочурился",
  "окочурилась",
  "сгинуть",
  "сгинул",
  "сгинула",

  // ===== Мысли и желания =====
  "хочу умереть",
  "хочу сдохнуть",
  "хочу исчезнуть",
  "хочу покончить с собой",
  "хочу убить себя",
  "хочу повеситься",
  "хочу отравиться",
  "хочу застрелиться",
  "хочу утопиться",
  "хочу спрыгнуть",
  "не хочу жить",
  "не хочу больше жить",
  "не хочу жить дальше",
  "жить не хочется",
  "жить не хочу",
  "незачем жить",
  "нет смысла жить",
  "не вижу смысла жить",
  "нет смысла в жизни",
  "жизнь бессмысленна",
  "жизнь не имеет смысла",
  "я устал жить",
  "я устала жить",
  "устал жить",
  "устала жить",
  "устали жить",
  "лучше умереть",
  "лучше сдохнуть",
  "лучше бы я умер",
  "лучше бы я умерла",
  "лучше бы меня не было",
  "тебе лучше умереть",
  "тебе лучше сдохнуть",
  "тебе лучше не жить",
  "сдохни",
  "сдохните",
  "умри",
  "умрите",
  "исчезни",
  "сгинь",
  "покончи с собой",
  "покончите с собой",
  "самоубейся",
  "самоубейтесь",
  "суицидничай",
  "суицидничайте",

  // ===== Английские прямые термины =====
  "suicide",
  "suicidal",
  "suicided",
  "suicide ideation",
  "suicidal thoughts",
  "suicidal ideation",
  "suicide note",
  "suicide letter",
  "suicide method",
  "suicide plan",
  "suicide pact",
  "suicide attempt",
  "attempted suicide",
  "commit suicide",
  "committed suicide",

  // ===== Английские фразы =====
  "kill myself",
  "killing myself",
  "killed myself",
  "kill yourself",
  "killing yourself",
  "killed yourself",
  "kill urself",
  "kill ur self",
  "kill yourselves",
  "kill me",
  "kill us",
  "end my life",
  "end your life",
  "end his life",
  "end her life",
  "end their life",
  "end it all",
  "end myself",
  "end yourself",
  "end himself",
  "end herself",
  "end themselves",
  "take my life",
  "take your life",
  "take his life",
  "take her life",
  "take their life",
  "take own life",
  "take one's own life",
  "off myself",
  "off yourself",
  "off himself",
  "off herself",
  "off themselves",
  "top myself",
  "top yourself",
  "top himself",
  "top herself",
  "top themselves",
  "do the deed",
  "final exit",
  "better off dead",
  "better off without me",
  "no reason to live",
  "not worth living",
  "life is meaningless",
  "life has no meaning",
  "i want to die",
  "i wanna die",
  "i want to kill myself",
  "i wanna kill myself",
  "i want to end it all",
  "i wanna end it all",
  "i'm going to kill myself",
  "im going to kill myself",
  "i will kill myself",
  "i'll kill myself",
  "ill kill myself",
  "i'm gonna kill myself",
  "im gonna kill myself",
  "i am going to kill myself",
  "i am gonna kill myself",
  "i want to disappear",
  "i wanna disappear",
  "i want to not exist",
  "i wanna not exist",
  "i don't want to live",
  "i dont want to live",
  "i don't want to be here",
  "i dont want to be here",
  "i can't go on",
  "i cant go on",
  "i can't do this anymore",
  "i cant do this anymore",

  // ===== Английский сленг =====
  "kys",
  "kms",
  "kik",
  "kik yourself",
  "kik urself",
  "kik me",
  "od",
  "od on pills",
  "overdose",
  "overdosed",
  "hang myself",
  "hanging myself",
  "hung myself",
  "hang yourself",
  "hanging yourself",
  "hung yourself",
  "cut myself",
  "cutting myself",
  "cut yourself",
  "cutting yourself",
  "cut my wrists",
  "cutting my wrists",
  "cut your wrists",
  "cutting your wrists",
  "slit my wrists",
  "slitting my wrists",
  "slit your wrists",
  "slitting your wrists",
  "slash my wrists",
  "slashing my wrists",
  "slash your wrists",
  "slashing your wrists",
  "jump off a bridge",
  "jump off bridge",
  "jump off a roof",
  "jump off roof",
  "jump in front of a train",
  "jump in front of train",
  "jump under a train",
  "jump under train",
  "jump in front of a bus",
  "jump in front of bus",
  "jump under a bus",
  "jump under bus",
  "take pills",
  "taking pills",
  "swallow pills",
  "swallowing pills",
  "poison myself",
  "poison yourself",
  "shoot myself",
  "shoot yourself",
  "shoot my brains out",
  "shoot your brains out",
  "blow my brains out",
  "blow your brains out",
  "drown myself",
  "drown yourself",
  "starve myself",
  "starve yourself",
  "set myself on fire",
  "set yourself on fire",
  "burn myself",
  "burn yourself",
  "electrocute myself",
  "electrocute yourself",
  "gas myself",
  "gas yourself",
  "carbon monoxide",
  "co poisoning",
  "exit bag",
  "partial hanging",
  "full hanging",
  "ligature",
  "self injury",
  "self-injury",
  "selfinjury",
  "cutting",
  "cutter",
  "cutters",
  "razor",
  "razors",
  "blade",
  "blades",
  "noose",
  "rope",
  "gallows",
  "cyanide",
  "poison",
  "pills",
  "helium",
  "nitrogen",
  "charcoal",
  "charcoal burning",
  "suicide bag",
  "suicide hood",
  "suicide kit",
  "suicide drug",
  "suicide pill",
  "lethal dose",
  "fatal dose",
  "ld50",
  "goodbye cruel world",
  "last goodbye",
  "final goodbye",
  "this is my last",
  "my last day",
  "my last night",
  "last day",
  "last night",
  "final message",
  "final note",
  "funeral",
  "grave",
  "coffin",
  "casket",
  "cremation",
  "burial",
  "tombstone",
  "headstone",
  "dead inside",
  "want to die",
  "wanna die",
  "wish i was dead",
  "wish i were dead",
  "wish i was never born",
  "wish i were never born",
  "never born",
  "better dead",
  "ready to die",
  "ready to go",
  "no way out",
  "no escape",
  "hopeless",
  "worthless",
  "empty",
  "numb",
  "painless",
  "peaceful",
  "eternal sleep",
  "eternal rest",
  "rest in peace",
  "afterlife",
  "next life",
  "reincarnation",
  "void",
  "nothingness",
  "blackout",
  "fade away",
  "fade to black",
  "game over",
  "check out",
  "clock out",
  "punch out",
  "permanent solution",
  "final solution",
  "final act",
  "last act",
  "last resort",
  "last option",
  "only option",
  "only way out",
  "way out",
  "exit strategy",
  "exit plan",
  "how to kill",
  "how to die",
  "how to suicide",
  "how to commit suicide",
  "how to hang",
  "how to cut",
  "how to overdose",
  "how to shoot",
  "how to drown",
  "how to poison",
  "how to gas",
  "how to jump",
  "quick death",
  "painless death",
  "easy death",
  "peaceful death",
  "dignified death",
  "right to die",
  "assisted suicide",
  "euthanasia",
  "doctor assisted",
  "physician assisted",
  "voluntary death",
  "self deliverance",
  "self-deliverance",
  "hemlock",
  "pro suicide",
  "pro-suicide",
  "suicide advocate",
  "suicide promotion",
  "suicide encouragement",
  "encourage suicide",
  "encouraging suicide",
  "promote suicide",
  "promoting suicide",
  "glorify suicide",
  "glorifying suicide",
  "romanticize suicide",
  "romanticizing suicide",
  "suicide is painless",
  "suicide is the answer",
  "suicide is solution"
];

export default function ApplicantModule() {
  const { applicantType, setApplicantType, t } = useTone();

  // Mode: 'landing' | 'create' | 'track'
  const [viewMode, setViewMode] = useState<"landing" | "create" | "track">("landing");

  // Creation State
  const [submissionPath, setSubmissionPath] = useState<"free" | "category">("free");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [appealText, setAppealText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({
    "где происходит": "",
    "как давно": "",
    "кто участвует": "",
    "обращался ли к кому-то": ""
  });
  const [emergencyContact, setEmergencyContact] = useState("");
  const [wantsEmergencyContact, setWantsEmergencyContact] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any | null>(null);

  // Live Crisis Detection
  const [showLiveCrisisAlert, setShowLiveCrisisAlert] = useState(false);

  // Track State
  const [trackInput, setTrackInput] = useState("");
  const [trackData, setTrackData] = useState<any | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Feedback State for "Это помогло" / "Это не помогло"
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copiedTrack, setCopiedTrack] = useState(false);

  // Load categories
  useEffect(() => {
    fetch("/api/public/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Error fetching categories:", err));

    // Check if track is saved in localStorage
    const saved = localStorage.getItem("otklik_saved_track");
    if (saved && !trackInput) {
      setTrackInput(saved);
    }
  }, []);

  // Check crisis keywords in real-time
  useEffect(() => {
    const textLower = appealText.toLowerCase();
    const crisisWords = [
      "покончить с собой", "суицид", "не хочу жить", "хочу умереть", "вскрыть вены",
      "порезы на руках", "спрыгнуть с крыши", "угрожают расправой", "угрожает убить",
      "зарежу", "пистолет", "оружие", "избивают", "избили", "насилие", "изнасилование",
      "бьет отец", "бьет мать", "бьет отчим", "шантажируют"
    ];
    const hasCrisis = crisisWords.some((w) => textLower.includes(w));
    setShowLiveCrisisAlert(hasCrisis);
  }, [appealText]);

  // Handle Submit Appeal
  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (BANNED_WORDS.includes(appealText.toLocaleLowerCase())) {
      alert("Вы не одни, телефон доверия: 8-800-2000-122")
      return
    }
    if (appealText.trim().length < 5) {
      alert(t("Пожалуйста, расскажи чуть подробнее о ситуации.", "Пожалуйста, опишите ситуацию подробнее."));
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("applicant_type", applicantType);
      formData.append("initial_text", appealText.trim());
      if (selectedCategoryId) {
        formData.append("category_id", selectedCategoryId.toString());
      }
      formData.append("clarification_answers", JSON.stringify(answers));
      if (wantsEmergencyContact && emergencyContact.trim()) {
        formData.append("emergency_contact", emergencyContact.trim());
      }

      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/public/appeals", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Ошибка при отправке обращения");
      }

      setSubmissionSuccess(data);
      localStorage.setItem("otklik_saved_track", data.track_number);
    } catch (err: any) {
      alert(err.message || "Произошла ошибка при отправке");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Track Lookup
  const handleLookupTrack = async (trackToLookup?: string) => {
    const target = trackToLookup || trackInput.trim();
    if (!target) return;

    setTrackLoading(true);
    setTrackError(null);
    try {
      const res = await fetch(`/api/public/track/${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Обращение не найдено");
      }
      setTrackData(data);
      setViewMode("track");
    } catch (err: any) {
      setTrackError(err.message || "Ошибка проверки номера");
      setTrackData(null);
    } finally {
      setTrackLoading(false);
    }
  };

  // Handle Send Reply in Dialogue
  const handleSendReply = async () => {
    if (!replyText.trim() || !trackData) return;
    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/public/track/${encodeURIComponent(trackData.track_number)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (!res.ok) throw new Error("Не удалось отправить сообщение");
      setReplyText("");
      await handleLookupTrack(trackData.track_number);
    } catch (err: any) {
      alert(err.message || "Ошибка отправки сообщения");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle Reaction: "Это помогло"
  const handleConfirmHelped = async () => {
    if (!trackData) return;
    try {
      const res = await fetch(`/api/public/track/${encodeURIComponent(trackData.track_number)}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reaction: "helped",
          rating: feedbackRating,
          comment: feedbackComment.trim(),
        }),
      });
      if (!res.ok) throw new Error("Не удалось отправить оценку");
      setShowHelpModal(false);
      await handleLookupTrack(trackData.track_number);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Reaction: "Это не помогло"
  const handleConfirmNotHelped = async () => {
    if (!trackData) return;
    try {
      const res = await fetch(`/api/public/track/${encodeURIComponent(trackData.track_number)}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reaction: "not_helped",
          reason: returnReason.trim() || "Ответ не помог решить проблему",
        }),
      });
      if (!res.ok) throw new Error("Не удалось отправить возврат");
      setShowReturnModal(false);
      await handleLookupTrack(trackData.track_number);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrack(true);
    setTimeout(() => setCopiedTrack(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* LANDING / HERO VIEW */}
      {viewMode === "landing" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Supportive Hero */}
          <div className="bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-4 border border-teal-400/20">
                <Shield className="w-3.5 h-3.5" />
                <span>100% Анонимно • Без регистрации • Безопасно</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 leading-tight">
                {t(
                  "Тебе есть кому довериться. Расскажи, что происходит.",
                  "Безопасная платформа доверительных обращений."
                )}
              </h1>
              <p className="text-teal-100/90 text-sm sm:text-base leading-relaxed mb-6">
                {t(
                  "Столкнулся с травлей, угрозами, давлением или трудностями в школе? Здесь тебя не осудят и не раскроют твою личность. Квалифицированные психологи и юристы помогут найти выход.",
                  "Если вы столкнулись с давлением, конфликтом или сложной ситуацией в образовательном процессе — вы можете конфиденциально обратиться за поддержкой профильных специалистов."
                )}
              </p>

              {/* Two Main Entry Points */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setViewMode("create")}
                  className="px-6 py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>{t("Подать обращение", "Направить обращение")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("track")}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base border border-white/20 flex items-center justify-center gap-2 backdrop-blur-xs transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Проверить статус по трек-номеру</span>
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Trust Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Никаких личных данных</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Мы не просим имя, фамилию, школу или телефон. Ваше обращение привязано исключительно к случайному трек-номеру.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Защита метаданных и фото</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Все прикрепляемые скриншоты переписок автоматически очищаются от геолокации и скрытых EXIF-тегов прямо на сервере.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Квалифицированные эксперты</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Психологи, конфликтологи и юристы разбирают каждую ситуацию бережно и дают пошаговые рекомендации.
              </p>
            </div>
          </div>

          {/* Quick Track Input if user already has one */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-2">Уже отправляли обращение?</h3>
            <p className="text-xs text-slate-600 mb-4">
              Введите ваш трек-номер вида <code className="bg-slate-100 px-1.5 py-0.5 rounded text-teal-800 font-mono">ОТК-XXXX-XXXX</code>, чтобы узнать решение или продолжить диалог со специалистом.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="text"
                placeholder="ОТК-XXXX-XXXX"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
              <button
                onClick={() => handleLookupTrack()}
                disabled={trackLoading || !trackInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {trackLoading ? "Проверка..." : "Проверить"}
              </button>
            </div>
            {trackError && (
              <p className="text-xs text-rose-600 mt-2 font-medium">{trackError}</p>
            )}
          </div>
        </div>
      )}

      {/* CREATE APPEAL FLOW (С1, С2, С6) */}
      {viewMode === "create" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Back button */}
          <button
            onClick={() => setViewMode("landing")}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            ← На главную
          </button>

          {/* SUCCESS SCREEN */}
          {submissionSuccess ? (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-teal-200 shadow-sm text-center max-w-xl mx-auto">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
                {submissionSuccess.welcome_message}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mb-6">
                Твоё обращение зарегистрировано в системе. Сохрани трек-номер — это единственный способ получить ответ специалиста:
              </p>

              {/* Track Number Display Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                <div className="text-xs text-slate-500 font-medium mb-1">Ваш секретный трек-номер</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-teal-800 font-mono tracking-wider mb-4">
                  {submissionSuccess.track_number}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => copyToClipboard(submissionSuccess.track_number)}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-all flex items-center gap-1.5"
                  >
                    {copiedTrack ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedTrack ? "Скопировано!" : "Скопировать номер"}</span>
                  </button>
                  <button
                    onClick={() => {
                      const text = `Платформа доверительных обращений «Отклик»\nВаш трек-номер: ${submissionSuccess.track_number}\nДата: ${new Date().toLocaleDateString("ru")}\nСохраните этот номер для проверки статуса обращения.`;
                      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Отклик_номер_${submissionSuccess.track_number}.txt`;
                      a.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать памятку</span>
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-left mb-6 text-xs text-slate-700 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Внимание:</strong> Поскольку платформа полностью анонимна, мы не запрашивали вашу почту. В случае утери трек-номера восстановить доступ к обращению будет невозможно.
                </span>
              </div>

              <button
                onClick={() => {
                  setTrackInput(submissionSuccess.track_number);
                  handleLookupTrack(submissionSuccess.track_number);
                }}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition-all"
              >
                Перейти в диалог по этому обращению
              </button>
            </div>
          ) : (
            /* WIZARD FORM */
            <form onSubmit={handleSubmitAppeal} className="space-y-6">
              {/* Emergency Banner if Crisis words detected */}
              {showLiveCrisisAlert && <EmergencyBanner />}

              {/* Step 1: Tone & Role Switcher */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  1. От чьего лица вы обращаетесь?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setApplicantType("student")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      applicantType === "student"
                        ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Школьник / Ученик</div>
                    <div className="text-xs text-slate-500 mt-0.5">Интерфейс на «ты»</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplicantType("parent")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      applicantType === "parent"
                        ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Родитель</div>
                    <div className="text-xs text-slate-500 mt-0.5">Интерфейс на «вы»</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplicantType("teacher")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      applicantType === "teacher"
                        ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Педагог</div>
                    <div className="text-xs text-slate-500 mt-0.5">Интерфейс на «вы»</div>
                  </button>
                </div>
              </div>

              {/* Step 2: Route Choice (Free text vs Category) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  2. Как {t("тебе", "вам")} удобнее описать ситуацию?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  <button
                    type="button"
                    onClick={() => setSubmissionPath("free")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      submissionPath === "free"
                        ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">
                      {t("Рассказать своими словами", "Описать ситуацию своими словами")}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Если трудно выбрать категорию
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionPath("category")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      submissionPath === "category"
                        ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Выбрать категорию из списка</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Если вы знаете точный характер проблемы
                    </div>
                  </button>
                </div>

                {/* Categories Selector if path is 'category' */}
                {submissionPath === "category" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 animate-fadeIn">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (cat.name.toLowerCase() === "не знаю как назвать") {
                            setSubmissionPath("free");
                            setSelectedCategoryId(cat.id);
                          } else {
                            setSelectedCategoryId(cat.id);
                          }
                        }}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                          selectedCategoryId === cat.id
                            ? "border-teal-600 bg-teal-50 text-teal-900 font-semibold"
                            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50"
                        }`}
                      >
                        <div className="font-bold">{cat.name}</div>
                        {cat.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {cat.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Text Input */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. {t("Расскажи о том, что происходит своими словами", "Опишите вашу ситуацию своими словами")}
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  {t(
                    "Пиши так, как чувствуешь. Никаких формальностей не нужно.",
                    "Опишите обстоятельства, участников и то, какая помощь вам необходима."
                  )}
                </p>
                <textarea
                  rows={5}
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder={t(
                    "Например: ребята из параллельного класса каждый день обзывают меня и не дают спокойно пройти...",
                    "Опишите суть вопроса или конфликта..."
                  )}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Step 4: Clarifying Questions (Optional!) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    4. Уточняющие вопросы (необязательно)
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Можно пропустить</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  {t(
                    "Ответь на те вопросы, на которые готов ответить. Это поможет быстрее подобрать специалиста.",
                    "Ответы на эти вопросы позволят точнее определить специализацию эксперта."
                  )}
                </p>

                <div className="space-y-3.5 text-xs">
                  {/* Where */}
                  <div>
                    <span className="font-semibold text-slate-800 block mb-1">Где это происходит?</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["В классе", "В раздевалке/коридоре", "В интернете / MAX", "По дороге домой", "Дома"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, "где происходит": opt })}
                          className={`px-3 py-1.5 rounded-lg border transition-all ${
                            answers["где происходит"] === opt
                              ? "bg-teal-600 text-white border-teal-600 font-semibold"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* How long */}
                  <div>
                    <span className="font-semibold text-slate-800 block mb-1">Как давно это продолжается?</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Только началось", "Около недели", "Несколько недель", "Полгода и дольше"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, "как давно": opt })}
                          className={`px-3 py-1.5 rounded-lg border transition-all ${
                            answers["как давно"] === opt
                              ? "bg-teal-600 text-white border-teal-600 font-semibold"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Who participates */}
                  <div>
                    <span className="font-semibold text-slate-800 block mb-1">Кто в этом участвует?</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Один сверстник", "Группа одноклассников", "Старшеклассники", "Учитель / Взрослый"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, "кто участвует": opt })}
                          className={`px-3 py-1.5 rounded-lg border transition-all ${
                            answers["кто участвует"] === opt
                              ? "bg-teal-600 text-white border-teal-600 font-semibold"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Attachments (EXIF stripping) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  5. Прикрепить скриншоты или файлы (до 5 файлов)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Скриншоты переписок помогают доказать кибербуллинг и угрозы.
                </p>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-teal-500 transition-all bg-slate-50/50">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(Array.from(e.target.files).slice(0, 5));
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Paperclip className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-teal-700 hover:text-teal-800">
                      Нажмите, чтобы выбрать скриншоты
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, PDF до 10 МБ</span>
                  </label>
                </div>

                {/* Privacy Badge on file upload */}
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Сервер автоматически удалит все геометки (EXIF) и скрытые данные с фото.</span>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        <span>{f.name}</span>
                        <span className="text-slate-400">({(f.size / 1024).toFixed(0)} КБ)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm sm:text-base shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Отправляем безопасно...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{t("Отправить обращение анонимно", "Отправить обращение")}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TRACK STATUS & CHAT DIALOGUE (С5) */}
      {viewMode === "track" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Back button */}
          <button
            onClick={() => setViewMode("landing")}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            ← На главную
          </button>

          {/* If no track data yet, show lookup form */}
          {!trackData ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Проверка статуса обращения</h2>
              <p className="text-xs text-slate-600 mb-4">
                Введите трек-номер обращения в формате <code className="bg-slate-100 px-1.5 py-0.5 rounded text-teal-800 font-mono">ОТК-XXXX-XXXX</code>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  type="text"
                  placeholder="ОТК-XXXX-XXXX"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => handleLookupTrack()}
                  disabled={trackLoading || !trackInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {trackLoading ? "Поиск..." : "Найти"}
                </button>
              </div>
              {trackError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {trackError}
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE APPEAL WORKSPACE FOR APPLICANT */
            <div className="space-y-6">
              {/* Header Box with Status Bar */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Обращение</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-teal-900 font-mono flex items-center gap-2">
                      <span>{trackData.track_number}</span>
                      <button
                        onClick={() => copyToClipboard(trackData.track_number)}
                        title="Скопировать"
                        className="text-slate-400 hover:text-teal-600"
                      >
                        {copiedTrack ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                      {trackData.category_name || "Общее"}
                    </span>
                    {trackData.is_crisis && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">
                        Срочное реагирование
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Timeline Bar */}
                <div className="pt-4">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Текущий статус:
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                    <span>{trackData.status_human}</span>
                  </div>

                  {/* Linear Status Steps */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-50">
                    <div className={["new", "assigned", "in_progress", "needs_clarification", "answer_ready", "completed"].includes(trackData.status) ? "text-teal-700 font-bold" : ""}>
                      1. Получено
                    </div>
                    <div className={["assigned", "in_progress", "needs_clarification", "answer_ready", "completed"].includes(trackData.status) ? "text-teal-700 font-bold" : ""}>
                      2. У специалиста
                    </div>
                    <div className={["in_progress", "needs_clarification", "answer_ready", "completed"].includes(trackData.status) ? "text-teal-700 font-bold" : ""}>
                      3. В работе
                    </div>
                    <div className={["answer_ready", "completed"].includes(trackData.status) ? "text-teal-700 font-bold" : ""}>
                      4. Ответ готов
                    </div>
                  </div>
                </div>
              </div>

              {/* REACTION SECTION (Ветка «Это помогло» / «Это не помогло») */}
              {trackData.status === "answer_ready" && (
                <div className="bg-teal-50/80 border-2 border-teal-300/80 rounded-2xl p-5 shadow-xs animate-fadeIn">
                  <h3 className="font-bold text-teal-950 text-sm sm:text-base mb-1">
                    Специалист подготовил рекомендации!
                  </h3>
                  <p className="text-xs sm:text-sm text-teal-900 mb-4">
                    Пожалуйста, ознакомься с ответом ниже и отметь, помогли ли данные советы разрешить ситуацию:
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowHelpModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Это помогло</span>
                    </button>

                    {trackData.can_return && (
                      <button
                        onClick={() => setShowReturnModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>Это не помогло (доработать)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CHAT THREAD WITH SPECIALIST («Единый голос») */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Защищенная переписка со специалистом
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Единый голос сервиса
                  </span>
                </div>

                <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
                  {trackData.messages.map((msg: any) => {
                    const isUser = msg.sender_type === "applicant";
                    const isSystem = msg.sender_type === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center my-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] bg-slate-100 text-slate-600">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div className="text-[11px] text-slate-400 font-medium mb-1 px-1">
                          {isUser ? "Вы" : msg.sender_display_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div
                          className={`max-w-lg p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? "bg-teal-600 text-white rounded-tr-none shadow-xs"
                              : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/80"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Box */}
                {trackData.status !== "completed" && trackData.status !== "rejected" && (
                  <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("Напиши уточнение или ответ специалисту...", "Введите ваш ответ специалисту...")}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendReply();
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Отправить</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODAL: "ЭТО ПОМОГЛО" (Rating & Feedback) */}
          {showHelpModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-scaleUp">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ThumbsUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Рады, что смогли помочь!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Пожалуйста, оцени работу специалиста, чтобы мы становились лучше:
                  </p>
                </div>

                {/* 5-star rating */}
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`p-1 transition-all ${
                        feedbackRating >= star ? "text-amber-400 scale-110" : "text-slate-200"
                      }`}
                    >
                      <Star className="w-7 h-7 fill-current" />
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Ваш отзыв (необязательно)..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none mb-4"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmHelped}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                  >
                    Завершить обращение
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: "ЭТО НЕ ПОМОГЛО" (Return to Operator) */}
          {showReturnModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-scaleUp">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ThumbsDown className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Что пошло не так?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Обращение вернётся оператору. Он изучит ситуацию и при необходимости назначит другого эксперта.
                  </p>
                </div>

                <textarea
                  rows={4}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Расскажите, чего именно не хватило в ответе или почему совет не сработал..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none mb-4"
                  required
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmNotHelped}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                  >
                    Вернуть оператору
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
