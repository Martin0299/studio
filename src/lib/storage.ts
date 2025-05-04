/**
 * @fileOverview Utility functions for saving and retrieving cycle log data from localStorage.
 */

import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

// Define the structure of the log data
export interface LogData {
  date: string; // Store date as 'yyyy-MM-dd' string
  periodFlow?: 'none' | 'light' | 'medium' | 'heavy';
  isPeriodEnd?: boolean; // New field to mark the end of a period
  symptoms?: string[];
  mood?: string;
  sexualActivityCount?: number; // Number of times activity occurred
  orgasm?: boolean; // Whether orgasm occurred
  protectionUsed?: boolean; // Whether protection was used (relevant if sexualActivityCount > 0)
  notes?: string;
  // Add other relevant fields as needed
}

const STORAGE_KEY_PREFIX = 'cycleLog_';

/**
 * Generates the localStorage key for a given date.
 * @param date - The date object.
 * @returns The localStorage key string (e.g., 'cycleLog_2024-07-28').
 */
function getKeyForDate(date: Date): string {
  return `${STORAGE_KEY_PREFIX}${format(date, 'yyyy-MM-dd')}`;
}

/**
 * Saves a log entry for a specific date to localStorage.
 * @param date - The date of the log entry.
 * @param data - The log data to save.
 */
export function saveLogEntry(date: Date, data: Omit<LogData, 'date'>): void {
  try {
    const key = getKeyForDate(date);
    // If setting isPeriodEnd to true, ensure periodFlow is not 'none'
    const isEndingPeriod = data.isPeriodEnd === true;
    const periodFlow = data.periodFlow && data.periodFlow !== 'none'
        ? data.periodFlow
        : (isEndingPeriod ? getLogEntry(date)?.periodFlow ?? 'light' : 'none'); // If ending, keep existing or default to light, otherwise 'none'

    // Determine if sexual activity occurred based on count
    const activityOccurred = (data.sexualActivityCount ?? 0) > 0;

    const entryToSave: LogData = {
        ...data,
        date: format(date, 'yyyy-MM-dd'), // Ensure date string is stored
        periodFlow: periodFlow,
        // Ensure isPeriodEnd is false or undefined if flow is 'none'
        isPeriodEnd: periodFlow !== 'none' ? data.isPeriodEnd : false,
        // Only store protectionUsed and orgasm if activity occurred
        protectionUsed: activityOccurred ? data.protectionUsed : undefined,
        orgasm: activityOccurred ? data.orgasm : undefined,
        // Ensure count is 0 or positive
        sexualActivityCount: Math.max(0, data.sexualActivityCount ?? 0),
    };

    // Don't save empty entries (only date) unless it's explicitly clearing previous data
    const hasMeaningfulData = Object.values(entryToSave).some((value, index) => {
        // Ignore the 'date' field itself for this check
        return index > 0 && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0) && value !== false && value !== 0;
    });

    const existingEntry = localStorage.getItem(key);

    if (hasMeaningfulData) {
        localStorage.setItem(key, JSON.stringify(entryToSave));
        // Optional: Dispatch a custom event to notify other components of the update
        window.dispatchEvent(new CustomEvent('cycleLogUpdated', { detail: { date: format(date, 'yyyy-MM-dd') } }));
    } else if (existingEntry) {
        // If no meaningful data is being saved, but an entry exists, delete it
        localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent('cycleLogUpdated', { detail: { date: format(date, 'yyyy-MM-dd') } }));
    } else {
        // No meaningful data and no existing entry, do nothing
    }

  } catch (error) {
    console.error("Error saving log entry to localStorage:", error);
    // Handle potential storage errors (e.g., quota exceeded)
  }
}

/**
 * Retrieves a log entry for a specific date from localStorage.
 * @param date - The date of the log entry to retrieve.
 * @returns The log data, or null if no entry exists or an error occurs.
 */
export function getLogEntry(date: Date): LogData | null {
  try {
    const key = getKeyForDate(date);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) as LogData : null;
  } catch (error) {
    console.error("Error retrieving log entry from localStorage:", error);
    return null;
  }
}

/**
 * Retrieves all log entries for a given month from localStorage.
 * @param monthDate - A date object representing any day within the target month.
 * @returns An object mapping date strings ('yyyy-MM-dd') to log data for the month.
 */
export function getMonthLogEntries(monthDate: Date): Record<string, LogData> {
  const entries: Record<string, LogData> = {};
  try {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    daysInMonth.forEach(day => {
      const entry = getLogEntry(day);
      if (entry) {
        entries[format(day, 'yyyy-MM-dd')] = entry;
      }
    });
  } catch (error) {
    console.error("Error retrieving month log entries from localStorage:", error);
  }
  return entries;
}

/**
 * Deletes a log entry for a specific date from localStorage.
 * @param date - The date of the log entry to delete.
 */
export function deleteLogEntry(date: Date): void {
    try {
        const key = getKeyForDate(date);
        localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent('cycleLogUpdated', { detail: { date: format(date, 'yyyy-MM-dd') } }));
    } catch (error) {
        console.error("Error deleting log entry from localStorage:", error);
    }
}

/**
 * Deletes all cycle log entries from localStorage.
 * Use with caution!
 */
export function deleteAllLogEntries(): void {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        window.dispatchEvent(new CustomEvent('cycleLogUpdatedAll')); // Notify about bulk deletion
    } catch (error) {
        console.error("Error deleting all log entries from localStorage:", error);
    }
}
