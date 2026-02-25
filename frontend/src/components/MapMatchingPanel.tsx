import React, { useState } from 'react';
import { MapMatchingRequest, MapMatchingResponse, MapMatchingPoint } from '../types';
import { matchTrajectory } from '../services/api';

interface MapMatchingPanelProps {
  onMapMatchingResult: (result: MapMatchingResponse, originalTrajectory?: number[][]) => void;
  onShowOriginalChange: (showOriginal: boolean) => void;
}

const MapMatchingPanel: React.FC<MapMatchingPanelProps> = ({ onMapMatchingResult, onShowOriginalChange }) => {
  const [trajectoryInput, setTrajectoryInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<MapMatchingResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string>('production');
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // 서버 목록
  const servers = [
    { value: 'production', label: 'Production (8000)', url: 'http://localhost:8000' },
    { value: 'dev', label: 'Dev 전처리 서버', url: 'https://engine-process-dev.roouty.io' },
    { value: 'staging', label: 'Staging', url: 'https://engine-process-stage.roouty.io' },
    { value: 'workstation', label: 'Workstation (8000)', url: 'http://localhost:8000' },
    { value: 'workstation-vpn', label: 'Workstation VPN (8000)', url: 'http://106.248.245.10:8000' }
  ];

  // 예시 데이터
  const exampleTrajectory = [
    [126.978, 37.5665, Date.now() / 1000, 5.0, 0.0],
    [126.982, 37.567, Date.now() / 1000 + 60, 8.0, 12.5],
    [126.985, 37.5675, Date.now() / 1000 + 120, 6.0, 15.0],
    [126.989, 37.568, Date.now() / 1000 + 180, 10.0, 18.0],
    [126.992, 37.5685, Date.now() / 1000 + 240, 7.0, 14.0],
    [126.995, 37.569, Date.now() / 1000 + 300, 5.0, 16.0]
  ];

  const handleLoadExample = () => {
    setTrajectoryInput(JSON.stringify(exampleTrajectory, null, 2));
    setError('');
  };

  const handleSubmit = async () => {
    if (!trajectoryInput.trim()) {
      setError('GPS 궤적 데이터를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // 입력 데이터 파싱
      const trajectory = JSON.parse(trajectoryInput);

      // 데이터 유효성 검사
      if (!Array.isArray(trajectory) || trajectory.length < 2) {
        throw new Error('최소 2개 이상의 GPS 포인트가 필요합니다.');
      }

      // 각 포인트가 올바른 형식인지 확인
      for (let i = 0; i < trajectory.length; i++) {
        const point = trajectory[i];
        if (!Array.isArray(point) || point.length < 5) {
          throw new Error(`포인트 ${i + 1}: [경도, 위도, 타임스탬프, 정확도, 속도] 형식이어야 합니다.`);
        }
      }

      const selectedServerConfig = servers.find(s => s.value === selectedServer);
      const request: MapMatchingRequest = {
        trajectory,
        enable_debug: true
      };
      const response = await matchTrajectory(request, selectedServerConfig?.url);

      setResult(response);
      onMapMatchingResult(response, trajectory);

      if (!response.success) {
        setError(response.error || 'Map matching 처리 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Map matching 요청 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('Map matching error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setTrajectoryInput('');
    setResult(null);
    setError('');
    onMapMatchingResult({
      success: true,
      matched_trace: [],
      message: 'Cleared'
    }, []);
  };

  return (
    <div className="map-matching-panel" style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
        Map Matching
      </h3>

      {/* 서버 선택 섹션 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Map Matching 서버:
        </label>
        <select
          value={selectedServer}
          onChange={(e) => setSelectedServer(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {servers.map(server => (
            <option key={server.value} value={server.value}>
              {server.label}
            </option>
          ))}
        </select>
      </div>

      {/* 입력 섹션 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          GPS 궤적 데이터:
        </label>
        <div style={{ marginBottom: '8px' }}>
          <button
            onClick={handleLoadExample}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            예시 데이터 로드
          </button>
          <span style={{ fontSize: '12px', color: '#666' }}>
            형식: [[경도, 위도, 타임스탬프, 정확도, 속도], ...]
          </span>
        </div>
        <textarea
          value={trajectoryInput}
          onChange={(e) => setTrajectoryInput(e.target.value)}
          placeholder="GPS 궤적 데이터를 JSON 형식으로 입력하세요..."
          style={{
            width: '100%',
            height: '200px',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 버튼 섹션 */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '8px'
          }}
        >
          {isLoading ? 'Processing...' : 'Map Matching 실행'}
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Clear
        </button>
        {result && result.success && (
          <button
            onClick={() => {
              const newShowOriginal = !showOriginal;
              setShowOriginal(newShowOriginal);
              onShowOriginalChange(newShowOriginal);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: showOriginal ? '#28a745' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showOriginal ? '원본 숨기기' : '원본 보기'}
          </button>
        )}
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div style={{
          padding: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* 결과 섹션 */}
      {result && result.success && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Map Matching 결과
          </h4>

          {/* 요약 정보 */}
          {result.summary && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              marginBottom: '12px'
            }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                요약 정보
              </h5>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                <div>전체 포인트: {result.summary.total_points}</div>
                <div>매칭된 포인트: {result.summary.matched_points}</div>
                <div>신뢰도: {(result.summary.confidence * 100).toFixed(1)}%</div>
                <div>형태 보존 점수: {(result.summary.shape_preservation_score * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* 매칭된 포인트 정보 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              매칭된 궤적 ({result.matched_trace.length}개 포인트)
            </h5>
            <div style={{
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              {result.matched_trace.slice(0, 10).map((point: MapMatchingPoint, index: number) => (
                <div key={index} style={{
                  padding: '2px 0',
                  borderBottom: index < 9 ? '1px solid #eee' : 'none'
                }}>
                  [{point.longitude.toFixed(6)}, {point.latitude.toFixed(6)}]
                  {point.flag === 1 && <span style={{ color: '#007bff' }}> (보정됨)</span>}
                </div>
              ))}
              {result.matched_trace.length > 10 && (
                <div style={{ padding: '4px 0', color: '#666', fontStyle: 'italic' }}>
                  ... 및 {result.matched_trace.length - 10}개 더
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapMatchingPanel;