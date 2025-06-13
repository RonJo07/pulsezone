import { supabase, getOrCreateUser } from '../lib/supabase';
import userStorage from './UserStorage';

class SupabaseStorageService {
  constructor() {
    this.isConnected = false;
    this.currentUser = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.init();
  }

  async init() {
    try {
      // Test connection
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        if (error.message.includes('relation "users" does not exist')) {
          console.log('Database tables need to be created. Please create them in Supabase dashboard.');
          await this.createTables();
        } else {
          throw error;
        }
      }
      
      this.isConnected = true;
      console.log('✅ Supabase connected successfully');
      
      // Migrate local data if user exists
      await this.migrateLocalData();
      
    } catch (error) {
      console.log('⚠️ Supabase connection failed, using local storage:', error.message);
      this.isConnected = false;
    }
  }

  async createTables() {
    console.log('Creating database tables...');
    
    // Users table
    const usersSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_fingerprint TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        total_games_played INTEGER DEFAULT 0,
        total_play_time INTEGER DEFAULT 0,
        high_score INTEGER DEFAULT 0,
        total_score BIGINT DEFAULT 0,
        best_combo INTEGER DEFAULT 0,
        best_perfect_streak INTEGER DEFAULT 0,
        achievements_unlocked TEXT[] DEFAULT ARRAY[]::TEXT[],
        current_level INTEGER DEFAULT 1,
        experience_points INTEGER DEFAULT 0,
        total_targets_hit INTEGER DEFAULT 0,
        total_targets_missed INTEGER DEFAULT 0
      );
    `;

    // Game sessions table
    const sessionsSQL = `
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint TEXT NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        score INTEGER NOT NULL,
        final_combo INTEGER DEFAULT 0,
        perfect_streak INTEGER DEFAULT 0,
        achievements_unlocked TEXT[] DEFAULT ARRAY[]::TEXT[],
        play_duration INTEGER NOT NULL,
        targets_hit INTEGER DEFAULT 0,
        targets_missed INTEGER DEFAULT 0,
        game_speed DECIMAL DEFAULT 1.0,
        game_mode TEXT DEFAULT 'classic',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;

    // Global leaderboard table
    const leaderboardSQL = `
      CREATE TABLE IF NOT EXISTS global_leaderboard (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint TEXT NOT NULL,
        score INTEGER NOT NULL,
        combo INTEGER DEFAULT 0,
        perfect_streak INTEGER DEFAULT 0,
        achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
        session_id UUID REFERENCES game_sessions(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;

    // Note: These should be run in Supabase SQL editor
    console.log('Please run these SQL commands in your Supabase SQL editor:');
    console.log('1. Users table:', usersSQL);
    console.log('2. Sessions table:', sessionsSQL);
    console.log('3. Leaderboard table:', leaderboardSQL);
    
    return { success: false, message: 'Please create tables manually in Supabase dashboard' };
  }

  async migrateLocalData() {
    try {
      const localUser = userStorage.getCurrentUser();
      if (!localUser?.deviceFingerprint) return;

      // Get or create cloud user
      const { data: cloudUser, error } = await getOrCreateUser(localUser.deviceFingerprint);
      if (error || !cloudUser) {
        console.log('Could not create/find cloud user:', error);
        return;
      }

      this.currentUser = cloudUser;

      // Migrate local stats if cloud user has no games
      if (cloudUser.total_games_played === 0) {
        console.log('Migrating local data to cloud...');
        
        const localStats = userStorage.getUserStats();
        const localSessions = userStorage.getRecentSessions(50);

        // Update user stats
        if (localStats.totalGamesPlayed > 0) {
          await supabase
            .from('users')
            .update({
              total_games_played: localStats.totalGamesPlayed,
              total_play_time: localStats.totalPlayTime,
              high_score: localStats.highScore,
              total_score: localStats.totalScore,
              best_combo: localStats.bestCombo,
              best_perfect_streak: localStats.bestPerfectStreak,
              achievements_unlocked: localStats.achievementsUnlocked || [],
              current_level: localStats.levelProgression?.currentLevel || 1,
              experience_points: localStats.levelProgression?.experiencePoints || 0,
              total_targets_hit: localStats.totalTargetsHit || 0,
              total_targets_missed: localStats.totalTargetsMissed || 0
            })
            .eq('id', cloudUser.id);
        }

        // Migrate sessions
        if (localSessions.length > 0) {
          const sessionsToInsert = localSessions.map(session => ({
            user_id: cloudUser.id,
            device_fingerprint: localUser.deviceFingerprint,
            start_time: session.startTime,
            end_time: session.endTime,
            score: session.score,
            final_combo: session.finalCombo || 0,
            perfect_streak: session.perfectStreak || 0,
            achievements_unlocked: session.achievementsUnlocked || [],
            play_duration: session.playDuration || 0,
            targets_hit: session.targetsHit || 0,
            targets_missed: session.targetsMissed || 0,
            game_speed: session.gameSpeed || 1.0,
            game_mode: session.gameMode || 'classic'
          }));

          await supabase
            .from('game_sessions')
            .insert(sessionsToInsert);
        }

        console.log('✅ Local data migrated to cloud successfully');
      }

    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  async saveGameSession(sessionData) {
    if (!this.isConnected) {
      return userStorage.saveGameSession(sessionData);
    }

    try {
      const localUser = userStorage.getCurrentUser();
      
      // Get or create cloud user
      const { data: cloudUser, error: userError } = await getOrCreateUser(localUser.deviceFingerprint);
      if (userError) throw userError;

      // Save session to cloud
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert([{
          user_id: cloudUser.id,
          device_fingerprint: localUser.deviceFingerprint,
          start_time: sessionData.startTime,
          end_time: sessionData.endTime || new Date().toISOString(),
          score: sessionData.score,
          final_combo: sessionData.finalCombo || 0,
          perfect_streak: sessionData.perfectStreak || 0,
          achievements_unlocked: sessionData.achievementsUnlocked || [],
          play_duration: sessionData.playDuration || 0,
          targets_hit: sessionData.targetsHit || 0,
          targets_missed: sessionData.targetsMissed || 0,
          game_speed: sessionData.gameSpeed || 1.0,
          game_mode: sessionData.gameMode || 'classic'
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Update user stats
      await this.updateUserStats(cloudUser.id, sessionData);

      // Update leaderboard if high score
      if (sessionData.score > cloudUser.high_score) {
        await supabase
          .from('global_leaderboard')
          .insert([{
            user_id: cloudUser.id,
            device_fingerprint: localUser.deviceFingerprint,
            score: sessionData.score,
            combo: sessionData.finalCombo || 0,
            perfect_streak: sessionData.perfectStreak || 0,
            achieved_at: sessionData.endTime || new Date().toISOString(),
            session_id: session.id
          }]);
      }

      console.log('✅ Session saved to cloud');
      return session;

    } catch (error) {
      console.error('Cloud save failed, using local storage:', error);
      return userStorage.saveGameSession(sessionData);
    }
  }

  async updateUserStats(userId, sessionData) {
    try {
      // Get current user stats
      const { data: currentUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!currentUser) return;

      // Calculate new stats
      const newStats = {
        total_games_played: currentUser.total_games_played + 1,
        total_play_time: currentUser.total_play_time + (sessionData.playDuration || 0),
        total_score: currentUser.total_score + sessionData.score,
        high_score: Math.max(currentUser.high_score, sessionData.score),
        best_combo: Math.max(currentUser.best_combo, sessionData.finalCombo || 0),
        best_perfect_streak: Math.max(currentUser.best_perfect_streak, sessionData.perfectStreak || 0),
        total_targets_hit: currentUser.total_targets_hit + (sessionData.targetsHit || 0),
        total_targets_missed: currentUser.total_targets_missed + (sessionData.targetsMissed || 0),
        last_seen: new Date().toISOString()
      };

      // Merge achievements
      const currentAchievements = currentUser.achievements_unlocked || [];
      const newAchievements = sessionData.achievementsUnlocked || [];
      const allAchievements = [...new Set([...currentAchievements, ...newAchievements])];
      newStats.achievements_unlocked = allAchievements;

      // Update experience and level
      const xpGained = Math.floor(sessionData.score / 10);
      const newXP = currentUser.experience_points + xpGained;
      const newLevel = Math.floor(newXP / 1000) + 1;
      
      newStats.experience_points = newXP;
      newStats.current_level = Math.max(currentUser.current_level, newLevel);

      // Update in database
      await supabase
        .from('users')
        .update(newStats)
        .eq('id', userId);

    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  async getGlobalLeaderboard(limit = 10) {
    if (!this.isConnected) {
      return userStorage.getLeaderboard(limit);
    }

    try {
      const { data, error } = await supabase
        .from('global_leaderboard')
        .select(`
          id,
          score,
          combo,
          perfect_streak,
          achieved_at,
          device_fingerprint,
          users!inner(
            current_level,
            total_games_played
          )
        `)
        .order('score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const leaderboard = data.map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        combo: entry.combo,
        perfectStreak: entry.perfect_streak,
        achievedAt: entry.achieved_at,
        playerLevel: entry.users.current_level,
        gamesPlayed: entry.users.total_games_played,
        deviceId: entry.device_fingerprint.slice(-6) // Show last 6 chars for privacy
      }));

      // Get current user's position
      const localUser = userStorage.getCurrentUser();
      const { data: userRank } = await supabase
        .from('global_leaderboard')
        .select('score')
        .eq('device_fingerprint', localUser.deviceFingerprint)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      let userPosition = null;
      if (userRank) {
        const { count } = await supabase
          .from('global_leaderboard')
          .select('*', { count: 'exact', head: true })
          .gt('score', userRank.score);
        
        userPosition = (count || 0) + 1;
      }

      // Get total players count
      const { count: totalPlayers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      return {
        globalLeaderboard: leaderboard,
        userPosition,
        totalPlayers: totalPlayers || 1,
        userBestScore: userRank?.score || 0
      };

    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
      return userStorage.getLeaderboard(limit);
    }
  }

  async getUserAnalytics() {
    if (!this.isConnected) {
      return userStorage.getAnalytics();
    }

    try {
      const localUser = userStorage.getCurrentUser();
      
      // Get user stats
      const { data: cloudUser } = await supabase
        .from('users')
        .select('*')
        .eq('device_fingerprint', localUser.deviceFingerprint)
        .single();

      // Get recent sessions
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('device_fingerprint', localUser.deviceFingerprint)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!cloudUser || !sessions) {
        return userStorage.getAnalytics();
      }

      // Process analytics
      const analytics = {
        stats: {
          userId: cloudUser.id,
          totalGamesPlayed: cloudUser.total_games_played,
          totalPlayTime: cloudUser.total_play_time,
          highScore: cloudUser.high_score,
          totalScore: cloudUser.total_score,
          averageScore: cloudUser.total_games_played > 0 ? Math.round(cloudUser.total_score / cloudUser.total_games_played) : 0,
          bestCombo: cloudUser.best_combo,
          bestPerfectStreak: cloudUser.best_perfect_streak,
          totalTargetsHit: cloudUser.total_targets_hit,
          totalTargetsMissed: cloudUser.total_targets_missed,
          accuracy: cloudUser.total_targets_hit + cloudUser.total_targets_missed > 0 
            ? Math.round((cloudUser.total_targets_hit / (cloudUser.total_targets_hit + cloudUser.total_targets_missed)) * 100) 
            : 0,
          achievementsUnlocked: cloudUser.achievements_unlocked || [],
          levelProgression: {
            currentLevel: cloudUser.current_level,
            experiencePoints: cloudUser.experience_points
          }
        },
        scoreProgression: sessions.map(session => ({
          date: session.end_time.split('T')[0],
          score: session.score,
          combo: session.final_combo
        })).reverse(),
        recentSessions: sessions.map(session => ({
          id: session.id,
          score: session.score,
          endTime: session.end_time,
          playDuration: session.play_duration,
          finalCombo: session.final_combo,
          perfectStreak: session.perfect_streak
        }))
      };

      return analytics;

    } catch (error) {
      console.error('Error fetching cloud analytics:', error);
      return userStorage.getAnalytics();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasCloudUser: !!this.currentUser,
      syncStatus: this.isConnected ? 'synced' : 'local-only'
    };
  }
}

// Create and export singleton
const supabaseStorage = new SupabaseStorageService();
export default supabaseStorage;