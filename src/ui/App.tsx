import { useState, useEffect } from 'react';
import { addDays, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { useTracker } from '../usePlanner';

export default function App() {
  const { entries, loading, updateEntry, getEntry, refresh } = useTracker();
  const [view, setView] = useState<'week' | 'month'>(() => {
    const v = localStorage.getItem('calendar_view');
    return v === 'month' ? 'month' : 'week';
  });
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('calendar_view', view);
  }, [view]);

  return (
    <div className="app-shell mx-auto w-full max-w-[1280px] px-3 sm:px-4 lg:px-5 pt-6 pb-6 bg-amber-25 min-h-screen">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-amber-900">Daily Tracker</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refresh()}
            className="px-3 py-2 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-sm"
          >
            Settings
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded ${view === 'week' ? 'bg-amber-200 text-amber-900' : 'text-amber-700'}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 rounded ${view === 'month' ? 'bg-amber-200 text-amber-900' : 'text-amber-700'}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>

          <div className="ms-3 flex items-center gap-2">
            <button
              className="px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setCurrentDate(view === 'week' ? subMonths(currentDate, 1) : subMonths(currentDate, 1))}
              aria-label="Previous"
            >
              ‹
            </button>
            <div className="text-sm opacity-80 text-amber-700">
              {view === 'week'
                ? `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d')}`
                : format(currentDate, 'MMMM yyyy')}
            </div>
            <button
              className="px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setCurrentDate(view === 'week' ? addMonths(currentDate, 1) : addMonths(currentDate, 1))}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      {view === 'week' ? (
        <WeekView currentDate={currentDate} updateEntry={updateEntry} getEntry={getEntry} />
      ) : (
        <MonthView currentDate={currentDate} updateEntry={updateEntry} getEntry={getEntry} />
      )}

      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center bg-amber-900/70 z-50">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-3 text-amber-900">Repository Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-amber-700 mb-1">GitHub Token</label>
                <input
                  type="password"
                  className="w-full border border-amber-300 bg-amber-50 rounded px-3 py-2 text-amber-900"
                  placeholder="ghp_..."
                  defaultValue={localStorage.getItem('gh_token') || ''}
                  onChange={(e) => localStorage.setItem('gh_token', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-amber-700 mb-1">Repository Owner</label>
                <input
                  type="text"
                  className="w-full border border-amber-300 bg-amber-50 rounded px-3 py-2 text-amber-900"
                  placeholder="username"
                  defaultValue={localStorage.getItem('gh_owner') || 'da-unstoppable'}
                  onChange={(e) => localStorage.setItem('gh_owner', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-amber-700 mb-1">Repository Name</label>
                <input
                  type="text"
                  className="w-full border border-amber-300 bg-amber-50 rounded px-3 py-2 text-amber-900"
                  placeholder="repo-name"
                  defaultValue={localStorage.getItem('gh_repo') || 'gist-challenge'}
                  onChange={(e) => localStorage.setItem('gh_repo', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-amber-700 mb-1">File Name</label>
                <input
                  type="text"
                  className="w-full border border-amber-300 bg-amber-50 rounded px-3 py-2 text-amber-900"
                  placeholder="challenge.json"
                  defaultValue={localStorage.getItem('gh_file') || 'challenge.json'}
                  onChange={(e) => localStorage.setItem('gh_file', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="px-3 py-2 rounded bg-amber-200 hover:bg-amber-300 text-amber-900"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
              <button
                className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-amber-50"
                onClick={() => {
                  setShowSettings(false);
                  window.location.reload(); // Reload to use new settings
                }}
              >
                Save & Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Week View ───────────────────────── */

function WeekView({ 
  currentDate, 
  updateEntry, 
  getEntry 
}: { 
  currentDate: Date;
  updateEntry: (date: string, updates: any) => void;
  getEntry: (date: string) => any;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate)
  });

  return (
    <section className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const entry = getEntry(dateStr);
        const isToday = isSameDay(day, new Date());
        
        return (
          <div key={day.toDateString()} className={`border rounded p-3 ${isToday ? 'ring-2 ring-amber-500' : 'border-amber-300'} bg-amber-50`}>
            <div className="text-sm font-semibold mb-2 text-amber-900">
              {format(day, 'EEE d')}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={entry?.completed || false}
                  onChange={(e) => updateEntry(dateStr, { completed: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-amber-800">Completed</span>
              </label>
              <textarea
                placeholder="Notes..."
                value={entry?.notes || ''}
                onChange={(e) => updateEntry(dateStr, { notes: e.target.value })}
                className="w-full h-20 p-2 text-sm border border-amber-300 rounded bg-amber-50 text-amber-900 resize-none"
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ───────────────────────── Month View ───────────────────────── */

function MonthView({ 
  currentDate, 
  updateEntry, 
  getEntry 
}: { 
  currentDate: Date;
  updateEntry: (date: string, updates: any) => void;
  getEntry: (date: string) => any;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <section className="bg-amber-50 border border-amber-300 rounded-lg p-4">
      {/* Header with day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-amber-800 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          const entry = getEntry(dateStr);
          
          return (
            <div
              key={day.toDateString()}
              className={`h-20 border border-amber-300 rounded p-1 ${
                isCurrentMonth ? 'bg-amber-50' : 'bg-amber-100'
              } ${isToday ? 'ring-2 ring-amber-500' : ''}`}
            >
              <div className={`text-xs ${isCurrentMonth ? 'text-amber-900' : 'text-amber-500'}`}>
                {format(day, 'd')}
              </div>
              <div className="mt-1 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={entry?.completed || false}
                  onChange={(e) => updateEntry(dateStr, { completed: e.target.checked })}
                  className="rounded"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}