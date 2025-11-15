import type { Program, Result } from '../types';
import * as mock from './mockApi';
import * as api from './api';
import * as xlsx from './xlsxService';

const useMockEnv = (import.meta.env.VITE_USE_MOCK ?? 'true') === 'true';
const useXlsxEnv = (import.meta.env.VITE_USE_XLSX ?? 'false') === 'true';
let backendAvailable: boolean | null = useMockEnv ? false : null;

export async function fetchPrograms(): Promise<Program[]> {
  if (useXlsxEnv) {
    try {
      const data = await xlsx.fetchProgramsFromXlsx();
      return data;
    } catch (e) {
      console.warn('fetchPrograms: XLSX unavailable, using mock instead of backend');
      return mock.fetchPrograms();
    }
  }
  if (useMockEnv) return mock.fetchPrograms();
  try {
    const data = await api.fetchPrograms();
    backendAvailable = true;
    return data;
  } catch (e) {
    console.warn('fetchPrograms: backend unavailable, falling back to mock');
    backendAvailable = false;
    return mock.fetchPrograms();
  }
}

export async function fetchResultsForProgram(key: string): Promise<Program | null> {
  if (useXlsxEnv) {
    try {
      const data = await xlsx.fetchResultsForProgramFromXlsx(key);
      return data;
    } catch (e) {
      console.warn('fetchResultsForProgram: XLSX unavailable, using mock instead of backend');
      return mock.fetchResultsForProgram(key);
    }
  }
  if (useMockEnv) return mock.fetchResultsForProgram(key);
  try {
    const data = await api.fetchResultsForProgram(key);
    backendAvailable = true;
    return data;
  } catch (e) {
    console.warn('fetchResultsForProgram: backend unavailable, falling back to mock');
    backendAvailable = false;
    return mock.fetchResultsForProgram(key);
  }
}

export async function announceResult(program: Program, result: Result): Promise<void> {
  // In XLSX mode, still notify backend to broadcast over WebSocket.
  if (useMockEnv) return;
  try {
    await api.announceResult(program, result);
    backendAvailable = true;
  } catch (e) {
    console.warn('announceResult: backend unavailable, skipping backend call');
    backendAvailable = false;
  }
}

export async function announceProgram(program: Program): Promise<void> {
  // Notify backend of selected program so viewers can show intro via WebSocket
  if (useMockEnv) return;
  try {
    await api.announceProgram(program);
    backendAvailable = true;
  } catch (e) {
    console.warn('announceProgram: backend unavailable, skipping backend call');
    backendAvailable = false;
  }
}

export function isBackendAvailable(): boolean | null {
  return backendAvailable;
}