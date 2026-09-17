import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Database,
  Cpu,
  CheckCircle2,
  Save,
  Check,
  ExternalLink,
  Sliders
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, apiKey, onSaveApiKey, systemStats }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    onSaveApiKey(inputKey.trim());
    try {
      await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: inputKey.trim() })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving API key:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white w-full max-w-lg rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">System & LLM Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure AI models, vector stores, and keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gemini API Key Configuration */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              Google Gemini API Key
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              Get Free Key <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
            />
            <button
              onClick={handleSave}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer shrink-0 ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white'
              }`}
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saved ? 'Saved!' : 'Save Key'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            PaperMind uses Gemini models for multi-step ReAct reasoning. If left empty, intelligent deterministic agent fallback mode is utilized.
          </p>
        </div>

        {/* Diagnostics & Runtime Stats */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            System Diagnostics
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1 font-sans font-semibold">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vector Store</span>
              </div>
              <span className="text-slate-900 font-bold font-sans">ChromaDB (Persistent)</span>
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="font-bold text-slate-800">{systemStats?.total_chunks || 0}</span> chunks indexed
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1 font-sans font-semibold">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                <span>Embedding Model</span>
              </div>
              <span className="text-slate-900 font-bold font-sans">all-MiniLM-L6-v2</span>
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="font-bold text-slate-800">384-dim</span> dense vectors
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer border border-slate-200/60"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}