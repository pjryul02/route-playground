import serversConfig from '../config/servers.json';

// Application constants
export const DEFAULT_TIMEOUT = 300;
export const DEFAULT_ZOOM = 13;
export const DEFAULT_CENTER: [number, number] = [37.5665, 126.9780];
export const DEFAULT_SERVER = 'vroom-optimize';

// Route colors for visualization
export const ROUTE_COLORS = [
  '#ff0000', // Red
  '#0000ff', // Blue
  '#00ff00', // Green
  '#ff00ff', // Magenta
  '#ffff00', // Yellow
  '#00ffff'  // Cyan
];

// Leaflet marker configuration
export const MARKER_CONFIG = {
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number],
  stepIconSize: [20, 20] as [number, number],
  stepIconAnchor: [10, 10] as [number, number],
  stepPopupAnchor: [0, -10] as [number, number]
};

// Excel export configuration
export const EXCEL_CONFIG = {
  columnWidths: {
    vehicleId: 12,
    stepNumber: 8,
    stepType: 12,
    jobId: 10,
    id: 10,
    description: 40,
    coordinates: 12,
    time: 20,
    serviceTime: 18,
    duration: 15,
    waitingTime: 18,
    cost: 10,
    distance: 15,
    dynamicColumn: 12
  },
  worksheetNames: {
    routeDetails: 'Route Details',
    vehicleSummary: 'Vehicle Summary',
    overallSummary: 'Overall Summary'
  }
};

// UI configuration
export const UI_CONFIG = {
  panelSizes: {
    jsonPanel: '25%',
    routeList: '20%',
    map: '55%'
  },
  animations: {
    transitionDuration: '0.2s'
  }
};

// Time and date formatting
export const TIME_CONFIG = {
  locale: 'ko-KR',
  dateTimeOptions: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const
  },
  timeOptions: {
    hour: '2-digit' as const,
    minute: '2-digit' as const
  }
};

// API configuration
export const API_CONFIG = {
  timeout: {
    min: 10,
    max: 1800,
    default: DEFAULT_TIMEOUT
  },
  endpoints: {
    solve: '/solve',
    servers: '/servers'
  }
};

// Default servers loaded from config/servers.json
export const DEFAULT_SERVERS = serversConfig;