import React from 'react';
import { ShieldCheck, TrendingUp, Users, Target, CalendarClock, DollarSign, Activity } from 'lucide-react';
import { Matter } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface AnalyticsModuleProps {
  activeMatter: Matter;
}

export default function AnalyticsModule({ activeMatter }: AnalyticsModuleProps) {
  const { t, isRtl } = useLanguage();
  // Compute some metrics
  const budgetRatio = Math.min(100, Math.round((activeMatter.expenses / activeMatter.budget) * 100));
  const remainingBudget = activeMatter.budget - activeMatter.expenses;
  const staffRatio = activeMatter.riskLevel === 'High' ? 85 : activeMatter.riskLevel === 'Medium' ? 60 : 35;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6" id="analytics-bento-grid">
      
      {/* 1. Risk Factor Block (Bento-style deep indigo) */}
      <div className="bg-indigo-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col text-white justify-between min-h-[140px] md:min-h-[160px] relative overflow-hidden md:col-span-1">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-800/30 rounded-full blur-xl pointer-events-none" />
        <div className="flex justify-between items-start mb-2 sm:mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">{t.riskFactorIndex}</span>
          <div className="px-2 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] uppercase font-bold text-indigo-100">
            {activeMatter.riskLevel === 'High' ? (isRtl ? 'مرتفع' : 'High') : activeMatter.riskLevel === 'Medium' ? (isRtl ? 'متوسط' : 'Medium') : (isRtl ? 'منخفض' : 'Low')}
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display">
            {activeMatter.riskLevel === 'High' ? '74.2%' : activeMatter.riskLevel === 'Medium' ? '38.5%' : '14.8%'}
          </div>
          <p className="text-[11px] text-indigo-200 mt-1 leading-relaxed">
            {t.riskFactorDesc}
          </p>
        </div>
      </div>

      {/* 2. Staff Resource Allocation Map */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col justify-between min-h-[140px] md:min-h-[160px] md:col-span-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.resourceAllocation}</span>
          <Users className="w-4.5 h-4.5 text-indigo-600" />
        </div>
        <div className="space-y-1.5 sm:space-y-2 mt-2 sm:mt-4">
          <div className="h-2 sm:h-2.5 bg-slate-100 rounded-full w-full overflow-hidden">
            <div className="h-2 sm:h-2.5 bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${staffRatio}%` }} />
          </div>
          <div className="h-2 sm:h-2.5 bg-slate-100 rounded-full w-full overflow-hidden">
            <div className="h-2 sm:h-2.5 bg-indigo-500 rounded-full opacity-60 transition-all duration-500" style={{ width: `${Math.max(20, staffRatio - 15)}%` }} />
          </div>
          <div className="h-2 sm:h-2.5 bg-slate-100 rounded-full w-full overflow-hidden">
            <div className="h-2 sm:h-2.5 bg-indigo-500 rounded-full opacity-30 transition-all duration-500" style={{ width: `${Math.max(10, staffRatio - 35)}%` }} />
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-center font-bold mt-1.5 sm:mt-2">
          {t.allocatedStaff}: {activeMatter.riskLevel === 'High' ? '6/8' : '3/8'}
        </p>
      </div>

      {/* 3. Primary Goal Saturation Indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500 min-h-[140px] md:min-h-[160px] md:col-span-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.primaryObjective}</span>
          <Target className="w-4.5 h-4.5 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-800 font-display">{t.contractSaturation}</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            {isRtl ? `تأمين معدل امتثال بنسبة ${activeMatter.winProbability}% لمتطلبات ما قبل المحاكمة وجلسة الاكتشاف.` : `Ensure ${activeMatter.winProbability}% compliance rating by pre-trial discovery hearing.`}
          </p>
        </div>
      </div>

      {/* 4. Financial Health Monitor */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col justify-between min-h-[140px] md:min-h-[160px] md:col-span-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.pleadingCapStatus}</span>
          <Activity className="w-4.5 h-4.5 text-indigo-600" />
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800 font-mono">
            {remainingBudget.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t.budgetBalance}</p>
          <div className="flex items-center gap-1.5 mt-2 sm:mt-3">
            <span className={`w-2.5 h-2.5 rounded-full ${budgetRatio > 75 ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-semibold text-slate-500">{budgetRatio}% {t.budgetExhausted}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
