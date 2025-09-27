
# Daily Tracker — Calendar PWA

A minimal, installable PWA (Vite + React + TS + Tailwind + vite-plugin-pwa) for daily tracking with weekly and monthly calendar views.

## Features
- **Weekly View**: Track daily progress with checkboxes and notes
- **Monthly View**: Overview calendar with completion checkboxes
- **Local Storage**: Data stored locally in your browser
- **Repository Sync**: Optional GitHub repository integration for sharing

## Quick start
```bash
npm install
npm run dev
```

## Usage
1. **Switch Views**: Toggle between Week and Month views
2. **Track Progress**: Check off completed days
3. **Add Notes**: In weekly view, add notes for each day
4. **Navigate**: Use arrow buttons to move between weeks/months
5. **Settings**: Configure GitHub repository sync (optional)

## Build PWA
```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).
The app works offline; it updates itself when you revisit (service worker autoUpdate).

## Data & Conflicts
- Local cache is stored in `localStorage` as `planner_cache`
- Sync uses ETag and merges by `task.id`, choosing the higher `updatedAt`
- Repository keeps a full git history if you need to roll back

## Sharing & Collaboration
- **Private Repository**: Only repository collaborators can access
- **Organization Repository**: Members of the organization can access
- **Public Repository**: Anyone can access (be careful with sensitive data)
- Each user needs their own GitHub token with appropriate permissions

## Notes
- This app supports multi-user collaboration through GitHub repository access
- Repository must have the JSON file with proper structure
- If you later want real local notifications, wrap the PWA with Capacitor.




To run

```bash
npm run build
cp dist/index.html dist/404.html

git worktree add gh-pages
rm -rf gh-pages/*
cp -r dist/* gh-pages/
cd gh-pages
git add .
git commit -m "update: default date today + time 00:00"
git push origin HEAD:gh-pages
cd ..
git worktree remove gh-pages
```