import React, { useState, useEffect, useCallback } from 'react';
import { fetchPrograms, fetchResultsForProgram, announceResult, announceProgram } from '../services/dataService';
import { eventBus } from '../services/eventBus';
import { emitShowProgram, emitShowResult } from '../services/socketio';
import { broadcastShowProgram, broadcastShowResult } from '../services/broadcast';
import { Program, Result, SocketEvent } from '../types';
import { CheckCircleIcon } from '../components/Icons';

interface ProgramListItemProps {
  program: Program;
  isActive: boolean;
  onSelect: (programKey: string) => void;
}

const ProgramListItem: React.FC<ProgramListItemProps> = ({ program, isActive, onSelect }) => {
  const baseClasses = "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all duration-200";
  const stateClasses = program.read
    ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
    : isActive
    ? "bg-sky-500/20 ring-2 ring-sky-500 text-white"
    : "bg-slate-800 hover:bg-slate-700 text-slate-300";

  return (
    <div className={`${baseClasses} ${stateClasses}`} onClick={() => !program.read && onSelect(program.key)}>
      <div>
        <p className="font-semibold">{program.program_name}</p>
        <p className="text-sm opacity-80">{program.section}</p>
      </div>
      {program.read && <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />}
    </div>
  );
};

interface ResultCardProps {
  result: Result;
  isAnnounced: boolean;
  onAnnounce: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, isAnnounced, onAnnounce }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center text-center gap-2 shadow-lg">
      <div className="font-orbitron font-bold text-2xl text-rose-400">{result.position}</div>
      <div className="text-slate-400 font-semibold">{result.grade ? `${result.grade} Grade` : 'No Grade'}</div>
      <div className="text-sm text-slate-300">{result.chest_no && result.chest_no !== '-' ? result.chest_no : ''}</div>
      <div className="font-bold text-lg text-white mt-2">{result.name}</div>
      <div className="text-sm text-slate-400">{result.team}</div>
      <button
        onClick={onAnnounce}
        disabled={isAnnounced}
        className="mt-4 w-full py-2 px-4 rounded-md font-bold text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 bg-sky-600 hover:bg-sky-500 text-white"
      >
        {isAnnounced ? 'Announced' : 'Announce'}
      </button>
    </div>
  );
};

const AnnouncerPage: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [announcedResults, setAnnouncedResults] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const fetchedPrograms = await fetchPrograms();
        console.info('[Announcer] Programs loaded:', fetchedPrograms.length);
        setPrograms(fetchedPrograms.sort((a, b) => (a.read ? 1 : -1) - (b.read ? 1 : -1) || a.program_name.localeCompare(b.program_name)));
      } catch (e: any) {
        console.error(e);
        setErrorMsg('Failed to load programs from backend');
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleSelectProgram = useCallback(async (programKey: string) => {
    const fullProgram = await fetchResultsForProgram(programKey);
    if (fullProgram) {
      setActiveProgram(fullProgram);
      setAnnouncedResults(new Set());
      eventBus.emit(SocketEvent.DISPLAY_PROGRAM, {
        program_name: fullProgram.program_name,
        section: fullProgram.section,
      });
      // Emit to backend Socket.IO if enabled
      emitShowProgram(programKey);
      // Broadcast to other tabs
      broadcastShowProgram({ program_name: fullProgram.program_name, section: fullProgram.section });
      // Notify backend to broadcast to WebSocket-connected viewers
      announceProgram(fullProgram).catch((e) => {
        console.warn('Backend program announce failed (continuing with local eventBus):', e);
      });
    }
  }, []);

  const handleAnnounceResult = useCallback((result: Result, index: number) => {
    if (!activeProgram) return;

    eventBus.emit(SocketEvent.DISPLAY_RESULT, {
      program_name: activeProgram.program_name,
      section: activeProgram.section,
      result,
    });
    // Emit to backend Socket.IO if enabled
    emitShowResult(activeProgram.key, index);
    // Broadcast to other tabs
    broadcastShowResult({ program_name: activeProgram.program_name, section: activeProgram.section, result });

    // If backend is enabled, also notify it so connected viewers receive updates via socket
    announceResult(activeProgram, result).catch((e) => {
      console.warn('Backend announce failed (continuing with local eventBus):', e);
    });

    const newAnnounced = new Set(announcedResults);
    newAnnounced.add(index);
    setAnnouncedResults(newAnnounced);

    if (newAnnounced.size === activeProgram.results.length) {
      const updatedPrograms = programs.map(p =>
        p.key === activeProgram.key ? { ...p, read: true } : p
      );
      setPrograms(updatedPrograms.sort((a, b) => (a.read ? 1 : -1) - (b.read ? 1 : -1) || a.program_name.localeCompare(b.program_name)));
      setActiveProgram(null);
    }
  }, [activeProgram, announcedResults, programs]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] w-full bg-slate-900 text-white">
      <aside className="w-full md:w-80 lg:w-96 bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold text-sky-400 mb-4">Programs</h2>
        {errorMsg && (
          <div className="mb-3 p-2 rounded bg-rose-900/40 text-rose-300 border border-rose-700 text-sm">
            {errorMsg}
          </div>
        )}
        <div className="overflow-y-auto space-y-2 flex-grow">
          {isLoading ? (
            <p className="text-slate-400">Loading programs...</p>
          ) : programs.length === 0 ? (
            <p className="text-slate-400">No programs found in Excel. Please check results.xlsx headers.</p>
          ) : (
            programs.map(p => (
              <ProgramListItem
                key={p.key}
                program={p}
                isActive={activeProgram?.key === p.key}
                onSelect={handleSelectProgram}
              />
            ))
          )}
        </div>
      </aside>
      <main className="flex-grow p-4 md:p-6 overflow-y-auto">
        {activeProgram ? (
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-1">
              {activeProgram.program_name}
            </h1>
            <p className="text-slate-400 text-center text-lg mb-6">{activeProgram.section}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {activeProgram.results.map((result, index) => (
                <ResultCard
                  key={index}
                  result={result}
                  isAnnounced={announcedResults.has(index)}
                  onAnnounce={() => handleAnnounceResult(result, index)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <h1 className="text-xl font-bold">No program selected</h1>
              <p>Select a program from the left to announce results.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnnouncerPage;