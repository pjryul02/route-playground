import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { RoutingResponse, Route, Step } from '../types';
import { ExcelRouteData, ExcelSummaryData } from '../types/excel';
import { EXCEL_CONFIG } from '../constants';
import { formatTime, formatDuration, formatArray, formatDistance } from './formatters';
import { 
  calculateDelivery, 
  getMaxArrayLength, 
  getMaxStepLoadLength, 
  getMaxStepDeliveryLength 
} from './routeHelpers';

// Remove duplicate interfaces as they're now imported from types/excel

// Utility functions now imported from separate modules

const addArrayColumnsToData = (data: any, route: Route, fieldName: 'delivery' | 'pickup', maxLength: number): void => {
  const arr = route[fieldName] || [];
  for (let i = 0; i < maxLength; i++) {
    const columnName = `${fieldName}_${i + 1}`;
    data[columnName] = i < arr.length ? arr[i] : '';
  }
};

const addLoadColumnsToData = (data: any, step: Step, maxLength: number): void => {
  const arr = step.load || [];
  for (let i = 0; i < maxLength; i++) {
    const columnName = `load_${i + 1}`;
    data[columnName] = i < arr.length ? arr[i] : '';
  }
};

const addDeliveryColumnsToData = (data: any, step: Step, maxLength: number): void => {
  const arr = step.delivery || [];
  for (let i = 0; i < maxLength; i++) {
    const columnName = `delivery_${i + 1}`;
    data[columnName] = i < arr.length ? arr[i] : '';
  }
};

// calculateDelivery function is now imported from routeHelpers

export const exportRoutingResultToExcel = (routingResponse: RoutingResponse): void => {
  // Find maximum array lengths for dynamic columns
  const maxDeliveryLength = getMaxArrayLength(routingResponse.routes, 'delivery');
  const maxPickupLength = getMaxArrayLength(routingResponse.routes, 'pickup');
  const maxLoadLength = getMaxStepLoadLength(routingResponse.routes);
  const maxStepDeliveryLength = getMaxStepDeliveryLength(routingResponse.routes);
  
  // Prepare route data
  const routeData: ExcelRouteData[] = [];
  
  routingResponse.routes.forEach((route: Route) => {
    let previousLoad: number[] | undefined = undefined;
    route.steps.forEach((step: Step, stepIndex: number) => {
      const data: ExcelRouteData = {
        'Vehicle ID': route.vehicle,
        'Step #': stepIndex + 1,
        'Step Type': step.type.charAt(0).toUpperCase() + step.type.slice(1),
        'Job ID': step.job !== undefined ? step.job : '',
        'ID': step.id !== undefined ? step.id : '',
        'Description': step.description || '',
        'Latitude': step.location[1], // VROOM uses [lng, lat] format
        'Longitude': step.location[0],
        'Arrival Time': step.arrival ? formatTime(step.arrival) : '',
        'Service Time (min)': step.service ? formatDuration(step.service) : 0,
        'Duration (min)': step.duration ? formatDuration(step.duration) : 0,
        'Waiting Time (min)': step.waiting_time ? formatDuration(step.waiting_time) : 0,
        'Cost': route.cost || 0,
        'Distance (km)': route.distance ? formatDistance(route.distance) : 0
      };
      
      // Calculate and add delivery columns based on load difference
      const delivery = calculateDelivery(step.load, previousLoad);
      const stepWithDelivery = { ...step, delivery };
      addDeliveryColumnsToData(data, stepWithDelivery, maxStepDeliveryLength);
      
      // Add dynamic load columns
      addLoadColumnsToData(data, step, maxLoadLength);
      
      // Add dynamic pickup columns
      addArrayColumnsToData(data, route, 'pickup', maxPickupLength);
      
      // Update previous load for next iteration
      previousLoad = step.load;
      
      routeData.push(data);
    });
  });

  // Prepare summary data
  const summaryData: ExcelSummaryData[] = [
    { 'Metric': 'Total Routes', 'Value': routingResponse.routes.length },
    { 'Metric': 'Total Cost', 'Value': routingResponse.summary.cost },
    { 'Metric': 'Total Service Time (min)', 'Value': formatDuration(routingResponse.summary.service) },
    { 'Metric': 'Total Duration (min)', 'Value': formatDuration(routingResponse.summary.duration) },
    { 'Metric': 'Total Waiting Time (min)', 'Value': formatDuration(routingResponse.summary.waiting_time || 0) },
    { 'Metric': 'Total Distance (km)', 'Value': routingResponse.summary.distance ? Math.round(routingResponse.summary.distance / 1000 * 100) / 100 : 0 },
    { 'Metric': 'Unassigned Jobs', 'Value': routingResponse.summary.unassigned },
    { 'Metric': 'Total Delivery', 'Value': formatArray(routingResponse.summary.delivery) },
    { 'Metric': 'Total Pickup', 'Value': formatArray(routingResponse.summary.pickup) },
    { 'Metric': 'Priority Score', 'Value': routingResponse.summary.priority },
  ];

  // Prepare vehicle summary data
  const vehicleSummaryData = routingResponse.routes.map((route: Route) => {
    const data: any = {
      'Vehicle ID': route.vehicle,
      'Total Jobs': route.steps.filter(step => step.type === 'job' || step.type === 'pickup' || step.type === 'delivery').length,
      'Service Time (min)': route.service ? formatDuration(route.service) : 0,
      'Duration (min)': route.duration ? formatDuration(route.duration) : 0,
      'Waiting Time (min)': route.waiting_time ? formatDuration(route.waiting_time) : 0,
      'Cost': route.cost || 0,
      'Distance (km)': route.distance ? Math.round(route.distance / 1000 * 100) / 100 : 0,
      'Priority': route.priority || 0,
      'Violations': route.violations ? route.violations.length : 0,
      'Start Time': route.steps[0]?.arrival ? formatTime(route.steps[0].arrival!) : '',
      'End Time': route.steps[route.steps.length - 1]?.arrival ? formatTime(route.steps[route.steps.length - 1].arrival!) : ''
    };
    
    // Add dynamic delivery columns
    addArrayColumnsToData(data, route, 'delivery', maxDeliveryLength);
    
    // Add dynamic pickup columns  
    addArrayColumnsToData(data, route, 'pickup', maxPickupLength);
    
    return data;
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add worksheets
  const routeWorksheet = XLSX.utils.json_to_sheet(routeData);
  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  const vehicleWorksheet = XLSX.utils.json_to_sheet(vehicleSummaryData);

  // Set column widths for better readability using constants
  const { columnWidths } = EXCEL_CONFIG;
  const routeColWidths = [
    { wch: columnWidths.vehicleId }, // Vehicle ID
    { wch: columnWidths.stepNumber }, // Step #
    { wch: columnWidths.stepType }, // Step Type
    { wch: columnWidths.jobId }, // Job ID
    { wch: columnWidths.id }, // ID
    { wch: columnWidths.description }, // Description
    { wch: columnWidths.coordinates }, // Latitude
    { wch: columnWidths.coordinates }, // Longitude
    { wch: columnWidths.time }, // Arrival Time
    { wch: columnWidths.serviceTime }, // Service Time
    { wch: columnWidths.duration }, // Duration
    { wch: columnWidths.waitingTime }, // Waiting Time
    { wch: columnWidths.cost }, // Cost
    { wch: columnWidths.distance }  // Distance
  ];
  
  // Add delivery column widths
  for (let i = 0; i < maxStepDeliveryLength; i++) {
    routeColWidths.push({ wch: columnWidths.dynamicColumn }); // delivery_1, delivery_2, etc.
  }
  
  // Add load column widths
  for (let i = 0; i < maxLoadLength; i++) {
    routeColWidths.push({ wch: columnWidths.dynamicColumn }); // load_1, load_2, etc.
  }
  
  // Add pickup column widths
  for (let i = 0; i < maxPickupLength; i++) {
    routeColWidths.push({ wch: columnWidths.dynamicColumn }); // pickup_1, pickup_2, etc.
  }

  const summaryColWidths = [
    { wch: 25 }, // Metric
    { wch: 20 }  // Value
  ];

  const vehicleColWidths = [
    { wch: 12 }, // Vehicle ID
    { wch: 12 }, // Total Jobs
    { wch: 18 }, // Service Time
    { wch: 15 }, // Duration
    { wch: 18 }, // Waiting Time
    { wch: 10 }, // Cost
    { wch: 15 }, // Distance
    { wch: 10 }, // Priority
    { wch: 12 }, // Violations
    { wch: 20 }, // Start Time
    { wch: 20 }  // End Time
  ];
  
  // Add delivery column widths for vehicle summary
  for (let i = 0; i < maxDeliveryLength; i++) {
    vehicleColWidths.push({ wch: 12 }); // delivery_1, delivery_2, etc.
  }
  
  // Add pickup column widths for vehicle summary
  for (let i = 0; i < maxPickupLength; i++) {
    vehicleColWidths.push({ wch: 12 }); // pickup_1, pickup_2, etc.
  }

  routeWorksheet['!cols'] = routeColWidths;
  summaryWorksheet['!cols'] = summaryColWidths;
  vehicleWorksheet['!cols'] = vehicleColWidths;

  // Add worksheets to workbook
  const { worksheetNames } = EXCEL_CONFIG;
  XLSX.utils.book_append_sheet(workbook, routeWorksheet, worksheetNames.routeDetails);
  XLSX.utils.book_append_sheet(workbook, vehicleWorksheet, worksheetNames.vehicleSummary);
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, worksheetNames.overallSummary);

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `routing_results_${timestamp}.xlsx`;
  
  // Download file
  saveAs(data, filename);
};

export const exportSelectedRouteToExcel = (route: Route, routeIndex: number): void => {
  // Find array lengths for this specific route
  const pickupLength = route.pickup ? route.pickup.length : 0;
  const maxLoadLength = Math.max(...route.steps.map(step => step.load ? step.load.length : 0), 0);
  
  // Calculate max step delivery length for this route
  let maxStepDeliveryLength = 0;
  let previousLoad: number[] | undefined = undefined;
  route.steps.forEach(step => {
    const delivery = calculateDelivery(step.load, previousLoad);
    if (delivery.length > maxStepDeliveryLength) {
      maxStepDeliveryLength = delivery.length;
    }
    previousLoad = step.load;
  });
  
  // Reset previous load for this route
  previousLoad = undefined;
  const routeData: ExcelRouteData[] = route.steps.map((step: Step, stepIndex: number) => {
    const data: ExcelRouteData = {
      'Vehicle ID': route.vehicle,
      'Step #': stepIndex + 1,
      'Step Type': step.type.charAt(0).toUpperCase() + step.type.slice(1),
      'Job ID': step.job !== undefined ? step.job : '',
      'ID': step.id !== undefined ? step.id : '',
      'Description': step.description || '',
      'Latitude': step.location[1],
      'Longitude': step.location[0],
      'Arrival Time': step.arrival ? formatTime(step.arrival) : '',
      'Service Time (min)': step.service ? formatDuration(step.service) : 0,
      'Duration (min)': step.duration ? formatDuration(step.duration) : 0,
      'Waiting Time (min)': step.waiting_time ? formatDuration(step.waiting_time) : 0,
      'Cost': route.cost || 0,
      'Distance (km)': route.distance ? Math.round(route.distance / 1000 * 100) / 100 : 0
    };
    
    // Calculate and add delivery columns based on load difference
    const delivery = calculateDelivery(step.load, previousLoad);
    const stepWithDelivery = { ...step, delivery };
    addDeliveryColumnsToData(data, stepWithDelivery, maxStepDeliveryLength);
    
    // Add load columns
    addLoadColumnsToData(data, step, maxLoadLength);
    
    // Add pickup columns
    addArrayColumnsToData(data, route, 'pickup', pickupLength);
    
    // Update previous load for next iteration
    previousLoad = step.load;
    
    return data;
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(routeData);
  
  const colWidths = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, 
    { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 15 }
  ];
  
  // Add delivery column widths
  for (let i = 0; i < maxStepDeliveryLength; i++) {
    colWidths.push({ wch: 12 });
  }
  
  // Add load column widths
  for (let i = 0; i < maxLoadLength; i++) {
    colWidths.push({ wch: 12 });
  }
  
  // Add pickup column widths
  for (let i = 0; i < pickupLength; i++) {
    colWidths.push({ wch: 12 });
  }
  
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, `Vehicle ${route.vehicle} Route`);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `vehicle_${route.vehicle}_route_${timestamp}.xlsx`;
  
  saveAs(data, filename);
};