
const GH_API = "https://api.github.com";

export type Repeat =
  | { type: 'none' }
  | { type: 'weekly' }          // repeats every week on the same weekday as startAt
  | { type: 'daily' };          // repeats every day

export type Task = {
  id: string;
  title: string;
  notes?: string;

  // Calendar bits ↓
  startAt?: number;             // epoch ms; if missing → treat as all-day on chosen date
  endAt?: number;               // optional end time
  repeat?: Repeat;              // none | weekly | daily

  day?: 'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun'; // legacy (kept for backward compat)
  done: boolean;

  createdAt: number;
  dueAt?: number;
  recurring?: { type: 'weekly'; weekday: number }; // legacy; safe to ignore
  updatedAt: number;
};

export type PlannerDoc = {
  version: 1;
  tasks: Task[];
  updatedAt: number;
};

export type GistConfig = {
  token: string;
  gistId: string;
  fileName: string;
};

function headers(token?: string, extra: Record<string,string> = {}) {
  const base: Record<string,string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) base["Authorization"] = `Bearer ${token}`;
  return { ...base, ...extra };
}

export async function loadPlanner(cfg: GistConfig, cachedEtag?: string): Promise<{
  doc: PlannerDoc,
  etag: string,
  commit?: string,
  notModified?: boolean
}> {
  const res = await fetch(`${GH_API}/gists/${cfg.gistId}`, {
    headers: headers(cfg.token, cachedEtag ? { "If-None-Match": cachedEtag } : {})
  });

  if (res.status === 304) {
    return { 
      doc: JSON.parse(localStorage.getItem("planner_cache") || '{"version":1,"tasks":[],"updatedAt":0}'), 
      etag: cachedEtag!, 
      notModified: true 
    };
  }
  if (!res.ok) throw new Error(`Gist load failed: ${res.status}`);

  const etag = res.headers.get("ETag") || "";
  const json = await res.json();
  const file = json.files?.['planner.json'] || json.files?.['PLANNER.JSON'] || json.files?.['Planner.json'];
  if (!file || !file.content) throw new Error(`File ${cfg.fileName} not found in gist`);
  const doc = JSON.parse(file.content) as PlannerDoc;

  localStorage.setItem("planner_cache", JSON.stringify(doc));
  if (etag) localStorage.setItem("planner_etag", etag);
  if (json.history?.[0]?.version) localStorage.setItem("planner_commit", json.history[0].version);

  return { doc, etag, commit: json.history?.[0]?.version };
}

export function mergeTasks(local: Task[], remote: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of remote) map.set(t.id, t);
  for (const t of local) {
    const r = map.get(t.id);
    if (!r || t.updatedAt > r.updatedAt) map.set(t.id, t);
  }
  return Array.from(map.values()).sort((a,b)=>a.createdAt-b.createdAt);
}

export async function savePlanner(cfg: GistConfig, next: PlannerDoc): Promise<{commit: string}> {
  const cachedEtag = localStorage.getItem("planner_etag") || undefined;
  let base: PlannerDoc | undefined;
  try {
    const { doc } = await loadPlanner(cfg, cachedEtag);
    base = doc;
  } catch {
    const cached = localStorage.getItem("planner_cache");
    base = cached ? JSON.parse(cached) : { version:1, tasks:[], updatedAt:0 } as PlannerDoc;
  }

  const merged: PlannerDoc = {
    version: 1,
    tasks: mergeTasks(next.tasks, base!.tasks),
    updatedAt: Date.now()
  };

  const body = {
    files: {
      [cfg.fileName]: {
        content: JSON.stringify(merged, null, 2)
      }
    }
  };

  const res = await fetch(`${GH_API}/gists/${cfg.gistId}`, {
    method: "PATCH",
    headers: headers(cfg.token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gist save failed: ${res.status} ${await res.text()}`);

  const js = await res.json();
  const commit = js.history?.[0]?.version || "";
  localStorage.setItem("planner_cache", JSON.stringify(merged));
  if (commit) localStorage.setItem("planner_commit", commit);
  const etag = res.headers.get("ETag");
  if (etag) localStorage.setItem("planner_etag", etag);

  return { commit };
}
