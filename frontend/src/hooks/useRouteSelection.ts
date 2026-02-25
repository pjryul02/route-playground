import { useState, useCallback } from 'react';

interface UseRouteSelectionResult {
  selectedRouteId: number | null;
  selectRoute: (routeId: number | null) => void;
  toggleRoute: (routeId: number) => void;
  clearSelection: () => void;
}

/**
 * Custom hook for managing route selection state
 */
export const useRouteSelection = (): UseRouteSelectionResult => {
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  const selectRoute = useCallback((routeId: number | null) => {
    setSelectedRouteId(routeId);
  }, []);

  const toggleRoute = useCallback((routeId: number) => {
    setSelectedRouteId(current => current === routeId ? null : routeId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRouteId(null);
  }, []);

  return {
    selectedRouteId,
    selectRoute,
    toggleRoute,
    clearSelection
  };
};