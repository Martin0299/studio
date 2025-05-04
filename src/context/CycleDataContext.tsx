// src/context/CycleDataContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { getLogEntry, saveLogEntry, getMonthLogEntries, LogData, deleteAllLogEntries as storageDeleteAll } from '@/lib/storage';

interface CycleDataContextType {
  logData: Record<string, LogData>; // Store logs keyed by 'yyyy-MM-dd'
  addOrUpdateLog: (date: Date, data: Omit<LogData, 'date'>) => void;
  getLogForDate: (date: Date) => LogData | null;
  getLogsForMonth: (monthDate: Date) => Record<string, LogData>;
  refreshData: () => void; // Function to manually trigger a data refresh
  deleteAllData: () => void; // Function to delete all data
  isLoading: boolean;
}

const CycleDataContext = createContext<CycleDataContextType | undefined>(undefined);

interface CycleDataProviderProps {
  children: ReactNode;
}

export function CycleDataProvider({ children }: CycleDataProviderProps) {
  const [logData, setLogData] = useState<Record<string, LogData>>({});
  const [isLoading, setIsLoading] = useState(true); // Start loading initially

  const loadInitialData = useCallback(() => {
    setIsLoading(true);
    try {
      // Load data relevant to the current view, e.g., current month + adjacent months
      // For simplicity, let's load everything for now, but optimize later if needed.
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('cycleLog_'));
      const initialData: Record<string, LogData> = {};
      allKeys.forEach(key => {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                const entry = JSON.parse(item) as LogData;
                // Ensure the key matches the stored date string for consistency
                if (entry.date) {
                   initialData[entry.date] = entry;
                } else {
                   // Fallback if date string isn't stored (older format?)
                   const dateFromKey = key.replace('cycleLog_', '');
                   initialData[dateFromKey] = { ...entry, date: dateFromKey };
                }
            }
        } catch (e) {
            console.error(`Error parsing localStorage item ${key}:`, e);
        }
      });
      setLogData(initialData);
    } catch (error) {
      console.error("Error loading initial data from localStorage:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Listen for custom events dispatched by the storage utility
    const handleStorageUpdate = (event: Event) => {
        console.log('Cycle log updated event received', (event as CustomEvent).detail);
        // Can refine this to only update specific entry if needed
        loadInitialData(); // Reload all data on any update for simplicity
    };

    window.addEventListener('cycleLogUpdated', handleStorageUpdate);
    window.addEventListener('cycleLogUpdatedAll', handleStorageUpdate); // Handle bulk deletion

    // Also listen to browser storage events (for changes in other tabs)
    const handleBrowserStorage = (event: StorageEvent) => {
        if (event.key && event.key.startsWith('cycleLog_')) {
             console.log('Browser storage event received for cycle log');
             loadInitialData();
        } else if (event.key === null) { // Storage was cleared
             console.log('Browser storage cleared event received');
             loadInitialData();
        }
    };
    window.addEventListener('storage', handleBrowserStorage);


    return () => {
      window.removeEventListener('cycleLogUpdated', handleStorageUpdate);
      window.removeEventListener('cycleLogUpdatedAll', handleStorageUpdate);
      window.removeEventListener('storage', handleBrowserStorage);
    };
  }, [loadInitialData]);

  const addOrUpdateLog = useCallback((date: Date, data: Omit<LogData, 'date'>) => {
    saveLogEntry(date, data); // Save to localStorage (this will trigger the event listener)
    // Optimistic UI update is handled by the event listener triggering loadInitialData
  }, [loadInitialData]); // Add loadInitialData as dependency? No, save triggers event.

  const getLogForDate = useCallback((date: Date): LogData | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    return logData[dateString] || null;
  }, [logData]);

  const getLogsForMonth = useCallback((monthDate: Date): Record<string, LogData> => {
    // Filter the existing state data for the given month
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const monthEntries: Record<string, LogData> = {};
    Object.keys(logData).forEach(dateString => {
      try {
        const entryDate = parseISO(dateString); // Assumes dateString is 'yyyy-MM-dd'
        if (entryDate >= start && entryDate <= end) {
          monthEntries[dateString] = logData[dateString];
        }
      } catch (e) {
          console.error(`Error parsing date string ${dateString} while filtering for month:`, e);
      }
    });
    return monthEntries;
    // Alternatively, could call getMonthLogEntries(monthDate) from storage if state isn't guaranteed complete
  }, [logData]);

  const deleteAllData = useCallback(() => {
    storageDeleteAll(); // Deletes from localStorage (triggers event)
    // Optimistic UI update is handled by the event listener triggering loadInitialData
  }, []); // No dependencies needed


  const value: CycleDataContextType = {
    logData,
    addOrUpdateLog,
    getLogForDate,
    getLogsForMonth,
    refreshData: loadInitialData, // Expose refresh function
    deleteAllData,
    isLoading,
  };

  return (
    <CycleDataContext.Provider value={value}>
      {children}
    </CycleDataContext.Provider>
  );
}

export function useCycleData() {
  const context = useContext(CycleDataContext);
  if (context === undefined) {
    throw new Error('useCycleData must be used within a CycleDataProvider');
  }
  return context;
}
```