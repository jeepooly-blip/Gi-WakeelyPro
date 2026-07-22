import React, { useState, useEffect } from 'react';
import { Calendar, User, CheckCircle2, Circle, Clock, Eye, EyeOff, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Task } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { translateStaticText } from '../lib/i18n';
import { saveItemsToOfflineStore, getByMatterIdFromOfflineStore, STORES } from '../lib/offlineStorage';

interface TasksModuleProps {
  matterId: string;
}

export default function TasksModule({ matterId }: TasksModuleProps) {
  const { t, isRtl } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // New Task form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('Farah Al-Sabah');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Localize Stage columns
  const STAGES: Task['status'][] = ['To Do', 'In Progress', 'Under Review', 'Completed'];

  const getStageLocalized = (stage: Task['status']) => {
    if (!isRtl) return stage;
    switch (stage) {
      case 'To Do': return 'قيد التخطيط';
      case 'In Progress': return 'قيد التنفيذ';
      case 'Under Review': return 'تحت المراجعة';
      case 'Completed': return 'تم إنجازها';
      default: return stage;
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const res = await fetch(`/api/matters/${matterId}/tasks`);
      if (res.ok) {
        const data: Task[] = await res.json();
        setTasks(data);
        await saveItemsToOfflineStore(STORES.TASKS, data);
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.warn("Loading tasks from IndexedDB cache:", err);
      const cached = await getByMatterIdFromOfflineStore<Task>(STORES.TASKS, matterId);
      if (cached && cached.length > 0) {
        setTasks(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const handleUpdate = () => {
      fetchTasks();
    };
    window.addEventListener('tasks-updated', handleUpdate);
    return () => {
      window.removeEventListener('tasks-updated', handleUpdate);
    };
  }, [matterId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          title,
          description,
          assignedTo,
          dueDate: dueDate || new Date().toISOString().split('T')[0],
          priority,
          visibleToClient,
          status: 'To Do'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => [...prev, data]);
        setShowForm(false);
        // Reset
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('Medium');
        setVisibleToClient(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskClientVisibility = async (task: Task) => {
    const updatedVisible = !task.visibleToClient;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleToClient: updatedVisible })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, visibleToClient: updatedVisible } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityLocalized = (p: string) => {
    if (!isRtl) return p;
    switch (p) {
      case 'High': return 'عالية';
      case 'Medium': return 'متوسطة';
      case 'Low': return 'منخفضة';
      default: return p;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm flex flex-col h-full gap-3.5 sm:gap-5" id="tasks-module">
      {/* Module Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">{t.workflowTitle}</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.addTask}
        </button>
      </div>

      {/* Task Creation Form Dropdown */}
      {showForm && (
        <form onSubmit={handleCreateTask} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.taskTitleLabel}</label>
              <input
                type="text"
                required
                placeholder={isRtl ? "مثال: استلام رد محكم مركز التحكيم التجاري" : "e.g. Obtain SCCA Arbitrator response"}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.assignedLawyer}</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
              >
                <option value="Farah Al-Sabah">{isRtl ? 'فرح الصباح (مستشار أول)' : 'Farah Al-Sabah (Senior Associate)'}</option>
                <option value="Walid Al-Gharaballi">{isRtl ? 'وليد الغربللي (شريك أول)' : 'Walid Al-Gharaballi (Senior Partner)'}</option>
                <option value="Tariq Al-Tayer">{isRtl ? 'طارق الطاير (مستشار مساعد)' : 'Tariq Al-Tayer (Associate)'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.taskDescLabel}</label>
            <textarea
              placeholder={isRtl ? "إضافة تعليمات وتفاصيل خاصة بملف القضية..." : "Case-specific details and instructions..."}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.dueDate}</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.priority}</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
              >
                <option value="Low">{isRtl ? 'منخفضة' : 'Low'}</option>
                <option value="Medium">{isRtl ? 'متوسطة' : 'Medium'}</option>
                <option value="High">{isRtl ? 'عالية' : 'High'}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="visibleToClientCheckbox"
                checked={visibleToClient}
                onChange={e => setVisibleToClient(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="visibleToClientCheckbox" className="text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none">
                {t.clientVisible}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting || !title}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-1 disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {t.saveTask}
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-grow overflow-x-auto min-h-[300px]" id="kanban-board">
        {STAGES.map(stage => {
          const stageTasks = tasks.filter(t => t.status === stage);
          return (
            <div key={stage} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex flex-col gap-3 min-w-[200px]">
              {/* Stage Header */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                  {getStageLocalized(stage)}
                </span>
                <span className="bg-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {stageTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-2.5 flex-grow overflow-y-auto max-h-[380px] pr-1">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : stageTasks.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                    {t.noTasks}
                  </p>
                ) : (
                  stageTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-white border border-slate-200/70 p-3 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col gap-2"
                    >
                      {/* Priority Tag & Client Visibility */}
                      <div className="flex justify-between items-center">
                        <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                          task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                          task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {getPriorityLocalized(task.priority)}
                        </span>

                        <button
                          onClick={() => toggleTaskClientVisibility(task)}
                          title={task.visibleToClient ? "Shared with client" : "Hidden from client"}
                          className={`p-1 rounded-md border transition-all ${
                            task.visibleToClient
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                          }`}
                        >
                          {task.visibleToClient ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 leading-snug">{translateStaticText(task.title, isRtl)}</h4>
                        {task.description && (
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {translateStaticText(task.description, isRtl)}
                          </p>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                        <div className="flex items-center gap-1 text-[9px] text-slate-400">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[80px]" title={task.assignedTo}>
                            {translateStaticText(task.assignedTo, isRtl)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                      </div>

                      {/* Advance Stage controls */}
                      <div className="grid grid-cols-2 gap-1 mt-1 border-t border-slate-100/60 pt-1.5">
                        {STAGES.indexOf(task.status) > 0 && (
                          <button
                            onClick={() => updateTaskStatus(task.id, STAGES[STAGES.indexOf(task.status) - 1])}
                            className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200/60 rounded-md transition-colors cursor-pointer"
                          >
                            {t.back}
                          </button>
                        )}
                        {STAGES.indexOf(task.status) < STAGES.length - 1 && (
                          <button
                            onClick={() => updateTaskStatus(task.id, STAGES[STAGES.indexOf(task.status) + 1])}
                            className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200/60 rounded-md transition-colors col-start-2 cursor-pointer"
                          >
                            {t.next}
                          </button>
                        )}
                        {task.status === 'Completed' && (
                          <div className="col-span-2 text-center text-[9px] text-emerald-500 font-extrabold flex items-center justify-center gap-1 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t.completed}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
