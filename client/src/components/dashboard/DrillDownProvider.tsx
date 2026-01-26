import { createContext, useContext, useState, ReactNode } from 'react';

interface DrillDownLevel {
  id: string;
  title: string;
  data: any;
  filters?: Record<string, any>;
}

interface DrillDownContextType {
  levels: DrillDownLevel[];
  currentLevel: DrillDownLevel | null;
  drillDown: (level: DrillDownLevel) => void;
  drillUp: (targetLevelId?: string) => void;
  reset: () => void;
  canDrillUp: boolean;
}

const DrillDownContext = createContext<DrillDownContextType | undefined>(undefined);

interface DrillDownProviderProps {
  children: ReactNode;
  initialLevel?: DrillDownLevel;
}

export function DrillDownProvider({ children, initialLevel }: DrillDownProviderProps) {
  const [levels, setLevels] = useState<DrillDownLevel[]>(
    initialLevel ? [initialLevel] : []
  );

  const currentLevel = levels[levels.length - 1] || null;
  const canDrillUp = levels.length > 1;

  const drillDown = (level: DrillDownLevel) => {
    setLevels(prev => [...prev, level]);
  };

  const drillUp = (targetLevelId?: string) => {
    if (targetLevelId) {
      const targetIndex = levels.findIndex(level => level.id === targetLevelId);
      if (targetIndex >= 0) {
        setLevels(prev => prev.slice(0, targetIndex + 1));
      }
    } else {
      setLevels(prev => prev.slice(0, -1));
    }
  };

  const reset = () => {
    setLevels(initialLevel ? [initialLevel] : []);
  };

  return (
    <DrillDownContext.Provider value={{
      levels,
      currentLevel,
      drillDown,
      drillUp,
      reset,
      canDrillUp
    }}>
      {children}
    </DrillDownContext.Provider>
  );
}

export function useDrillDown() {
  const context = useContext(DrillDownContext);
  if (context === undefined) {
    throw new Error('useDrillDown must be used within a DrillDownProvider');
  }
  return context;
}