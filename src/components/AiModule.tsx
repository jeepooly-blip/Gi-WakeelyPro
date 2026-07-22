import React, { useState } from 'react';
import { Sparkles, FileText, Download, Copy, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { Matter } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface AiModuleProps {
  activeMatter: Matter;
}

export default function AiModule({ activeMatter }: AiModuleProps) {
  const { t, isRtl } = useLanguage();
  const [draftType, setDraftType] = useState('Demand Letter');
  const [customInstructions, setCustomInstructions] = useState('');
  const [draftText, setDraftText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId: activeMatter.id,
          type: draftType,
          details: customInstructions,
          lang: isRtl ? 'ar' : 'en' // Pass chosen language to generator backend
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDraftText(data.draft);
      } else {
        const errData = await res.json();
        setError(errData.error || (isRtl ? "فشل الذكاء الاصطناعي في توليد المسودة." : "Failed to generate legal draft."));
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Localized template options
  const templateOptions = [
    { name: t.demandNotice, value: 'Formal Demand Notice' },
    { name: t.settlementAccord, value: 'Settlement Accord' },
    { name: t.arbitrationPetition, value: 'SCCA Arbitration Petition' },
    { name: t.statementDefense, value: 'Statement of Defense Pleading' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col h-full gap-3.5 sm:gap-5" id="ai-copilot-module">
      {/* Module Title */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 fill-indigo-100 shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">{t.aiCopilotTitle}</h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
          {t.poweredBy}
        </span>
      </div>

      {/* Main Grid: Options Form Left | Draft Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6 flex-grow overflow-hidden">
        {/* Left Side: Drafting Configs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.draftTemplate}</label>
            <div className="grid grid-cols-2 gap-2">
              {templateOptions.map(tpl => (
                <button
                  key={tpl.value}
                  type="button"
                  onClick={() => setDraftType(tpl.value)}
                  className={`p-3 text-xs font-semibold rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                    isRtl ? 'text-right' : 'text-left'
                  } ${
                    draftType === tpl.value
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 text-slate-600'
                  }`}
                >
                  <FileText className={`w-4 h-4 mb-2 ${draftType === tpl.value ? 'text-indigo-200' : 'text-slate-400'}`} />
                  <span>{tpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.draftDirectives}</label>
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder={t.draftDirectivesPlaceholder}
              rows={4}
              className="w-full text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 leading-normal"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerateDraft}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white animate-spin shrink-0" />
                <span>{isRtl ? 'جاري صياغة النص من جيمي...' : 'Gemini Generating Draft...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                <span>{t.draftBtn}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Draft Text Output in Parchment Viewport */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-3xl p-5 overflow-hidden min-h-[350px]">
          {draftText ? (
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">{t.draftReady}</span>
                  <p className="text-xs font-bold text-slate-700">
                    {templateOptions.find(o => o.value === draftType)?.name || draftType}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyToClipboard}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 shadow-sm transition-all text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t.copiedBtn : t.copyBtn}</span>
                  </button>
                </div>
              </div>

              {/* Text Area Mock Parchment scroll */}
              <div 
                className="flex-grow overflow-y-auto max-h-[350px] bg-white border border-slate-100 p-5 rounded-2xl shadow-inner text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line"
                style={{ direction: isRtl ? 'rtl' : 'ltr' }}
              >
                {draftText}
              </div>

              <span className="text-[9px] text-slate-400 text-center uppercase tracking-widest font-bold font-mono">
                {t.draftLegalNotes}
              </span>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-400 py-10 gap-2">
              <FileText className="w-12 h-12 text-slate-300" />
              <p className="text-xs">{t.noDraftPrompt}</p>
              <p className="text-[10px] text-slate-400">{isRtl ? 'جميع المستندات المصاغة تتبع البناء القانوني المعتمد في الشرق الأوسط.' : 'All drafts use formal Middle Eastern judicial structures.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
