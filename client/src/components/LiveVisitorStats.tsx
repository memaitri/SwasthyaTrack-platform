import { useState, useEffect } from "react";
import { StatsCard } from "./StatsCard";
import { Users, Clock, Activity } from "lucide-react";

interface StatsData {
  totalVisitors: number;
  visitorsToday: number;
  totalUsage: number;
  lastUpdated: string;
}

// Realistic stats tracking using localStorage
class StatsTracker {
  private static readonly STORAGE_KEYS = {
    TOTAL_VISITORS: 'swasthya_total_visitors',
    VISITORS_TODAY: 'swasthya_visitors_today',
    TOTAL_USAGE: 'swasthya_total_usage',
    LAST_VISIT_DATE: 'swasthya_last_visit_date',
    SESSION_ID: 'swasthya_session_id'
  };

  static initializeSession(): void {
    const sessionId = sessionStorage.getItem(this.STORAGE_KEYS.SESSION_ID);
    const today = new Date().toDateString();
    const lastVisitDate = localStorage.getItem(this.STORAGE_KEYS.LAST_VISIT_DATE);

    // Check if this is a new session
    if (!sessionId) {
      // Generate new session ID
      const newSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem(this.STORAGE_KEYS.SESSION_ID, newSessionId);

      // Increment total visitors
      const totalVisitors = this.getTotalVisitors() + 1;
      localStorage.setItem(this.STORAGE_KEYS.TOTAL_VISITORS, totalVisitors.toString());

      // Handle daily visitors
      if (lastVisitDate !== today) {
        // New day, reset daily count
        localStorage.setItem(this.STORAGE_KEYS.VISITORS_TODAY, '1');
        localStorage.setItem(this.STORAGE_KEYS.LAST_VISIT_DATE, today);
      } else {
        // Same day, increment
        const visitorsToday = this.getVisitorsToday() + 1;
        localStorage.setItem(this.STORAGE_KEYS.VISITORS_TODAY, visitorsToday.toString());
      }

      // Increment usage count for new session
      this.incrementUsage();
    }
  }

  static getTotalVisitors(): number {
    return parseInt(localStorage.getItem(this.STORAGE_KEYS.TOTAL_VISITORS) || '0', 10);
  }

  static getVisitorsToday(): number {
    const today = new Date().toDateString();
    const lastVisitDate = localStorage.getItem(this.STORAGE_KEYS.LAST_VISIT_DATE);
    
    if (lastVisitDate !== today) {
      // New day, reset count
      localStorage.setItem(this.STORAGE_KEYS.VISITORS_TODAY, '0');
      localStorage.setItem(this.STORAGE_KEYS.LAST_VISIT_DATE, today);
      return 0;
    }
    
    return parseInt(localStorage.getItem(this.STORAGE_KEYS.VISITORS_TODAY) || '0', 10);
  }

  static getTotalUsage(): number {
    return parseInt(localStorage.getItem(this.STORAGE_KEYS.TOTAL_USAGE) || '0', 10);
  }

  static incrementUsage(): void {
    const currentUsage = this.getTotalUsage() + 1;
    localStorage.setItem(this.STORAGE_KEYS.TOTAL_USAGE, currentUsage.toString());
  }

  static getStats(): StatsData {
    return {
      totalVisitors: this.getTotalVisitors(),
      visitorsToday: this.getVisitorsToday(),
      totalUsage: this.getTotalUsage(),
      lastUpdated: new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  }
}

export function LiveVisitorStats() {
  const [stats, setStats] = useState<StatsData>(() => {
    // Initialize session and get initial stats
    StatsTracker.initializeSession();
    return StatsTracker.getStats();
  });

  useEffect(() => {
    // Track page interaction
    const handleInteraction = () => {
      StatsTracker.incrementUsage();
      setStats(StatsTracker.getStats());
    };

    // Listen for user interactions that should increment usage
    const events = ['click', 'keydown', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    // Update stats periodically to refresh timestamp and check for day changes
    const interval = setInterval(() => {
      setStats(StatsTracker.getStats());
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

  return (
    <div className="w-full max-w-md">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-600 text-center mb-1">
          Platform Activity
        </h3>
        <p className="text-xs text-gray-500 text-center">
          Live usage statistics
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        <StatsCard
          title="Total Visitors"
          value={stats.totalVisitors}
          icon={Users}
          lastUpdated={stats.lastUpdated}
        />
        
        <StatsCard
          title="Today's Visitors"
          value={stats.visitorsToday}
          icon={Clock}
          lastUpdated={stats.lastUpdated}
        />
        
        <StatsCard
          title="Page Interactions"
          value={stats.totalUsage}
          icon={Activity}
          lastUpdated={stats.lastUpdated}
        />
      </div>
      
      <div className="mt-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-100 rounded-md">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>
    </div>
  );
}