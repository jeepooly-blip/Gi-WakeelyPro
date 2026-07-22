import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Clock, Receipt, Play, Square, Plus, RefreshCw, Check, CheckCircle2, TrendingUp, Landmark } from 'lucide-react';
import { TimeEntry, Invoice, Matter } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { translateStaticText } from '../lib/i18n';
import { saveItemsToOfflineStore, getByMatterIdFromOfflineStore, STORES } from '../lib/offlineStorage';

interface BillingModuleProps {
  activeMatter: Matter;
  onRefreshMatter: () => void;
}

export default function BillingModule({ activeMatter, onRefreshMatter }: BillingModuleProps) {
  const { t, isRtl } = useLanguage();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual Time form
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualRate, setManualRate] = useState(150);
  const [savingTime, setSavingTime] = useState(false);

  // Dynamic Stopwatch State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const res = await fetch(`/api/matters/${activeMatter.id}/billing`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.timeEntries || []);
        setInvoices(data.invoices || []);
        if (data.timeEntries) {
          await saveItemsToOfflineStore(STORES.TIME_ENTRIES, data.timeEntries);
        }
        if (data.invoices) {
          await saveItemsToOfflineStore(STORES.INVOICES, data.invoices);
        }
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.warn("Loading billing data from IndexedDB cache:", err);
      const cachedEntries = await getByMatterIdFromOfflineStore<TimeEntry>(STORES.TIME_ENTRIES, activeMatter.id);
      const cachedInvoices = await getByMatterIdFromOfflineStore<Invoice>(STORES.INVOICES, activeMatter.id);
      if (cachedEntries) setEntries(cachedEntries);
      if (cachedInvoices) setInvoices(cachedInvoices);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
    // Clean up timer on unmount
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeMatter.id]);

  // Stopwatch controls
  const handleStartTimer = () => {
    setTimerRunning(true);
    setTimerSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopTimer = async () => {
    setTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const elapsedHours = Number((timerSeconds / 3600).toFixed(2));
    if (elapsedHours < 0.01) {
      alert(isRtl ? "تنبيه: الوقت المسجل قصير جداً ليتم قيده (أقل من ٣٠ ثانية)." : "Timer was too short to record (< 30 seconds).");
      setTimerSeconds(0);
      return;
    }

    const desc = prompt(
      isRtl 
        ? "تم تسجيل الوقت عبر ساعة التتبع! يرجى إدخال وصف مبسط للعمل المنجز:" 
        : "Stopwatch Recorded! Enter description for this time block:", 
      isRtl ? "مراجعة ملف القضية وبنود الادعاء" : "Review of Case Materials"
    );
    if (desc === null) return; // cancelled

    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId: activeMatter.id,
          description: desc || (isRtl ? "عمل مقيد بساعة التتبع" : "Logged via Stopwatch"),
          hours: elapsedHours,
          rate: manualRate
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(prev => [data, ...prev]);
        setTimerSeconds(0);
        onRefreshMatter(); // Refresh expenses
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCreateTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHours || !manualDesc) return;

    setSavingTime(true);
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId: activeMatter.id,
          description: manualDesc,
          hours: Number(manualHours),
          rate: Number(manualRate)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(prev => [data, ...prev]);
        setShowTimeForm(false);
        setManualHours('');
        setManualDesc('');
        onRefreshMatter();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTime(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId: activeMatter.id })
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(prev => [data, ...prev]);
        // Re-fetch billing entries because they are now marked as billed
        fetchBilling();
        onRefreshMatter();
      } else {
        const errData = await res.json();
        alert(errData.error || (isRtl ? "لا يمكن إصدار فاتورة جديدة حالياً." : "Cannot generate invoice."));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkInvoicePaid = async (invId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid', paymentTxId: `TXN-CLIQU-${Math.floor(1000 + Math.random() * 9000)}` })
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices(prev => prev.map(inv => inv.id === invId ? updated : inv));
        onRefreshMatter();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getInvoiceStatusLocalized = (status: string) => {
    if (!isRtl) return status;
    switch (status) {
      case 'Draft': return 'مسودة';
      case 'Sent': return 'مُرسلة';
      case 'Paid': return 'مدفوعة';
      default: return status;
    }
  };

  const unbilledHours = entries.filter(e => !e.billed).reduce((acc, curr) => acc + curr.hours, 0);
  const unbilledAmount = entries.filter(e => !e.billed).reduce((acc, curr) => acc + (curr.hours * curr.rate), 0);
  const totalBilled = invoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col h-full gap-3.5 sm:gap-5" id="billing-module">
      {/* Module Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">{t.billingTitle}</h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">
          {isRtl ? 'الأرقام بالدينار الأردني JOD' : 'Billed in JOD'}
        </span>
      </div>

      {/* Trust Ledger & Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t.unbilledLedger}</span>
            <span className="text-xl font-bold text-slate-800 font-display mt-1 block">{unbilledAmount.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-2 block">{unbilledHours.toFixed(1)} {t.outstanding}</span>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">{t.sentInvoices}</span>
            <span className="text-xl font-bold text-indigo-900 font-display mt-1 block">{totalBilled.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}</span>
          </div>
          <button
            onClick={handleGenerateInvoice}
            disabled={unbilledAmount === 0}
            className="mt-2 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all text-center disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            {t.generateInvoice}
          </button>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">{t.trustFunds}</span>
            <span className="text-xl font-bold text-emerald-700 font-display mt-1 block">{totalPaid.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-2 block">{t.realization}: {totalBilled > 0 ? ((totalPaid/totalBilled)*100).toFixed(0) : 100}%</span>
        </div>
      </div>

      {/* Stopwatch & Manual Entry Row */}
      <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Dynamic Stopwatch */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 rounded-xl bg-indigo-100/50 text-indigo-600">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-[120px]">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t.stopwatchTitle}</span>
            <span className="text-base font-extrabold text-slate-700 font-mono mt-0.5 block">
              {formatTimer(timerSeconds)}
            </span>
          </div>

          <div className="flex gap-2 ml-4">
            {!timerRunning ? (
              <button
                onClick={handleStartTimer}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> {t.startActive}
              </button>
            ) : (
              <button
                onClick={handleStopTimer}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-red-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-white" /> {t.stopLog}
              </button>
            )}
          </div>
        </div>

        {/* Trigger manual input */}
        <button
          onClick={() => setShowTimeForm(!showTimeForm)}
          className="text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl shadow-sm cursor-pointer shrink-0 w-full md:w-auto text-center"
        >
          {showTimeForm ? (isRtl ? 'إخفاء الإدخال اليدوي' : 'Hide Manual Log') : t.manualLogBtn}
        </button>
      </div>

      {/* Manual log Form */}
      {showTimeForm && (
        <form onSubmit={handleCreateTimeEntry} className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.timeEntryDesc}</label>
              <input
                type="text"
                required
                placeholder={isRtl ? "مثال: مراجعة وصياغة بنود مذكرة الدفاع لمركز التحكيم" : "e.g. Defense drafting for SCCA Arbitration tribunal"}
                value={manualDesc}
                onChange={e => setManualDesc(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.logHoursLabel}</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="2.5"
                value={manualHours}
                onChange={e => setManualHours(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowTimeForm(false)}
              className="px-3.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={savingTime}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {savingTime && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />}
              {t.saveTime}
            </button>
          </div>
        </form>
      )}

      {/* List grids: Left Side (Time entries list) | Right Side (Invoices list) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[320px] overflow-hidden">
        {/* Time ledger */}
        <div className="overflow-y-auto pr-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{t.hoursLogged}</span>
          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                {t.emptyTimeLedger}
              </p>
            ) : (
              entries.map(te => (
                <div key={te.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-700 leading-snug">{translateStaticText(te.description, isRtl)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {te.date} • {te.hours} {isRtl ? 'ساعة' : 'hrs'} @ {te.rate} {isRtl ? 'د.أ' : 'JOD'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider shrink-0 ${
                    te.billed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {te.billed ? (isRtl ? 'مفوترة' : 'Invoiced') : (isRtl ? 'معلقة' : 'Pending')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoices List */}
        <div className="overflow-y-auto pr-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            {isRtl ? 'سجل الفواتير وصرف المبالغ' : 'Disbursement & Invoices History'}
          </span>
          <div className="space-y-2">
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                {t.emptyInvoiceHistory}
              </p>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex justify-between items-center text-xs shadow-sm">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">{inv.invoiceNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide ${
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === 'Sent' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {getInvoiceStatusLocalized(inv.status)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {isRtl ? 'استحقاق' : 'Due'}: {inv.dueDate} • {isRtl ? 'المبلغ' : 'Sum'}: <span className="text-slate-600 font-bold">{inv.totalAmount.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}</span>
                    </p>
                    {inv.paymentTxId && (
                      <p className="text-[9px] text-emerald-600 font-mono mt-0.5">ClIQ: {inv.paymentTxId}</p>
                    )}
                  </div>

                  {inv.status !== 'Paid' && (
                    <button
                      onClick={() => handleMarkInvoicePaid(inv.id)}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg font-bold text-[10px] uppercase hover:bg-emerald-100 transition-all cursor-pointer shrink-0"
                    >
                      {t.clearPayment}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
