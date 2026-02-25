import React, { useState } from 'react';
import JsonPanel from './components/JsonPanel';
import MapComponent from './components/MapComponent';
import RouteList from './components/RouteList';
import MapMatchingPanel from './components/MapMatchingPanel';
import ServerPanel from './components/panels/ServerPanel';
import { Vehicle, Job, RoutingResponse, MapMatchingResponse } from './types';

const App: React.FC = () => {
  const [routingResponse, setRoutingResponse] = useState<RoutingResponse | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [mapMatchingResult, setMapMatchingResult] = useState<MapMatchingResponse | null>(null);
  const [originalTrajectory, setOriginalTrajectory] = useState<number[][] | null>(null);
  const [activeTab, setActiveTab] = useState<'routing' | 'map-matching' | 'servers'>('routing');
  const [showOriginalTrajectory, setShowOriginalTrajectory] = useState<boolean>(false);

  const handleRoutingResponse = (response: RoutingResponse | null, requestData: any) => {
    setRoutingResponse(response);

    // If response is null (clearing routes), also clear vehicles and jobs
    if (!response) {
      setVehicles([]);
      setJobs([]);
      setSelectedRouteId(null);
      return;
    }

    // Extract vehicles and jobs from request data for map display
    const vehiclesData: Vehicle[] = requestData.vehicles?.map((v: any) => ({
      id: v.id,
      start: { lat: v.start[1], lng: v.start[0] }, // VROOM uses [lng, lat] format
      end: v.end ? { lat: v.end[1], lng: v.end[0] } : undefined,
      capacity: Array.isArray(v.capacity) ? v.capacity : (v.capacity ? [v.capacity] : undefined),
      skills: v.skills,
      time_window: v.time_window
    })) || [];

    const jobsData: Job[] = requestData.jobs?.map((j: any) => ({
      id: j.id,
      location: { lat: j.location[1], lng: j.location[0] }, // VROOM uses [lng, lat] format
      service: j.service,
      delivery: j.delivery,
      pickup: j.pickup,
      priority: j.priority,
      skills: j.skills,
      time_windows: j.time_windows,
      description: j.description
    })) || [];

    setVehicles(vehiclesData);
    setJobs(jobsData);
    setSelectedRouteId(null); // Reset selection when new data loads
  };

  const handleMapMatchingResult = (result: MapMatchingResponse, originalTrajectory?: number[][]) => {
    setMapMatchingResult(result);
    setOriginalTrajectory(originalTrajectory || null);
  };

  const getTabStyle = (tab: 'routing' | 'map-matching' | 'servers') => ({
    flex: 1,
    padding: '8px 16px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#007bff' : '#f8f9fa',
    color: activeTab === tab ? 'white' : '#333',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid #007bff' : 'none',
    fontSize: '13px',
    fontWeight: activeTab === tab ? 'bold' : 'normal'
  });

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left side - Control Panel with Tabs */}
      <div style={{ width: '25%', minWidth: '350px', display: 'flex', flexDirection: 'column' }}>
        {/* Tab buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
          <button onClick={() => setActiveTab('routing')} style={getTabStyle('routing')}>
            Routing
          </button>
          <button onClick={() => setActiveTab('map-matching')} style={getTabStyle('map-matching')}>
            Map Matching
          </button>
          <button onClick={() => setActiveTab('servers')} style={getTabStyle('servers')}>
            Servers
          </button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'routing' && <JsonPanel onRoutingResponse={handleRoutingResponse} />}
          {activeTab === 'map-matching' && (
            <MapMatchingPanel
              onMapMatchingResult={handleMapMatchingResult}
              onShowOriginalChange={setShowOriginalTrajectory}
            />
          )}
          {activeTab === 'servers' && <ServerPanel />}
        </div>
      </div>

      {/* Middle - Route List */}
      <div style={{ width: '20%', minWidth: '250px', borderRight: '1px solid #ccc' }}>
        <RouteList
          routingResponse={routingResponse}
          selectedRouteId={selectedRouteId}
          onRouteSelect={setSelectedRouteId}
          vehicles={vehicles}
        />
      </div>

      {/* Right side - Map */}
      <div style={{ width: '55%', height: '100vh' }}>
        <MapComponent
          vehicles={vehicles}
          jobs={jobs}
          routingResponse={routingResponse}
          selectedRouteId={selectedRouteId}
          onMapClick={() => { }} // Empty handler for now
          mapMatchingResult={mapMatchingResult}
          originalTrajectory={originalTrajectory}
          showOriginalTrajectory={showOriginalTrajectory}
        />
      </div>
    </div>
  );
};

export default App;