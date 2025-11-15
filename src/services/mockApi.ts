import { Program, Result } from '../types';

const sampleResultsA: Result[] = [
  { position: 1, grade: 'A', name: 'Alex Johnson', team: 'Team Orion', chest_no: 'C-101', photo_url: 'https://picsum.photos/seed/alex/400' },
  { position: 2, grade: 'B', name: 'Bella Smith', team: 'Team Orion', chest_no: 'C-102', photo_url: 'https://picsum.photos/seed/bella/400' },
  { position: 3, grade: 'B', name: 'Chris Lee', team: 'Team Orion', chest_no: 'C-103', photo_url: 'https://picsum.photos/seed/chris/400' },
];

const sampleResultsB: Result[] = [
  { position: 1, grade: 'A', name: 'Divya Patel', team: 'Team Atlas', chest_no: 'C-201', photo_url: 'https://picsum.photos/seed/divya/400' },
  { position: 2, grade: 'A', name: 'Ethan Clark', team: 'Team Atlas', chest_no: 'C-202', photo_url: 'https://picsum.photos/seed/ethan/400' },
  { position: 3, grade: 'C', name: 'Farah Khan', team: 'Team Atlas', chest_no: 'C-203', photo_url: 'https://picsum.photos/seed/farah/400' },
];

const programs: Program[] = [
  { key: 'prog-100', program_name: 'Dance Solo', section: 'Senior', read: false, results: sampleResultsA },
  { key: 'prog-200', program_name: 'Classical Vocal', section: 'Junior', read: false, results: sampleResultsB },
  { key: 'prog-300', program_name: 'Instrumental Violin', section: 'Open', read: true, results: sampleResultsA },
];

export async function fetchPrograms(): Promise<Program[]> {
  await delay(300);
  return programs.map(p => ({ key: p.key, program_name: p.program_name, section: p.section, read: !!p.read, results: [] }));
}

export async function fetchResultsForProgram(programKey: string): Promise<Program | null> {
  await delay(300);
  const found = programs.find(p => p.key === programKey);
  return found ? { ...found, results: [...found.results] } : null;
}

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}