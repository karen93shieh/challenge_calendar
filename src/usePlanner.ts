
import { useEffect, useState } from 'react';
import { loadPlanner, savePlanner, Task, PlannerDoc, GistConfig } from './gistSync';

const cfg: GistConfig = {
  token: localStorage.getItem('gh_token') || '',
  gistId: localStorage.getItem('gh_gist') || '',
  fileName: 'planner.json'
};

export function usePlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const etag = localStorage.getItem('planner_etag') || undefined;
        const { doc } = await loadPlanner(cfg, etag);
        setTasks(doc.tasks);
      } catch (e:any) {
        const cached = localStorage.getItem('planner_cache');
        if (cached) setTasks(JSON.parse(cached).tasks);
        else setTasks([]);
        setError(e.message || 'Load error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addTask(partial: Omit<Task,'id'|'createdAt'|'updatedAt'|'done'>) {
    const now = Date.now();
    const t: Task = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, done:false, ...partial };
    const next = [...tasks, t];
    setTasks(next);
    try { await savePlanner(cfg, { version:1, tasks: next, updatedAt: now }); } catch {}
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    const now = Date.now();
    const next = tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: now } : t);
    setTasks(next);
    try { await savePlanner(cfg, { version:1, tasks: next, updatedAt: now }); } catch {}
  }

  async function removeTask(id: string) {
    const next = tasks.filter(t => t.id !== id);
    setTasks(next);
    try {
      await savePlanner(cfg, { version:1, tasks: next, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Save deferred', e);
    }
  }

  return { tasks, addTask, updateTask, removeTask, loading, error, setTasks };
}
