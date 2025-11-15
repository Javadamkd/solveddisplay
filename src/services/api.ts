import { Program, Result } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PROGRAMS_PATH = import.meta.env.VITE_API_PROGRAMS_PATH || '/programs';
const PROGRAM_DETAIL_PATH = import.meta.env.VITE_API_PROGRAM_DETAIL_PATH || '/programs/:key';
const ANNOUNCE_PATH = import.meta.env.VITE_API_ANNOUNCE_PATH || '/announce';

function normalizeProgramItem(raw: any): Program {
  const results = Array.isArray(raw.results) ? raw.results.map(normalizeResultItem) : [];
  return {
    key: raw.key ?? raw.id ?? raw.slug ?? String(raw.program_name ?? raw.name ?? 'unknown'),
    program_name: raw.program_name ?? raw.name ?? 'Unknown Program',
    section: raw.section ?? raw.category ?? raw.group ?? 'Unknown',
    read: Boolean(raw.read ?? raw.is_read ?? false),
    results,
  };
}

function normalizeResultItem(raw: any): Result {
  return {
    position: raw.position ?? raw.rank ?? raw.place ?? '-',
    grade: raw.grade ?? raw.grade_name ?? raw.level ?? '-',
    name: raw.name ?? raw.participant_name ?? raw.student ?? 'Unknown',
    team: raw.team ?? raw.school ?? raw.org ?? '-',
    chest_no: raw.chest_no ?? raw.number ?? undefined,
    photo_url: raw.photo_url ?? raw.photo ?? raw.image_url ?? undefined,
  };
}

export async function fetchPrograms(): Promise<Program[]> {
  const url = new URL(PROGRAMS_PATH, API_BASE).toString();
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch programs: ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data?.items ?? []);
  return list.map(normalizeProgramItem).map(p => ({ ...p, results: [] }));
}

export async function fetchResultsForProgram(programKey: string): Promise<Program | null> {
  const path = PROGRAM_DETAIL_PATH.replace(':key', encodeURIComponent(programKey));
  const url = new URL(path, API_BASE).toString();
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch program ${programKey}: ${res.status}`);
  const data = await res.json();
  return normalizeProgramItem(data);
}

export async function announceResult(program: Program, result: Result): Promise<void> {
  const url = new URL(ANNOUNCE_PATH, API_BASE).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_name: program.program_name,
      section: program.section,
      result,
    }),
  });
  if (!res.ok) throw new Error(`Failed to announce result: ${res.status}`);
}

export async function announceProgram(program: Program): Promise<void> {
  const url = new URL(ANNOUNCE_PATH, API_BASE).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_name: program.program_name,
      section: program.section,
    }),
  });
  if (!res.ok) throw new Error(`Failed to announce program: ${res.status}`);
}