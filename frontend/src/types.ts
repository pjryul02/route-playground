export interface Location {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: number;
  start: Location;
  end?: Location;
  capacity?: number[];
  skills?: number[];
  time_window?: number[]; // [start, end]
}

export interface Job {
  id: number;
  location: Location;
  service?: number;
  delivery?: number[];
  pickup?: number[];
  skills?: number[];
  priority?: number;
  time_windows?: number[][]; // [[start, end], ...]
  description?: string;
}

export interface RoutingRequest {
  vehicles: Vehicle[];
  jobs: Job[];
  matrix?: number[][];
  options?: Record<string, any>;
}

export interface Step {
  type: string;
  location: number[];
  job?: number;
  id?: number;
  arrival?: number;
  duration?: number;
  service?: number;
  waiting_time?: number;
  geometry?: string;
  description?: string;
  load?: number[];
  delivery?: number[];
}

export interface Route {
  vehicle: number;
  cost: number;
  steps: Step[];
  geometry?: string;
  service?: number;
  duration?: number;
  distance?: number;
  delivery?: number[];
  pickup?: number[];
  setup?: number;
  waiting_time?: number;
  priority?: number;
  violations?: any[];
}

export interface Summary {
  cost: number;
  unassigned: number;
  delivery: number[];
  amount?: number[];
  pickup: number[];
  service: number;
  duration: number;
  waiting_time: number;
  priority: number;
  distance?: number;
  routes?: number;
}

export interface RoutingResponse {
  code: number;
  summary: Summary;
  unassigned: Array<Record<string, any>>;
  routes: Route[];
  engine: string;
  metadata?: {
    elapsedTime?: number;
    [key: string]: any;
  };
}

// 전처리 서버 응답 형식
export interface PreprocessorResponse {
  status: string;
  message: string;
  data: {
    code: number;
    summary: Summary;
    unassigned?: Array<Record<string, any>>;
    routes?: Route[];
    violations?: any[];
    delivery?: number[];
    pickup?: number[];
  };
}

export type ServerStatus = 'up' | 'down' | 'checking' | 'unknown';

export interface Server {
  name: string;
  description: string;
  url: string;
  type?: 'direct' | 'proxy';
  status?: ServerStatus;
  lastChecked?: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AsyncJob {
  id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  result?: RoutingResponse;
  error?: string;
}

// Map Matching 관련 타입들
export interface MapMatchingRequest {
  trajectory: number[][]; // [경도, 위도, 타임스탬프, 정확도, 속도][]
  enable_debug: boolean;
}

export interface MapMatchingPoint {
  longitude: number;
  latitude: number;
  timestamp: number;
  flag: number; // 0.5: 선별적보정, 1.0: 원본유지, 1.5: 스무딩, 2.0: 생성, 2.5: 보간
}

export interface MapMatchingSummary {
  total_points: number;
  matched_points: number;
  confidence: number;
  shape_preservation_score: number;
}

export interface MapMatchingResponse {
  success: boolean;
  message?: string;
  matched_trace: MapMatchingPoint[];
  summary?: MapMatchingSummary;
  error?: string;
}