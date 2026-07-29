const CACHE_NAME = 'cloudstream-favorites-v1';
const META_KEY = 'cloudstream_cache_meta';

export const CacheEngine = {
  getMeta() {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  },
  saveMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  },

  async incrementPlayCount(driveFileId) {
    const meta = this.getMeta();
    if (meta[driveFileId]) {
      meta[driveFileId].playCount += 1;
      meta[driveFileId].lastPlayed = Date.now();
      this.saveMeta(meta);
    }
  },

  async evictLeastPlayed() {
    const meta = this.getMeta();
    const keys = Object.keys(meta);
    if (keys.length === 0) return false;

    const now = Date.now();
    let lowestScoreId = keys[0];
    let lowestScore = Infinity;

    for (const id of keys) {
      const track = meta[id];
      
      const daysInactive = (now - track.lastPlayed) / (1000 * 60 * 60 * 24);
      
      const score = track.playCount / (daysInactive + 1);

      if (score < lowestScore) {
        lowestScore = score;
        lowestScoreId = id;
      } else if (score === lowestScore) {
        if (track.lastPlayed < meta[lowestScoreId].lastPlayed) {
          lowestScoreId = id;
        }
      }
    }

    console.log(`🧹 Evicting track with lowest score (${lowestScore.toFixed(2)}): ${lowestScoreId}`);
    await this.removeTrack(lowestScoreId);
    return true;
  },

  async enforceLimits(neededBytes = 15 * 1024 * 1024) {
    let keys = Object.keys(this.getMeta());
    while (keys.length >= 100) {
      await this.evictLeastPlayed();
      keys = Object.keys(this.getMeta());
    }

    if (!navigator.storage || !navigator.storage.estimate) return;
    
    let { usage, quota } = await navigator.storage.estimate();
    const safeQuota = quota * 0.9;

    while (usage + neededBytes > safeQuota) {
      const evicted = await this.evictLeastPlayed();
      if (!evicted) break;
      
      const newEstimate = await navigator.storage.estimate();
      usage = newEstimate.usage;
    }
  },

  async cacheTrack(track, driveToken) {
    if (!track || !driveToken) return;
    
    const cache = await caches.open(CACHE_NAME);
    const url = `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`;

    const existing = await cache.match(url);
    if (existing) return;

    try {
      await this.enforceLimits();

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${driveToken}` }
      });

      if (response.ok) {
        await cache.put(url, response.clone());
        
        const meta = this.getMeta();
        meta[track.driveFileId] = {
          playCount: 1, 
          lastPlayed: Date.now()
        };
        this.saveMeta(meta);
        
        console.log(`Cached favorite track for offline: ${track.title}`);
      }
    } catch (error) {
      console.error("Failed to cache track:", error);
    }
  },

  async removeTrack(driveFileId) {
    const cache = await caches.open(CACHE_NAME);
    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    await cache.delete(url);
    
    const meta = this.getMeta();
    delete meta[driveFileId];
    this.saveMeta(meta);
  },

  async getCachedTrack(driveFileId) {
    const cache = await caches.open(CACHE_NAME);
    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    return await cache.match(url); 
  }
};