import { io, Socket } from 'socket.io-client';
import { eventBus } from './eventBus';
import { SocketEvent, Result } from '../types';

let socket: Socket | null = null;

export type Unsubscribe = () => void;
export function initSocketIO(): Unsubscribe | null {
  const enabled = (import.meta.env.VITE_ENABLE_WS ?? 'false') === 'true';
  const url = import.meta.env.VITE_SOCKETIO_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
  if (!enabled) return;
  try {
    socket = io(url, { transports: ['websocket'] });
    socket.on('connect', () => {
      console.log('[socketio] connected', socket?.id);
    });
    socket.on('disconnect', () => {
      console.warn('[socketio] disconnected');
    });
    socket.on('display_program', (payload: { program_key: string; program_name: string; section: string; }) => {
      eventBus.emit(SocketEvent.DISPLAY_PROGRAM, { program_name: payload.program_name, section: payload.section });
    });
    socket.on('display_result', (payload: { program_key: string; program_name: string; section: string; result: Result; }) => {
      eventBus.emit(SocketEvent.DISPLAY_RESULT, { program_name: payload.program_name, section: payload.section, result: payload.result });
    });
    socket.on('error', (e: any) => {
      console.warn('[socketio] server error', e);
    });
    return () => { try { socket?.disconnect(); } catch {} };
  } catch (e) {
    console.warn('[socketio] init failed', e);
    return null;
  }
}

export function emitShowProgram(program_key: string): void {
  if (!socket) return;
  socket.emit('show_program', { program_key });
}

export function emitShowResult(program_key: string, result_index: number): void {
  if (!socket) return;
  socket.emit('show_result', { program_key, result_index });
}