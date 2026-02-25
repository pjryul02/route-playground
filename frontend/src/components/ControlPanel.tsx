import React, { useState, useEffect } from 'react';
import { Vehicle, Job, RoutingResponse, Server } from '../types';
import { getAvailableServers } from '../services/api';
import { useRouting } from '../hooks/useRouting';

interface ControlPanelProps {
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[]) => void;
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  onSolve: (response: RoutingResponse) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  vehicles,
  setVehicles,
  jobs,
  setJobs,
  onSolve
}) => {
  const [selectedServer, setSelectedServer] = useState<string>('roouty');
  const [availableServers, setAvailableServers] = useState<Server[]>([]);
  const [useAsync, setUseAsync] = useState<boolean>(false);
  const [timeout, setTimeout] = useState<number>(300);
  const [lastResponse, setLastResponse] = useState<RoutingResponse | null>(null);
  
  const { isLoading, error, currentJob, solve, clearError } = useRouting();

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await getAvailableServers();
        setAvailableServers(response.servers);
      } catch (error) {
        console.error('Error fetching servers:', error);
      }
    };
    fetchServers();
  }, []);

  const handleSolve = async () => {
    clearError();
    setLastResponse(null);
    try {
      const response = await solve(selectedServer, { vehicles, jobs }, timeout, useAsync);
      if (response) {
        setLastResponse(response);
        onSolve(response);
      }
    } catch (error) {
      console.error('Error solving routing problem:', error);
      alert('Error solving routing problem. Please check the console for details.');
    }
  };

  const formatElapsedTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };

  const addVehicle = () => {
    const newVehicle: Vehicle = {
      id: Date.now(),
      start: { lat: 37.5665, lng: 126.9780 },
      end: { lat: 37.5665, lng: 126.9780 },
      capacity: [1000]
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const removeVehicle = (id: number) => {
    setVehicles(vehicles.filter(v => v.id !== id));
  };

  const updateVehicle = (id: number, updates: Partial<Vehicle>) => {
    setVehicles(vehicles.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const addJob = () => {
    const newJob: Job = {
      id: Date.now(),
      location: { lat: 37.5651, lng: 126.9895 },
      service: 300,
      delivery: [100],
      priority: 100
    };
    setJobs([...jobs, newJob]);
  };

  const removeJob = (id: number) => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const updateJob = (id: number, updates: Partial<Job>) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  return (
    <div className="sidebar">
      <h2>Route Playground</h2>
      
      <div className="form-group">
        <label>Routing Server:</label>
        <select
          value={selectedServer}
          onChange={(e) => setSelectedServer(e.target.value)}
        >
          {availableServers.map((server) => (
            <option key={server.name} value={server.name}>
              {server.description}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Timeout (seconds):</label>
        <input
          type="number"
          value={timeout}
          onChange={(e) => setTimeout(parseInt(e.target.value) || 300)}
          min="10"
          max="1800"
        />
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={useAsync}
            onChange={(e) => setUseAsync(e.target.checked)}
          />
          Use Async Processing
        </label>
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {currentJob && (
        <div className="job-status" style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
          <div><strong>Job Status:</strong> {currentJob.status}</div>
          <div><strong>Job ID:</strong> {currentJob.id}</div>
          {currentJob.status === 'processing' && (
            <div style={{ marginTop: '5px' }}>
              <div>Processing... Please wait</div>
            </div>
          )}
        </div>
      )}

      {lastResponse && !useAsync && lastResponse.metadata?.elapsedTime && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '10px', 
          border: '1px solid #28a745', 
          backgroundColor: '#d4edda', 
          borderRadius: '4px',
          color: '#155724'
        }}>
          <div><strong>✅ Solution completed successfully!</strong></div>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            ⏱️ Response time: {formatElapsedTime(lastResponse.metadata.elapsedTime)}
          </div>
        </div>
      )}

      <div className="form-group">
        <button onClick={handleSolve} disabled={isLoading}>
          {isLoading ? (useAsync ? 'Processing...' : 'Solving...') : 'Solve Routing Problem'}
        </button>
      </div>

      {/* Vehicles Section */}
      <div className="vehicle-section">
        <h3>Vehicles</h3>
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <h4>Vehicle {vehicle.id}</h4>
            <div className="form-group">
              <label>Start Location:</label>
              <div className="location-inputs">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={vehicle.start.lat}
                  onChange={(e) => updateVehicle(vehicle.id, {
                    start: { ...vehicle.start, lat: parseFloat(e.target.value) || 0 }
                  })}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={vehicle.start.lng}
                  onChange={(e) => updateVehicle(vehicle.id, {
                    start: { ...vehicle.start, lng: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Capacity:</label>
              <input
                type="number"
                value={vehicle.capacity?.[0] || 1000}
                onChange={(e) => updateVehicle(vehicle.id, {
                  capacity: [parseInt(e.target.value) || 1000]
                })}
              />
            </div>
            <button className="remove-btn" onClick={() => removeVehicle(vehicle.id)}>
              Remove Vehicle
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={addVehicle}>
          Add Vehicle
        </button>
      </div>

      {/* Jobs Section */}
      <div className="job-section">
        <h3>Jobs ({jobs.length})</h3>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Click on the map to add new jobs
        </p>
        {jobs.map((job) => (
          <div key={job.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <h4>Job {job.id}</h4>
            <div className="form-group">
              <label>Location:</label>
              <div className="location-inputs">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={job.location.lat}
                  onChange={(e) => updateJob(job.id, {
                    location: { ...job.location, lat: parseFloat(e.target.value) || 0 }
                  })}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={job.location.lng}
                  onChange={(e) => updateJob(job.id, {
                    location: { ...job.location, lng: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Service Time (seconds):</label>
              <input
                type="number"
                value={job.service || 300}
                onChange={(e) => updateJob(job.id, {
                  service: parseInt(e.target.value) || 300
                })}
              />
            </div>
            <div className="form-group">
              <label>Delivery Amount:</label>
              <input
                type="number"
                value={job.delivery?.[0] || 100}
                onChange={(e) => updateJob(job.id, {
                  delivery: [parseInt(e.target.value) || 100]
                })}
              />
            </div>
            <button className="remove-btn" onClick={() => removeJob(job.id)}>
              Remove Job
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={addJob}>
          Add Job
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;