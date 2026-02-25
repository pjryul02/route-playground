import { TIME_CONFIG } from '../constants';

/**
 * Formats a timestamp (seconds) to a localized date-time string
 */
export const formatTime = (timestamp: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleString(
    TIME_CONFIG.locale,
    TIME_CONFIG.dateTimeOptions
  );
};

/**
 * Formats a timestamp (seconds) to a time-only string
 */
export const formatTimeOnly = (timestamp: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleTimeString(
    'en-US',
    TIME_CONFIG.timeOptions
  );
};

/**
 * Converts seconds to minutes (rounded)
 */
export const formatDuration = (seconds: number): number => {
  return Math.round(seconds / 60);
};

/**
 * Formats duration in seconds to human-readable string (Xh Ym or Ym)
 */
export const formatDurationString = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Formats an array of numbers as a string representation
 */
export const formatArray = (arr: number[] | undefined): string => {
  if (!arr || arr.length === 0) return '';
  return `[${arr.join(', ')}]`;
};

/**
 * Formats distance in meters to kilometers with one decimal place
 */
export const formatDistance = (distanceInMeters: number): number => {
  return Math.round(distanceInMeters / 1000 * 100) / 100;
};

/**
 * Formats a number with locale-specific thousands separators
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};