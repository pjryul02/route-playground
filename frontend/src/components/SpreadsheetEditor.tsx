import React, { useState, useEffect, useRef } from 'react';

interface JobRow {
  id: number;
  description: string;
  location_lon: number;
  location_lat: number;
  service: number;
  delivery: string; // JSON string representation
  skills: string; // JSON string representation
  priority: number;
  time_windows: string; // JSON string representation
  round?: number;
  groups?: string; // JSON string representation
}

interface VehicleRow {
  id: number;
  profile: string;
  start_lon: number;
  start_lat: number;
  capacity: string; // JSON string representation
  costs_fixed: number;
  skills: string; // JSON string representation
  time_window: string; // JSON string representation
  groups?: string; // JSON string representation
}

interface ShipmentRow {
  id: number;
  pickup_location_lon: number;
  pickup_location_lat: number;
  delivery_location_lon: number;
  delivery_location_lat: number;
  pickup_service?: number;
  delivery_service?: number;
  amount?: string; // JSON string representation
  skills?: string; // JSON string representation
  priority?: number;
  pickup_time_windows?: string; // JSON string representation
  delivery_time_windows?: string; // JSON string representation
}

interface SpreadsheetEditorProps {
  jsonData: string;
  onJsonChange: (newJson: string) => void;
}

const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ jsonData, onJsonChange }) => {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [activeTab, setActiveTab] = useState<'jobs' | 'vehicles' | 'shipments'>('jobs');
  const [isInitialized, setIsInitialized] = useState(false);
  const skipNextUpdate = useRef(false);

  // Helper functions for array/object conversion
  const arrayToString = (arr: any[]): string => {
    if (!Array.isArray(arr)) return '[]';
    return JSON.stringify(arr);
  };

  const stringToArray = (str: string): any[] => {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Convert JSON to table data
  const jsonToTables = (json: string) => {
    if (!json || json.trim() === '') return;
    
    try {
      const data = JSON.parse(json);
      
      // Convert jobs
      const jobsData: JobRow[] = (data.jobs || []).map((job: any, index: number) => ({
        id: job.id !== undefined ? job.id : index,
        description: job.description || '',
        location_lon: Array.isArray(job.location) ? job.location[0] || 0 : 0,
        location_lat: Array.isArray(job.location) ? job.location[1] || 0 : 0,
        service: job.service || 0,
        delivery: arrayToString(job.delivery || []),
        skills: arrayToString(job.skills || []),
        priority: job.priority || 0,
        time_windows: arrayToString(job.time_windows || []),
        round: job.round,
        groups: arrayToString(job.groups || [])
      }));

      // Convert vehicles
      const vehiclesData: VehicleRow[] = (data.vehicles || []).map((vehicle: any, index: number) => ({
        id: vehicle.id !== undefined ? vehicle.id : index,
        profile: vehicle.profile || '',
        start_lon: Array.isArray(vehicle.start) ? vehicle.start[0] || 0 : 0,
        start_lat: Array.isArray(vehicle.start) ? vehicle.start[1] || 0 : 0,
        capacity: arrayToString(vehicle.capacity || []),
        costs_fixed: (vehicle.costs && vehicle.costs.fixed) || 0,
        skills: arrayToString(vehicle.skills || []),
        time_window: arrayToString(vehicle.time_window || []),
        groups: arrayToString(vehicle.groups || [])
      }));

      // Convert shipments
      const shipmentsData: ShipmentRow[] = (data.shipments || []).map((shipment: any, index: number) => ({
        id: shipment.id !== undefined ? shipment.id : index,
        pickup_location_lon: Array.isArray(shipment.pickup?.location) ? shipment.pickup.location[0] || 0 : 0,
        pickup_location_lat: Array.isArray(shipment.pickup?.location) ? shipment.pickup.location[1] || 0 : 0,
        delivery_location_lon: Array.isArray(shipment.delivery?.location) ? shipment.delivery.location[0] || 0 : 0,
        delivery_location_lat: Array.isArray(shipment.delivery?.location) ? shipment.delivery.location[1] || 0 : 0,
        pickup_service: shipment.pickup?.service,
        delivery_service: shipment.delivery?.service,
        amount: arrayToString(shipment.amount || []),
        skills: arrayToString(shipment.skills || []),
        priority: shipment.priority,
        pickup_time_windows: arrayToString(shipment.pickup?.time_windows || []),
        delivery_time_windows: arrayToString(shipment.delivery?.time_windows || [])
      }));

      // Set skip flag to prevent triggering update back to parent
      skipNextUpdate.current = true;
      setJobs(jobsData);
      setVehicles(vehiclesData);
      setShipments(shipmentsData);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  };

  // Convert table data back to JSON
  const tablesToJson = (): string => {
    const data: any = {};

    // Convert jobs
    if (jobs.length > 0) {
      data.jobs = jobs.map(job => ({
        id: job.id,
        description: job.description,
        location: [job.location_lon, job.location_lat],
        service: job.service,
        delivery: stringToArray(job.delivery),
        skills: stringToArray(job.skills),
        priority: job.priority,
        time_windows: stringToArray(job.time_windows),
        ...(job.round !== undefined && { round: job.round }),
        ...(job.groups && stringToArray(job.groups).length > 0 && { groups: stringToArray(job.groups) })
      }));
    }

    // Convert vehicles
    if (vehicles.length > 0) {
      data.vehicles = vehicles.map(vehicle => ({
        id: vehicle.id,
        profile: vehicle.profile,
        start: [vehicle.start_lon, vehicle.start_lat],
        capacity: stringToArray(vehicle.capacity),
        costs: { fixed: vehicle.costs_fixed },
        skills: stringToArray(vehicle.skills),
        time_window: stringToArray(vehicle.time_window),
        ...(vehicle.groups && stringToArray(vehicle.groups).length > 0 && { groups: stringToArray(vehicle.groups) })
      }));
    }

    // Convert shipments
    if (shipments.length > 0) {
      data.shipments = shipments.map(shipment => ({
        id: shipment.id,
        pickup: {
          location: [shipment.pickup_location_lon, shipment.pickup_location_lat],
          ...(shipment.pickup_service !== undefined && { service: shipment.pickup_service }),
          ...(shipment.pickup_time_windows && { time_windows: stringToArray(shipment.pickup_time_windows) })
        },
        delivery: {
          location: [shipment.delivery_location_lon, shipment.delivery_location_lat],
          ...(shipment.delivery_service !== undefined && { service: shipment.delivery_service }),
          ...(shipment.delivery_time_windows && { time_windows: stringToArray(shipment.delivery_time_windows) })
        },
        ...(shipment.amount && { amount: stringToArray(shipment.amount) }),
        ...(shipment.skills && { skills: stringToArray(shipment.skills) }),
        ...(shipment.priority !== undefined && { priority: shipment.priority })
      }));
    }

    // Add other fields from original JSON
    try {
      const originalData = JSON.parse(jsonData);
      Object.keys(originalData).forEach(key => {
        if (!['jobs', 'vehicles', 'shipments'].includes(key)) {
          data[key] = originalData[key];
        }
      });
    } catch (error) {
      console.error('Error preserving original data:', error);
    }

    return JSON.stringify(data, null, 2);
  };

  // Initialize from JSON data
  useEffect(() => {
    jsonToTables(jsonData);
  }, [jsonData]);

  // Update JSON when table data changes
  useEffect(() => {
    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    if (isInitialized) {
      const timer = setTimeout(() => {
        const newJson = tablesToJson();
        onJsonChange(newJson);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [jobs, vehicles, shipments, isInitialized]);

  const updateJobField = (index: number, field: keyof JobRow, value: any) => {
    const newJobs = [...jobs];
    newJobs[index] = { ...newJobs[index], [field]: value };
    setJobs(newJobs);
  };

  const updateVehicleField = (index: number, field: keyof VehicleRow, value: any) => {
    const newVehicles = [...vehicles];
    newVehicles[index] = { ...newVehicles[index], [field]: value };
    setVehicles(newVehicles);
  };

  const updateShipmentField = (index: number, field: keyof ShipmentRow, value: any) => {
    const newShipments = [...shipments];
    newShipments[index] = { ...newShipments[index], [field]: value };
    setShipments(newShipments);
  };

  const addJobRow = () => {
    const newJob: JobRow = {
      id: jobs.length,
      description: '',
      location_lon: 0,
      location_lat: 0,
      service: 0,
      delivery: '[]',
      skills: '[]',
      priority: 0,
      time_windows: '[]',
      groups: '[]'
    };
    setJobs([...jobs, newJob]);
  };

  const addVehicleRow = () => {
    const newVehicle: VehicleRow = {
      id: vehicles.length,
      profile: '',
      start_lon: 0,
      start_lat: 0,
      capacity: '[]',
      costs_fixed: 0,
      skills: '[]',
      time_window: '[]',
      groups: '[]'
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const addShipmentRow = () => {
    const newShipment: ShipmentRow = {
      id: shipments.length,
      pickup_location_lon: 0,
      pickup_location_lat: 0,
      delivery_location_lon: 0,
      delivery_location_lat: 0,
      amount: '[]'
    };
    setShipments([...shipments, newShipment]);
  };

  const removeJobRow = (index: number) => {
    setJobs(jobs.filter((_, i) => i !== index));
  };

  const removeVehicleRow = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const removeShipmentRow = (index: number) => {
    setShipments(shipments.filter((_, i) => i !== index));
  };

  const renderJobsTable = () => (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '50px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '150px' }}>Description</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Lon</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Lat</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '60px' }}>Service</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Delivery</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Skills</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '60px' }}>Priority</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '120px' }}>Time Windows</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '60px' }}>Round</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Groups</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '60px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={job.id}
                  onChange={(e) => updateJobField(index, 'id', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={job.description}
                  onChange={(e) => updateJobField(index, 'description', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={job.location_lon}
                  onChange={(e) => updateJobField(index, 'location_lon', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={job.location_lat}
                  onChange={(e) => updateJobField(index, 'location_lat', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={job.service}
                  onChange={(e) => updateJobField(index, 'service', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={job.delivery}
                  onChange={(e) => updateJobField(index, 'delivery', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[10,0,0]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={job.skills}
                  onChange={(e) => updateJobField(index, 'skills', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[1,2]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={job.priority}
                  onChange={(e) => updateJobField(index, 'priority', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={job.time_windows}
                  onChange={(e) => updateJobField(index, 'time_windows', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[[start,end]]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={job.round || ''}
                  onChange={(e) => updateJobField(index, 'round', e.target.value ? parseInt(e.target.value) : undefined)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={job.groups}
                  onChange={(e) => updateJobField(index, 'groups', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[1,2]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>
                <button
                  onClick={() => removeJobRow(index)}
                  style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderVehiclesTable = () => (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '50px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '120px' }}>Profile</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Start Lon</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Start Lat</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Capacity</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Fixed Cost</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Skills</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '120px' }}>Time Window</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Groups</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '60px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={vehicle.id}
                  onChange={(e) => updateVehicleField(index, 'id', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={vehicle.profile}
                  onChange={(e) => updateVehicleField(index, 'profile', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={vehicle.start_lon}
                  onChange={(e) => updateVehicleField(index, 'start_lon', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={vehicle.start_lat}
                  onChange={(e) => updateVehicleField(index, 'start_lat', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={vehicle.capacity}
                  onChange={(e) => updateVehicleField(index, 'capacity', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[1000,0,0]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={vehicle.costs_fixed}
                  onChange={(e) => updateVehicleField(index, 'costs_fixed', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={vehicle.skills}
                  onChange={(e) => updateVehicleField(index, 'skills', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[1,2]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={vehicle.time_window}
                  onChange={(e) => updateVehicleField(index, 'time_window', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[start,end]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={vehicle.groups}
                  onChange={(e) => updateVehicleField(index, 'groups', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[1,2]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>
                <button
                  onClick={() => removeVehicleRow(index)}
                  style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderShipmentsTable = () => (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '50px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Pickup Lon</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Pickup Lat</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Delivery Lon</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Delivery Lat</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Pickup Service</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Delivery Service</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '80px' }}>Amount</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '60px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={shipment.id}
                  onChange={(e) => updateShipmentField(index, 'id', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={shipment.pickup_location_lon}
                  onChange={(e) => updateShipmentField(index, 'pickup_location_lon', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={shipment.pickup_location_lat}
                  onChange={(e) => updateShipmentField(index, 'pickup_location_lat', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={shipment.delivery_location_lon}
                  onChange={(e) => updateShipmentField(index, 'delivery_location_lon', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  step="0.000001"
                  value={shipment.delivery_location_lat}
                  onChange={(e) => updateShipmentField(index, 'delivery_location_lat', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={shipment.pickup_service || ''}
                  onChange={(e) => updateShipmentField(index, 'pickup_service', e.target.value ? parseInt(e.target.value) : undefined)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="number"
                  value={shipment.delivery_service || ''}
                  onChange={(e) => updateShipmentField(index, 'delivery_service', e.target.value ? parseInt(e.target.value) : undefined)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                <input
                  type="text"
                  value={shipment.amount || '[]'}
                  onChange={(e) => updateShipmentField(index, 'amount', e.target.value)}
                  style={{ width: '100%', border: 'none', padding: '2px' }}
                  placeholder="[10,0,0]"
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>
                <button
                  onClick={() => removeShipmentRow(index)}
                  style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '10px', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '8px 16px',
            marginRight: '5px',
            backgroundColor: activeTab === 'jobs' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'jobs' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          style={{
            padding: '8px 16px',
            marginRight: '5px',
            backgroundColor: activeTab === 'vehicles' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'vehicles' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'shipments' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'shipments' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Shipments ({shipments.length})
        </button>
      </div>

      <div style={{ marginBottom: '10px', flexShrink: 0 }}>
        {activeTab === 'jobs' && (
          <>
            <button onClick={addJobRow} style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
              Add Job
            </button>
          </>
        )}
        {activeTab === 'vehicles' && (
          <>
            <button onClick={addVehicleRow} style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
              Add Vehicle
            </button>
          </>
        )}
        {activeTab === 'shipments' && (
          <>
            <button onClick={addShipmentRow} style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
              Add Shipment
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, border: '1px solid #ccc', overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'jobs' && renderJobsTable()}
        {activeTab === 'vehicles' && renderVehiclesTable()}
        {activeTab === 'shipments' && renderShipmentsTable()}
      </div>
    </div>
  );
};

export default SpreadsheetEditor;