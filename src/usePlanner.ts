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
    setEntries(newEntries);
    const data: TrackerData = {
      version: 2,
      entries: newEntries,
      updatedAt: Date.now()
    };
    
    // Save locally first
    localStorage.setItem('tracker_data', JSON.stringify(data));
    
    // Try to save to repository
    try {
      const token = localStorage.getItem('gh_token');
      const owner = localStorage.getItem('gh_owner') || 'da-unstoppable';
      const repo = localStorage.getItem('gh_repo') || 'gist-challenge';
      const fileName = localStorage.getItem('gh_file') || 'challenge.json';

      if (token) {
        // Get current file SHA by fetching the file first
        console.log('Getting current SHA before saving...');
        const shaResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        });
        
        let currentSha = null;
        if (shaResponse.ok) {
          const shaJson = await shaResponse.json();
          currentSha = shaJson.sha;
          console.log('Current SHA:', currentSha);
        }
        
        console.log('Saving to repository:', { owner, repo, fileName, hasSha: !!currentSha });
        
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
        } else if (response.status === 409) {
          // SHA conflict - merge changes and retry
          console.log('SHA conflict detected, merging changes...');
          await loadFromRepository();
          // Merge local changes with latest remote data
          const mergedEntries = mergeEntries(newEntries, entries);
          // Retry with merged data
          setTimeout(() => saveEntries(mergedEntries), 1000);
        } else {
          const errorText = await response.text();
          console.error('Failed to save to repository:', response.status, errorText);
        }
      } else {
        console.log('No GitHub token found, saving locally only');
      }
    } catch (e) {
      console.error('Repository save failed:', e);
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
    updateEntry,
    getEntry,
    refresh: loadFromRepository
  };
}