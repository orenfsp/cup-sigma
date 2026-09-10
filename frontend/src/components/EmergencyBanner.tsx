"use client";

import React from "react";
import { PhoneCall, ShieldAlert, HeartHandshake } from "lucide-react";
import { useTone } from "@/context/ToneContext";

interface EmergencyBannerProps {
  compact?: boolean;
}

export default function EmergencyBanner({ compact = false }: EmergencyBannerProps) {
  const { t } = useTone();

  return (
    <aside
      aria-label="Экстренная и кризисная помощь"
      className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 text-slate-800 backdrop-blur-xs transition-all animate-fadeIn"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
          <HeartHandshake className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-slate-900 text-sm sm:text-base">
              {t("Ты в безопасности. Помощь рядом в любую секунду", "Вы в безопасности. Помощь доступна круглосуточно")}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Бесплатно и анонимно
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-3 leading-relaxed">
            {t(
              "Если тебе прямо сейчас угрожают, есть опасность для жизни или очень тяжело на душе — не оставайся один. Специалисты горячей линии готовы выслушать тебя прямо сейчас:",
              "Если ситуация требует экстренного вмешательства или существует угроза жизни и здоровью — незамедлительно свяжитесь с профильными службами:"
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <a
              href="tel:88002000122"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/60 hover:border-amber-300 hover:shadow-xs transition-all text-xs sm:text-sm group"
            >
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Детский телефон доверия</div>
                <div className="font-bold text-teal-700 group-hover:text-teal-800 text-sm">8-800-2000-122</div>
              </div>
              <PhoneCall className="w-4 h-4 text-teal-600 shrink-0" />
            </a>

            <a
              href="tel:112"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/60 hover:border-amber-300 hover:shadow-xs transition-all text-xs sm:text-sm group"
            >
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Единая служба спасения</div>
                <div className="font-bold text-rose-700 group-hover:text-rose-800 text-sm">112</div>
              </div>
              <PhoneCall className="w-4 h-4 text-rose-600 shrink-0" />
            </a>

            <a
              href="tel:051"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/60 hover:border-amber-300 hover:shadow-xs transition-all text-xs sm:text-sm group"
            >
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Неотложная психопомощь</div>
                <div className="font-bold text-indigo-700 group-hover:text-indigo-800 text-sm">051 / +7 495 051</div>
              </div>
              <PhoneCall className="w-4 h-4 text-indigo-600 shrink-0" />
            </a>
          </div>

          <div className="mt-3 text-[11px] text-slate-600 italic">
            * {t("Твой рассказ здесь не прерывается — ты можешь продолжить писать обращение в своём темпе.", "Вы можете продолжать заполнение обращения в комфортном для вас темпе.")}
          </div>
        </div>
      </div>
    </aside>
  );
}
