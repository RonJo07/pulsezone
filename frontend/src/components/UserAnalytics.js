import React, { useState, useEffect } from 'react';
import userStorage from '../services/UserStorage';

const UserAnalytics = ({ isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      const data = userStorage.getAnalytics();
      setAnalytics(data);
    }
  }, [isOpen]);

  if (!isOpen || !analytics) return null;

  const { stats, scoreProgression, achievementProgress, recentSessions } = analytics;

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Player Analytics
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-4 mt-4">
            {['overview', 'progress', 'achievements', 'sessions'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
                  <div className="text-2xl font-bold">{stats.highScore || 0}</div>
                  <div className="text-sm opacity-90">High Score</div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-4 text-white">
                  <div className="text-2xl font-bold">{stats.totalGamesPlayed || 0}</div>
                  <div className="text-sm opacity-90">Games Played</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg p-4 text-white">
                  <div className="text-2xl font-bold">{stats.levelProgression?.currentLevel || 1}</div>
                  <div className="text-sm opacity-90">Player Level</div>
                </div>
                <div className="bg-gradient-to-r from-pink-500 to-red-600 rounded-lg p-4 text-white">
                  <div className="text-2xl font-bold">{formatDuration(stats.totalPlayTime || 0)}</div>
                  <div className="text-sm opacity-90">Total Play Time</div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Average Score:</span>
                      <span className="font-medium">{stats.averageScore || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Best Combo:</span>
                      <span className="font-medium">{stats.bestCombo || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Best Perfect Streak:</span>
                      <span className="font-medium">{stats.bestPerfectStreak || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
                      <span className="font-medium">{stats.accuracy || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Today's Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sessions Today:</span>
                      <span className="font-medium">{stats.sessionsToday || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Best Score Today:</span>
                      <span className="font-medium">{stats.bestScoreToday || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Targets Hit:</span>
                      <span className="font-medium">{stats.totalTargetsHit || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Targets Missed:</span>
                      <span className="font-medium">{stats.totalTargetsMissed || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Level Progress */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Level Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Level {stats.levelProgression?.currentLevel || 1}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.levelProgression?.experiencePoints || 0} XP
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((stats.levelProgression?.experiencePoints || 0) % 1000) / 10)}%`
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {1000 - ((stats.levelProgression?.experiencePoints || 0) % 1000)} XP to next level
                  </div>
                </div>
              </div>

              {/* Score Progression Chart */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Score Progression</h3>
                <div className="space-y-2">
                  {scoreProgression.slice(-10).map((session, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(session.date)}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{session.score}</span>
                        <div 
                          className="bg-blue-500 h-2 rounded"
                          style={{width: `${Math.min(100, (session.score / (stats.highScore || 1)) * 100)}px`}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{achievementProgress.unlocked}</div>
                  <div className="text-sm opacity-90">Achievements Unlocked</div>
                  <div className="text-xs opacity-75">
                    {achievementProgress.unlocked} of {achievementProgress.total}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Recent Unlocks</h3>
                  {achievementProgress.recent.length > 0 ? (
                    <div className="space-y-1">
                      {achievementProgress.recent.map((achievement, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          🏆 {achievement}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No achievements unlocked yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Sessions</h3>
              <div className="space-y-3">
                {recentSessions.map((session, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg text-gray-900 dark:text-white">
                          {session.score} points
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(session.endTime)} • {formatDuration(session.playDuration || 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Combo: {session.finalCombo || 0}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Perfect: {session.perfectStreak || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;