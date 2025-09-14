
import { usePlanner } from '../usePlanner'

export default function App() {
  const { tasks, addTask, updateTask, removeTask, loading, error } = usePlanner()

  if (loading) return <div className="p-6">Loading…</div>
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weekly Planner</h1>
        <a href="#settings" className="underline text-sm opacity-80">Settings</a>
      </header>

      {error && <div className="text-red-400 mb-3">{error}</div>}

      <form onSubmit={(e)=>{
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const title = String(fd.get('title')||'').trim();
        const day = String(fd.get('day')||'Mon') as any;
        if (title) addTask({ title, day, done:false });
        (e.currentTarget as HTMLFormElement).reset();
      }} className="flex gap-2 mb-5">
        <input name="title" placeholder="Task" className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 flex-1" />
        <select name="day" className="border border-zinc-800 bg-zinc-900 rounded px-2 py-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><option key={d}>{d}</option>)}
        </select>
        <button className="rounded bg-zinc-800 px-3">Add</button>
      </form>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map(t => (
          <article key={t.id} className="border border-zinc-800 rounded p-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={t.done} onChange={e=>updateTask(t.id,{ done: e.target.checked })} />
              <div className="flex-1">
                <div className={`font-medium ${t.done?'line-through opacity-60':''}`}>{t.title}</div>
                <div className="text-xs opacity-70">{t.day}</div>
              </div>
              <button onClick={()=>removeTask(t.id)} className="text-xs underline opacity-80">delete</button>
            </div>
          </article>
        ))}
      </section>

      <hr className="my-6 border-zinc-800" />

      <Settings />
    </div>
  )
}

function Settings() {
  function saveCreds(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get('token')||'').trim();
    const gist = String(fd.get('gist')||'').trim();
    localStorage.setItem('gh_token', token);
    localStorage.setItem('gh_gist', gist);
    alert('Saved. Reloading…');
    location.reload();
  }

  return (
    <section id="settings" className="space-y-3">
      <h2 className="text-xl font-semibold">Sync (GitHub Gist)</h2>
      <p className="text-sm opacity-80">
        Create a <em>secret</em> Gist with a file named <code>planner.json</code> containing:{" "}
        <code>{`{ "version": 1, "tasks": [], "updatedAt": 0 }`}</code>.
        {" "}Then paste your token (gist scope) and Gist ID below.
      </p>
      <form onSubmit={saveCreds} className="grid gap-2 max-w-xl">
        <label className="text-sm">GitHub Token (gist scope)
          <input name="token" className="mt-1 w-full border border-zinc-800 bg-zinc-900 rounded px-3 py-2" defaultValue={localStorage.getItem('gh_token')||''} />
        </label>
        <label className="text-sm">Gist ID
          <input name="gist" className="mt-1 w-full border border-zinc-800 bg-zinc-900 rounded px-3 py-2" defaultValue={localStorage.getItem('gh_gist')||''} />
        </label>
        <button className="justify-self-start rounded bg-zinc-800 px-3 py-2">Save</button>
      </form>
    </section>
  )
}
