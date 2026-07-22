import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MattersModule from './components/MattersModule';
import DocumentsModule from './components/DocumentsModule';
import TasksModule from './components/TasksModule';
import BillingModule from './components/BillingModule';
import AiModule from './components/AiModule';
import ClientPortal from './components/ClientPortal';
import AnalyticsModule from './components/AnalyticsModule';
import { Matter } from './types';
import { RefreshCw, Scale, Sparkles, FolderOpen, CalendarClock, WifiOff, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './lib/LanguageContext';
import { saveItemsToOfflineStore, getAllFromOfflineStore, STORES } from './lib/offlineStorage';

export default function App() {
  const { t, isRtl } = useLanguage();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [activeMatterId, setActiveMatterId] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<'Lawyer' | 'Client'>('Lawyer');
  const [loading, setLoading] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'all' | 'analytics' | 'tasks' | 'docs' | 'ai'>('all');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [usingCachedData, setUsingCachedData] = useState<boolean>(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchMatters();
    };
    const handleOffline = () => {
      setIsOffline(true);
      fetchMatters();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleMobileTab = (e: any) => {
      if (e.detail) {
        setActiveMobileTab(e.detail);
      }
    };
    window.addEventListener('mobile-tab-changed', handleMobileTab);
    return () => window.removeEventListener('mobile-tab-changed', handleMobileTab);
  }, []);

  // Fetch initial matters from Express server or fall back to IndexedDB
  const fetchMatters = async () => {
    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }

      const res = await fetch('/api/matters');
      if (res.ok) {
        const data: Matter[] = await res.json();
        setMatters(data);
        setUsingCachedData(false);
        if (data.length > 0 && !activeMatterId) {
          setActiveMatterId(data[0].id);
        }
        // Save to IndexedDB cache for offline availability
        await saveItemsToOfflineStore(STORES.MATTERS, data);
      } else {
        throw new Error('API server returned error');
      }
    } catch (err) {
      console.warn("API load failed or offline, loading from IndexedDB offline storage:", err);
      const cachedMatters = await getAllFromOfflineStore<Matter>(STORES.MATTERS);
      if (cachedMatters && cachedMatters.length > 0) {
        setMatters(cachedMatters);
        setUsingCachedData(true);
        if (!activeMatterId) {
          setActiveMatterId(cachedMatters[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatters();
  }, []);

  const handleNewMatterCreated = (newMatter: Matter) => {
    setMatters(prev => [...prev, newMatter]);
    setActiveMatterId(newMatter.id);
    saveItemsToOfflineStore(STORES.MATTERS, newMatter);
  };

  const handleMatterUpdated = (updatedMatter: Matter) => {
    setMatters(prev => prev.map(m => m.id === updatedMatter.id ? updatedMatter : m));
  };

  const handleRefreshMatter = () => {
    fetchMatters();
  };

  const activeMatter = matters.find(m => m.id === activeMatterId);

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-500 font-display">
          {isRtl ? 'جاري تحضير ملفات واكيلي برو وقيد القضايا...' : 'Initializing Wakeely Pro Case Files...'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-2 sm:p-4 md:p-8 pb-24 lg:pb-8 text-slate-900 font-sans flex flex-col justify-between" id="app-root">
      
      {/* Offline Status Alert Banner */}
      {(isOffline || usingCachedData) && (
        <div className="mb-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{t.offlineModeActive}:</strong> {t.offlineCachedNotice}
            </span>
          </div>
          <button
            onClick={() => fetchMatters()}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0"
          >
            {isRtl ? 'إعادة المحاولة' : 'Retry Connection'}
          </button>
        </div>
      )}

      {/* 1. Header Profile Widget */}
      <Header
        currentMode={currentMode}
        onModeChange={(mode) => setCurrentMode(mode)}
        matters={matters}
        activeMatterId={activeMatterId}
        onActiveMatterChange={(id) => setActiveMatterId(id)}
        onNewMatterCreated={handleNewMatterCreated}
      />

      {/* Main Panel Controller */}
      {activeMatter ? (
        <main className="flex-grow flex flex-col gap-3 sm:gap-4 md:gap-8">
          {currentMode === 'Lawyer' ? (
            /* LAWYER WORKSPACE GRID */
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-6" id="lawyer-workspace">
              
              {/* Row 1: Key Performance Metrics & Statistics */}
              <div id="analytics-module" className={activeMobileTab !== 'all' && activeMobileTab !== 'analytics' ? 'hidden lg:block' : 'block'}>
                <AnalyticsModule activeMatter={activeMatter} />
              </div>

              {/* Row 2: Two major bento panels (Matter Details vs Kanban Workflows) */}
              <div id="tasks-module" className={activeMobileTab !== 'all' && activeMobileTab !== 'tasks' ? 'hidden lg:block' : 'block'}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
                  <div className="xl:col-span-4">
                    <MattersModule 
                      activeMatter={activeMatter} 
                      onMatterUpdated={handleMatterUpdated}
                    />
                  </div>
                  <div className="xl:col-span-8">
                    <TasksModule matterId={activeMatter.id} />
                  </div>
                </div>
              </div>

              {/* Row 3: Documents and Billing Operations */}
              <div id="documents-module" className={activeMobileTab !== 'all' && activeMobileTab !== 'docs' ? 'hidden lg:block' : 'block'}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
                  <div className="xl:col-span-6">
                    <DocumentsModule 
                      matterId={activeMatter.id} 
                      onRefreshExpenses={handleRefreshMatter}
                    />
                  </div>
                  <div className="xl:col-span-6">
                    <BillingModule 
                      activeMatter={activeMatter} 
                      onRefreshMatter={handleRefreshMatter}
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: AI Pleading Copilot */}
              <div id="ai-module" className={activeMobileTab !== 'all' && activeMobileTab !== 'ai' ? 'hidden lg:block' : 'block'}>
                <AiModule activeMatter={activeMatter} />
              </div>

            </div>
          ) : (
            /* CLIENT WORKSPACE PORTAL */
            <ClientPortal 
              activeMatter={activeMatter} 
              onRefreshMatter={handleRefreshMatter}
            />
          )}
        </main>
      ) : (
        <div className="flex-grow bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center gap-4">
          <FolderOpen className="w-16 h-16 text-slate-300 animate-pulse" />
          <h3 className="text-xl font-bold font-display text-slate-700">
            {isRtl ? 'لا توجد قضية مفتوحة' : 'No Case Files Open'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
            {isRtl 
              ? 'يرجى قيد ملف قضية جديد أو تحديد نزاع تجاري نشط من القائمة العلوية للبدء.' 
              : 'Create an intake file or select an active commercial matter from the header dropdown to begin.'}
          </p>
        </div>
      )}

      {/* 3. System Footer */}
      <footer className="mt-8 pt-6 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em] gap-3">
        <span>{t.firmHash}</span>
        <span className="text-center">{t.copyright}</span>
        <span>{t.matrixVer}</span>
      </footer>

    </div>
  );
}
