import React, { useState } from 'react';
import { RoutingResponse } from '../types';
import { useServers } from '../hooks/useServers';
import { useRouting } from '../hooks/useRouting';
import { DEFAULT_TIMEOUT, DEFAULT_SERVER } from '../constants';
import TabButton from './common/TabButton';
import InputPanel from './panels/InputPanel';
import OutputPanel from './panels/OutputPanel';
import AnalysisPanel, { hasAnalysisData } from './panels/AnalysisPanel';

interface JsonPanelProps {
  onRoutingResponse?: (response: RoutingResponse | null, requestData: any) => void;
}

const JsonPanel: React.FC<JsonPanelProps> = ({ onRoutingResponse }) => {
  const [selectedServer, setSelectedServer] = useState<string>(DEFAULT_SERVER);
  const [timeout, setTimeout] = useState<number>(DEFAULT_TIMEOUT);
  const [inputJson, setInputJson] = useState<string>(`{
  "jobs": [
    {
      "id": 0,
      "description": "서울 마포구 백범로31길 21 101동 615호",
      "location": [126.949791, 37.546615],
      "service": 60,
      "delivery": [41, 0, 0],
      "skills": [1],
      "priority": 4,
      "time_windows": [[1749450600, 1749459600]]
    },
    {
      "id": 1,
      "description": "서울 노원구 동일로 986 (공릉동, 노원 프레미어스 엠코)",
      "location": [127.07568332, 37.61832412],
      "service": 300,
      "delivery": [65, 0, 0],
      "skills": [2],
      "priority": 4,
      "time_windows": [[1749394800, 1750258800]]
    },
    {
      "id": 2,
      "description": "서울 강남구 테헤란로 518 11층",
      "location": [127.060234, 37.504012],
      "service": 300,
      "delivery": [120, 0, 0],
      "skills": [1],
      "priority": 4,
      "time_windows": [[1749450600, 1750258800]]
    },
    {
      "id": 3,
      "description": "경기 성남시 분당구 정자일로 95 네이버1784 13층",
      "location": [127.105399, 37.359708],
      "service": 300,
      "delivery": [80, 0, 0],
      "skills": [2],
      "priority": 4,
      "time_windows": [[1749394800, 1750258800]]
    }
  ],
  "vehicles": [
    {
      "id": 14591,
      "profile": "car", 
      "start": [127.154014, 35.8163581],
      "capacity": [2000, 0, 0],
      "costs": {"fixed": 50000},
      "skills": [2],
      "time_window": [1749427200, 1750258800]
    }
  ],
  "distribute_options": {
    "custom_matrix": {
      "enabled": true
    }
  }
}`);
  const [outputJson, setOutputJson] = useState<string>('');
  const [viewMode, setViewMode] = useState<'json' | 'spreadsheet'>('json');
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'analysis'>('input');
  const [useAsync, setUseAsync] = useState<boolean>(false);

  // Use custom hooks
  const { servers, refreshStatus } = useServers();
  const { isLoading, error, currentJob, solve, clearError } = useRouting();

  const handleSolve = async () => {
    console.log('[handleSolve] Called with server:', selectedServer);
    clearError();
    setOutputJson('');

    // Clear previous routing results when starting a new solve
    if (onRoutingResponse) {
      onRoutingResponse(null, {});
    }

    try {
      const requestData = JSON.parse(inputJson);
      console.log('[handleSolve] Parsed request data, calling solve...');
      const response = await solve(selectedServer, requestData, timeout, useAsync);

      if (response) {
        const jsonStr = JSON.stringify(response, null, 2);
        setOutputJson(jsonStr);

        // Call the callback to update the map
        if (onRoutingResponse) {
          onRoutingResponse(response, requestData);
        }

        // Switch to analysis tab if wrapper data exists, otherwise output
        if (hasAnalysisData(jsonStr)) {
          setActiveTab('analysis');
        } else {
          setActiveTab('output');
        }
      }
    } catch (error: any) {
      console.error('Error parsing JSON:', error);
    }
  };

  const loadSampleData = () => {
    setInputJson(`{
  "vehicles": [
    {
      "id": 1,
      "profile": "car",
      "start": [126.9780, 37.5665],
      "end": [126.9780, 37.5665],
      "capacity": [1000]
    },
    {
      "id": 2,
      "profile": "car",
      "start": [126.9780, 37.5665],
      "end": [126.9780, 37.5665],
      "capacity": [1000]
    }
  ],
  "jobs": [
    {
      "id": 1,
      "location": [126.9895, 37.5651],
      "service": 300,
      "delivery": [100],
      "priority": 100
    },
    {
      "id": 2,
      "location": [126.9748, 37.5663],
      "service": 300,
      "delivery": [150],
      "priority": 100
    },
    {
      "id": 3,
      "location": [126.9851, 37.5707],
      "service": 300,
      "delivery": [200],
      "priority": 100
    },
    {
      "id": 4,
      "location": [126.9805, 37.5635],
      "service": 300,
      "delivery": [80],
      "priority": 100
    }
  ],
  "options": {
    "g": true
  }
}`);
  };

  const handleApplyToMap = () => {
    try {
      const parsedJson = JSON.parse(outputJson);
      if (onRoutingResponse) {
        // Try to get request data from input tab
        const requestData = JSON.parse(inputJson);
        onRoutingResponse(parsedJson, requestData);
      }
    } catch (error) {
      alert('Invalid JSON format. Please check your JSON and try again.');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with tabs */}
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Route Playground</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          <TabButton
            isActive={activeTab === 'input'}
            onClick={() => setActiveTab('input')}
          >
            Input Data
          </TabButton>
          <TabButton
            isActive={activeTab === 'output'}
            onClick={() => setActiveTab('output')}
            hasIndicator={!!outputJson}
          >
            Output JSON
          </TabButton>
          <TabButton
            isActive={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
            hasIndicator={outputJson ? hasAnalysisData(outputJson) : false}
          >
            Analysis
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, padding: '10px', overflow: 'auto', minHeight: 0 }}>
        {activeTab === 'input' && (
          <InputPanel
            selectedServer={selectedServer}
            timeout={timeout}
            inputJson={inputJson}
            viewMode={viewMode}
            isLoading={isLoading}
            error={error}
            useAsync={useAsync}
            currentJob={currentJob}
            servers={servers}
            onServerChange={setSelectedServer}
            onTimeoutChange={setTimeout}
            onInputChange={setInputJson}
            onViewModeChange={setViewMode}
            onAsyncChange={setUseAsync}
            onSolve={handleSolve}
            onLoadSample={loadSampleData}
            onRefreshServers={refreshStatus}
          />
        )}

        {activeTab === 'output' && (
          <OutputPanel
            outputJson={outputJson}
            inputJson={inputJson}
            isLoading={isLoading}
            error={error}
            onOutputChange={setOutputJson}
            onSolve={handleSolve}
            onApplyToMap={handleApplyToMap}
            onClear={() => setOutputJson('')}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisPanel outputJson={outputJson} />
        )}
      </div>
    </div>
  );
};

export default JsonPanel;