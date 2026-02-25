import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import { Vehicle, Job, RoutingResponse, MapMatchingResponse } from '../types';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const vehicleIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'vehicle-marker'
});

const jobIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTIuNSAyQzYuNSAyIDIgNi41IDIgMTIuNWMwIDEwIDEwLjUgMjYgMTAuNSAyNlMyMyAyMi41IDIzIDEyLjVDMjMgNi41IDE4LjUgMiAxMi41IDJ6IiBmaWxsPSIjZmY2NjAwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxjaXJjbGUgY3g9IjEyLjUiIGN5PSIxMi41IiByPSI0IiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Route step icons
const createStepIcon = (stepNumber: number, color: string) => new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="10" y="14" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${stepNumber}</text>
    </svg>
  `)}`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});


// 원본 궤적 상태별 아이콘들
const unchangedOriginalIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4" fill="#000000" stroke="#fff" stroke-width="1"/>
    </svg>
  `)}`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -6],
});

const modifiedOriginalIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4" fill="#ff4444" stroke="#fff" stroke-width="1"/>
    </svg>
  `)}`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -6],
});

const addedCorrectedIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5" fill="#0066ff" stroke="#fff" stroke-width="2"/>
      <text x="7" y="10" text-anchor="middle" fill="white" font-size="8" font-weight="bold">+</text>
    </svg>
  `)}`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
});

interface MapComponentProps {
  vehicles: Vehicle[];
  jobs: Job[];
  routingResponse: RoutingResponse | null;
  selectedRouteId?: number | null;
  onMapClick: (lat: number, lng: number) => void;
  mapMatchingResult?: MapMatchingResponse | null;
  originalTrajectory?: number[][] | null;
  showOriginalTrajectory?: boolean;
}

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
  vehicles,
  jobs,
  routingResponse,
  selectedRouteId,
  onMapClick,
  mapMatchingResult,
  originalTrajectory,
  showOriginalTrajectory = false
}) => {
  const center = vehicles.length > 0 ? [vehicles[0].start.lat, vehicles[0].start.lng] : [37.5665, 126.9780];

  // Generate route colors
  const routeColors = ['#ff0000', '#0000ff', '#00ff00', '#ff00ff', '#ffff00', '#00ffff'];

  // Map Matching 궤적 분석 함수
  const analyzeTrajectoryChanges = () => {
    if (!originalTrajectory || !mapMatchingResult?.matched_trace) {
      return { originalPoints: [], matchedPoints: [], addedPoints: [] };
    }

    type OriginalPointStatus = 'unchanged' | 'modified' | 'removed';
    type MatchedPointStatus = 'original' | 'added' | 'unknown';

    const originalPoints = originalTrajectory.map((point, index) => ({
      index,
      longitude: point[0],
      latitude: point[1],
      timestamp: point[2],
      accuracy: point[3] || 0,
      speed: point[4] || 0,
      status: 'unknown' as OriginalPointStatus
    }));

    const matchedPoints = mapMatchingResult.matched_trace.map((point, index) => ({
      ...point,
      index,
      status: 'unknown' as MatchedPointStatus
    }));

    // 원본 포인트와 매칭된 포인트 간의 관계 분석
    const tolerance = 0.0001; // 약 10미터 정도의 허용 오차
    
    originalPoints.forEach(origPoint => {
      const closestMatch = matchedPoints.find(matchPoint => {
        const latDiff = Math.abs(origPoint.latitude - matchPoint.latitude);
        const lonDiff = Math.abs(origPoint.longitude - matchPoint.longitude);
        return latDiff < tolerance && lonDiff < tolerance;
      });

      if (closestMatch) {
        origPoint.status = 'unchanged';
        closestMatch.status = 'original';
      } else {
        origPoint.status = 'modified';
      }
    });

    // 추가된 포인트 식별
    const addedPoints = matchedPoints.filter(point => point.status === 'unknown').map(point => ({
      ...point,
      status: 'added' as const
    }));

    return { originalPoints, matchedPoints, addedPoints };
  };

  const { originalPoints } = analyzeTrajectoryChanges();

  return (
    <MapContainer
      center={center as [number, number]}
      zoom={13}
      className="leaflet-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapClickHandler onMapClick={onMapClick} />

      {/* Render vehicles */}
      {vehicles.map((vehicle) => {
        const shouldDimVehicle = selectedRouteId !== null && selectedRouteId !== vehicle.id;
        
        return (
          <Marker
            key={`vehicle-${vehicle.id}`}
            position={[vehicle.start.lat, vehicle.start.lng]}
            icon={vehicleIcon}
            opacity={shouldDimVehicle ? 0.3 : 1.0}
          >
            <Popup>
              <div>
                <h4>Vehicle {vehicle.id}</h4>
                <p>Capacity: {vehicle.capacity}</p>
                <p>Start: ({vehicle.start.lat.toFixed(4)}, {vehicle.start.lng.toFixed(4)})</p>
                {selectedRouteId === vehicle.id && (
                  <p style={{ color: '#007bff', fontWeight: 'bold' }}>
                    Selected Route
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Render jobs */}
      {jobs.map((job) => {
        // Check if this job is part of the selected route
        let isInSelectedRoute = false;
        let vehicleId = null;
        
        if (selectedRouteId !== null && routingResponse && routingResponse.routes) {
          const selectedRoute = routingResponse.routes.find(route => route.vehicle === selectedRouteId);
          if (selectedRoute) {
            isInSelectedRoute = selectedRoute.steps.some(step => step.job === job.id);
            vehicleId = selectedRoute.vehicle;
          }
        }
        
        // If a route is selected and this job is not in it, make it semi-transparent
        const shouldDimJob = selectedRouteId !== null && !isInSelectedRoute;
        
        return (
          <Marker
            key={`job-${job.id}`}
            position={[job.location.lat, job.location.lng]}
            icon={jobIcon}
            opacity={shouldDimJob ? 0.3 : 1.0}
          >
            <Popup>
              <div>
                <h4>Job {job.id}</h4>
                {job.description && <p><strong>Description:</strong> {job.description}</p>}
                <p><strong>Service time:</strong> {job.service}s</p>
                <p><strong>Delivery:</strong> {job.delivery?.join(', ')}</p>
                <p><strong>Priority:</strong> {job.priority}</p>
                {job.skills && job.skills.length > 0 && (
                  <p><strong>Required Skills:</strong> [{job.skills.join(', ')}]</p>
                )}
                {job.time_windows && job.time_windows.length > 0 && (
                  <div>
                    <strong>Time Windows:</strong>
                    {job.time_windows.map((tw, idx) => {
                      const formatTimeWindow = (seconds: number) => {
                        const date = new Date(seconds * 1000);
                        return date.toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      };
                      return (
                        <div key={idx} style={{ marginLeft: '10px', fontSize: '12px' }}>
                          {formatTimeWindow(tw[0])} ~ {formatTimeWindow(tw[1])}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p><strong>Location:</strong> ({job.location.lat.toFixed(4)}, {job.location.lng.toFixed(4)})</p>
                {isInSelectedRoute && (
                  <p style={{ color: '#007bff', fontWeight: 'bold' }}>
                    Assigned to Vehicle {vehicleId}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Render routes with geometry */}
      {routingResponse?.routes?.map((route, routeIndex) => {
        const color = routeColors[routeIndex % routeColors.length];
        const isSelected = selectedRouteId === null || selectedRouteId === route.vehicle;
        const isHighlighted = selectedRouteId === route.vehicle;
        const routeElements = [];
        
        // Skip rendering if a specific route is selected and this isn't it
        if (!isSelected) {
          return null;
        }
        
        // If route has overall geometry, decode and render it
        if (route.geometry && route.geometry !== "{mwfFetqwV??????????") {
          try {
            const decodedGeometry = polyline.decode(route.geometry);
            const geometryPositions = decodedGeometry.map(([lat, lng]: [number, number]) => [lat, lng] as [number, number]);
            
            routeElements.push(
              <Polyline
                key={`route-geometry-${route.vehicle}`}
                positions={geometryPositions}
                color={color}
                weight={isHighlighted ? 6 : 4}
                opacity={isHighlighted ? 1.0 : 0.6}
              />
            );
          } catch (error) {
            console.warn(`Failed to decode route geometry for vehicle ${route.vehicle}:`, error);
          }
        }
        
        // Render individual step geometries
        route.steps.forEach((step, stepIndex) => {
          if (step.geometry && step.geometry !== "{mwfFetqwV??") {
            try {
              const decodedGeometry = polyline.decode(step.geometry);
              const geometryPositions = decodedGeometry.map(([lat, lng]: [number, number]) => [lat, lng] as [number, number]);
              
              routeElements.push(
                <Polyline
                  key={`step-geometry-${route.vehicle}-${stepIndex}`}
                  positions={geometryPositions}
                  color={color}
                  weight={isHighlighted ? 4 : 3}
                  opacity={isHighlighted ? 0.8 : 0.4}
                  dashArray={isHighlighted ? "3, 3" : "5, 5"}
                />
              );
            } catch (error) {
              console.warn(`Failed to decode step geometry for vehicle ${route.vehicle}, step ${stepIndex}:`, error);
            }
          }
        });
        
        // Fallback: render basic route connecting waypoints if no valid geometry
        if (routeElements.length === 0) {
          const routePositions = route.steps.map(step => [step.location[1], step.location[0]] as [number, number]);
          
          routeElements.push(
            <Polyline
              key={`route-fallback-${route.vehicle}`}
              positions={routePositions}
              color={color}
              weight={isHighlighted ? 6 : 4}
              opacity={isHighlighted ? 1.0 : 0.6}
              dashArray={isHighlighted ? "5, 5" : "10, 5"}
            />
          );
        }
        
        // Add step markers for the selected route or all routes
        if (isSelected) {
          route.steps.forEach((step, stepIndex) => {
            // Skip start/end steps as they are already shown as vehicle markers
            if (step.type === 'start' || step.type === 'end') return;
            
            const stepIcon = createStepIcon(stepIndex, color);
            const formatTime = (timestamp: number) => {
              return new Date(timestamp * 1000).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
            };

            const formatDetailedTime = (seconds: number) => {
              if (seconds === 0) return '0초';

              const hours = Math.floor(seconds / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              const secs = seconds % 60;

              const parts = [];
              if (hours > 0) parts.push(`${hours}시간`);
              if (minutes > 0) parts.push(`${minutes}분`);
              if (secs > 0) parts.push(`${secs}초`);

              return parts.join(' ');
            };
            
            routeElements.push(
              <Marker
                key={`step-marker-${route.vehicle}-${stepIndex}`}
                position={[step.location[1], step.location[0]]}
                icon={stepIcon}
                opacity={isHighlighted ? 1.0 : 0.7}
              >
                <Popup>
                  <div>
                    <h4>Step {stepIndex} - Vehicle {route.vehicle}</h4>
                    <p><strong>Type:</strong> {step.type.charAt(0).toUpperCase() + step.type.slice(1)}</p>
                    {step.job !== undefined && <p><strong>Job ID:</strong> {step.job}</p>}
                    {step.description && <p><strong>Description:</strong> {step.description}</p>}
                    {step.arrival && <p><strong>Arrival:</strong> {formatTime(step.arrival)}</p>}
                    {step.duration !== undefined && <p><strong>Duration:</strong> {formatDetailedTime(step.duration)}</p>}
                    {step.service !== undefined && <p><strong>Service:</strong> {formatDetailedTime(step.service)}</p>}
                    {step.waiting_time !== undefined && <p><strong>Waiting Time:</strong> {formatDetailedTime(step.waiting_time)}</p>}
                    {step.load && step.load.length > 0 && (() => {
                      const vehicle = vehicles.find(v => v.id === route.vehicle);
                      const capacity = vehicle?.capacity;
                      const loadPercents = capacity && capacity.length > 0
                        ? step.load.map((l, i) => {
                            const cap = capacity[i];
                            return cap ? ((l / cap) * 100).toFixed(1) + '%' : '-';
                          })
                        : null;
                      return (
                        <p><strong>Load:</strong> [{step.load.join(', ')}]{loadPercents && ` (${loadPercents.join(', ')})`}</p>
                      );
                    })()}
                    <p><strong>Location:</strong> ({step.location[1].toFixed(4)}, {step.location[0].toFixed(4)})</p>
                  </div>
                </Popup>
              </Marker>
            );
          });
        }
        
        return routeElements;
      })}

      {/* Render Map Matching results */}
      {mapMatchingResult && mapMatchingResult.success && (
        <>
          {/* Render original trajectory as polyline (원본 보기 활성화 시) */}
          {showOriginalTrajectory && originalTrajectory && originalTrajectory.length > 0 && (
            <Polyline
              positions={originalTrajectory.map(point => [point[1], point[0]])}
              color="#888888"
              weight={3}
              opacity={0.6}
              dashArray="5, 5"
            />
          )}

          {/* Render matched trajectory as polyline (보정된 결과값끼리만 연결) */}
          {mapMatchingResult.matched_trace.length > 0 && (
            <Polyline
              positions={mapMatchingResult.matched_trace.map(point => [point.latitude, point.longitude])}
              color="#00aa00"
              weight={4}
              opacity={0.8}
            />
          )}
          
          {/* Render original trajectory points with status colors */}
          {originalPoints.map((point, index) => {
            let icon;
            let statusText;
            
            switch (point.status) {
              case 'unchanged':
                icon = unchangedOriginalIcon;
                statusText = 'Unchanged';
                break;
              case 'modified':
                icon = modifiedOriginalIcon;
                statusText = 'Modified/Removed';
                break;
              default:
                icon = unchangedOriginalIcon;
                statusText = 'Unknown';
            }

            const formatTimestamp = (timestamp: number) => {
              return new Date(timestamp * 1000).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };
            
            return (
              <Marker
                key={`original-${index}`}
                position={[point.latitude, point.longitude]}
                icon={icon}
              >
                <Popup>
                  <div>
                    <h4>Original Point {index + 1}</h4>
                    <p><strong>Status:</strong> {statusText}</p>
                    <p><strong>Location:</strong> ({point.latitude.toFixed(6)}, {point.longitude.toFixed(6)})</p>
                    <p><strong>Timestamp:</strong> {formatTimestamp(point.timestamp)}</p>
                    <p><strong>Accuracy:</strong> {point.accuracy.toFixed(1)}m</p>
                    <p><strong>Speed:</strong> {point.speed.toFixed(1)} m/s</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Render Map Matching result points with flag-based colors */}
          {mapMatchingResult.matched_trace.map((point, index) => {
            let icon;
            let statusText;
            let statusColor;
            
            // 새로운 플래그 값에 따른 분류
            if (point.flag === 0.5) {
              icon = modifiedOriginalIcon; // 빨간색
              statusText = '선별적 보정';
              statusColor = '#ff4444';
            } else if (point.flag === 1.0) {
              icon = unchangedOriginalIcon; // 검은색
              statusText = '원본 유지';
              statusColor = '#000000';
            } else if (point.flag === 1.5) {
              icon = unchangedOriginalIcon; // 검은색
              statusText = '스무딩 적용';
              statusColor = '#666666';
            } else if (point.flag === 2.0) {
              icon = addedCorrectedIcon; // 파란색
              statusText = '생성된 포인트';
              statusColor = '#0066ff';
            } else if (point.flag === 2.5) {
              icon = addedCorrectedIcon; // 파란색
              statusText = '보간된 포인트';
              statusColor = '#0088ff';
            } else {
              icon = unchangedOriginalIcon; // 기본값
              statusText = `기타 (${point.flag})`;
              statusColor = '#888888';
            }

            const formatTimestamp = (timestamp: number) => {
              return new Date(timestamp * 1000).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };
            
            return (
              <Marker
                key={`matched-${index}`}
                position={[point.latitude, point.longitude]}
                icon={icon}
              >
                <Popup>
                  <div>
                    <h4>Matched Point {index + 1}</h4>
                    <p><strong>Status:</strong> <span style={{color: statusColor}}>{statusText}</span></p>
                    <p><strong>Flag:</strong> {point.flag}</p>
                    <p><strong>Location:</strong> ({point.latitude.toFixed(6)}, {point.longitude.toFixed(6)})</p>
                    <p><strong>Timestamp:</strong> {formatTimestamp(point.timestamp)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      )}
    </MapContainer>
  );
};

export default MapComponent;