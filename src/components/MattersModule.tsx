import React, { useState } from 'react';
import { Landmark, Briefcase, TrendingUp, AlertTriangle, Scale, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { Matter } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { translateStaticText } from '../lib/i18n';

interface MattersModuleProps {
  activeMatter: Matter;
  onMatterUpdated: (updated: Matter) => void;
}

interface RiskAnalysisResult {
  riskSummary: string;
  keyChallenges: string[];
  strategyRecommendations: string[];
  riskScore: number;
  winProbability: number;
}

export default function MattersModule({ activeMatter, onMatterUpdated }: MattersModuleProps) {
  const { t, isRtl } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId: activeMatter.id })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        // Sync win probability back to main app state
        onMatterUpdated({
          ...activeMatter,
          winProbability: data.winProbability
        });
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to analyze risk.");
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Localize risk label
  const getRiskLabel = (level: string) => {
    if (level === 'High') return isRtl ? 'مرتفع' : 'High';
    if (level === 'Medium') return isRtl ? 'متوسط' : 'Medium';
    return isRtl ? 'منخفض' : 'Low';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col h-full gap-3 sm:gap-5" id="matters-module">
      {/* Title & Metadata Header */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Scale className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.caseProfile}</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display leading-snug">{translateStaticText(activeMatter.title, isRtl)}</h3>
          </div>
        </div>
        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold uppercase rounded-xl tracking-wider ${
          activeMatter.riskLevel === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
          activeMatter.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
          'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {getRiskLabel(activeMatter.riskLevel)} {t.riskLevel}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans bg-slate-50/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100/60">
        {translateStaticText(activeMatter.description, isRtl)}
      </p>

      {/* Grid of Custom Fields (Bento-style inside component) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-slate-50/30 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.jurisdiction}</span>
          <span className="text-xs font-semibold text-slate-700 mt-1 leading-normal">{translateStaticText(activeMatter.jurisdiction, isRtl)}</span>
        </div>
        
        <div className="bg-slate-50/30 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.judge}</span>
          <span className="text-xs font-semibold text-slate-700 mt-1 leading-normal">{translateStaticText(activeMatter.judge, isRtl)}</span>
        </div>

        <div className="bg-slate-50/30 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.opposingCounsel}</span>
          <span className="text-xs font-semibold text-slate-700 mt-1 leading-normal">{(activeMatter.opposingCounsel ? translateStaticText(activeMatter.opposingCounsel, isRtl) : null) || (isRtl ? 'لا يوجد خصم معلن' : 'None Declared')}</span>
        </div>

        <div className="bg-slate-50/30 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.statuteDeadline}</span>
          <span className="text-xs font-semibold text-red-500 font-mono mt-1">{activeMatter.statuteDeadline || (isRtl ? 'غير محدد' : 'None Set')}</span>
        </div>
      </div>

      {/* Core Dynamic Stats: Budget and Success Rate */}
      <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-4 my-2">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">{t.budgetCap}</span>
          <span className="text-2xl font-bold text-slate-800 font-display mt-0.5 block">{activeMatter.budget.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}</span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-indigo-500 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, (activeMatter.expenses / activeMatter.budget) * 100)}%` }} 
            />
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-1 block">{t.spent}: {activeMatter.expenses.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">{t.winProb}</span>
          <span className={`text-2xl font-bold font-display mt-0.5 block ${
            activeMatter.winProbability >= 70 ? 'text-emerald-500' :
            activeMatter.winProbability >= 50 ? 'text-amber-500' : 'text-red-500'
          }`}>{activeMatter.winProbability}%</span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${
                activeMatter.winProbability >= 70 ? 'bg-emerald-500' :
                activeMatter.winProbability >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${activeMatter.winProbability}%` }} 
            />
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-1 block">{t.aiStrategy}</span>
        </div>
      </div>

      {/* AI Risk Assessment Action Card */}
      <div className="bg-indigo-900 rounded-3xl p-5 text-white flex flex-col gap-3 relative overflow-hidden mt-auto">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-800/40 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-1.5 text-indigo-200">
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span className="text-xs font-bold uppercase tracking-widest">{t.sccaEngine}</span>
          </div>
          <button
            onClick={handleRunAiAnalysis}
            disabled={analyzing}
            className="px-3.5 py-1.5 bg-white text-indigo-900 rounded-xl text-xs font-bold shadow-md hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-900" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            {t.analyzeBtn}
          </button>
        </div>

        <div>
          <h4 className="text-base font-bold font-display">{t.simulateTitle}</h4>
          <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
            {t.simulateDesc}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-100 text-xs p-2.5 rounded-xl mt-1">
            {error}
          </div>
        )}

        {analysis && (
          <div className="bg-white/10 border border-white/15 p-4 rounded-2xl text-xs flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">{t.aiCoreFindings}</span>
              <p className="mt-1 leading-relaxed text-indigo-50">{analysis.riskSummary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-200 block">{t.riskIndex}</span>
                <span className="text-base font-extrabold text-white">{analysis.riskScore}/100</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-200 block">{t.successRatio}</span>
                <span className="text-base font-extrabold text-emerald-300">{analysis.winProbability}%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <span className="text-[9px] uppercase font-bold text-indigo-200 block mb-1">{t.strategyDirectives}</span>
              <ul className="space-y-1 text-[11px] text-indigo-100">
                {analysis.strategyRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
