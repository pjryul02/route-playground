import axios from 'axios';
import { Server, AsyncJob, RoutingResponse, PreprocessorResponse, MapMatchingRequest, MapMatchingResponse } from '../types';
import { isDirectServer, getDirectServerUrl } from '../utils/serverHelpers';

const API_BASE_URL = process.env.REACT_APP_API_URL || `http://localhost:8080`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Storage for frontend-managed async requests to direct servers
interface PendingDirectRequest {
  promise: Promise<any>;
  startTime: number;
  server: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

const pendingDirectRequests = new Map<string, PendingDirectRequest>();

// 전처리 서버 응답인지 확인하는 함수
const isPreprocessorResponse = (data: any): data is PreprocessorResponse => {
  return data &&
    typeof data.status === 'string' &&
    typeof data.message === 'string' &&
    data.data &&
    typeof data.data.code === 'number' &&
    data.data.summary;
};

// 전처리 서버 응답을 표준 형식으로 변환
const normalizePreprocessorResponse = (response: PreprocessorResponse): RoutingResponse => {
  return {
    code: response.data.code,
    summary: response.data.summary,
    unassigned: response.data.unassigned || [],
    routes: response.data.routes || [],
    engine: 'preprocessor',
    metadata: {
      originalStatus: response.status,
      originalMessage: response.message
    }
  };
};

export const solveRouting = async (
  server: string,
  request: any,
  timeoutSeconds: number = 300,
  useAsync: boolean = false
): Promise<any> => {
  let url;
  let axiosInstance;

  console.log('[solveRouting] Called with server:', server, 'isDirectServer:', isDirectServer(server));

  // Handle direct servers (VROOM and custom servers) - always use direct endpoint
  if (isDirectServer(server)) {
    url = getDirectServerUrl(server);
    console.log('[solveRouting] Direct server URL:', url);

    // Add async parameter to URL if requested
    if (useAsync) {
      url += '?async=true';
    }

    axiosInstance = axios.create({
      timeout: timeoutSeconds * 1000
    });

    // For async requests on direct servers, we handle polling at the frontend level
    if (useAsync) {
      // Start the request in the background and return a mock job object
      const startTime = Date.now();
      const jobId = `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create a promise that will be polled
      const requestPromise = axiosInstance.post(url, request, {
        timeout: timeoutSeconds * 1000
      });

      // Create the pending request object
      const pendingRequest: PendingDirectRequest = {
        promise: requestPromise,
        startTime,
        server,
        status: 'processing'
      };

      // Setup promise handlers to update status
      requestPromise
        .then((result) => {
          pendingRequest.status = 'completed';
          // 전처리 서버 응답인지 확인하고 정규화
          if (isPreprocessorResponse(result.data)) {
            pendingRequest.result = normalizePreprocessorResponse(result.data);
          } else {
            pendingRequest.result = result.data;
          }
        })
        .catch((error) => {
          pendingRequest.status = 'failed';
          pendingRequest.error = error.message || 'Request failed';
        });

      // Store the promise for polling
      pendingDirectRequests.set(jobId, pendingRequest);

      return {
        id: jobId,
        status: 'processing',
        created_at: new Date(startTime).toISOString(),
        updated_at: new Date(startTime).toISOString()
      };
    } else {
      // Synchronous request
      console.log('[solveRouting] Making sync POST request to:', url);
      try {
        const response = await axiosInstance.post(url, request, {
          timeout: timeoutSeconds * 1000
        });
        console.log('[solveRouting] Response received:', response.status);

        // 전처리 서버 응답인지 확인하고 정규화
        if (isPreprocessorResponse(response.data)) {
          return normalizePreprocessorResponse(response.data);
        } else {
          return response.data;
        }
      } catch (err: any) {
        console.error('[solveRouting] Request error:', err.message, err);
        throw err;
      }
    }
  } else {
    // Use backend proxy for other servers
    const asyncParam = useAsync ? '&async=true' : '';
    url = `/solve/${server}?timeout=${timeoutSeconds}${asyncParam}`;
    axiosInstance = api;

    const response = await axiosInstance.post(url, request, {
      timeout: timeoutSeconds * 1000
    });

    // 전처리 서버 응답인지 확인하고 정규화
    if (isPreprocessorResponse(response.data)) {
      return normalizePreprocessorResponse(response.data);
    } else {
      return response.data;
    }
  }
};

export const getJobStatus = async (jobId: string): Promise<AsyncJob> => {
  // Check if this is a frontend-managed job for direct servers
  if (jobId.startsWith('frontend-')) {
    const pendingRequest = pendingDirectRequests.get(jobId);
    if (!pendingRequest) {
      throw new Error('Job not found');
    }

    return {
      id: jobId,
      status: pendingRequest.status as any,
      created_at: new Date(pendingRequest.startTime).toISOString(),
      updated_at: new Date().toISOString(),
      result: pendingRequest.result,
      error: pendingRequest.error
    };
  }

  // Backend-managed job
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
};

export const pollJobUntilComplete = async (
  jobId: string,
  onProgress?: (job: AsyncJob) => void
): Promise<RoutingResponse> => {
  const pollInterval = 1000; // 1 second

  while (true) {
    const job = await getJobStatus(jobId);

    if (onProgress) {
      onProgress(job);
    }

    if (job.status === 'completed' && job.result) {
      // Clean up frontend-managed job
      if (jobId.startsWith('frontend-')) {
        pendingDirectRequests.delete(jobId);
      }
      return job.result;
    }

    if (job.status === 'failed') {
      // Clean up frontend-managed job
      if (jobId.startsWith('frontend-')) {
        pendingDirectRequests.delete(jobId);
      }
      throw new Error(job.error || 'Job failed');
    }

    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
};

export const getAvailableServers = async (): Promise<{ servers: Server[] }> => {
  const response = await api.get('/servers');
  return response.data;
};

// Map Matching API 함수들
export const matchTrajectory = async (request: MapMatchingRequest, serverUrl?: string): Promise<MapMatchingResponse> => {
  // 기본값은 localhost:8000, 서버 URL이 제공되면 해당 URL 사용
  const url = serverUrl || 'http://localhost:8000';
  const response = await axios.post(`${url}/map-matching/match`, request, {
    timeout: 30000 // 30초 타임아웃
  });

  // 응답 구조 맞춤 (8100 서비스는 다른 구조를 반환할 수 있음)
  if (response.data.status === 'success' && response.data.data) {
    const matchedPoints = response.data.data.matched_trace.map((point: any[]) => ({
      longitude: point[0],
      latitude: point[1],
      timestamp: point[2],
      flag: point[3]
    }));

    return {
      success: true,
      message: response.data.message,
      matched_trace: matchedPoints,
      summary: response.data.data.summary
    };
  } else {
    return {
      success: false,
      message: 'Map matching failed',
      matched_trace: [],
      error: response.data.message || 'Unknown error'
    };
  }
};