import {
  startOfDay, endOfDay, isWithinInterval, addDays, eachDayOfInterval,
  startOfWeek, endOfWeek, getDay, setHours, setMinutes, format, isSameDay
} from 'date-fns';
import type { Task } from '../gistSync';

// Determine which days a repeating task appears on within a window.
export function expandOccurrences(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const out: Array<{ task: Task; when: Date }> = [];

  for (const t of tasks) {
    const base = t.startAt ? new Date(t.startAt) : undefined;
    const rep = t.repeat?.type ?? 'none';

    if (!base) {
      // Legacy all-day: place on its "day" within the range
      if (t.day) {
        const map = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6} as const;
        const want = map[t.day];
        for (const d of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
          if (getDay(d) === want) out.push({ task: t, when: startOfDay(d) });
        }
      }
      continue;
    }

    if (rep === 'none') {
      if (isWithinInterval(base, { start: rangeStart, end: rangeEnd })) {
        out.push({ task: t, when: base });
      }
      continue;
    }

    if (rep === 'daily') {
      for (const d of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
        // keep the time of day from base
        const when = setMinutes(setHours(d, base.getHours()), base.getMinutes());
        out.push({ task: t, when });
      }
      continue;
    }

    if (rep === 'weekly') {
      const weekday = getDay(base); // 0=Sun..6=Sat
      for (const d of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
        if (getDay(d) === weekday) {
          const when = setMinutes(setHours(d, base.getHours()), base.getMinutes());
          out.push({ task: t, when });
        }
      }
      continue;
    }
  }

  return out.sort((a,b)=>a.when.getTime()-b.when.getTime());
}

export function weekWindow(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 }); // Mon start
  const end = endOfWeek(anchor, { weekStartsOn: 1 });
  return { start, end };
}

export function formatTime(ts?: number) {
  if (!ts) return '';
  return format(new Date(ts), 'HH:mm');
}

export function formatDuration(min?: number) {
  if (!min || min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// Accepts "90", "1:30", "01:30", or "45"
export function parseDuration(input: string): number | undefined {
  const s = input.trim();
  if (!s) return undefined;
  if (s.includes(':')) {
    const [hh, mm] = s.split(':').map(n => Number(n));
    if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
    return undefined;
  }
  const mins = Number(s);
  return Number.isFinite(mins) ? mins : undefined;
}

