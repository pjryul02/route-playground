import { ROUTE_COLORS } from '../constants';
import { Route, Step } from '../types';

/**
 * Gets a color for a route based on its index
 */
export const getRouteColor = (index: number): string => {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
};

/**
 * Calculates delivery amounts based on load differences between steps
 */
export const calculateDelivery = (
  currentLoad: number[] | undefined,
  previousLoad: number[] | undefined
): number[] => {
  if (!currentLoad) return [];
  if (!previousLoad) return new Array(currentLoad.length).fill(0);
  
  const delivery = [];
  const maxLength = Math.max(currentLoad.length, previousLoad.length);
  
  for (let i = 0; i < maxLength; i++) {
    const current = i < currentLoad.length ? currentLoad[i] : 0;
    const previous = i < previousLoad.length ? previousLoad[i] : 0;
    delivery.push(previous - current);
  }
  
  return delivery;
};

/**
 * Filters route steps to only include job-related steps
 */
export const getJobSteps = (steps: Step[]): Step[] => {
  return steps.filter(step => 
    step.type === 'job' || step.type === 'pickup' || step.type === 'delivery'
  );
};

/**
 * Calculates route statistics
 */
export const calculateRouteStats = (route: Route) => {
  const jobSteps = getJobSteps(route.steps);
  const totalJobs = jobSteps.length;
  const startTime = route.steps[0]?.arrival || 0;
  const endTime = route.steps[route.steps.length - 1]?.arrival || 0;
  
  return {
    totalJobs,
    startTime,
    endTime,
    hasDelivery: route.delivery && route.delivery.length > 0,
    hasPickup: route.pickup && route.pickup.length > 0 && route.pickup.some(p => p > 0),
    hasViolations: route.violations && route.violations.length > 0
  };
};

/**
 * Checks if a job is in the selected route
 */
export const isJobInRoute = (jobId: number, route: Route): boolean => {
  return route.steps.some(step => step.job === jobId);
};

/**
 * Gets the maximum length of a specific array field across all routes
 */
export const getMaxArrayLength = (routes: Route[], field: 'delivery' | 'pickup'): number => {
  let maxLength = 0;
  routes.forEach(route => {
    const arr = route[field];
    if (arr && arr.length > maxLength) {
      maxLength = arr.length;
    }
  });
  return maxLength;
};

/**
 * Gets the maximum load array length across all steps in all routes
 */
export const getMaxStepLoadLength = (routes: Route[]): number => {
  let maxLength = 0;
  routes.forEach(route => {
    route.steps.forEach(step => {
      if (step.load && step.load.length > maxLength) {
        maxLength = step.load.length;
      }
    });
  });
  return maxLength;
};

/**
 * Gets the maximum delivery array length across all calculated deliveries
 */
export const getMaxStepDeliveryLength = (routes: Route[]): number => {
  let maxLength = 0;
  routes.forEach(route => {
    let previousLoad: number[] | undefined = undefined;
    route.steps.forEach(step => {
      const delivery = calculateDelivery(step.load, previousLoad);
      if (delivery.length > maxLength) {
        maxLength = delivery.length;
      }
      previousLoad = step.load;
    });
  });
  return maxLength;
};