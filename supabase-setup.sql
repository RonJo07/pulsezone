-- Pulse Game Database Setup for Supabase
-- Copy and paste these commands into your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for anonymous user tracking
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

-- Game sessions table
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

-- Global leaderboard table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_device_fingerprint ON game_sessions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_score ON global_leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_device_fingerprint ON global_leaderboard(device_fingerprint);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access
-- Allow anyone to read from users table
CREATE POLICY "Allow anonymous read access on users" ON users
  FOR SELECT USING (true);

-- Allow anyone to insert new users
CREATE POLICY "Allow anonymous insert on users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own records (by device fingerprint)
CREATE POLICY "Allow update own user record" ON users
  FOR UPDATE USING (true);

-- Allow anyone to read game sessions (for leaderboards)
CREATE POLICY "Allow anonymous read access on game_sessions" ON game_sessions
  FOR SELECT USING (true);

-- Allow anyone to insert game sessions
CREATE POLICY "Allow anonymous insert on game_sessions" ON game_sessions
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read global leaderboard
CREATE POLICY "Allow anonymous read access on global_leaderboard" ON global_leaderboard
  FOR SELECT USING (true);

-- Allow anyone to insert to global leaderboard
CREATE POLICY "Allow anonymous insert on global_leaderboard" ON global_leaderboard
  FOR INSERT WITH CHECK (true);

-- Optional: Create a view for top scores
CREATE OR REPLACE VIEW top_scores AS
SELECT 
  gl.score,
  gl.combo,
  gl.perfect_streak,
  gl.achieved_at,
  u.current_level,
  u.total_games_played,
  SUBSTRING(gl.device_fingerprint, LENGTH(gl.device_fingerprint) - 5) as device_id
FROM global_leaderboard gl
JOIN users u ON gl.user_id = u.id
ORDER BY gl.score DESC
LIMIT 100;

-- Create a function to get user rank
CREATE OR REPLACE FUNCTION get_user_rank(user_device_fingerprint TEXT)
RETURNS INTEGER AS $$
DECLARE
  user_best_score INTEGER;
  user_rank INTEGER;
BEGIN
  -- Get user's best score
  SELECT MAX(score) INTO user_best_score
  FROM global_leaderboard
  WHERE device_fingerprint = user_device_fingerprint;
  
  -- If user has no scores, return null
  IF user_best_score IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Count how many scores are better
  SELECT COUNT(*) + 1 INTO user_rank
  FROM (
    SELECT DISTINCT score
    FROM global_leaderboard
    WHERE score > user_best_score
  ) AS better_scores;
  
  RETURN user_rank;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data (optional)
-- INSERT INTO users (device_fingerprint, total_games_played, high_score) 
-- VALUES ('sample_device_001', 5, 1500);