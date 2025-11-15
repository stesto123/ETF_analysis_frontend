import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEARNING_LEVELS, LESSON_LEVEL_LOOKUP, TOTAL_LESSONS_PER_LEVEL, type LearningLevelId } from '@/constants/learningPaths';

const STORAGE_KEY = '@app:learn-progress';

type StoredProgress = {
  selectedLevel?: LearningLevelId;
  completedLessonIds?: string[];
};

type LevelStats = {
  total: number;
  completed: number;
  percent: number;
};

type LearnProgressContextValue = {
  selectedLevel: LearningLevelId;
  setSelectedLevel: (level: LearningLevelId) => void;
  completedLessons: Set<string>;
  markLessonComplete: (lessonId: string) => void;
  markLessonIncomplete: (lessonId: string) => void;
  toggleLessonCompletion: (lessonId: string) => void;
  isLessonCompleted: (lessonId: string) => boolean;
  getLevelStats: (level: LearningLevelId) => LevelStats;
  loading: boolean;
};

const LearnProgressContext = createContext<LearnProgressContextValue | undefined>(undefined);

export function LearnProgressProvider({ children }: { children: React.ReactNode }) {
  const [selectedLevel, setSelectedLevelState] = useState<LearningLevelId>('beginner');
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const storedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!storedRaw) {
          return;
        }
        const stored: StoredProgress = JSON.parse(storedRaw);
        if (!active) return;
        if (stored.selectedLevel && LEARNING_LEVELS.find((entry) => entry.id === stored.selectedLevel)) {
          setSelectedLevelState(stored.selectedLevel);
        }
        if (Array.isArray(stored.completedLessonIds)) {
          setCompletedLessons(new Set(stored.completedLessonIds));
        }
      } catch (error) {
        console.warn('Failed to load learn progress', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }
    const payload: StoredProgress = {
      selectedLevel,
      completedLessonIds: Array.from(completedLessons),
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch((error) => {
      console.warn('Failed to persist learn progress', error);
    });
  }, [selectedLevel, completedLessons, loading]);

  const setSelectedLevel = useCallback((level: LearningLevelId) => {
    setSelectedLevelState(level);
  }, []);

  const markLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      if (prev.has(lessonId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(lessonId);
      return next;
    });
  }, []);

  const markLessonIncomplete = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      if (!prev.has(lessonId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(lessonId);
      return next;
    });
  }, []);

  const toggleLessonCompletion = useCallback(
    (lessonId: string) => {
      setCompletedLessons((prev) => {
        const next = new Set(prev);
        if (next.has(lessonId)) {
          next.delete(lessonId);
        } else {
          next.add(lessonId);
        }
        return next;
      });
    },
    []
  );

  const isLessonCompleted = useCallback(
    (lessonId: string) => {
      return completedLessons.has(lessonId);
    },
    [completedLessons]
  );

  const completedCountByLevel = useMemo(() => {
    const counts: Record<LearningLevelId, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    completedLessons.forEach((lessonId) => {
      const level = LESSON_LEVEL_LOOKUP[lessonId];
      if (level) {
        counts[level] += 1;
      }
    });
    return counts;
  }, [completedLessons]);

  const getLevelStats = useCallback(
    (level: LearningLevelId): LevelStats => {
      const total = TOTAL_LESSONS_PER_LEVEL[level] ?? 0;
      const completed = Math.min(completedCountByLevel[level] ?? 0, total);
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { total, completed, percent };
    },
    [completedCountByLevel]
  );

  const value = useMemo<LearnProgressContextValue>(
    () => ({
      selectedLevel,
      setSelectedLevel,
      completedLessons,
      markLessonComplete,
      markLessonIncomplete,
      toggleLessonCompletion,
      isLessonCompleted,
      getLevelStats,
      loading,
    }),
    [
      selectedLevel,
      setSelectedLevel,
      completedLessons,
      markLessonComplete,
      markLessonIncomplete,
      toggleLessonCompletion,
      isLessonCompleted,
      getLevelStats,
      loading,
    ]
  );

  return <LearnProgressContext.Provider value={value}>{children}</LearnProgressContext.Provider>;
}

export function useLearnProgress(): LearnProgressContextValue {
  const ctx = useContext(LearnProgressContext);
  if (!ctx) {
    throw new Error('useLearnProgress must be used within LearnProgressProvider');
  }
  return ctx;
}
