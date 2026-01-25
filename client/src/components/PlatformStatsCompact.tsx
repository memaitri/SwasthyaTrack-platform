import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, School, FileHeart, Activity, TrendingUp, LogIn } from "lucide-react";

interface PlatformStats {
  // Core platform stats
  totalUsers: number;
  totalStudents: number;
  totalSchools: number;
  todaysActiveUsers: number;
  totalHealthCards: number;
  
  // Visitor stats
  totalVisitors: number;
  todayVisitors: number;
  totalPageViews: number;
  
  // Login stats (bonus)
  totalLoginAttempts: number;
  totalSuccessfulLogins: number;
  todayLoginAttempts: number;
  todaySuccessfulLogins: number;
  loginSuccessRate: number;
  todayLoginSuccessRate: number;
  
  // Metadata
  lastUpdated: string;
  serverTime: string;
}

export function PlatformStatsCompact() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalSchools: 0,
    todaysActiveUsers: 0,
    totalHealthCards: 0,
    totalVisitors: 0,
    todayVisitors: 0,
    totalPageViews: 0,
    totalLoginAttempts: 0,
    totalSuccessfulLogins: 0,
    todayLoginAttempts: 0,
    todaySuccessfulLogins: 0,
    loginSuccessRate: 0,
    todayLoginSuccessRate: 0,
    lastUpdated: new Date().toISOString(),
    serverTime: new Date().toISOString()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Generate or retrieve session ID
    let currentSessionId = sessionStorage.getItem('swasthya-session-id');
    if (!currentSessionId) {
      currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('swasthya-session-id', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Fetch real stats from database API
    const fetchRealStats = async () => {
      try {
        setError(null);
        const response = await fetch('/api/platform-stats', {
          method: 'GET',
          headers: {
            'X-Session-ID': currentSessionId,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update session ID from response if provided
        const responseSessionId = response.headers.get('X-Session-ID');
        if (responseSessionId && responseSessionId !== currentSessionId) {
          sessionStorage.setItem('swasthya-session-id', responseSessionId);
          setSessionId(responseSessionId);
        }
        
        // Validate and set stats with proper type conversion
        setStats({
          totalUsers: Number(data.totalUsers) || 0,
          totalStudents: Number(data.totalStudents) || 0,
          totalSchools: Number(data.totalSchools) || 0,
          todaysActiveUsers: Number(data.todaysActiveUsers) || 0,
          totalHealthCards: Number(data.totalHealthCards) || 0,
          totalVisitors: Number(data.totalVisitors) || 0,
          todayVisitors: Number(data.todayVisitors) || 0,
          totalPageViews: Number(data.totalPageViews) || 0,
          totalLoginAttempts: Number(data.totalLoginAttempts) || 0,
          totalSuccessfulLogins: Number(data.totalSuccessfulLogins) || 0,
          todayLoginAttempts: Number(data.todayLoginAttempts) || 0,
          todaySuccessfulLogins: Number(data.todaySuccessfulLogins) || 0,
          loginSuccessRate: Number(data.loginSuccessRate) || 0,
          todayLoginSuccessRate: Number(data.todayLoginSuccessRate) || 0,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          serverTime: data.serverTime || new Date().toISOString()
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch stats');
        setIsLoading(false);
      }
    };

    fetchRealStats();

    // Update stats every 2 minutes (120000ms) as required
    const interval = setInterval(() => {
      fetchRealStats();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="animate-pulse">
          <div className="h-3 bg-gray-200 rounded mb-2"></div>
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 border-t border-gray-100 bg-red-50/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <Activity className="w-3 h-3 text-red-600" />
          </div>
          <h4 className="text-xs font-semibold text-red-900">Stats Unavailable</h4>
        </div>
        <p className="text-xs text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs text-red-700 underline mt-1"
        >
          Retry
        </button>
      </div>
    );
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-3 border-t border-gray-100 bg-gray-50/50"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center">
          <TrendingUp className="w-3 h-3 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-gray-900">Platform Statistics</h4>
          <p className="text-xs text-gray-500">Real-time database data</p>
        </div>
      </div>

      {/* Compact Stats Grid - Primary Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        {/* Total Users */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Users</span>
          <span className="font-semibold text-gray-900">
            {stats.totalUsers.toLocaleString()}
          </span>
        </div>

        {/* Total Students */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Students</span>
          <span className="font-semibold text-gray-900">
            {stats.totalStudents.toLocaleString()}
          </span>
        </div>

        {/* Total Schools */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Schools</span>
          <span className="font-semibold text-gray-900">
            {stats.totalSchools.toLocaleString()}
          </span>
        </div>

        {/* Total Visitors */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Visitors</span>
          <span className="font-semibold text-gray-900">
            {stats.totalVisitors.toLocaleString()}
          </span>
        </div>

        {/* Today's Active Users */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Today Active</span>
          <span className="font-semibold text-green-600">
            {stats.todaysActiveUsers.toLocaleString()}
          </span>
        </div>

        {/* Today's Visitors */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Today Visits</span>
          <span className="font-semibold text-blue-600">
            {stats.todayVisitors.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Login Stats Section (Bonus) */}
      <div className="border-t border-gray-200 pt-2 mb-3">
        <div className="flex items-center gap-1 mb-2">
          <LogIn className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Login Analytics</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Success Rate</span>
            <span className="font-semibold text-green-600">
              {stats.loginSuccessRate}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Today Rate</span>
            <span className="font-semibold text-blue-600">
              {stats.todayLoginSuccessRate}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Logins</span>
            <span className="font-semibold text-gray-900">
              {stats.totalSuccessfulLogins.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Today Logins</span>
            <span className="font-semibold text-gray-900">
              {stats.todaySuccessfulLogins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Live DB</span>
        </div>
        <span className="text-xs text-gray-500">
          Updated {formatLastUpdated(stats.lastUpdated)}
        </span>
      </div>
    </motion.div>
  );
}