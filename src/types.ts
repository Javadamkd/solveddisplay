export interface Result {
  position: string | number;
  grade: string;
  name: string;
  team: string;
  chest_no?: string;
  photo_url?: string;
}

export interface Program {
  key: string;
  program_name: string;
  section: string;
  read?: boolean;
  results: Result[];
}

export enum SocketEvent {
  DISPLAY_PROGRAM = 'DISPLAY_PROGRAM',
  DISPLAY_RESULT = 'DISPLAY_RESULT',
}

export interface DisplayProgramPayload {
  program_name: string;
  section: string;
}

export interface DisplayResultPayload {
  program_name: string;
  section: string;
  result: Result;
}