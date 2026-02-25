import React from 'react';
import { RoutingResponse } from '../../types';
import { exportRoutingResultToExcel } from '../../utils/excelExport';
import ExportButton from '../common/ExportButton';

interface OutputPanelProps {
  outputJson: string;
  inputJson: string;
  isLoading: boolean;
  error: string;
  onOutputChange: (output: string) => void;
  onSolve: () => void;
  onApplyToMap: () => void;
  onClear: () => void;
}

const OutputPanel: React.FC<OutputPanelProps> = ({
  outputJson,
  inputJson,
  isLoading,
  error,
  onOutputChange,
  onSolve,
  onApplyToMap,
  onClear
}) => {
  const handleExportToExcel = () => {
    try {
      const parsedResponse = JSON.parse(outputJson) as RoutingResponse;
      if (parsedResponse.routes && parsedResponse.routes.length > 0) {
        exportRoutingResultToExcel(parsedResponse);
      } else {
        alert('No valid routes found in the response to export.');
      }
    } catch (error) {
      alert('Invalid JSON format. Please check your response data.');
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routing_response.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getElapsedTimeInfo = () => {
    try {
      const parsedResponse = JSON.parse(outputJson) as RoutingResponse;
      return parsedResponse.metadata?.elapsedTime;
    } catch {
      return null;
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h4 style={{ margin: 0 }}>JSON Response</h4>
          {(() => {
            const elapsedTime = getElapsedTimeInfo();
            return elapsedTime ? (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                ⏱️ Response time: {formatElapsedTime(elapsedTime)}
              </div>
            ) : null;
          })()}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportButton
            onClick={onSolve}
            disabled={isLoading}
            variant="primary"
            size="medium"
            icon={isLoading ? '⏳' : '🔄'}
          >
            {isLoading ? 'Solving...' : 'Solve Again'}
          </ExportButton>
          
          <ExportButton
            onClick={onApplyToMap}
            disabled={!outputJson.trim()}
            variant="success"
            size="medium"
            icon="🗺️"
          >
            Apply to Map
          </ExportButton>
        </div>
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
      
      <div className="form-group">
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
          Output JSON (editable - paste your own response here):
        </label>
        <textarea
          value={outputJson}
          onChange={(e) => onOutputChange(e.target.value)}
          style={{
            width: '100%',
            height: '500px',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            resize: 'none'
          }}
          placeholder="Response will appear here after solving, or paste your own JSON response here..."
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
        {outputJson && (
          <>
            <ExportButton
              onClick={handleDownloadJson}
              variant="info"
              size="medium"
              icon="📄"
            >
              Download JSON
            </ExportButton>
            
            <ExportButton
              onClick={handleExportToExcel}
              variant="success"
              size="medium"
              icon="📊"
            >
              Export to Excel
            </ExportButton>
          </>
        )}
        
        <ExportButton
          onClick={onClear}
          variant="danger"
          size="medium"
          icon="🗑️"
        >
          Clear
        </ExportButton>
      </div>
    </div>
  );
};

export default OutputPanel;