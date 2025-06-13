import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Database table schemas
export const TABLE_SCHEMAS = {
  users: {
    id: 'uuid primary key default gen_random_uuid()',
    device_fingerprint: 'text unique not null',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    last_seen: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    total_games_played: 'integer default 0',
    total_play_time: 'integer default 0',
    high_score: 'integer default 0',
    total_score: 'bigint default 0',
    best_combo: 'integer default 0',
    best_perfect_streak: 'integer default 0',
    achievements_unlocked: 'text[] default array[]::text[]',
    current_level: 'integer default 1',
    experience_points: 'integer default 0',
    total_targets_hit: 'integer default 0',
    total_targets_missed: 'integer default 0'
  },
  
  game_sessions: {
    id: 'uuid primary key default gen_random_uuid()',
    user_id: 'uuid references users(id) on delete cascade',
    device_fingerprint: 'text not null',
    start_time: 'timestamp with time zone not null',
    end_time: 'timestamp with time zone not null',
    score: 'integer not null',
    final_combo: 'integer default 0',
    perfect_streak: 'integer default 0',
    achievements_unlocked: 'text[] default array[]::text[]',
    play_duration: 'integer not null',
    targets_hit: 'integer default 0',
    targets_missed: 'integer default 0',
    game_speed: 'decimal default 1.0',
    game_mode: 'text default \'classic\'',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  
  global_leaderboard: {
    id: 'uuid primary key default gen_random_uuid()',
    user_id: 'uuid references users(id) on delete cascade',
    device_fingerprint: 'text not null',
    score: 'integer not null',
    combo: 'integer default 0',
    perfect_streak: 'integer default 0',
    achieved_at: 'timestamp with time zone not null',
    session_id: 'uuid references game_sessions(id)',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  }
};

// Setup database tables
export const setupDatabase = async () => {
  try {
    console.log('Setting up Supabase database...');
    
    // Note: In a real app, you'd run these in Supabase SQL editor
    // For now, we'll create them via the dashboard or handle missing tables gracefully
    
    return { success: true, message: 'Database setup initiated' };
  } catch (error) {
    console.error('Database setup error:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to get or create user by device fingerprint
export const getOrCreateUser = async (deviceFingerprint) => {
  try {
    // First, try to find existing user
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    if (existingUser && !findError) {
      // Update last_seen
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', existingUser.id);
      
      return { data: existingUser, error: null };
    }

    // Create new user if not found
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ device_fingerprint: deviceFingerprint }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return { data: null, error: createError };
    }

    return { data: newUser, error: null };
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    return { data: null, error };
  }
};