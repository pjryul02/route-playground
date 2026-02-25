import React from 'react';
import { RoutingResponse, Vehicle } from '../types';
import { exportRoutingResultToExcel, exportSelectedRouteToExcel } from '../utils/excelExport';

interface RouteListProps {
  routingResponse: RoutingResponse | null;
  selectedRouteId: number | null;
  onRouteSelect: (routeId: number | null) => void;
  vehicles?: Vehicle[];
}

const RouteList: React.FC<RouteListProps> = ({
  routingResponse,
  selectedRouteId,
  onRouteSelect,
  vehicles = []
}) => {
  // Check if there are no routes AND no vehicles to show as unassigned
  const hasRoutes = routingResponse && routingResponse.routes && routingResponse.routes.length > 0;
  const hasVehicles = vehicles.length > 0;

  if (!hasRoutes && !hasVehicles) {
    return (
      <div style={{ height: '100vh', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Routes</h3>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          No routes available.<br/>
          Solve a routing problem to see routes here.
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

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

  const getRouteColor = (index: number) => {
    const colors = ['#ff0000', '#0000ff', '#00ff00', '#ff00ff', '#ffff00', '#00ffff'];
    return colors[index % colors.length];
  };

  const routeCount = routingResponse?.routes?.length || 0;

  return (
    <div style={{ height: '100vh', padding: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Routes ({routeCount})</h3>
        {hasRoutes && (
          <button
            onClick={() => onRouteSelect(null)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: selectedRouteId === null ? '#007bff' : '#f8f9fa',
              color: selectedRouteId === null ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Show All
          </button>
        )}
      </div>

      {hasRoutes && routingResponse && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
          <button
            onClick={() => exportRoutingResultToExcel(routingResponse)}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            title="Export all routes to Excel"
          >
            📊 Export All to Excel
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {hasRoutes && routingResponse && routingResponse.routes.map((route, index) => {
          const isSelected = selectedRouteId === route.vehicle;
          const routeColor = getRouteColor(index);
          
          // Calculate route statistics
          const jobSteps = route.steps.filter(step => step.type === 'job' || step.type === 'pickup' || step.type === 'delivery');
          const totalJobs = jobSteps.length;
          const startTime = route.steps[0]?.arrival || 0;
          const endTime = route.steps[route.steps.length - 1]?.arrival || 0;
          
          return (
            <div
              key={route.vehicle}
              onClick={() => onRouteSelect(isSelected ? null : route.vehicle)}
              style={{
                border: `2px solid ${isSelected ? routeColor : '#e0e0e0'}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                backgroundColor: isSelected ? `${routeColor}15` : '#ffffff',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 2px 8px ${routeColor}40` : '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: routeColor,
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}
                />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                  Vehicle {route.vehicle}
                </h4>
              </div>

              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                {(() => {
                  const vehicle = vehicles.find(v => v.id === route.vehicle);
                  return (
                    <>
                      {vehicle?.skills && vehicle.skills.length > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Skills:</strong> [{vehicle.skills.join(', ')}]
                        </div>
                      )}
                      {vehicle?.time_window && vehicle.time_window.length >= 2 && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Time Window:</strong> {formatTime(vehicle.time_window[0])} ~ {formatTime(vehicle.time_window[1])}
                        </div>
                      )}
                      {vehicle?.capacity && vehicle.capacity.length > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Capacity:</strong> [{vehicle.capacity.join(', ')}]
                        </div>
                      )}
                    </>
                  );
                })()}
                <div style={{ marginBottom: '4px' }}>
                  <strong>Jobs:</strong> {totalJobs}
                </div>
                {route.delivery && route.delivery.length > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Delivery:</strong> [{route.delivery.join(', ')}]
                  </div>
                )}
                {route.pickup && route.pickup.length > 0 && route.pickup.some(p => p > 0) && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Pickup:</strong> [{route.pickup.join(', ')}]
                  </div>
                )}
                <div style={{ marginBottom: '4px' }}>
                  <strong>Service Time:</strong> {formatDuration(route.service || 0)}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Duration:</strong> {formatDuration(route.duration || 0)}
                </div>
                {route.waiting_time !== undefined && route.waiting_time > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Waiting Time:</strong> {formatDuration(route.waiting_time)}
                  </div>
                )}
                {startTime > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Time:</strong> {formatTime(startTime)} - {formatTime(endTime)}
                  </div>
                )}
                {route.cost !== undefined && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Cost:</strong> {route.cost.toLocaleString()}
                  </div>
                )}
                {route.distance !== undefined && route.distance > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Distance:</strong> {(route.distance / 1000).toFixed(1)} km
                  </div>
                )}
                {route.priority !== undefined && route.priority > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Priority:</strong> {route.priority}
                  </div>
                )}
                {route.violations && route.violations.length > 0 && (
                  <div style={{ marginBottom: '4px', color: '#dc3545' }}>
                    <strong>Violations:</strong> {route.violations.length}
                  </div>
                )}
              </div>

              {isSelected && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSelectedRouteToExcel(route, index);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '11px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      marginBottom: '8px'
                    }}
                    title={`Export Vehicle ${route.vehicle} route to Excel`}
                  >
                    📋 Export This Route
                  </button>
                  
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Route Steps:</div>
                    {route.steps.map((step, stepIndex) => (
                      <div key={stepIndex} style={{ marginBottom: '3px' }}>
                        <div>
                          {stepIndex + 1}. {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                          {step.job !== undefined && ` (Job ${step.job})`}
                          {step.arrival && ` - ${formatTime(step.arrival)}`}
                        </div>
                        {step.description && (
                          <div style={{ fontSize: '10px', color: '#999', marginLeft: '10px', fontStyle: 'italic' }}>
                            {step.description}
                          </div>
                        )}
                        <div style={{ fontSize: '10px', color: '#999', marginLeft: '10px' }}>
                          {step.service !== undefined && `서비스: ${formatDetailedTime(step.service)}`}
                          {step.service !== undefined && step.waiting_time !== undefined && ' | '}
                          {step.waiting_time !== undefined && `대기: ${formatDetailedTime(step.waiting_time)}`}
                        </div>
                        {step.delivery && step.delivery.length > 0 && step.delivery.some(d => d > 0) && (
                          <div style={{ fontSize: '10px', color: '#e67e22', marginLeft: '10px' }}>
                            배송량: [{step.delivery.join(', ')}]
                          </div>
                        )}
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
                            <div style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>
                              적재량: [{step.load.join(', ')}]{loadPercents && ` (${loadPercents.join(', ')})`}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Vehicles */}
        {(() => {
          const assignedVehicleIds = routingResponse?.routes?.map(r => r.vehicle) || [];
          const unassignedVehicles = vehicles.filter(v => !assignedVehicleIds.includes(v.id));

          if (unassignedVehicles.length === 0) return null;

          return (
            <>
              <div style={{
                marginTop: '16px',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#999'
              }}>
                미배차 차량 ({unassignedVehicles.length})
              </div>
              {unassignedVehicles.map((vehicle) => (
                <div
                  key={`unassigned-${vehicle.id}`}
                  style={{
                    border: '2px dashed #ccc',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '10px',
                    backgroundColor: '#f9f9f9',
                    opacity: 0.7
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#999',
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}
                    />
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                      Vehicle {vehicle.id}
                    </h4>
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '10px',
                      color: '#999',
                      backgroundColor: '#eee',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      미배차
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
                    {vehicle.skills && vehicle.skills.length > 0 && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Skills:</strong> [{vehicle.skills.join(', ')}]
                      </div>
                    )}
                    {vehicle.time_window && vehicle.time_window.length >= 2 && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Time Window:</strong> {formatTime(vehicle.time_window[0])} ~ {formatTime(vehicle.time_window[1])}
                      </div>
                    )}
                    {vehicle.capacity && vehicle.capacity.length > 0 && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Capacity:</strong> [{vehicle.capacity.join(', ')}]
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          );
        })()}
      </div>

      {routingResponse?.summary && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '12px',
          borderTop: '1px solid #e0e0e0'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Summary</div>
          <div>Routes: {routingResponse.summary.routes || routingResponse.routes?.length || 0}</div>
          {routingResponse.summary.delivery && routingResponse.summary.delivery.length > 0 && (
            <div>Total Delivery: [{routingResponse.summary.delivery.join(', ')}]</div>
          )}
          {routingResponse.summary.pickup && routingResponse.summary.pickup.length > 0 && (
            <div>Total Pickup: [{routingResponse.summary.pickup.join(', ')}]</div>
          )}
          <div>Total Cost: {routingResponse.summary.cost.toLocaleString()}</div>
          <div>Total Service: {formatDuration(routingResponse.summary.service)}</div>
          <div>Total Duration: {formatDuration(routingResponse.summary.duration)}</div>
          {routingResponse.summary.waiting_time !== undefined && routingResponse.summary.waiting_time > 0 && (
            <div>Total Waiting: {formatDuration(routingResponse.summary.waiting_time)}</div>
          )}
          {routingResponse.summary.distance && (
            <div>Total Distance: {(routingResponse.summary.distance / 1000).toFixed(1)} km</div>
          )}
          <div>Unassigned Jobs: {routingResponse.summary.unassigned}</div>
        </div>
      )}
    </div>
  );
};

export default RouteList;