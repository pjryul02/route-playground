// Excel export specific types

export interface ExcelColumnConfig {
  header: string;
  key: string;
  width: number;
  formatter?: (value: any) => string | number;
}

export interface ExcelWorksheetConfig {
  name: string;
  columns: ExcelColumnConfig[];
  data: any[];
}

export interface ExcelExportOptions {
  filename?: string;
  includeTimestamp?: boolean;
  worksheets: ExcelWorksheetConfig[];
}

export interface ExcelRouteData {
  'Vehicle ID': number;
  'Step #': number;
  'Step Type': string;
  'Job ID': number | string;
  'ID': number | string;
  'Description': string;
  'Latitude': number;
  'Longitude': number;
  'Arrival Time': string;
  'Service Time (min)': number;
  'Duration (min)': number;
  'Waiting Time (min)': number;
  'Cost': number;
  'Distance (km)': number;
  [key: string]: any; // For dynamic columns
}

export interface ExcelSummaryData {
  'Metric': string;
  'Value': string | number;
}

export interface ExcelVehicleData {
  'Vehicle ID': number;
  'Total Jobs': number;
  'Service Time (min)': number;
  'Duration (min)': number;
  'Waiting Time (min)': number;
  'Cost': number;
  'Distance (km)': number;
  'Priority': number;
  'Violations': number;
  'Start Time': string;
  'End Time': string;
  [key: string]: any; // For dynamic columns
}