import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import ViewerPage from './pages/ViewerPage';
import AnnouncerPage from './pages/AnnouncerPage';

const App: React.FC = () => {
  const location = useLocation();
  const isViewer = location.pathname === '/viewer' || location.pathname === '/';
  const headerInnerClass = isViewer
    ? 'max-w-6xl mx-auto px-4 py-3 flex items-center justify-center'
    : 'max-w-6xl mx-auto px-4 py-3 flex items-center justify-between';
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className={headerInnerClass}>
          <h1 className="font-orbitron font-black tracking-widest text-sky-400">Result Display</h1>
          {!isViewer && (
            <nav className="flex gap-4">
              <NavLink to="/viewer" className={({ isActive }) =>
                `px-3 py-1 rounded-md ${isActive ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`
              }>Viewer</NavLink>
              <NavLink to="/announcer" className={({ isActive }) =>
                `px-3 py-1 rounded-md ${isActive ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`
              }>Announcer</NavLink>
            </nav>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<ViewerPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
        <Route path="/announcer" element={<AnnouncerPage />} />
      </Routes>
    </div>
  );
}

export default App;