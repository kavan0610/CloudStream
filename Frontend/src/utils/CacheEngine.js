const CACHE_NAME = 'cloudstream-favorites-v1';
const META_KEY = 'cloudstream_cache_meta';

export const CacheEngine = {
  // --- METADATA HELPERS ---
  getMeta() {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  },
  saveMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  },

  // --- PLAY FREQUENCY TRACKER ---
  async incrementPlayCount(driveFileId) {
    const meta = this.getMeta();
    if (meta[driveFileId]) {
      meta[driveFileId].playCount += 1;
      meta[driveFileId].lastPlayed = Date.now();
      this.saveMeta(meta);
    }
  },

  // --- CORE EVICTION LOGIC (The Garbage Collector) ---
  async evictLeastPlayed() {
    const meta = this.getMeta();
    const keys = Object.keys(meta);
    if (keys.length === 0) return false;

    const now = Date.now();
    let lowestScoreId = keys[0];
    let lowestScore = Infinity;

    for (const id of keys) {
      const track = meta[id];
      
      // Calculate how many days it has been since this song was last played
      const daysInactive = (now - track.lastPlayed) / (1000 * 60 * 60 * 24);
      
      // The Gravity Formula: Play counts lose weight as they get older
      // We add +1 to prevent division by zero for songs played today
      const score = track.playCount / (daysInactive + 1);

      if (score < lowestScore) {
        lowestScore = score;
        lowestScoreId = id;
      } else if (score === lowestScore) {
        // Tie-breaker: If scores are identical, kick out the older one
        if (track.lastPlayed < meta[lowestScoreId].lastPlayed) {
          lowestScoreId = id;
        }
      }
    }

    console.log(`🧹 Evicting track with lowest score (${lowestScore.toFixed(2)}): ${lowestScoreId}`);
    await this.removeTrack(lowestScoreId);
    return true; // Successfully freed up space
  },

  // --- SAFETY LIMITS ---
  async enforceLimits(neededBytes = 15 * 1024 * 1024) {
    // 1. Check the hard 100-song limit
    let keys = Object.keys(this.getMeta());
    while (keys.length >= 100) {
      await this.evictLeastPlayed();
      keys = Object.keys(this.getMeta()); // Refresh keys
    }

    // 2. Check the physical device storage limit
    if (!navigator.storage || !navigator.storage.estimate) return;
    
    let { usage, quota } = await navigator.storage.estimate();
    const safeQuota = quota * 0.9; // Leave 10% of device storage free for the OS

    // Keep evicting the least played songs until the phone has enough space
    while (usage + neededBytes > safeQuota) {
      const evicted = await this.evictLeastPlayed();
      if (!evicted) break; // Cache is empty, nothing left to delete
      
      const newEstimate = await navigator.storage.estimate();
      usage = newEstimate.usage;
    }
  },

  // --- CACHING LOGIC ---
  async cacheTrack(track, driveToken) {
    if (!track || !driveToken) return;
    
    const cache = await caches.open(CACHE_NAME);
    const url = `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`;

    const existing = await cache.match(url);
    if (existing) return; // Already cached!

    try {
      await this.enforceLimits(); // Ensures we have room (both 100 limit & device limit)

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${driveToken}` }
      });

      if (response.ok) {
        await cache.put(url, response.clone());
        
        // Add it to our frequency metadata dictionary
        const meta = this.getMeta();
        meta[track.driveFileId] = {
          playCount: 1, 
          lastPlayed: Date.now()
        };
        this.saveMeta(meta);
        
        console.log(`✅ Cached favorite track for offline: ${track.title}`);
      }
    } catch (error) {
      console.error("Failed to cache track:", error);
    }
  },

  // --- REMOVAL LOGIC ---
  async removeTrack(driveFileId) {
    const cache = await caches.open(CACHE_NAME);
    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    await cache.delete(url);
    
    // Remove from frequency metadata
    const meta = this.getMeta();
    delete meta[driveFileId];
    this.saveMeta(meta);
  },

  // --- RETRIEVAL LOGIC ---
  async getCachedTrack(driveFileId) {
    const cache = await caches.open(CACHE_NAME);
    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    return await cache.match(url); 
  }
};