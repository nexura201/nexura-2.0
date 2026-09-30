/**
 * MediaServerService - Pool de media servers para streaming
 * 
 * Permite gestionar múltiples servidores MediaMTX
 */

export interface MediaServer {
  id: string;
  name: string;
  rtmpUrl: string;
  hlsUrl: string;
  apiUrl: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  capacity: number;
  currentLoad: number;
  activeStreams: number;
  maxStreams: number;
  region?: string;
  lastHealthCheck: number;
}

export interface StreamAssignment {
  streamId: string;
  serverId: string;
  assignedAt: number;
}

export class MediaServerService {
  private static instance: MediaServerService;
  private servers: Map<string, MediaServer> = new Map();
  private assignments: Map<string, StreamAssignment> = new Map();

  private constructor() {
    this.loadServers();
    this.registerDefaultServer();
  }

  static getInstance(): MediaServerService {
    if (!MediaServerService.instance) {
      MediaServerService.instance = new MediaServerService();
    }
    return MediaServerService.instance;
  }

  /**
   * Register default media server
   */
  private registerDefaultServer(): void {
    if (this.servers.size === 0) {
      this.registerServer({
        id: 'default',
        name: 'Default Media Server',
        rtmpUrl: 'rtmp://localhost:1935/live',
        hlsUrl: 'http://localhost:8888/live',
        apiUrl: 'http://localhost:9997',
        status: 'UP',
        capacity: 100,
        currentLoad: 0,
        activeStreams: 0,
        maxStreams: 100,
        lastHealthCheck: Date.now(),
      });
    }
  }

  /**
   * Load servers from localStorage
   */
  private loadServers(): void {
    const stored = localStorage.getItem('nexura_media_servers');
    if (stored) {
      try {
        const servers = JSON.parse(stored);
        Object.entries(servers).forEach(([id, server]) => {
          this.servers.set(id, server as MediaServer);
        });
      } catch (error) {
        console.error('[MediaServerService] Error loading servers:', error);
      }
    }

    const assignments = localStorage.getItem('nexura_stream_assignments');
    if (assignments) {
      try {
        const data = JSON.parse(assignments);
        Object.entries(data).forEach(([streamId, assignment]) => {
          this.assignments.set(streamId, assignment as StreamAssignment);
        });
      } catch (error) {
        console.error('[MediaServerService] Error loading assignments:', error);
      }
    }
  }

  /**
   * Save servers to localStorage
   */
  private saveServers(): void {
    const serversObj: Record<string, MediaServer> = {};
    this.servers.forEach((server, id) => {
      serversObj[id] = server;
    });
    localStorage.setItem('nexura_media_servers', JSON.stringify(serversObj));

    const assignmentsObj: Record<string, StreamAssignment> = {};
    this.assignments.forEach((assignment, streamId) => {
      assignmentsObj[streamId] = assignment;
    });
    localStorage.setItem('nexura_stream_assignments', JSON.stringify(assignmentsObj));
  }

  /**
   * Register a new media server
   */
  registerServer(server: MediaServer): void {
    this.servers.set(server.id, server);
    this.saveServers();
  }

  /**
   * Unregister a media server
   */
  unregisterServer(serverId: string): void {
    this.servers.delete(serverId);
    
    // Reassign streams from this server
    for (const [streamId, assignment] of this.assignments.entries()) {
      if (assignment.serverId === serverId) {
        this.assignments.delete(streamId);
      }
    }
    
    this.saveServers();
  }

  /**
   * Get a media server by ID
   */
  getServer(serverId: string): MediaServer | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all media servers
   */
  getAllServers(): MediaServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get available servers (UP or DEGRADED)
   */
  getAvailableServers(): MediaServer[] {
    return Array.from(this.servers.values()).filter(
      s => s.status === 'UP' || s.status === 'DEGRADED'
    );
  }

  /**
   * Select the best server for a new stream
   */
  selectServer(preferredRegion?: string): MediaServer | null {
    const available = this.getAvailableServers();
    if (available.length === 0) return null;

    // Filter by region if preferred
    let candidates = preferredRegion
      ? available.filter(s => s.region === preferredRegion)
      : available;

    // If no servers in preferred region, use all available
    if (candidates.length === 0) {
      candidates = available;
    }

    // Select server with lowest load
    return candidates.reduce((best, current) => {
      const bestLoad = best.activeStreams / best.maxStreams;
      const currentLoad = current.activeStreams / current.maxStreams;
      return currentLoad < bestLoad ? current : best;
    });
  }

  /**
   * Assign a stream to a server
   */
  assignStream(streamId: string, serverId?: string): MediaServer | null {
    // Check if already assigned
    const existing = this.assignments.get(streamId);
    if (existing) {
      const server = this.servers.get(existing.serverId);
      if (server && server.status !== 'DOWN') {
        return server;
      }
      // Server is down, remove assignment
      this.assignments.delete(streamId);
    }

    // Select server
    const server = serverId ? this.servers.get(serverId) : this.selectServer();
    if (!server) return null;

    // Create assignment
    const assignment: StreamAssignment = {
      streamId,
      serverId: server.id,
      assignedAt: Date.now(),
    };

    this.assignments.set(streamId, assignment);

    // Update server load
    server.activeStreams++;
    server.currentLoad = (server.activeStreams / server.maxStreams) * 100;

    this.saveServers();
    return server;
  }

  /**
   * Release a stream from a server
   */
  releaseStream(streamId: string): void {
    const assignment = this.assignments.get(streamId);
    if (!assignment) return;

    const server = this.servers.get(assignment.serverId);
    if (server) {
      server.activeStreams = Math.max(0, server.activeStreams - 1);
      server.currentLoad = (server.activeStreams / server.maxStreams) * 100;
    }

    this.assignments.delete(streamId);
    this.saveServers();
  }

  /**
   * Get server assignment for a stream
   */
  getAssignment(streamId: string): StreamAssignment | undefined {
    return this.assignments.get(streamId);
  }

  /**
   * Get playback URL for a stream
   */
  getPlaybackUrl(streamId: string, streamKey: string): string | null {
    const assignment = this.assignments.get(streamId);
    if (!assignment) return null;

    const server = this.servers.get(assignment.serverId);
    if (!server) return null;

    return `${server.hlsUrl}/${streamKey}`;
  }

  /**
   * Update server health status
   */
  updateHealth(serverId: string, status: MediaServer['status']): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = status;
      server.lastHealthCheck = Date.now();
      this.saveServers();
    }
  }

  /**
   * Perform health check on all servers
   */
  async healthCheck(): Promise<void> {
    for (const server of this.servers.values()) {
      try {
        // In production, this would call the server's health endpoint
        // const response = await fetch(`${server.apiUrl}/health`);
        // const status = response.ok ? 'UP' : 'DEGRADED';
        
        // For now, just update the timestamp
        server.lastHealthCheck = Date.now();
      } catch (error) {
        server.status = 'DOWN';
        server.lastHealthCheck = Date.now();
      }
    }
    this.saveServers();
  }

  /**
   * Get system-wide statistics
   */
  getStats(): {
    totalServers: number;
    availableServers: number;
    totalStreams: number;
    totalCapacity: number;
    averageLoad: number;
  } {
    const servers = Array.from(this.servers.values());
    const totalStreams = servers.reduce((sum, s) => sum + s.activeStreams, 0);
    const totalCapacity = servers.reduce((sum, s) => sum + s.maxStreams, 0);
    const averageLoad = totalCapacity > 0 ? (totalStreams / totalCapacity) * 100 : 0;

    return {
      totalServers: servers.length,
      availableServers: this.getAvailableServers().length,
      totalStreams,
      totalCapacity,
      averageLoad,
    };
  }
}

// Export singleton instance
export const mediaServerService = MediaServerService.getInstance();
