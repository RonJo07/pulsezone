import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import UserAnalytics from './components/UserAnalytics';
import supabaseStorage from './services/SupabaseStorage';

// Game constants
const GAME_STATES = {
  SPLASH: 'splash',
  MENU: 'menu', 
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  LEADERBOARD: 'leaderboard',
  ACHIEVEMENTS: 'achievements'
};

const ACHIEVEMENTS = [
  { id: 'first_game', name: 'First Steps', description: 'Play your first game', requirement: 1, icon: '🎯' },
  { id: 'score_100', name: 'Century', description: 'Score 100 points', requirement: 100, icon: '💯' },
  { id: 'score_500', name: 'High Flyer', description: 'Score 500 points', requirement: 500, icon: '🚀' },
  { id: 'perfect_10', name: 'Perfect Streak', description: 'Get 10 perfect taps in a row', requirement: 10, icon: '⭐' },
  { id: 'games_played_50', name: 'Dedicated', description: 'Play 50 games', requirement: 50, icon: '🏆' }
];

function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('pulse-theme');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.SPLASH);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('pulse-high-score') || '0');
  });
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [targets, setTargets] = useState([]);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(() => {
    return parseInt(localStorage.getItem('pulse-games-played') || '0');
  });
  const [gameStartTime, setGameStartTime] = useState(null);
  const [targetsHit, setTargetsHit] = useState(0);
  const [targetsMissed, setTargetsMissed] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false, syncStatus: 'checking' });

  // Achievement state
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    const saved = localStorage.getItem('pulse-achievements');
    return saved ? JSON.parse(saved) : [];
  });
  const [newAchievement, setNewAchievement] = useState(null);

  // Refs
  const gameIntervalRef = useRef(null);
  const targetIdRef = useRef(0);
  const gameContainerRef = useRef(null);

  // Audio context for sound effects
  const audioContextRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  // Play sound effect
  const playSound = useCallback((frequency, duration = 0.1, type = 'sine') => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.log('Audio not available');
    }
  }, []);

  // Initialize Supabase storage and get connection status
  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(supabaseStorage.getConnectionStatus());
    };
    
    updateStatus();
    
    // Check status periodically
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('pulse-theme', JSON.stringify(newTheme));
  };

  // Check and unlock achievements
  const checkAchievements = useCallback((gameScore, streak, games) => {
    const newlyUnlocked = [];
    
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id)) {
        let shouldUnlock = false;
        
        switch (achievement.id) {
          case 'first_game':
            shouldUnlock = games >= 1;
            break;
          case 'score_100':
            shouldUnlock = gameScore >= 100;
            break;
          case 'score_500':
            shouldUnlock = gameScore >= 500;
            break;
          case 'perfect_10':
            shouldUnlock = streak >= 10;
            break;
          case 'games_played_50':
            shouldUnlock = games >= 50;
            break;
        }
        
        if (shouldUnlock) {
          newlyUnlocked.push(achievement.id);
        }
      }
    });
    
    if (newlyUnlocked.length > 0) {
      const updatedAchievements = [...unlockedAchievements, ...newlyUnlocked];
      setUnlockedAchievements(updatedAchievements);
      localStorage.setItem('pulse-achievements', JSON.stringify(updatedAchievements));
      
      // Show achievement notification
      const achievement = ACHIEVEMENTS.find(a => a.id === newlyUnlocked[0]);
      setNewAchievement(achievement);
      playSound(800, 0.3);
      setTimeout(() => setNewAchievement(null), 3000);
    }
  }, [unlockedAchievements, playSound]);

  // Generate random target
  const generateTarget = useCallback(() => {
    if (!gameContainerRef.current) return null;
    
    const container = gameContainerRef.current.getBoundingClientRect();
    const size = Math.max(40, 80 - gameSpeed * 5);
    const margin = size;
    
    return {
      id: targetIdRef.current++,
      x: Math.random() * (container.width - size - margin * 2) + margin,
      y: Math.random() * (container.height - size - margin * 2) + margin,
      size,
      timeLeft: Math.max(800, 2000 - gameSpeed * 100),
      maxTime: Math.max(800, 2000 - gameSpeed * 100),
      perfectWindow: 0.3
    };
  }, [gameSpeed]);

  // Start game
  const startGame = () => {
    setGameState(GAME_STATES.PLAYING);
    setScore(0);
    setLives(3);
    setCombo(0);
    setTargets([]);
    setGameSpeed(1);
    setPerfectStreak(0);
    setTargetsHit(0);
    setTargetsMissed(0);
    setGameStartTime(new Date().toISOString());
    targetIdRef.current = 0;
    
    // Add first target
    const firstTarget = generateTarget();
    if (firstTarget) {
      setTargets([firstTarget]);
    }
    
    // Start game loop
    gameIntervalRef.current = setInterval(() => {
      setTargets(prev => {
        const updated = prev.map(target => ({
          ...target,
          timeLeft: target.timeLeft - 50
        })).filter(target => {
          if (target.timeLeft <= 0) {
            setLives(l => l - 1);
            setTargetsMissed(prev => prev + 1);
            playSound(200, 0.2);
            setCombo(0);
            setPerfectStreak(0);
            return false;
          }
          return true;
        });
        
        // Add new targets randomly
        if (Math.random() < 0.02 + gameSpeed * 0.01) {
          const newTarget = generateTarget();
          if (newTarget && updated.length < 3) {
            updated.push(newTarget);
          }
        }
        
        return updated;
      });
      
      // Increase speed gradually
      setGameSpeed(prev => Math.min(prev + 0.001, 3));
    }, 50);
  };

  // Handle target tap
  const handleTargetTap = (targetId) => {
    setTargets(prev => {
      const target = prev.find(t => t.id === targetId);
      if (!target) return prev;
      
      const timeRemaining = target.timeLeft / target.maxTime;
      const isPerfect = timeRemaining >= target.perfectWindow;
      
      let points = 10;
      if (isPerfect) {
        points = 20;
        setPerfectStreak(s => s + 1);
        playSound(600, 0.1);
      } else {
        setPerfectStreak(0);
        playSound(400, 0.1);
      }
      
      setCombo(c => c + 1);
      setScore(s => s + points + Math.floor(combo / 5) * 5);
      setTargetsHit(prev => prev + 1);
      
      return prev.filter(t => t.id !== targetId);
    });
  };

  // End game
  const endGame = useCallback(async () => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
    
    const endTime = new Date().toISOString();
    const playDuration = gameStartTime ? Math.floor((new Date(endTime) - new Date(gameStartTime)) / 1000) : 0;
    
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    localStorage.setItem('pulse-games-played', newGamesPlayed.toString());
    
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('pulse-high-score', score.toString());
      playSound(1000, 0.5);
    }
    
    // Save game session to Supabase (with local fallback)
    const sessionData = {
      startTime: gameStartTime,
      endTime,
      score,
      finalCombo: combo,
      perfectStreak,
      achievementsUnlocked: unlockedAchievements.filter(id => 
        !localStorage.getItem(`pulse-achievement-${id}-notified`)
      ),
      playDuration,
      targetsHit,
      targetsMissed,
      gameSpeed,
      gameMode: 'classic'
    };
    
    try {
      await supabaseStorage.saveGameSession(sessionData);
      console.log('✅ Game session saved successfully');
    } catch (error) {
      console.error('Error saving game session:', error);
    }
    
    checkAchievements(score, perfectStreak, newGamesPlayed);
    setGameState(GAME_STATES.GAME_OVER);
  }, [score, highScore, perfectStreak, gamesPlayed, gameStartTime, combo, targetsHit, targetsMissed, gameSpeed, unlockedAchievements, checkAchievements]);

  // Check game over condition
  useEffect(() => {
    if (gameState === GAME_STATES.PLAYING && lives <= 0) {
      endGame();
    }
  }, [lives, gameState, endGame]);

  // Share score
  const shareScore = async () => {
    const shareData = {
      title: 'Pulse Game',
      text: `I just scored ${score} points in Pulse! Can you beat my score?`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers without Web Share API
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(url, '_blank');
      }
      playSound(500, 0.2);
    } catch (error) {
      console.log('Share failed:', error);
    }
  };

  // Splash screen timeout
  useEffect(() => {
    if (gameState === GAME_STATES.SPLASH) {
      const timer = setTimeout(() => {
        setGameState(GAME_STATES.MENU);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  const themeClasses = isDarkMode 
    ? 'bg-gray-900 text-white' 
    : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900';

  return (
    <div className={`min-h-screen transition-all duration-300 ${themeClasses}`}>
      {/* Achievement Notification */}
      {newAchievement && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 text-black px-6 py-3 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{newAchievement.icon}</span>
            <div>
              <div className="font-bold">{newAchievement.name}</div>
              <div className="text-sm">{newAchievement.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-40 p-3 rounded-full bg-opacity-20 bg-white backdrop-blur-sm border border-white border-opacity-30 hover:bg-opacity-30 transition-all"
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      {/* Splash Screen */}
      {gameState === GAME_STATES.SPLASH && (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
              PULSE
            </h1>
            <p className="text-xl mb-8">Tap • Time • Triumph</p>
            <div className="text-sm opacity-70">
              From <a href="https://techwithron.co.in" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-100">TechWithRon</a>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {gameState === GAME_STATES.MENU && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              PULSE
            </h1>
            <p className="text-lg opacity-80">High Score: {highScore}</p>
          </div>
          
          <div className="space-y-4 w-full max-w-xs">
            <button
              onClick={startGame}
              className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              START GAME
            </button>
            
            <button
              onClick={() => setGameState(GAME_STATES.LEADERBOARD)}
              className="w-full py-3 px-8 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-30 rounded-xl font-medium hover:bg-opacity-20 transition-all"
            >
              LEADERBOARD
            </button>
            
            <button
              onClick={() => setGameState(GAME_STATES.ACHIEVEMENTS)}
              className="w-full py-3 px-8 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-30 rounded-xl font-medium hover:bg-opacity-20 transition-all"
            >
              ACHIEVEMENTS ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
            </button>
            
            <button
              onClick={() => setShowAnalytics(true)}
              className="w-full py-3 px-8 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-30 rounded-xl font-medium hover:bg-opacity-20 transition-all"
            >
              PLAYER ANALYTICS
            </button>
          </div>
          
          {/* Connection Status */}
          <div className="mt-6 text-center text-xs opacity-60">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>{connectionStatus.isConnected ? 'Cloud Sync Active' : 'Local Storage'}</span>
            </div>
          </div>
          
          <div className="mt-12 text-center text-sm opacity-70">
            <p>Created by <a href="https://techwithron.co.in" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-100">TechWithRon</a></p>
          </div>
        </div>
      )}

      {/* Game Screen */}
      {gameState === GAME_STATES.PLAYING && (
        <div className="min-h-screen flex flex-col">
          {/* Game HUD */}
          <div className="flex justify-between items-center p-4 bg-black bg-opacity-20 backdrop-blur-sm">
            <div className="flex space-x-4">
              <div className="text-lg font-bold">Score: {score}</div>
              <div className="text-lg">Combo: {combo}</div>
            </div>
            <div className="flex space-x-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < lives ? 'bg-red-500' : 'bg-gray-500'}`}
                />
              ))}
            </div>
          </div>
          
          {/* Game Area */}
          <div
            ref={gameContainerRef}
            className="flex-1 relative overflow-hidden"
            style={{ minHeight: '500px' }}
          >
            {targets.map(target => {
              const progress = target.timeLeft / target.maxTime;
              const ringSize = target.size + (1 - progress) * 20;
              
              return (
                <div
                  key={target.id}
                  className="absolute"
                  style={{
                    left: target.x,
                    top: target.y,
                    width: target.size,
                    height: target.size
                  }}
                  onClick={() => handleTargetTap(target.id)}
                >
                  {/* Outer ring */}
                  <div
                    className="absolute border-4 border-blue-400 rounded-full pointer-events-none"
                    style={{
                      width: ringSize,
                      height: ringSize,
                      left: (target.size - ringSize) / 2,
                      top: (target.size - ringSize) / 2,
                      opacity: progress
                    }}
                  />
                  
                  {/* Target circle */}
                  <div
                    className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg"
                    style={{
                      opacity: 0.8 + progress * 0.2
                    }}
                  />
                  
                  {/* Perfect timing indicator */}
                  {progress >= target.perfectWindow && (
                    <div className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GAME_STATES.GAME_OVER && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
            <div className="space-y-2 text-lg">
              <p>Final Score: <span className="font-bold text-blue-500">{score}</span></p>
              <p>Best Combo: <span className="font-bold text-purple-500">{combo}</span></p>
              {score > highScore && (
                <p className="text-yellow-500 font-bold animate-pulse">🎉 NEW HIGH SCORE! 🎉</p>
              )}
            </div>
          </div>
          
          <div className="space-y-4 w-full max-w-xs">
            <button
              onClick={startGame}
              className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              PLAY AGAIN
            </button>
            
            <button
              onClick={shareScore}
              className="w-full py-3 px-8 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              SHARE SCORE
            </button>
            
            <button
              onClick={() => setGameState(GAME_STATES.MENU)}
              className="w-full py-3 px-8 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-30 rounded-xl font-medium hover:bg-opacity-20 transition-all"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === GAME_STATES.LEADERBOARD && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Leaderboard</h2>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
              <div className="text-lg mb-2">Your Best Score</div>
              <div className="text-3xl font-bold text-blue-500">{highScore}</div>
              <div className="text-sm opacity-70 mt-2">Games Played: {gamesPlayed}</div>
            </div>
            
            <div className="mt-6 text-center text-sm">
              {connectionStatus.isConnected ? (
                <div className="space-y-2">
                  <p className="text-green-400">🌐 Connected to Global Leaderboard</p>
                  <p className="opacity-70">Competing with players worldwide!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-yellow-400">📱 Local Leaderboard</p>
                  <p className="opacity-70">Connect to internet for global rankings</p>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setGameState(GAME_STATES.MENU)}
            className="py-3 px-8 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-30 rounded-xl font-medium hover:bg-opacity-20 transition-all"
          >
            BACK TO MENU
          </button>
        </div>
      )}

      {/* Achievements Screen */}
      {gameState === GAME_STATES.ACHIEVEMENTS && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Achievements</h2>
            <p className="text-lg opacity-80">{unlockedAchievements.length} of {ACHIEVEMENTS.length} unlocked</p>
          </div>
          
          <div className="w-full max-w-md space-y-3 mb-8">
            {ACHIEVEMENTS.map(achievement => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-yellow-400'
                      : 'bg-white bg-opacity-10 backdrop-blur-sm border-white border-opacity-30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <div className={`font-bold ${isUnlocked ? 'text-black' : ''}`}>
                        {achievement.name}
                      </div>
                      <div className={`text-sm ${isUnlocked ? 'text-black opacity-80' : 'opacity-70'}`}>
                        {achievement.description}
                      </div>
                    </div>
                    {isUnlocked && <span className="text-xl">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => setGameState(GAME_STATES.MENU)}
            className="py-3 px-8 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-30 rounded-xl font-medium hover:bg-opacity-20 transition-all"
          >
            BACK TO MENU
          </button>
        </div>
      )}

      {/* User Analytics Modal */}
      <UserAnalytics 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
      />
    </div>
  );
}

export default App;