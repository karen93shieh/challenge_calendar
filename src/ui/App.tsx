import { useState } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { usePlanner } from '../usePlanner';
import type { Task } from '../gistSync';
import {
  expandOccurrences,
  weekWindow,
  formatTime,
  formatDuration,
  parseDuration,
} from '../lib/schedule';

export default function App() {
  const { tasks, addTask, updateTask, removeTask, loading, error } = usePlanner();
  const [view, setView] = useState<'day' | 'week'>('week');
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Weekly Planner</h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded ${view === 'day' ? 'bg-zinc-800' : ''}`}
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button
              className={`px-3 py-1 rounded ${view === 'week' ? 'bg-zinc-800' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
          </div>

          <div className="ms-3 flex items-center gap-2">
            <button
              className="px-2 py-1 rounded border border-zinc-700"
              onClick={() => setAnchor(addDays(anchor, view === 'day' ? -1 : -7))}
              aria-label="Previous"
            >
              ‹
            </button>
            <div className="text-sm opacity-80">
              {view === 'day'
                ? format(anchor, 'EEE, MMM d')
                : `${format(weekWindow(anchor).start, 'MMM d')} – ${format(
                    weekWindow(anchor).end,
                    'MMM d'
                  )}`}
            </div>
            <button
              className="px-2 py-1 rounded border border-zinc-700"
              onClick={() => setAnchor(addDays(anchor, view === 'day' ? 1 : 7))}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      {error && <div className="text-red-400 mb-3">{error}</div>}

      <AddForm onAdd={addTask} />

      {view === 'week' ? (
        <WeekView
          tasks={tasks}
          anchor={anchor}
          onUpdate={updateTask}
          onDelete={removeTask}
          setConfirmTask={setConfirmTask}
        />
      ) : (
        <DayView
          tasks={tasks}
          anchor={anchor}
          onUpdate={updateTask}
          onDelete={removeTask}
          setConfirmTask={setConfirmTask}
        />
      )}

      {confirmTask && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">Delete Task</h2>
            <p className="mb-4">
              Are you sure you want to delete <span className="font-medium">"{confirmTask.title}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600"
                onClick={() => setConfirmTask(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500"
                onClick={() => {
                  removeTask(confirmTask.id);
                  setConfirmTask(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Add Form ───────────────────────── */

import { format as dfFormat } from 'date-fns';

function AddForm({
  onAdd,
}: {
  onAdd: (t: Omit<Task, 'id' | 'done' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
}) {
  const todayStr = dfFormat(new Date(), 'yyyy-MM-dd');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const title = String(fd.get('title') || '').trim();
        const date = String(fd.get('date') || '');
        const time = String(fd.get('time') || '');
        const duration = String(fd.get('duration') || '');
        const repeat = String(fd.get('repeat') || 'none') as 'none' | 'daily' | 'weekly' | 'biweekly';
        if (!title) return;

        let startAt: number | undefined = undefined;
        if (date) {
          const [y, m, d] = date.split('-').map(Number);
          const dt = new Date(y, m - 1, d);
          if (time) {
            const [hh, mm] = time.split(':').map(Number);
            dt.setHours(hh || 0, mm || 0, 0, 0);
          } else {
            dt.setHours(0, 0, 0, 0);
          }
          startAt = dt.getTime();
        }

        const durationMin = parseDuration(duration);

        onAdd({
          title,
          startAt,
          durationMin,
          repeat: repeat === 'none' ? { type: 'none' } : { type: repeat },
        });

        (e.currentTarget as HTMLFormElement).reset();
        const dateEl = (e.currentTarget as HTMLFormElement).elements.namedItem('date') as HTMLInputElement | null;
        const timeEl = (e.currentTarget as HTMLFormElement).elements.namedItem('time') as HTMLInputElement | null;
        if (dateEl) dateEl.value = todayStr;
        if (timeEl) timeEl.value = '00:00';
      }}
      className="grid md:grid-cols-6 gap-2 mb-5"
    >
      <input name="title" placeholder="Add an activity…" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 md:col-span-2" />
      <input name="date" type="date" defaultValue={todayStr} className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" />
      <input name="time" type="time" defaultValue="00:00" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" />
      <input name="duration" placeholder="Duration (min or HH:MM)" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" />
      <select name="repeat" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2">
        <option value="none">One-time</option>
        <option value="daily">Day</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
      </select>
      <button className="rounded bg-zinc-800 px-3 py-2">Add</button>
    </form>
  );
}

/* ───────────────────────── Day View ───────────────────────── */

function DayView({
  tasks,
  anchor,
  onUpdate,
  onDelete,
  setConfirmTask,
}: {
  tasks: Task[];
  anchor: Date;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  setConfirmTask: (t: Task | null) => void;
}) {
  const occ = expandOccurrences(tasks, startOfDay(anchor), endOfDay(anchor)).sort((a, b) => {
    const at = a.task.startAt ? a.when.getTime() : -1;
    const bt = b.task.startAt ? b.when.getTime() : -1;
    return at - bt || a.task.title.localeCompare(b.task.title);
  });

  return (
    <section className="space-y-2">
      {occ.length === 0 && <div className="opacity-70 text-sm">No activities today.</div>}
      {occ.map(({ task, when }) => {
        const noDuration = !task.durationMin || task.durationMin <= 0;
        const timeLabel = noDuration ? 'All day' : format(when, 'MM/dd/yyyy HH:mm');
        return (
          <article key={task.id + when.getTime()} className="border border-zinc-800 rounded p-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={task.done}
                onChange={(e) => onUpdate(task.id, { done: e.target.checked })}
              />
              <div className="flex-1">
                <div className={`font-medium ${task.done ? 'line-through opacity-50' : ''}`}>
                  {task.title}
                </div>
                <div className="text-xs opacity-70">
                  {timeLabel}
                  {formatDuration(task.durationMin) ? ` (${formatDuration(task.durationMin)})` : ''}
                </div>
              </div>
              <button className="text-xs underline opacity-80" onClick={() => setConfirmTask(task)}>
                delete
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

/* ───────────────────────── Week View ───────────────────────── */

export function WeekView({
  tasks,
  anchor,
  onUpdate,
  onDelete,
  setConfirmTask,
}: {
  tasks: Task[];
  anchor: Date;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  setConfirmTask: (t: Task | null) => void;
}) {
  const { start, end } = weekWindow(anchor);
  const occ = expandOccurrences(tasks, start, end);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <section className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map((d) => {
        const dayItems = occ
          .filter((o) => o.when.toDateString() === d.toDateString())
          .sort((a, b) => {
            const at = a.task.startAt ? a.when.getTime() : -1;
            const bt = b.task.startAt ? b.when.getTime() : -1;
            return at - bt || a.task.title.localeCompare(b.task.title);
          });

        return (
          <div key={d.toDateString()} className="border border-zinc-800 rounded p-2">
            <div className="text-sm font-semibold mb-2">{format(d, 'EEE d')}</div>
            <div className="space-y-2">
              {dayItems.map(({ task, when }) => {
                const noDuration = !task.durationMin || task.durationMin <= 0;
                const timeLabel = noDuration ? 'All day' : formatTime(when.getTime());
                return (
                  <div key={task.id + when.getTime()} className="border border-zinc-800 rounded p-2">
                    <div className="text-xs opacity-70">
                      {timeLabel}
                      {formatDuration(task.durationMin) ? ` (${formatDuration(task.durationMin)})` : ''}
                    </div>
                    <div className="flex items-start gap-2 mt-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 shrink-0"
                        checked={task.done}
                        onChange={(e) => onUpdate(task.id, { done: e.target.checked })}
                      />
                      <div className="flex-1 leading-5">
                        <div className={`text-sm ${task.done ? 'line-through opacity-50' : ''}`}>
                          {task.title}
                        </div>
                        {task.notes && (
                          <div className={`text-xs mt-0.5 ${task.done ? 'line-through opacity-50' : 'opacity-70'}`}>
                            {task.notes}
                          </div>
                        )}
                      </div>
                      <button className="text-[11px] underline opacity-80" onClick={() => setConfirmTask(task)}>
                        del
                      </button>
                    </div>
                  </div>
                );
              })}
              {dayItems.length === 0 && <div className="text-xs opacity-50">—</div>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
