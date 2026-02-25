import React, { useState } from 'react';

interface EngineGuideProps {
  serverName: string;
}

interface ModeInfo {
  label: string;
  color: string;
  tagline: string;
  pipeline: string[];
  responseFields: string[];
  extras: string[];
  tip: string;
}

const MODE_INFO: Record<string, ModeInfo> = {
  'vroom-distribute': {
    label: 'Direct',
    color: '#6c757d',
    tagline: 'VROOM 직접 호출 (전처리/후처리 없음)',
    pipeline: [
      'VROOM 바이너리 호출 (OSRM 도로 경로)',
      '미배정 작업 사유 분석',
    ],
    responseFields: [
      'routes — 차량별 경로 (OSRM 도로 기반)',
      'summary — 총 비용/거리/시간',
      'unassigned — 미배정 작업 + 사유(reasons)',
    ],
    extras: [],
    tip: 'VROOM 표준 응답과 동일. API Key 불필요. 가장 빠름.',
  },
  'vroom-optimize': {
    label: 'Standard',
    color: '#007bff',
    tagline: '전처리 + 최적화 + 분석 + 통계 풀 파이프라인',
    pipeline: [
      '1. 전처리: 입력 검증, 좌표 정규화, 비즈니스 규칙 적용',
      '2. 캐시 확인 (동일 요청 즉시 반환)',
      '3. 도달 불가능 작업 사전 필터링',
      '4. VROOM 최적화 실행',
      '5. 미배정 시 제약 완화 후 자동 재시도',
      '6. 미배정 사유 분석 (capacity, skills, time_window 등)',
      '7. 품질 분석 (quality_score, 개선 제안)',
      '8. 상세 통계 생성 (거리, 시간, 적재율 등)',
      '9. 결과 캐시 저장',
    ],
    responseFields: [
      'routes — 차량별 최적 경로',
      'summary — 요약 정보',
      'unassigned — 미배정 + 상세 사유(reasons)',
      'analysis — 품질 점수, 차량 활용률, 개선 제안',
      'statistics — 총 거리/시간, 차량별 적재율 등 통계',
      '_metadata — 처리시간, 캐시 여부, 엔진 정보',
    ],
    extras: [
      'use_cache: true — 동일 요청 캐시 (기본 켜짐)',
      'business_rules.vip_job_ids — VIP 작업 우선 배정',
      'business_rules.urgent_job_ids — 긴급 작업 우선 배정',
    ],
    tip: '일반적인 운영에 권장. 품질 분석과 통계로 배차 결과를 평가할 수 있음.',
  },
  'vroom-optimize-basic': {
    label: 'Basic',
    color: '#28a745',
    tagline: '빠른 최적화 (분석/통계/캐시 생략)',
    pipeline: [
      '1. 전처리: 입력 검증, 좌표 정규화, 비즈니스 규칙 적용',
      '2. VROOM 최적화 실행',
      '3. 미배정 사유 분석',
    ],
    responseFields: [
      'routes — 차량별 최적 경로',
      'summary — 요약 정보',
      'unassigned — 미배정 + 상세 사유(reasons)',
      '_metadata — 컨트롤 레벨, 엔진 정보',
    ],
    extras: [
      'business_rules 사용 가능',
      '자동 재시도 없음 (빠른 응답 우선)',
    ],
    tip: '빠른 결과가 필요할 때. 전처리(검증)는 포함되지만 후처리(분석/통계)는 생략.',
  },
  'vroom-optimize-premium': {
    label: 'Premium',
    color: '#6f42c1',
    tagline: '다중 시나리오 비교 + 2-Pass 최적화',
    pipeline: [
      '1. 전처리: 입력 검증, 좌표 정규화, 비즈니스 규칙 적용',
      '2. 도달 불가능 작업 사전 필터링',
      '3. 다중 시나리오 생성 (다양한 설정 조합)',
      '4. 각 시나리오별 VROOM 최적화 실행',
      '5. 2-Pass: 초기 배정 후 경로별 재최적화',
      '6. 최적 시나리오 자동 선택',
      '7. 미배정 사유 분석',
      '8. 품질 분석 + 상세 통계',
    ],
    responseFields: [
      'routes — 최적 시나리오의 차량별 경로',
      'summary — 요약 정보',
      'unassigned — 미배정 + 상세 사유(reasons)',
      'analysis — 품질 점수, 차량 활용률, 개선 제안',
      'statistics — 총 거리/시간, 차량별 적재율 등',
      'multi_scenario_metadata — 시나리오 비교 결과',
      '_metadata — two_pass: true, 처리시간 등',
    ],
    extras: [
      '여러 설정 조합을 동시에 실행하여 최적 결과 선택',
      '2-Pass: 1차 배정 후 각 경로를 개별 재최적화',
      '처리 시간이 더 걸리지만 품질이 가장 높음',
    ],
    tip: '최고 품질이 필요할 때. 처리 시간은 Standard의 2~4배이나 더 나은 결과 기대.',
  },
};

const EngineGuide: React.FC<EngineGuideProps> = ({ serverName }) => {
  const [expanded, setExpanded] = useState(false);
  const info = MODE_INFO[serverName];

  if (!info) return null;

  return (
    <div style={{
      marginBottom: '10px',
      border: `1px solid ${info.color}33`,
      borderRadius: '6px',
      backgroundColor: `${info.color}08`,
      overflow: 'hidden',
    }}>
      {/* Header - always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            backgroundColor: info.color,
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}>
            {info.label}
          </span>
          <span style={{ fontSize: '12px', color: '#555' }}>
            {info.tagline}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, marginLeft: '8px' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 12px 12px 12px', fontSize: '12px', lineHeight: '1.6' }}>
          {/* Pipeline */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              처리 파이프라인:
            </div>
            {info.pipeline.map((step, i) => (
              <div key={i} style={{ color: '#555', paddingLeft: '8px' }}>
                {step.match(/^\d\./) ? step : `• ${step}`}
              </div>
            ))}
          </div>

          {/* Response fields */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              응답에 포함되는 데이터:
            </div>
            {info.responseFields.map((field, i) => (
              <div key={i} style={{ color: '#555', paddingLeft: '8px' }}>
                <code style={{
                  backgroundColor: '#f0f0f0',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  fontSize: '11px',
                }}>
                  {field.split(' — ')[0]}
                </code>
                {field.includes(' — ') && (
                  <span style={{ marginLeft: '4px' }}>
                    — {field.split(' — ')[1]}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Extra options */}
          {info.extras.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                {serverName.includes('optimize') ? '추가 옵션:' : '참고:'}
              </div>
              {info.extras.map((extra, i) => (
                <div key={i} style={{ color: '#555', paddingLeft: '8px' }}>
                  • {extra}
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          <div style={{
            padding: '6px 10px',
            backgroundColor: `${info.color}12`,
            borderLeft: `3px solid ${info.color}`,
            borderRadius: '0 4px 4px 0',
            color: '#444',
          }}>
            {info.tip}
          </div>

          {/* Comparison table for optimize modes */}
          {serverName.startsWith('vroom-optimize') && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '6px' }}>
                모드 비교:
              </div>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={thStyle}>기능</th>
                    <th style={thStyle}>Basic</th>
                    <th style={thStyle}>Standard</th>
                    <th style={thStyle}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={tdStyle}>{row.label}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.basic}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.standard}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '4px 6px',
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  fontWeight: 'bold',
};

const tdStyle: React.CSSProperties = {
  padding: '3px 6px',
  borderBottom: '1px solid #eee',
};

const COMPARISON_ROWS = [
  { label: '입력 검증/정규화', basic: 'O', standard: 'O', premium: 'O' },
  { label: '비즈니스 규칙', basic: 'O', standard: 'O', premium: 'O' },
  { label: '미배정 사유 분석', basic: 'O', standard: 'O', premium: 'O' },
  { label: '도달불가 필터링', basic: '-', standard: 'O', premium: 'O' },
  { label: '자동 재시도', basic: '-', standard: 'O', premium: 'O' },
  { label: '캐시', basic: '-', standard: 'O', premium: '-' },
  { label: '품질 분석/제안', basic: '-', standard: 'O', premium: 'O' },
  { label: '상세 통계', basic: '-', standard: 'O', premium: 'O' },
  { label: '다중 시나리오', basic: '-', standard: '-', premium: 'O' },
  { label: '2-Pass 최적화', basic: '-', standard: '-', premium: 'O' },
  { label: '처리 속도', basic: '빠름', standard: '보통', premium: '느림' },
];

export default EngineGuide;
