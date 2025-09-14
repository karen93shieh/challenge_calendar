import { useState } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { usePlanner } from '../usePlanner';
import { expandOccurrences, weekWindow, formatTime } from '../lib/schedule';
import type { Task } from '../gistSync';

export default function App() {
  const { tasks, addTask, updateTask, removeTask, loading, error } = usePlanner();
  const [view, setView] = useState<'day'|'week'>('week');
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Weekly Planner</h1>
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1 rounded ${view==='day'?'bg-zinc-800':''}`} onClick={()=>setView('day')}>Day</button>
          <button className={`px-3 py-1 rounded ${view==='week'?'bg-zinc-800':''}`} onClick={()=>setView('week')}>Week</button>
          <div className="ms-3 flex items-center gap-2">
            <button className="px-2 py-1 rounded border border-zinc-700" onClick={()=>setAnchor(addDays(anchor, view==='day'?-1:-7))}>‹</button>
            <div className="text-sm opacity-80">
              {view==='day' ? format(anchor,'EEE, MMM d') : `${format(weekWindow(anchor).start,'MMM d')} – ${format(weekWindow(anchor).end,'MMM d')}`}
            </div>
            <button className="px-2 py-1 rounded border border-zinc-700" onClick={()=>setAnchor(addDays(anchor, view==='day'?1:7))}>›</button>
          </div>
        </div>
      </header>

      {error && <div className="text-red-400 mb-3">{error}</div>}

      <AddForm onAdd={addTask} />

      {view === 'week' ? (
        <WeekView tasks={tasks} anchor={anchor} onUpdate={updateTask} onDelete={removeTask} />
      ) : (
        <DayView tasks={tasks} anchor={anchor} onUpdate={updateTask} onDelete={removeTask} />
      )}
    </div>
  );
}

function AddForm({
    onAdd,
  }: {
    onAdd: (t: Omit<Task, 'id' | 'done' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  }) {
    return (
    <form onSubmit={(e)=>{
      e.preventDefault();
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      const title = String(fd.get('title')||'').trim();
      const date = String(fd.get('date')||'');
      const time = String(fd.get('time')||'');
      const repeat = String(fd.get('repeat')||'none') as 'none'|'daily'|'weekly';
      if (!title) return;

      let startAt: number | undefined = undefined;
      if (date) {
        const [y,m,d] = date.split('-').map(Number);
        let dt = new Date(y, m-1, d);
        if (time) {
          const [hh, mm] = time.split(':').map(Number);
          dt.setHours(hh||0, mm||0, 0, 0);
        }
        startAt = dt.getTime();
      }

      onAdd({
        title,
        startAt,
        repeat: repeat==='none' ? {type:'none'} : {type: repeat},
      });

      (e.currentTarget as HTMLFormElement).reset();
    }} className="grid md:grid-cols-5 gap-2 mb-5">
      <input name="title" placeholder="Add an activity…" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 md:col-span-2" />
      <input name="date" type="date" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" />
      <input name="time" type="time" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" />
      <select name="repeat" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2">
        <option value="none">One-time</option>
        <option value="weekly">Repeats weekly</option>
        <option value="daily">Repeats daily</option>
      </select>
      <button className="rounded bg-zinc-800 px-3 py-2">Add</button>
    </form>
  );
}

function DayView({ tasks, anchor, onUpdate, onDelete }:{
  tasks: Task[], anchor: Date,
  onUpdate: (id: string, patch: Partial<Task>) => void,
  onDelete: (id: string) => void
}) {
  const occ = expandOccurrences(tasks, anchor, anchor);
  return (
    <section className="space-y-2">
      {occ.length === 0 && <div className="opacity-70 text-sm">No activities today.</div>}
      {occ.map(({task, when})=>(
        <article key={task.id + when.getTime()} className="border border-zinc-800 rounded p-3 flex items-center gap-3">
          <input type="checkbox" checked={task.done} onChange={e=>onUpdate(task.id,{ done: e.target.checked })}/>
          <div className="flex-1">
            <div className="font-medium">{task.title}</div>
            <div className="text-xs opacity-70">{format(when,'EEE MMM d')} {formatTime(when.getTime())}</div>
          </div>
          <button className="text-xs underline opacity-80" onClick={()=>onDelete(task.id)}>delete</button>
        </article>
      ))}
    </section>
  );
}

function WeekView({ tasks, anchor, onUpdate, onDelete }:{
  tasks: Task[], anchor: Date,
  onUpdate: (id: string, patch: Partial<Task>) => void,
  onDelete: (id: string) => void
}) {
  const { start, end } = weekWindow(anchor);
  const occ = expandOccurrences(tasks, start, end);

  const days = Array.from({length:7}, (_,i)=>addDays(start, i));

  return (
    <section className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map((d)=>(
        <div key={d.toDateString()} className="border border-zinc-800 rounded p-2">
          <div className="text-sm font-semibold mb-2">{format(d,'EEE d')}</div>
          <div className="space-y-2">
            {occ.filter(o=>o.when.toDateString()===d.toDateString()).map(({task, when})=>(
              <div key={task.id + when.getTime()} className="border border-zinc-800 rounded p-2">
                <div className="text-xs opacity-70">{formatTime(when.getTime()) || 'All day'}</div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={task.done} onChange={e=>onUpdate(task.id,{ done: e.target.checked })}/>
                  <div className="flex-1">
                    <div className="text-sm">{task.title}</div>
                  </div>
                  <button className="text-[11px] underline opacity-80" onClick={()=>onDelete(task.id)}>del</button>
                </div>
              </div>
            ))}
            {occ.every(o=>o.when.toDateString()!==d.toDateString()) && (
              <div className="text-xs opacity-50">—</div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
