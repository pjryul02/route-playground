import { useState, useEffect, useCallback, useRef } from 'react';
import { Server, ServerStatus } from '../types';
import { getAvailableServers } from '../services/api';
import { DEFAULT_SERVERS } from '../constants';
import axios from 'axios';

interface UseServersResult {
  servers: Server[];
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
}

/**
 * Custom hook for managing server data and health status
 */
export const useServers = (): UseServersResult => {
  const [servers, setServers] = useState<Server[]>(
    (DEFAULT_SERVERS as Server[]).map(s => ({ ...s, status: 'unknown' }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to keep track of current servers for health checks without dependency loops
  const serversRef = useRef<Server[]>([]);

  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  const checkHealth = useCallback(async (server: Server): Promise<ServerStatus> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Local embedded case
      if (server.url === 'embedded') return 'up';

      // For 'proxy' types (likely cloud engines), direct GET will fail due to CORS.
      // We can use a 'no-cors' fetch to see if the server responds at all.
      if (server.type === 'proxy' || server.url.startsWith('http')) {
        try {
          await fetch(server.url, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
          });
          clearTimeout(timeoutId);
          return 'up';
        } catch (fetchErr) {
          // If fetch fails, it might really be down or timeout
        }
      }

      // Fallback to axios for local servers where CORS might be configured
      await axios.get(server.url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
        validateStatus: () => true
      });

      clearTimeout(timeoutId);
      return 'up';
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.name === 'AbortError' || err.message === 'Network Error') {
        return 'down';
      }
      return 'unknown';
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const currentServers = serversRef.current;
    if (currentServers.length === 0) return;

    setServers(prev => prev.map(s => ({ ...s, status: 'checking' })));

    const checkedResults = await Promise.all(
      currentServers.map(async (s) => ({
        ...s,
        status: await checkHealth(s),
        lastChecked: new Date().toISOString()
      }))
    );
    setServers(checkedResults);
  }, [checkHealth]);

  // Initial fetch on mount
  useEffect(() => {
    const initServers = async () => {
      try {
        setIsLoading(true);
        let allServers: Server[] = [...(DEFAULT_SERVERS as Server[])];

        try {
          const response = await getAvailableServers();
          const backendServers = response.servers.map(s => ({ ...s, type: 'proxy' as const }));
          const existingNames = new Set(allServers.map(s => s.name));

          backendServers.forEach(bs => {
            if (!existingNames.has(bs.name)) {
              allServers.push(bs);
            }
          });
        } catch (e) {
          console.warn('Backend server list unavailable');
        }

        const initialStatus = allServers.map(s => ({ ...s, status: 'checking' as ServerStatus }));
        setServers(initialStatus);

        const results = await Promise.all(
          initialStatus.map(async (s) => ({
            ...s,
            status: await checkHealth(s),
            lastChecked: new Date().toISOString()
          }))
        );
        setServers(results);

      } catch (err) {
        setError('Failed to initialize servers');
      } finally {
        setIsLoading(false);
      }
    };

    initServers();
  }, [checkHealth]); // Only run on mount (checkHealth is stable)

  // Auto-refresh timer
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    servers,
    isLoading,
    error,
    refreshStatus
  };
};