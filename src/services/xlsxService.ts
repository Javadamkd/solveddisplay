import type { Program, Result } from '../types';
import * as XLSX from 'xlsx';

function toStringSafe(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function findField(row: Record<string, unknown>, candidates: string[], includesOnly = false): unknown {
  const keys = Object.keys(row);
  // Exact candidates first
  for (const key of keys) {
    for (const c of candidates) {
      if (key.toLowerCase() === c.toLowerCase()) return row[key];
    }
  }
  if (!includesOnly) {
    // Common title-cased/space variants
    for (const key of keys) {
      const lk = key.toLowerCase().replace(/\s+/g, '');
      for (const c of candidates) {
        const lc = c.toLowerCase().replace(/\s+/g, '');
        if (lk === lc) return row[key];
      }
    }
  }
  // Substring includes
  for (const key of keys) {
    const lk = key.toLowerCase();
    for (const c of candidates) {
      const lc = c.toLowerCase();
      if (lk.includes(lc)) return row[key];
    }
  }
  return undefined;
}

function inferKey(program_name: string, section: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `${slug(program_name)}__${slug(section)}`;
}

function normalizeResult(row: Record<string, unknown>): Result {
  const position = findField(row, ['position', 'place', 'rank', 'pos']);
  const grade = findField(row, ['grade', 'class']);
  const name = findField(row, ['name', 'athlete', 'competitor']);
  const team = findField(row, ['team', 'house', 'school', 'club']);
  const chest_no = findField(row, ['chest_no', 'chest', 'bib', 'chest no']);
  const photo_url = findField(row, ['photo_url', 'photo', 'image', 'pic']);
  return {
    position: typeof position === 'number' || (typeof position === 'string' && position.trim() !== '') ? (position as any) : '',
    grade: toStringSafe(grade),
    name: toStringSafe(name),
    team: toStringSafe(team),
    chest_no: toStringSafe(chest_no) || undefined,
    photo_url: toStringSafe(photo_url) || undefined,
  };
}

const getWorkbook = async (): Promise<XLSX.WorkBook> => {
  const url = import.meta.env.VITE_XLSX_PATH || '/results.xlsx';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch XLSX at ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
};

export async function fetchProgramsFromXlsx(): Promise<Program[]> {
  const wb = await getWorkbook();
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  // Read raw rows to reconstruct two-row headers like pandas header=[1,2]
  const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 3) return [];

  // Try default: header rows at index 1 and 2 (0-based)
  let h1Idx = 1;
  let h2Idx = 2;
  // If these don't look like expected headers, search for a pair that contains Program/Result/Candidate sections
  const looksLikeHeaders = (row: any[]) => row.some((v: any) => toStringSafe(v).toLowerCase().includes('program'));
  if (!looksLikeHeaders(rawRows[h1Idx])) {
    for (let i = 0; i < Math.min(10, rawRows.length - 1); i++) {
      if (looksLikeHeaders(rawRows[i])) { h1Idx = i; h2Idx = i + 1; break; }
    }
  }

  const header1 = rawRows[h1Idx] as any[];
  const header2 = rawRows[h2Idx] as any[];

  const colPairs: Array<[string, string, number]> = [];
  const maxLen = Math.max(header1.length, header2.length);
  for (let c = 0; c < maxLen; c++) {
    colPairs.push([toStringSafe(header1[c]), toStringSafe(header2[c]), c]);
  }

  const programsMap = new Map<string, Program>();

  let lastCode = '';
  let lastName = '';
  let lastSection = '';
  const norm = (s: string) => s?.toString().toLowerCase().replace(/\s+/g, '').replace(/[\.!,:;]|[_-]/g, '') || '';
  const findPairVariants = (rowArr: any[], aCandidates: string[], bCandidates: string[]): string => {
    const aNorms = aCandidates.map(norm);
    const bNorms = bCandidates.map(norm);
    for (const [h1, h2, idx] of colPairs) {
      const h1N = norm(h1);
      const h2N = norm(h2);
      const aMatch = aNorms.some(a => h1N === a || h1N.includes(a) || a.includes(h1N));
      const bMatch = bNorms.some(b => h2N === b || h2N.includes(b) || b.includes(h2N));
      if (aMatch && bMatch) {
        return toStringSafe(rowArr[idx]);
      }
    }
    return '';
  };

  for (let r = h2Idx + 1; r < rawRows.length; r++) {
    const rowArr = rawRows[r] as any[];

    // Fill down merged cells like in app.py
    let code = findPairVariants(rowArr, ['Program'], ['Code', 'Code No', 'Prog Code']) || lastCode;
    let name = findPairVariants(rowArr, ['Program'], ['Program', 'Program Name', 'Event', 'Item']) || lastName;
    let section = findPairVariants(rowArr, ['Program'], ['Section', 'Category', 'Group']) || lastSection;

    if (code) lastCode = code; if (name) lastName = name; if (section) lastSection = section;

    if (!code && !name) continue;

    const key = `${code} - ${name} (${section})`;
    if (!programsMap.has(key)) {
      programsMap.set(key, { key, program_name: name, section, read: false, results: [] });
    }

    const chestRaw = findPairVariants(rowArr, ['Candidate', 'Candidates'], ['Chest No.', 'Chest No', 'Chest', 'Bib']);
    const chestClean = toStringSafe(chestRaw);
    const gradeRaw = findPairVariants(rowArr, ['Result'], ['Grade', 'Class']);
    const gradeClean = toStringSafe(gradeRaw) === '-' ? '' : toStringSafe(gradeRaw);
    const result: Result = {
      position: findPairVariants(rowArr, ['Result'], ['Position', 'Place', 'Rank']),
      grade: gradeClean,
      name: findPairVariants(rowArr, ['Candidate', 'Candidates'], ['Name']),
      team: findPairVariants(rowArr, ['Candidate', 'Candidates'], ['Team', 'House', 'School', 'Club']),
      chest_no: chestClean && chestClean !== '-' ? chestClean : undefined,
      // Do not guess photo_url here; extensions vary. Viewer handles mapping by chest number.
      photo_url: undefined,
    };

    if (result.name || result.chest_no) {
      programsMap.get(key)!.results.push(result);
    }
  }

  const out = Array.from(programsMap.values()).map(p => ({
    ...p,
    program_name: p.program_name || p.key,
  }));
  console.info(`[xlsxService] Parsed programs from '${sheetName}':`, out.length);
  return out;
}

export async function fetchResultsForProgramFromXlsx(key: string): Promise<Program | null> {
  const all = await fetchProgramsFromXlsx();
  return all.find((p) => p.key === key) ?? null;
}