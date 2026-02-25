import React from 'react';
import { Server } from '../../types';
import { useServers } from '../../hooks/useServers';

const ServerPanel: React.FC = () => {
    const { servers, isLoading, refreshStatus } = useServers();

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'up': return '#4caf50';
            case 'down': return '#f44336';
            case 'checking': return '#ffeb3b';
            default: return '#9e9e9e';
        }
    };

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'up': return 'ONLINE';
            case 'down': return 'OFFLINE';
            case 'checking': return 'CHECKING...';
            default: return 'UNKNOWN';
        }
    };

    return (
        <div style={{ padding: '15px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Routing Engines</h3>
                <button
                    onClick={refreshStatus}
                    disabled={isLoading}
                    style={{
                        padding: '5px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    {isLoading ? 'Checking...' : 'Check All Status'}
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {servers.map((server) => (
                    <div
                        key={server.name}
                        style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '6px',
                            marginBottom: '10px',
                            backgroundColor: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                                <strong style={{ fontSize: '15px' }}>{server.description}</strong>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{server.name}</div>
                            </div>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: getStatusColor(server.status) + '15',
                                color: getStatusColor(server.status),
                                border: `1px solid ${getStatusColor(server.status)}40`
                            }}>
                                {getStatusLabel(server.status)}
                            </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#888', wordBreak: 'break-all', marginBottom: '8px' }}>
                            <code>{server.url}</code>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#999' }}>
                            <span>Type: {server.type || 'direct'}</span>
                            {server.lastChecked && (
                                <span>Last checked: {new Date(server.lastChecked).toLocaleTimeString()}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                <strong>Configuration Note:</strong>
                <p style={{ margin: '5px 0 0 0' }}>
                    Backend proxies are configured via <code>.env</code> file. Direct servers are defined in <code>servers.json</code>.
                </p>
            </div>
        </div>
    );
};

export default ServerPanel;
