import React from 'react';

interface AnalysisPanelProps {
  outputJson: string;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ outputJson }) => {
  let data: any = null;
  try {
    data = JSON.parse(outputJson);
  } catch {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>
        응답 데이터가 없습니다. Solve를 먼저 실행하세요.
      </div>
    );
  }

  const metadata = data._metadata || data._wrapper || null;
  const analysis = data.analysis || null;
  const statistics = data.statistics || null;
  const unassigned = data.unassigned || [];
  const multiScenario = data.multi_scenario_metadata || null;
  const relaxation = data.relaxation_metadata || null;
  const summary = data.summary || null;

  const hasWrapperData = metadata || analysis || statistics;

  return (
    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
      {/* Metadata */}
      {metadata && <MetadataSection metadata={metadata} wrapperVersion={data.wrapper_version} />}

      {/* Summary (always available) */}
      {summary && <SummarySection summary={summary} />}

      {/* Quality Analysis */}
      {analysis && <AnalysisSection analysis={analysis} />}

      {/* Statistics */}
      {statistics && <StatisticsSection statistics={statistics} />}

      {/* Unassigned */}
      {unassigned.length > 0 && <UnassignedSection unassigned={unassigned} />}

      {/* Multi-scenario */}
      {multiScenario && <ScenarioSection scenario={multiScenario} />}

      {/* Relaxation */}
      {relaxation && <RelaxationSection relaxation={relaxation} />}

      {/* No wrapper data */}
      {!hasWrapperData && unassigned.length === 0 && (
        <div style={{
          padding: '30px 20px',
          textAlign: 'center',
          color: '#888',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>-</div>
          <div>이 서버 모드에서는 분석 데이터가 제공되지 않습니다.</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#aaa' }}>
            VROOM Optimize (Full/Premium) 모드에서 품질 분석, 통계, 미배정 사유 등을 확인할 수 있습니다.
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================
   Section Components
   ============================================ */

const MetadataSection: React.FC<{ metadata: any; wrapperVersion?: string }> = ({ metadata, wrapperVersion }) => {
  const controlLevel = metadata.control_level;
  const levelColors: Record<string, string> = {
    BASIC: '#28a745',
    STANDARD: '#007bff',
    PREMIUM: '#6f42c1',
  };

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {controlLevel && (
          <span style={{
            backgroundColor: levelColors[controlLevel] || '#6c757d',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>
            {controlLevel}
          </span>
        )}
        {wrapperVersion && (
          <span style={tagStyle}>v{wrapperVersion}</span>
        )}
        {metadata.engine && (
          <span style={tagStyle}>engine: {metadata.engine}</span>
        )}
        {metadata.processing_time_ms != null && (
          <span style={tagStyle}>{metadata.processing_time_ms}ms</span>
        )}
        {metadata.from_cache && (
          <span style={{ ...tagStyle, backgroundColor: '#fff3cd', color: '#856404' }}>cached</span>
        )}
        {metadata.two_pass && (
          <span style={{ ...tagStyle, backgroundColor: '#d4edda', color: '#155724' }}>2-Pass</span>
        )}
      </div>
    </div>
  );
};

const SummarySection: React.FC<{ summary: any }> = ({ summary }) => (
  <div style={sectionStyle}>
    <SectionTitle>Summary</SectionTitle>
    <div style={gridStyle}>
      <StatCard label="Routes" value={summary.routes ?? '-'} />
      <StatCard label="Distance" value={summary.distance != null ? `${(summary.distance / 1000).toFixed(1)} km` : '-'} />
      <StatCard label="Duration" value={summary.duration != null ? `${Math.round(summary.duration / 60)} min` : '-'} />
      <StatCard label="Unassigned" value={summary.unassigned ?? 0} color={summary.unassigned > 0 ? '#dc3545' : '#28a745'} />
      {summary.service != null && (
        <StatCard label="Service" value={`${Math.round(summary.service / 60)} min`} />
      )}
      {summary.waiting_time != null && summary.waiting_time > 0 && (
        <StatCard label="Waiting" value={`${Math.round(summary.waiting_time / 60)} min`} />
      )}
    </div>
    {summary.computing_times && (
      <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
        VROOM: loading {summary.computing_times.loading}ms, solving {summary.computing_times.solving}ms, routing {summary.computing_times.routing}ms
      </div>
    )}
  </div>
);

const AnalysisSection: React.FC<{ analysis: any }> = ({ analysis }) => (
  <div style={sectionStyle}>
    <SectionTitle>Quality Analysis</SectionTitle>

    {/* Quality Score Bar */}
    {analysis.quality_score != null && (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Quality Score</span>
          <span style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: analysis.quality_score >= 80 ? '#28a745' : analysis.quality_score >= 50 ? '#ffc107' : '#dc3545',
          }}>
            {analysis.quality_score.toFixed(1)}
          </span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(analysis.quality_score, 100)}%`,
            backgroundColor: analysis.quality_score >= 80 ? '#28a745' : analysis.quality_score >= 50 ? '#ffc107' : '#dc3545',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    )}

    {/* Assignment Rate */}
    {analysis.assignment_rate != null && (
      <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
        Assignment Rate: <strong>{analysis.assignment_rate}%</strong>
      </div>
    )}

    {/* Route Balance */}
    {analysis.route_balance && (
      <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
        Route Balance: <strong>{analysis.route_balance.balance_score?.toFixed(1)}%</strong>
      </div>
    )}

    {/* Suggestions */}
    {analysis.suggestions && analysis.suggestions.length > 0 && (
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Suggestions:</div>
        {analysis.suggestions.map((s: any, i: number) => {
          const suggestion = typeof s === 'string' ? s : (s.message || s.description || JSON.stringify(s));
          return (
            <div key={i} style={{
              padding: '6px 10px',
              backgroundColor: '#fff8e1',
              borderLeft: '3px solid #ffc107',
              borderRadius: '0 4px 4px 0',
              fontSize: '12px',
              marginBottom: '4px',
              color: '#555',
            }}>
              {suggestion}
            </div>
          );
        })}
      </div>
    )}

    {/* Time Window Utilization */}
    {analysis.time_window_utilization?.utilization && analysis.time_window_utilization.utilization.length > 0 && (
      <div style={{ marginTop: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Time Window Utilization:</div>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {analysis.time_window_utilization.utilization.map((v: any, i: number) => (
              <tr key={i}>
                <td style={tdStyle}>{v.vehicle ?? v.vehicle_id ?? i}</td>
                <td style={tdStyle}>{v.duration != null ? `${Math.round(v.duration / 60)} min` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const StatisticsSection: React.FC<{ statistics: any }> = ({ statistics }) => {
  const cost = statistics.cost_breakdown;
  const time = statistics.time_analysis;
  const efficiency = statistics.efficiency_metrics;
  const vehicles = statistics.vehicle_utilization?.vehicles;

  return (
    <div style={sectionStyle}>
      <SectionTitle>Statistics</SectionTitle>

      {/* Cost / Distance / Time */}
      {cost && (
        <div style={gridStyle}>
          <StatCard label="Total Distance" value={`${cost.total_distance_km?.toFixed(1)} km`} />
          <StatCard label="Total Duration" value={`${(cost.total_duration_hours * 60)?.toFixed(0)} min`} />
          <StatCard label="Service Time" value={`${(cost.service_time_hours * 60)?.toFixed(0)} min`} />
          {cost.waiting_time_hours > 0 && (
            <StatCard label="Waiting Time" value={`${(cost.waiting_time_hours * 60)?.toFixed(0)} min`} />
          )}
        </div>
      )}

      {/* Time breakdown */}
      {time && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Time Breakdown:</div>
          <div style={{
            display: 'flex',
            height: '20px',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid #dee2e6',
          }}>
            <div style={{ width: `${time.travel_percentage || 0}%`, backgroundColor: '#007bff', minWidth: '1px' }}
              title={`Travel: ${time.travel_percentage?.toFixed(1)}%`} />
            <div style={{
              width: `${100 - (time.travel_percentage || 0)}%`,
              backgroundColor: '#28a745',
              minWidth: '1px',
            }}
              title={`Service: ${(100 - (time.travel_percentage || 0)).toFixed(1)}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '2px' }}>
            <span>Travel {time.travel_percentage?.toFixed(0)}%</span>
            <span>Service {(100 - (time.travel_percentage || 0)).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Efficiency */}
      {efficiency && (
        <div style={{ ...gridStyle, marginTop: '10px' }}>
          <StatCard label="Jobs / Vehicle" value={efficiency.jobs_per_vehicle?.toFixed(1)} />
          <StatCard label="km / Job" value={efficiency.km_per_job?.toFixed(1)} />
          <StatCard label="min / Job" value={efficiency.minutes_per_job?.toFixed(1)} />
        </div>
      )}

      {/* Vehicle utilization table */}
      {vehicles && vehicles.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Vehicle Utilization:</div>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Jobs</th>
                <th style={thStyle}>Load</th>
                <th style={thStyle}>Distance</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v: any, i: number) => (
                <tr key={i}>
                  <td style={tdStyle}>{v.vehicle ?? v.vehicle_id ?? i}</td>
                  <td style={tdStyle}>{v.jobs ?? v.tasks ?? '-'}</td>
                  <td style={tdStyle}>{v.capacity_used ?? '-'}</td>
                  <td style={tdStyle}>{v.distance_km != null ? `${v.distance_km.toFixed(1)} km` : (v.distance != null ? `${(v.distance / 1000).toFixed(1)} km` : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const UnassignedSection: React.FC<{ unassigned: any[] }> = ({ unassigned }) => {
  const reasonIcons: Record<string, string> = {
    capacity: '[ capacity ]',
    skills: '[ skills ]',
    time_window: '[ time ]',
    max_tasks: '[ max_tasks ]',
    unreachable: '[ unreachable ]',
    complex_constraint: '[ complex ]',
  };

  const reasonColors: Record<string, string> = {
    capacity: '#e74c3c',
    skills: '#9b59b6',
    time_window: '#f39c12',
    max_tasks: '#3498db',
    unreachable: '#95a5a6',
    complex_constraint: '#e67e22',
  };

  return (
    <div style={sectionStyle}>
      <SectionTitle>
        Unassigned Jobs
        <span style={{
          marginLeft: '8px',
          backgroundColor: '#dc3545',
          color: '#fff',
          padding: '1px 8px',
          borderRadius: '10px',
          fontSize: '12px',
        }}>
          {unassigned.length}
        </span>
      </SectionTitle>

      {unassigned.map((u: any, i: number) => (
        <div key={i} style={{
          padding: '8px 10px',
          backgroundColor: '#fff5f5',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '6px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
              Job #{u.id} {u.type ? `(${u.type})` : ''}
            </span>
            {u.description && (
              <span style={{ fontSize: '11px', color: '#888' }}>{u.description}</span>
            )}
          </div>

          {u.reasons && u.reasons.length > 0 ? (
            <div style={{ marginTop: '4px' }}>
              {u.reasons.map((r: any, j: number) => (
                <div key={j} style={{
                  fontSize: '12px',
                  color: reasonColors[r.type] || '#555',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  marginTop: '2px',
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    backgroundColor: `${reasonColors[r.type] || '#555'}18`,
                    padding: '1px 4px',
                    borderRadius: '2px',
                    flexShrink: 0,
                  }}>
                    {reasonIcons[r.type] || `[ ${r.type} ]`}
                  </span>
                  <span>{r.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
              Reason not available
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ScenarioSection: React.FC<{ scenario: any }> = ({ scenario }) => (
  <div style={sectionStyle}>
    <SectionTitle>Multi-Scenario</SectionTitle>
    <div style={gridStyle}>
      <StatCard label="Selected" value={scenario.selected_scenario || '-'} />
      <StatCard label="Total Scenarios" value={scenario.total_scenarios ?? '-'} />
    </div>
  </div>
);

const RelaxationSection: React.FC<{ relaxation: any }> = ({ relaxation }) => (
  <div style={sectionStyle}>
    <SectionTitle>Constraint Relaxation</SectionTitle>
    <div style={{ fontSize: '12px', color: '#555' }}>
      <div>Initial unassigned: <strong>{relaxation.initial_unassigned}</strong></div>
      <div>After relaxation: <strong>{relaxation.final_unassigned}</strong></div>
      <div style={{ color: '#28a745', fontWeight: 'bold' }}>
        Improved: -{relaxation.improvement} jobs
      </div>
    </div>
  </div>
);

/* ============================================
   Common Sub-components & Styles
   ============================================ */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
  }}>
    {children}
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={{
    padding: '8px 10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
    textAlign: 'center',
    minWidth: '80px',
  }}>
    <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{label}</div>
    <div style={{
      fontSize: '15px',
      fontWeight: 'bold',
      color: color || '#333',
    }}>
      {value}
    </div>
  </div>
);

const sectionStyle: React.CSSProperties = {
  marginBottom: '14px',
  padding: '12px',
  backgroundColor: '#fff',
  border: '1px solid #e9ecef',
  borderRadius: '6px',
};

const gridStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const tagStyle: React.CSSProperties = {
  backgroundColor: '#e9ecef',
  color: '#555',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '12px',
};

const thStyle: React.CSSProperties = {
  padding: '4px 8px',
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  fontWeight: 'bold',
  fontSize: '11px',
};

const tdStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderBottom: '1px solid #eee',
};

/** Check if the response contains wrapper analysis data */
export function hasAnalysisData(outputJson: string): boolean {
  try {
    const data = JSON.parse(outputJson);
    return !!(data.analysis || data.statistics || data._metadata || (data.unassigned && data.unassigned.length > 0));
  } catch {
    return false;
  }
}

export default AnalysisPanel;
