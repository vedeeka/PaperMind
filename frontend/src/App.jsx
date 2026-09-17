import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  BookOpen,
  Search,
  GitCompare,
  Settings,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react';


import DeepResearchStudio from './components/DeepResearchStudio';
import PaperLibrary from './components/PaperLibrary';
import SemanticSearch from './components/SemanticSearch';
import CompareMatrix from './components/CompareMatrix';
import SettingsModal from './components/SettingsModal';

const TABS = [
  { id: 'research', label: 'Deep Research Studio', icon: Brain, badge: 'Agentic' },
  { id: 'library', label: 'Paper Library', icon: BookOpen },
  { id: 'search', label: 'Semantic Search', icon: Search },
  { id: 'compare', label: 'Compare Matrix', icon: GitCompare }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('research');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('papermind_api_key') || '');
  const [systemStats, setSystemStats] = useState({
    papers_count: 0,
    total_chunks: 0,
    has_api_key: false
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('papermind_api_key', key);
    fetchStats();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50/60 text-slate-900 selection:bg-blue-500/20 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  PaperMind
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold tracking-wider uppercase">
                  Agentic RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                LangGraph Multi-Agent Research System
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-xs font-mono text-slate-600 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-800">{systemStats.papers_count || 0}</span>
              <span>Papers</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold text-slate-800">{systemStats.total_chunks || 0}</span>
              <span>Chunks</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700 font-medium">Vector Engine Active</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (confirm('Start a new session? This will wipe all indexed papers from vector memory.')) {
                  await fetch('/api/reset', { method: 'POST' });
                  fetchStats();
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200/80 text-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Clear all stored documents and start fresh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Session</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200/80 text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Settings & API Key"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 py-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-blue-50 border border-blue-200/80 rounded-xl -z-10 shadow-2xs"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'research' && (
            <motion.div
              key="research"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <DeepResearchStudio apiKey={apiKey} />
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PaperLibrary onUpdateStats={fetchStats} />
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SemanticSearch />
            </motion.div>
          )}

          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <CompareMatrix apiKey={apiKey} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/90 py-5 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="font-semibold text-slate-700">PaperMind Agentic RAG Platform</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
            <span>Powered by LangGraph & Gemini</span>
            <span>•</span>
            <span>ChromaDB Vector Memory</span>
            <span>•</span>
            <span>Sentence Transformers</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        systemStats={systemStats}
      />
    </div>
  );
}