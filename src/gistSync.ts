
const GH_API = "https://api.github.com";

export type Repeat =
  | { type: 'none' }
  | { type: 'daily' }
  | { type: 'weekly' }
  | { type: 'biweekly' };

export type Task = {
  id: string;
  title: string;
  notes?: string;

  startAt?: number;        // when it starts
  endAt?: number;          // (optional) if you want explicit end times later
  durationMin?: number;    // duration in minutes
  repeat?: Repeat;

  day?: 'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun'; // legacy
  done: boolean;

  createdAt: number;
  dueAt?: number;
  recurring?: { type: 'weekly'; weekday: number }; // legacy
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
  // Local is the source of truth for which IDs should exist.
  // If an ID exists only on remote, we treat it as deleted locally → drop it.
  const localMap = new Map<string, Task>();
  for (const t of local) localMap.set(t.id, t);

  const out: Task[] = [];

  // For IDs present on both sides, pick the newer by updatedAt.
  const remoteMap = new Map(remote.map(t => [t.id, t]));
  for (const [id, r] of remoteMap) {
    const l = localMap.get(id);
    if (l) {
      out.push((l.updatedAt ?? 0) >= (r.updatedAt ?? 0) ? l : r);
      localMap.delete(id); // handled
    }
    // else: exists only on remote -> treat as deleted locally -> skip
  }

  // Any remaining local-only IDs are new items → add them.
  for (const t of localMap.values()) out.push(t);

  // Stable order
  return out.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
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
