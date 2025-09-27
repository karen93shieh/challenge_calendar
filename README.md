
# Challenge Calendar — Repository Sync PWA

A minimal, installable PWA (Vite + React + TS + Tailwind + vite-plugin-pwa) that syncs
your weekly tasks to a **GitHub Repository** JSON file.

## Quick start
```bash
npm install
npm run dev
```

Then open the app → **Settings** → paste your GitHub token and repository details.

### Create your Repository
- Go to GitHub → Create a new repository
- Add a JSON file (e.g., `challenge.json`) with initial content:
```json
{
  "version": 2,
  "tasks": [],
  "updatedAt": 0
}
```
- Commit and push the file

### Token
- Create a Personal Access Token with **repo** scope (full repository access)
- Paste it in Settings (stored locally in your browser via localStorage)

### Repository Settings
- **Owner**: Your GitHub username or organization name
- **Repository**: The repository name
- **File Name**: The JSON file name (e.g., `challenge.json`)

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