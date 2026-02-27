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
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', lineHeight: '1.6' }}>
          {useAsync ? (
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #c8e6c9',
              borderRadius: '4px',
              marginTop: '4px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2e7d32' }}>Async 모드 ON</div>
              <div><strong>동작:</strong> 요청 즉시 Job ID 반환 → 1초 간격 폴링 → 완료 시 결과 표시</div>
              <div><strong>용도:</strong> 대규모 요청 (50+ jobs, 10+ vehicles) 또는 타임아웃이 긴 경우</div>
              <div><strong>모니터링:</strong> 아래 Job Status 패널에서 상태 실시간 확인</div>
              <div style={{ marginTop: '4px', color: '#555' }}>
                <strong>vs Sync:</strong> 동기 모드는 응답 올 때까지 대기. 비동기는 백그라운드 처리 후 폴링으로 수신.
                결과는 동일하며, 브라우저 타임아웃 방지에 유리함.
              </div>
            </div>
          ) : (
            <span>대규모 요청 시 브라우저 타임아웃 방지를 위해 비동기 처리를 사용합니다.</span>
          )}
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
          <div><strong>Job Status:</strong> <span style={{
            padding: '2px 8px',
            borderRadius: '3px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: currentJob.status === 'completed' ? '#c8e6c9' :
                           currentJob.status === 'failed' ? '#ffcdd2' : '#bbdefb',
            color: currentJob.status === 'completed' ? '#2e7d32' :
                   currentJob.status === 'failed' ? '#c62828' : '#1565c0'
          }}>{currentJob.status?.toUpperCase()}</span></div>
          <div style={{ marginTop: '4px' }}><strong>Job ID:</strong> <code style={{ fontSize: '11px' }}>{currentJob.id}</code></div>
          {currentJob.status === 'processing' && (
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
              백그라운드 처리 중... 1초 간격으로 상태를 확인합니다.
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