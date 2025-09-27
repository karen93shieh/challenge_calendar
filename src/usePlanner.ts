import { useState, useEffect } from 'react';

// Simple daily tracking data structure
export type DailyEntry = {
  date: string; // YYYY-MM-DD format
  notes?: string;
  completed: boolean;
  updatedAt: number;
};

export type TrackerData = {
  version: 2;
  entries: DailyEntry[];
  updatedAt: number;
};

export function useTracker() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFromRepository();
  }, []);

  async function loadFromRepository() {
    try {
      // Check if we have repository configuration
      const token = localStorage.getItem('gh_token');
      const owner = localStorage.getItem('gh_owner') || 'da-unstoppable';
      const repo = localStorage.getItem('gh_repo') || 'gist-challenge';
      const fileName = localStorage.getItem('gh_file') || 'challenge.json';

      if (token) {
        // Load from repository
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        });

        if (response.ok) {
          const json = await response.json();
          if (json.content) {
            const content = JSON.parse(atob(json.content));
            setEntries(content.entries || []);
            // Also cache locally
            localStorage.setItem('tracker_data', JSON.stringify(content));
            // Store the file SHA for future updates
            if (json.sha) {
              localStorage.setItem('planner_commit', json.sha);
              console.log('Updated SHA from load:', json.sha);
            }
            setLoading(false);
            return;
          }
        } else {
          console.warn('Failed to load from repository:', response.status, await response.text());
        }
      }
    } catch (e) {
      console.warn('Repository load failed:', e);
    }

    // Fallback to localStorage
    const cached = localStorage.getItem('tracker_data');
    if (cached) {
      try {
        const data = JSON.parse(cached) as TrackerData;
        setEntries(data.entries || []);
      } catch (e) {
        console.warn('Failed to parse cached data:', e);
        setEntries([]);
      }
    }
    setLoading(false);
  }

  async function saveEntries(newEntries: DailyEntry[]) {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('gh_token');
      const owner = localStorage.getItem('gh_owner') || 'da-unstoppable';
      const repo = localStorage.getItem('gh_repo') || 'gist-challenge';
      const fileName = localStorage.getItem('gh_file') || 'challenge.json';

      if (token) {
        // Step 1: Fetch latest data from repository
        console.log('Fetching latest data before saving...');
        const fetchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        });
        
        let remoteEntries: DailyEntry[] = [];
        let currentSha = null;
        
        if (fetchResponse.ok) {
          const fetchJson = await fetchResponse.json();
          if (fetchJson.content) {
            const remoteData = JSON.parse(atob(fetchJson.content));
            remoteEntries = remoteData.entries || [];
            currentSha = fetchJson.sha;
            console.log('Fetched remote data:', remoteEntries.length, 'entries, SHA:', currentSha);
          }
        } else {
          console.log('Could not fetch remote data, proceeding with local data only');
        }
        
        // Step 2: Merge local changes with remote data
        const mergedEntries = mergeEntries(newEntries, remoteEntries);
        console.log('Merged entries:', mergedEntries.length, 'total');
        
        // Step 3: Update local state with merged data
        setEntries(mergedEntries);
        
        // Step 4: Save merged data to repository
        const data: TrackerData = {
          version: 2,
          entries: mergedEntries,
          updatedAt: Date.now()
        };
        
        // Save locally first
        localStorage.setItem('tracker_data', JSON.stringify(data));
        
        console.log('Saving merged data to repository...');
        
        const body = {
          message: `Update ${fileName} - ${new Date().toISOString()}`,
          content: btoa(JSON.stringify(data, null, 2))
        };
        
        // Only include SHA if we have one (for updates)
        if (currentSha) {
          (body as any).sha = currentSha;
        }
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const json = await response.json();
          console.log('Successfully saved to repository:', json);
          if (json.commit?.sha) {
            localStorage.setItem('planner_commit', json.commit.sha);
          }
          setSaving(false);
        } else {
          const errorText = await response.text();
          console.error('Failed to save to repository:', response.status, errorText);
          setSaving(false);
        }
      } else {
        console.log('No GitHub token found, saving locally only');
        setSaving(false);
      }
    } catch (e) {
      console.error('Repository save failed:', e);
      setSaving(false);
      // Show user-friendly error message
      alert('Failed to save to repository. Check console for details.');
    }
  }

  async function updateEntry(date: string, updates: Partial<DailyEntry>) {
    const existingIndex = entries.findIndex(e => e.date === date);
    const now = Date.now();
    
    if (existingIndex >= 0) {
      // Update existing entry
      const updated = entries.map((entry, index) => 
        index === existingIndex 
          ? { ...entry, ...updates, updatedAt: now }
          : entry
      );
      await saveEntries(updated);
    } else {
      // Create new entry
      const newEntry: DailyEntry = {
        date,
        completed: false,
        updatedAt: now,
        ...updates
      };
      await saveEntries([...entries, newEntry]);
    }
  }

  function getEntry(date: string): DailyEntry | undefined {
    return entries.find(e => e.date === date);
  }

  // Merge local changes with remote data, preferring newer updates
  function mergeEntries(localEntries: DailyEntry[], remoteEntries: DailyEntry[]): DailyEntry[] {
    const merged = new Map<string, DailyEntry>();
    
    // Add remote entries first
    for (const entry of remoteEntries) {
      merged.set(entry.date, entry);
    }
    
    // Override with local entries if they're newer
    for (const localEntry of localEntries) {
      const remoteEntry = merged.get(localEntry.date);
      if (!remoteEntry || localEntry.updatedAt > remoteEntry.updatedAt) {
        merged.set(localEntry.date, localEntry);
      }
    }
    
    return Array.from(merged.values());
  }

  return {
    entries,
    loading,
    saving,
    updateEntry,
    getEntry,
    refresh: loadFromRepository
  };
}