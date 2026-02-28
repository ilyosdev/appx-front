import { io, Socket } from 'socket.io-client';
import { tokenStorage, getApiBaseUrl } from './api';

let socket: Socket | null = null;
let currentProjectId: string | null = null;

// Connection state management for stability
let isConnecting = false;
let pendingProjectId: string | null = null;
let disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export function connectSocket(projectId: string, wsUrl?: string): Socket {
  // Cancel any pending disconnect (React Strict Mode recovery)
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
    disconnectTimeout = null;
    console.log('[Socket] Cancelled pending disconnect');
  }

  // If already connected to this project, return existing socket
  if (socket?.connected && currentProjectId === projectId) {
    console.log('[Socket] Reusing existing connection for project:', projectId);
    return socket;
  }

  // If currently connecting to the same project, return the socket being set up
  if (isConnecting && pendingProjectId === projectId && socket) {
    console.log('[Socket] Connection in progress for project:', projectId);
    return socket;
  }

  // If connected to a different project, disconnect first
  if (socket && currentProjectId !== projectId) {
    console.log('[Socket] Switching projects, disconnecting from:', currentProjectId);
    socket.disconnect();
    socket = null;
    currentProjectId = null;
  }

  // If we have a socket that's not connected (e.g., disconnected state), clean it up
  if (socket && !socket.connected && !isConnecting) {
    console.log('[Socket] Cleaning up disconnected socket');
    socket.disconnect();
    socket = null;
  }

  const token = tokenStorage.getAccessToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  isConnecting = true;
  pendingProjectId = projectId;

  const baseWsUrl = wsUrl || getApiBaseUrl().replace('/api/v1', '').replace('https://', 'wss://').replace('http://', 'ws://');
  const socketUrl = `${baseWsUrl}/projects`;

  console.log('[Socket] Creating new connection for project:', projectId);

  socket = io(socketUrl, {
    query: { token, projectId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  currentProjectId = projectId;

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id, 'Project:', projectId);
    isConnecting = false;
    pendingProjectId = null;
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    isConnecting = false;
    // Don't clear currentProjectId here - we might reconnect
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    isConnecting = false;
  });

  return socket;
}

export function disconnectSocket(): void {
  // Cancel any existing pending disconnect
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
  }

  // Debounce disconnect to handle React Strict Mode double-invoke
  // This gives time for a reconnect call to cancel the disconnect
  disconnectTimeout = setTimeout(() => {
    if (socket) {
      console.log('[Socket] Executing disconnect');
      socket.disconnect();
      socket = null;
      currentProjectId = null;
      isConnecting = false;
      pendingProjectId = null;
    }
    disconnectTimeout = null;
  }, 100); // 100ms delay to allow reconnect to cancel
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function forceDisconnect(): void {
  // Immediate disconnect without debounce (for navigation away)
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout);
    disconnectTimeout = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
    currentProjectId = null;
    isConnecting = false;
    pendingProjectId = null;
  }
}
