// User Storage Service - Local storage with Supabase upgrade path
class UserStorageService {
  constructor() {
    this.storagePrefix = 'pulse-game-';
    this.currentUser = null;
    this.initializeUser();
  }

  // Generate simple device fingerprint
  generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      canvas.toDataURL()
    ].join('|');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Initialize or get existing user
  initializeUser() {
    let userId = localStorage.getItem(this.storagePrefix + 'user-id');
    
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(this.storagePrefix + 'user-id', userId);
    }

    const deviceFingerprint = this.generateDeviceFingerprint();
    
    this.currentUser = {
      id: userId,
      deviceFingerprint,
      createdAt: localStorage.getItem(this.storagePrefix + 'created-at') || new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    // Update last seen
    localStorage.setItem(this.storagePrefix + 'created-at', this.currentUser.createdAt);
    localStorage.setItem(this.storagePrefix + 'last-seen', this.currentUser.lastSeen);
    
    console.log('User initialized:', this.currentUser.id);
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Save game session
  saveGameSession(sessionData) {
    const sessionId = 'session_' + Date.now();
    const session = {
      id: sessionId,
      userId: this.currentUser.id,
      deviceFingerprint: this.currentUser.deviceFingerprint,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime || new Date().toISOString(),
      score: sessionData.score,
      finalCombo: sessionData.finalCombo || 0,
      perfectStreak: sessionData.perfectStreak || 0,
      achievementsUnlocked: sessionData.achievementsUnlocked || [],
      playDuration: sessionData.playDuration,
      targetsHit: sessionData.targetsHit || 0,
      targetsMissed: sessionData.targetsMissed || 0,
      gameSpeed: sessionData.gameSpeed || 1,
      gameMode: sessionData.gameMode || 'classic'
    };

    // Save individual session
    localStorage.setItem(this.storagePrefix + 'session-' + sessionId, JSON.stringify(session));
    
    // Update user stats
    this.updateUserStats(session);
    
    return session;
  }

  // Update user statistics
  updateUserStats(session) {
    const statsKey = this.storagePrefix + 'user-stats';
    let stats = JSON.parse(localStorage.getItem(statsKey) || '{}');

    // Initialize stats if new user
    if (!stats.userId) {
      stats = {
        userId: this.currentUser.id,
        deviceFingerprint: this.currentUser.deviceFingerprint,
        totalGamesPlayed: 0,
        totalPlayTime: 0,
        highScore: 0,
        totalScore: 0,
        averageScore: 0,
        bestCombo: 0,
        bestPerfectStreak: 0,
        totalTargetsHit: 0,
        totalTargetsMissed: 0,
        accuracy: 0,
        achievementsUnlocked: [],
        levelProgression: {
          currentLevel: 1,
          experiencePoints: 0
        },
        dailyStats: {},
        weeklyStats: {},
        monthlyStats: {},
        firstPlayDate: new Date().toISOString(),
        lastPlayDate: new Date().toISOString(),
        sessionsToday: 0,
        bestScoreToday: 0
      };
    }

    // Update stats with new session
    const today = new Date().toISOString().split('T')[0];
    
    stats.totalGamesPlayed += 1;
    stats.totalPlayTime += session.playDuration || 0;
    stats.totalScore += session.score;
    stats.averageScore = Math.round(stats.totalScore / stats.totalGamesPlayed);
    stats.lastPlayDate = session.endTime;
    
    if (session.score > stats.highScore) {
      stats.highScore = session.score;
    }
    
    if (session.finalCombo > stats.bestCombo) {
      stats.bestCombo = session.finalCombo;
    }
    
    if (session.perfectStreak > stats.bestPerfectStreak) {
      stats.bestPerfectStreak = session.perfectStreak;
    }

    stats.totalTargetsHit += session.targetsHit || 0;
    stats.totalTargetsMissed += session.targetsMissed || 0;
    
    if (stats.totalTargetsHit + stats.totalTargetsMissed > 0) {
      stats.accuracy = Math.round((stats.totalTargetsHit / (stats.totalTargetsHit + stats.totalTargetsMissed)) * 100);
    }

    // Merge achievements
    if (session.achievementsUnlocked && session.achievementsUnlocked.length > 0) {
      const newAchievements = session.achievementsUnlocked.filter(
        achievement => !stats.achievementsUnlocked.includes(achievement)
      );
      stats.achievementsUnlocked.push(...newAchievements);
    }

    // Daily stats
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = {
        gamesPlayed: 0,
        totalScore: 0,
        highScore: 0,
        playTime: 0
      };
      stats.sessionsToday = 0;
      stats.bestScoreToday = 0;
    }

    stats.dailyStats[today].gamesPlayed += 1;
    stats.dailyStats[today].totalScore += session.score;
    stats.dailyStats[today].playTime += session.playDuration || 0;
    stats.sessionsToday = stats.dailyStats[today].gamesPlayed;

    if (session.score > stats.dailyStats[today].highScore) {
      stats.dailyStats[today].highScore = session.score;
      stats.bestScoreToday = session.score;
    }

    // Experience points and leveling
    const xpGained = Math.floor(session.score / 10);
    stats.levelProgression.experiencePoints += xpGained;
    
    // Simple leveling system
    const xpForNextLevel = stats.levelProgression.currentLevel * 1000;
    if (stats.levelProgression.experiencePoints >= xpForNextLevel) {
      stats.levelProgression.currentLevel += 1;
      console.log('Level up! Now level:', stats.levelProgression.currentLevel);
    }

    localStorage.setItem(statsKey, JSON.stringify(stats));
    return stats;
  }

  // Get user statistics
  getUserStats() {
    const statsKey = this.storagePrefix + 'user-stats';
    return JSON.parse(localStorage.getItem(statsKey) || '{}');
  }

  // Get recent sessions
  getRecentSessions(limit = 10) {
    const sessions = [];
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.storagePrefix + 'session-')
    );
    
    keys.forEach(key => {
      try {
        const session = JSON.parse(localStorage.getItem(key));
        sessions.push(session);
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    });

    return sessions
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
      .slice(0, limit);
  }

  // Get leaderboard data (local for now)
  getLeaderboard(limit = 10) {
    const stats = this.getUserStats();
    
    // For now, return user's own scores from recent sessions
    const sessions = this.getRecentSessions(50);
    const topScores = sessions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((session, index) => ({
        rank: index + 1,
        score: session.score,
        date: session.endTime,
        combo: session.finalCombo,
        perfectStreak: session.perfectStreak,
        playDuration: session.playDuration
      }));

    return {
      userStats: stats,
      topScores,
      globalRank: 1, // Will be real when connected to Supabase
      totalPlayers: 1 // Will be real when connected to Supabase
    };
  }

  // Analytics data for charts
  getAnalytics() {
    const stats = this.getUserStats();
    const sessions = this.getRecentSessions(30);

    // Score progression over time
    const scoreProgression = sessions.map(session => ({
      date: session.endTime.split('T')[0],
      score: session.score,
      combo: session.finalCombo
    })).reverse();

    // Play time by day
    const playTimeByDay = {};
    sessions.forEach(session => {
      const date = session.endTime.split('T')[0];
      playTimeByDay[date] = (playTimeByDay[date] || 0) + (session.playDuration || 0);
    });

    // Achievement progress
    const achievementProgress = {
      unlocked: stats.achievementsUnlocked ? stats.achievementsUnlocked.length : 0,
      total: 5, // Total achievements available
      recent: stats.achievementsUnlocked ? stats.achievementsUnlocked.slice(-3) : []
    };

    return {
      stats,
      scoreProgression,
      playTimeByDay,
      achievementProgress,
      recentSessions: sessions.slice(0, 10)
    };
  }

  // Export user data (for backup or migration)
  exportUserData() {
    const userData = {
      user: this.currentUser,
      stats: this.getUserStats(),
      sessions: this.getRecentSessions(100),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    return userData;
  }

  // Clear all user data
  clearAllData() {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.storagePrefix)
    );
    
    keys.forEach(key => localStorage.removeItem(key));
    this.initializeUser();
    
    console.log('All user data cleared');
  }

  // Prepare for Supabase sync (future implementation)
  async syncWithSupabase(supabaseClient, apiKey) {
    console.log('Supabase sync will be implemented here');
    // This method will sync local data with Supabase when keys are available
    
    // 1. Upload local sessions to Supabase
    // 2. Download any existing data for this device
    // 3. Merge and resolve conflicts
    // 4. Set up real-time sync
    
    return { success: false, message: 'Supabase integration pending' };
  }
}

// Create and export singleton instance
const userStorage = new UserStorageService();
export default userStorage;