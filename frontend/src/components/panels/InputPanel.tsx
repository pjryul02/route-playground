import React from 'react';
import { Server } from '../../types';
import { DEFAULT_TIMEOUT, API_CONFIG } from '../../constants';
import { getServerUrl } from '../../utils/serverHelpers';
import SpreadsheetEditor from '../SpreadsheetEditor';
import ExportButton from '../common/ExportButton';
import EngineGuide from './EngineGuide';

type ViewMode = 'json' | 'spreadsheet';

interface InputPanelProps {
  selectedServer: string;
  timeout: number;
  inputJson: string;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string;
  useAsync: boolean;
  currentJob?: any;
  servers: Server[];
  onServerChange: (server: string) => void;
  onTimeoutChange: (timeout: number) => void;
  onInputChange: (input: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onAsyncChange: (useAsync: boolean) => void;
  onSolve: () => void;
  onLoadSample: () => void;
  onRefreshServers: () => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  selectedServer,
  timeout,
  inputJson,
  viewMode,
  isLoading,
  error,
  useAsync,
  currentJob,
  servers,
  onServerChange,
  onTimeoutChange,
  onInputChange,
  onViewModeChange,
  onAsyncChange,
  onSolve,
  onLoadSample,
  onRefreshServers
}) => {
  const selectedServerData = servers.find(s => s.name === selectedServer);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'up': return '#4caf50';
      case 'down': return '#f44336';
      case 'checking': return '#ffeb3b';
      default: return '#9e9e9e';
    }
  };

  const getStatusEmoji = (status?: string) => {
    switch (status) {
      case 'up': return '🟢';
      case 'down': return '🔴';
      case 'checking': return '🟡';
      default: return '⚪';
    }
  };

  const getCurlCommand = () => {
    const baseUrl = getServerUrl(selectedServer, timeout);
    return `curl --max-time ${timeout} -H "Content-Type: application/json" -d '@your-input.json' -X POST ${baseUrl} -o output.json`;
  };

  return (
    <div>
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <label>Routing Server:</label>
          {selectedServerData && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <span style={{
                height: '8px',
                width: '8px',
                borderRadius: '50%',
                display: 'inline-block',
                backgroundColor: getStatusColor(selectedServerData.status),
                marginRight: '5px'
              }} />
              <span style={{ color: '#666' }}>{(selectedServerData.status || 'unknown').toUpperCase()}</span>
              {selectedServerData.lastChecked && (
                <span style={{ color: '#999', marginLeft: '8px', fontSize: '10px' }}>
                  {new Date(selectedServerData.lastChecked).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedServer}
            onChange={(e) => onServerChange(e.target.value)}
            style={{
              flex: 1,
              height: '36px',
              padding: '0 10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          >
            {servers.map((server) => (
              <option key={server.name} value={server.name}>
                {getStatusEmoji(server.status)} {server.description}
              </option>
            ))}
          </select>
          <button
            onClick={onRefreshServers}
            style={{
              height: '36px',
              width: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: 0,
              fontSize: '16px'
            }}
            title="Refresh Server Status"
          >
            🔄
          </button>
        </div>
      </div>

      <EngineGuide serverName={selectedServer} />

      <div className="form-group">
        <label>Timeout (seconds):</label>
        <input
          type="number"
          value={timeout}
          onChange={(e) => onTimeoutChange(parseInt(e.target.value) || DEFAULT_TIMEOUT)}
          min={API_CONFIG.timeout.min}
          max={API_CONFIG.timeout.max}
          style={{ width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}
          placeholder={DEFAULT_TIMEOUT.toString()}
        />
        <small style={{ color: '#666', fontSize: '12px' }}>
          Default: {DEFAULT_TIMEOUT} seconds. Range: {API_CONFIG.timeout.min}-{API_CONFIG.timeout.max} seconds.
        </small>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={useAsync}
            onChange={(e) => onAsyncChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Use Async Processing
        </label>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          When enabled, requests are processed asynchronously with 1-second polling for results.
        </div>
      </div>

      {currentJob && (
        <div style={{
          padding: '10px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <div><strong>Job Status:</strong> {currentJob.status}</div>
          <div><strong>Job ID:</strong> {currentJob.id}</div>
          {currentJob.status === 'processing' && (
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
              Processing... Please wait while the server handles your request.
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ marginRight: '15px' }}>Input Data:</label>
          <button
            onClick={() => onViewModeChange('json')}
            style={{
              padding: '5px 10px',
              marginRight: '5px',
              backgroundColor: viewMode === 'json' ? '#007bff' : '#f8f9fa',
              color: viewMode === 'json' ? 'white' : 'black',
              border: '1px solid #ccc',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            JSON View
          </button>
          <button
            onClick={() => onViewModeChange('spreadsheet')}
            style={{
              padding: '5px 10px',
              backgroundColor: viewMode === 'spreadsheet' ? '#007bff' : '#f8f9fa',
              color: viewMode === 'spreadsheet' ? 'white' : 'black',
              border: '1px solid #ccc',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Spreadsheet View
          </button>
        </div>

        {viewMode === 'json' ? (
          <div>
            <textarea
              value={inputJson}
              onChange={(e) => onInputChange(e.target.value)}
              style={{
                width: '100%',
                height: '400px',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                resize: 'none'
              }}
              placeholder="Enter your routing request JSON here..."
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <ExportButton
                onClick={onSolve}
                disabled={isLoading}
                variant="primary"
                size="large"
                icon={isLoading ? '⏳' : '🚀'}
              >
                {isLoading ? (useAsync ? 'Processing...' : 'Solving...') : 'Solve Routing Problem'}
              </ExportButton>

              <ExportButton
                onClick={onLoadSample}
                variant="success"
                size="medium"
                icon="📋"
              >
                Load Sample Data
              </ExportButton>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '500px', width: '100%', overflow: 'hidden' }}>
              <SpreadsheetEditor
                jsonData={inputJson}
                onJsonChange={onInputChange}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <ExportButton
                onClick={onSolve}
                disabled={isLoading}
                variant="primary"
                size="large"
                icon={isLoading ? '⏳' : '🚀'}
              >
                {isLoading ? (useAsync ? 'Processing...' : 'Solving...') : 'Solve Routing Problem'}
              </ExportButton>

              <ExportButton
                onClick={onLoadSample}
                variant="success"
                size="medium"
                icon="📋"
              >
                Load Sample Data
              </ExportButton>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p><strong>Equivalent curl command:</strong></p>
        <code style={{
          background: '#f4f4f4',
          padding: '5px',
          display: 'block',
          wordBreak: 'break-all',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {getCurlCommand()}
        </code>
      </div>
    </div>
  );
};

export default InputPanel;