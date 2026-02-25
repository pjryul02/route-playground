import serversConfig from '../config/servers.json';

export interface ServerConfig {
  name: string;
  description: string;
  url: string;
  type: 'direct' | 'proxy';
}

// Load all servers from the config file
const allServers: ServerConfig[] = serversConfig as ServerConfig[];

// Build a lookup map for O(1) access
const serverMap = new Map<string, ServerConfig>(
  allServers.map(s => [s.name, s])
);

/**
 * Checks if a server should be called directly (not through backend proxy)
 */
export const isDirectServer = (server: string): boolean => {
  const config = serverMap.get(server);
  return config?.type === 'direct';
};

/**
 * Gets the URL for a direct server
 */
export const getDirectServerUrl = (server: string): string => {
  const config = serverMap.get(server);
  if (!config) {
    throw new Error(`Unknown server: ${server}`);
  }
  return config.url;
};

/**
 * Gets the appropriate URL for any server (direct or backend proxy)
 */
export const getServerUrl = (server: string, timeout?: number): string => {
  if (isDirectServer(server)) {
    return getDirectServerUrl(server);
  }

  const baseUrl = `http://${window.location.hostname}:8080/solve/${server}`;
  return timeout ? `${baseUrl}?timeout=${timeout}` : baseUrl;
};

/**
 * Gets a user-friendly display name for servers
 */
export const getServerDisplayName = (server: string): string => {
  const config = serverMap.get(server);
  return config?.description || server.toUpperCase();
};

/**
 * Returns all configured servers
 */
export const getAllServers = (): ServerConfig[] => {
  return allServers;
};