import React, { useState, useEffect } from 'react';
import { eventBus } from '../services/eventBus';
import { initViewerSocket } from '../services/socket';
import { initSocketIO } from '../services/socketio';
import { initViewerBroadcast } from '../services/broadcast';
import { Result, SocketEvent, DisplayProgramPayload, DisplayResultPayload } from '../types';

interface ProgramIntroProps {
  programName: string;
  category: string;
}

const ProgramIntro: React.FC<ProgramIntroProps> = ({ programName, category }) => (
  <div className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
    <div className="text-center p-8">
      <h1 className="font-orbitron font-black text-4xl sm:text-6xl md:text-8xl lg:text-9xl text-white tracking-wider text-shadow-glow">
        {programName}
      </h1>
      <p className="font-orbitron text-xl sm:text-2xl md:text-4xl text-sky-300 mt-4 uppercase tracking-widest">
        {category}
      </p>
    </div>
  </div>
);

interface ResultDisplayProps {
  program: DisplayProgramPayload | null;
  result: Result | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ program, result }) => {
  const [gradient, setGradient] = useState('from-sky-500 to-indigo-600');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [fallbackQueue, setFallbackQueue] = useState<string[]>([]);
  const DEFAULT_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const DEFAULT_AVATAR =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
        </defs>
        <!-- Full-bleed background that matches the card shape -->
        <rect width="128" height="128" rx="24" fill="url(#g)"/>
        <!-- Head -->
        <circle cx="64" cy="46" r="26" fill="#ffffff" fill-opacity="0.92"/>
        <!-- Body block extends to the bottom edge to avoid gaps -->
        <rect x="16" y="72" width="96" height="56" rx="26" fill="#ffffff" fill-opacity="0.88"/>
      </svg>`
    );
  const DEFAULT_GROUP_AVATAR =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="24" fill="url(#bg)"/>
        <!-- Two avatars stacked behind -->
        <g opacity="0.88">
          <circle cx="44" cy="50" r="20" fill="#fff"/>
          <rect x="24" y="66" width="40" height="46" rx="20" fill="#fff"/>
        </g>
        <g opacity="0.88">
          <circle cx="84" cy="50" r="20" fill="#fff"/>
          <rect x="64" y="66" width="40" height="46" rx="20" fill="#fff"/>
        </g>
        <!-- One avatar toppled/front and larger -->
        <g opacity="0.95">
          <circle cx="64" cy="44" r="24" fill="#fff"/>
          <rect x="28" y="70" width="72" height="54" rx="26" fill="#fff"/>
        </g>
      </svg>`
    );
  const AVATAR_CANDIDATES = ['/photos/avatar.jpg', '/photos/avatar.png', '/avatar.jpg', '/avatar.png'];

  // Determine group entry status so we can choose the appropriate default icon in render and fallbacks
  const section = (program?.section ?? '').toLowerCase();
  const progName = (program?.program_name ?? '').toLowerCase();
  const resName = (result?.name ?? '').toLowerCase();
  const resTeam = (result?.team ?? '').toLowerCase();
  const isGroupEntry = (
    section.includes('group') ||
    progName.includes('group') ||
    progName.includes('duet') ||
    progName.includes('pair') ||
    progName.includes('band') ||
    progName.includes('ensemble') ||
    progName.includes('choir') ||
    resName.includes('&') ||
    resName.includes(' team') ||
    resTeam.includes('&') ||
    resTeam.includes(' team')
  );

  // Derive team name parts (two lines) for group display
  const teamParts = (() => {
    const raw = ((result?.team ?? '') || (result?.name ?? '')).trim();
    if (!raw) return [] as string[];
    const splitAmpOrAnd = raw.split(/\s*&\s*|\s+and\s+/i);
    if (splitAmpOrAnd.length >= 2) return splitAmpOrAnd.slice(0, 2).map(s => s.trim());
    const tokens = raw.split(/\s+/);
    if (tokens.length >= 2) return [tokens[0], tokens.slice(1).join(' ')];
    return [raw];
  })();

  useEffect(() => {
    if (result) {
      const gradients = [
        'from-purple-500 to-indigo-600',
        'from-rose-500 to-red-600',
        'from-amber-400 to-orange-500',
        'from-emerald-500 to-teal-600',
        'from-fuchsia-500 to-purple-600',
      ];
      setGradient(gradients[Math.floor(Math.random() * gradients.length)]);
    }
  }, [result]);

  useEffect(() => {
    if (!result) {
      setImgSrc(null);
      setFallbackQueue([]);
      return;
    }
    // Build candidate list: optional explicit photo_url first, then chest-derived variants
    const chestRaw = (result.chest_no ?? '').toString();
    const chestTrim = chestRaw.trim();
    const chestUpper = chestTrim.toUpperCase();
    const chestNoSpaces = chestUpper.replace(/\s+/g, '');

    const baseVariants = Array.from(new Set([
      chestUpper,
      chestNoSpaces,
    ])).filter(Boolean);

    const exts = ['png', 'jpg', 'jpeg'];
    const filenameVariants: string[] = [];
    for (const base of baseVariants) {
      for (const ext of exts) {
        filenameVariants.push(`${base}.${ext}`);
        // Handle the special case where filenames include a space before extension e.g. "885 .jpg"
        filenameVariants.push(`${base} .${ext}`);
      }
    }

    // Prefer explicit group icon for team entries; otherwise we will fall back to built-in avatar
    // For group entries, do not show an image rectangle at all.
    if (isGroupEntry) {
      setImgSrc(null);
      setFallbackQueue([]);
      return;
    }
    // For individual entries, try the chest-number derived files only; if none works, use built-in avatar
    const candidates = [
      ...(result.photo_url ? [result.photo_url] : []),
      ...filenameVariants.map(n => `/photos/${encodeURIComponent(n)}`),
    ];

    // Preload and pick the first valid image; otherwise use avatar.
    // This avoids showing a broken image icon in the UI.
    const pickValid = (list: string[]) => {
      if (!list.length) {
        setImgSrc(isGroupEntry ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR);
        setFallbackQueue([]);
        return;
      }
      let cancelled = false;
      const tryIndex = (i: number) => {
        const candidate = list[i];
        const testImg = new Image();
        testImg.onload = () => {
          if (!cancelled) {
            setImgSrc(candidate);
            // No external avatar files; if this later errors, we will fall back to built-in avatar
            setFallbackQueue([]);
          }
        };
        testImg.onerror = () => {
          if (i + 1 < list.length) {
            tryIndex(i + 1);
          } else if (!cancelled) {
            setImgSrc(DEFAULT_AVATAR);
            setFallbackQueue([]);
          }
        };
        testImg.src = candidate;
      };
      tryIndex(0);
      return () => { cancelled = true; };
    };

    const cleanup = pickValid(candidates);
    return cleanup;
  }, [program, result]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-500">
      <div className="text-center mb-6 h-20">
        {program && (
          <div className="animate-fade-in">
            <h2 className="font-orbitron font-bold text-3xl sm:text-4xl md:text-5xl text-white">
              {program.program_name}
            </h2>
            <p className="font-orbitron text-lg sm:text-xl md:text-2xl text-slate-400 uppercase">
              {program.section}
            </p>
          </div>
        )}
      </div>
      {/* Content area without gradient box */}
      <div className={`w-full max-w-6xl min-h-[500px] p-6 md:p-12 flex flex-col md:flex-row items-center justify-around gap-8 md:gap-12 text-white transition-all duration-500`}>
        {result ? (
          <>
            <div className="text-center md:text-left animate-fade-in-up order-2 md:order-1">
              <div className="font-orbitron font-black text-yellow-300 text-7xl sm:text-9xl lg:text-[160px] leading-none drop-shadow-lg">
                {result.position}
              </div>
              {result.grade ? (
                <div className="font-semibold text-2xl sm:text-4xl lg:text-5xl text-white/90 mt-2">
                  {result.grade} Grade
                </div>
              ) : (
                <div className="font-semibold text-2xl sm:text-4xl lg:text-5xl text-white/90 mt-2">&nbsp;</div>
              )}
            </div>

            <div className="animate-fade-in-up order-1 md:order-2">
              <div className="w-72 h-96 rounded-[30px] bg-gradient-to-br from-sky-600 to-rose-600 p-1 shadow-xl">
                {isGroupEntry ? (
                  <div className="w-full h-full rounded-[30px] bg-black/10 flex items-center justify-center text-center">
                    <div className="px-4">
                      <div className="font-orbitron text-white/90 text-3xl tracking-widest">TEAM</div>
                      <div className="font-bold text-white mt-2 leading-tight">
                        {teamParts[0] && (
                          <div className="text-4xl whitespace-nowrap">{teamParts[0]}</div>
                        )}
                        {teamParts[1] && (
                          <div className="text-4xl whitespace-nowrap">{teamParts[1]}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={imgSrc || DEFAULT_AVATAR}
                    alt={result?.name || 'Avatar'}
                    onError={() => {
                      if (fallbackQueue.length) {
                        const [next, ...rest] = fallbackQueue;
                        setImgSrc(next);
                        setFallbackQueue(rest);
                      } else {
                        // Final safety: always use built-in avatar icon
                        setImgSrc(DEFAULT_AVATAR);
                      }
                    }}
                    className="w-full h-full rounded-[30px] object-cover object-center"
                  />
                )}
              </div>
            </div>

            <div className="text-center animate-fade-in-up order-3">
              <div className="font-orbitron text-2xl sm:text-3xl lg:text-4xl text-slate-200">
                {(result.chest_no && result.chest_no !== '-') ? result.chest_no : ''}
              </div>
              <div className="font-bold text-4xl sm:text-5xl lg:text-7xl my-2 leading-tight">
                {result.name}
              </div>
              <div className="font-semibold text-2xl sm:text-3xl lg:text-4xl text-slate-300">
                {result.team}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center font-orbitron text-3xl text-white/50">
            Waiting for Announcement...
          </div>
        )}
      </div>

      <div className="mt-8 font-orbitron text-2xl sm:text-3xl text-slate-500 tracking-[0.2em] animate-fade-in">
        www.artifada.festie.app
      </div>
    </div>
  );
};

const ViewerPage: React.FC = () => {
  const [program, setProgram] = useState<DisplayProgramPayload | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const handleDisplayProgram = (data: DisplayProgramPayload) => {
      setProgram(data);
      setResult(null);
      setShowIntro(true);
      setTimeout(() => {
        setShowIntro(false);
      }, 5000);
    };

    const handleDisplayResult = (data: DisplayResultPayload) => {
      setShowIntro(false);
      setProgram({ program_name: data.program_name, section: data.section });
      setResult(data.result);
    };

    const unsubProgram = eventBus.on(SocketEvent.DISPLAY_PROGRAM, handleDisplayProgram);
    const unsubResult = eventBus.on(SocketEvent.DISPLAY_RESULT, handleDisplayResult);

    const wsUnsub = initViewerSocket(handleDisplayProgram, handleDisplayResult);
    const sioUnsub = initSocketIO();
    const bcUnsub = initViewerBroadcast(handleDisplayProgram, handleDisplayResult);

    return () => {
      unsubProgram();
      unsubResult();
      wsUnsub && wsUnsub();
      sioUnsub && sioUnsub();
      bcUnsub && bcUnsub();
    };
  }, []);

  return (
    <main className="w-full h-[calc(100vh-64px)] relative">
      {showIntro && program && (
        <ProgramIntro programName={program.program_name} category={program.section} />
      )}
      <ResultDisplay program={program} result={result} />
    </main>
  );
};

export default ViewerPage;