import { useEffect, useState } from 'react';
import { loadPlanner, savePlanner, Task, PlannerDoc, RepoConfig } from './gistSync';
import { setCompletedAt } from './lib/schedule'; // path matches where you put schedule.ts

const cfg: RepoConfig = {
  token: localStorage.getItem('gh_token') || '',
  owner: localStorage.getItem('gh_owner') || 'da-unstoppable',
  repo: localStorage.getItem('gh_repo') || 'gist-challenge',
  fileName: localStorage.getItem('gh_file') || 'challenge.json'
};

function nowMs() { return Date.now(); }

export function usePlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const etag = localStorage.getItem('planner_etag') || undefined;
        const { doc } = await loadPlanner(cfg, etag);
        // Ensure completion map exists
        setTasks((doc.tasks || []).map(t => ({ ...t, completion: t.completion ?? {} })));
      } catch (e:any) {
        const cached = localStorage.getItem('planner_cache');
        if (cached) {
          const doc = JSON.parse(cached) as PlannerDoc;
          setTasks((doc.tasks || []).map(t => ({ ...t, completion: t.completion ?? {} })));
        } else {
          setTasks([]);
        }
        setError(e.message || 'Load error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(nextTasks: Task[]) {
    setTasks(nextTasks);
    try {
      await savePlanner(cfg, { version: 2, tasks: nextTasks, updatedAt: nowMs() });
    } catch (e) {
      console.warn('Save deferred', e);
    }
  }

  async function addTask(partial: Omit<Task,'id'|'createdAt'|'updatedAt'|'completion'|'done'>) {
    const now = nowMs();
    const t: Task = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      completion: {},
      ...partial,
    };
    await persist([ ...tasks, t ]);
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    const now = nowMs();
    const next = tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: now } : t);
    await persist(next);
  }

  async function removeTask(id: string) {
    await persist(tasks.filter(t => t.id !== id));
  }

  // NEW: toggle/set completion for a SPECIFIC occurrence
  async function setDoneForOccurrence(id: string, when: Date, done: boolean) {
    const now = nowMs();
    const next = tasks.map(t => {
      if (t.id !== id) return t;
      return { ...setCompletedAt(t, when, done), updatedAt: now };
    });
    await persist(next);
  }

  return { tasks, addTask, updateTask, removeTask, loading, error, setDoneForOccurrence };
}
