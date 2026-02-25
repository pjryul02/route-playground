import { useState, useCallback } from 'react';
import { RoutingResponse, AsyncJob } from '../types';
import { solveRouting, pollJobUntilComplete } from '../services/api';

interface UseRoutingResult {
  isLoading: boolean;
  error: string;
  currentJob: AsyncJob | null;
  solve: (server: string, requestData: any, timeout: number, useAsync?: boolean) => Promise<RoutingResponse | null>;
  clearError: () => void;
}

/**
 * Custom hook for handling routing operations
 */
export const useRouting = (): UseRoutingResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentJob, setCurrentJob] = useState<AsyncJob | null>(null);

  const solve = useCallback(async (
    server: string,
    requestData: any,
    timeout: number,
    useAsync: boolean = false
  ): Promise<RoutingResponse | null> => {
    setIsLoading(true);
    setError('');
    setCurrentJob(null);
    
    try {
      if (useAsync) {
        // Start async job (this now handles both direct and backend servers)
        const job = await solveRouting(server, requestData, timeout, true);
        setCurrentJob(job);
        
        // Poll for completion
        const response = await pollJobUntilComplete(job.id, (updatedJob) => {
          setCurrentJob(updatedJob);
        });
        
        console.log('Async response received:', response);
        return response;
      } else {
        // Synchronous request - track elapsed time
        const startTime = Date.now();
        const response = await solveRouting(server, requestData, timeout, false);
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;
        
        // Add elapsed time to response
        return {
          ...response,
          metadata: {
            ...response.metadata,
            elapsedTime
          }
        };
      }
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setError('Invalid JSON format in input');
      } else {
        setError(`Error: ${error.message || error}`);
      }
      console.error('Error solving routing problem:', error);
      return null;
    } finally {
      setIsLoading(false);
      setCurrentJob(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    isLoading,
    error,
    currentJob,
    solve,
    clearError
  };
};