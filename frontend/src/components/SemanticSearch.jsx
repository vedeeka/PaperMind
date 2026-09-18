import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../config';
import {
  Search,
  Sliders,
  BookOpen,
  Copy,
  Check,
  Zap,
  Filter,
  Layers,
  Sparkles,
  Inbox
} from 'lucide-react';

export default function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [minSimilarity, setMinSimilarity] = useState(0);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: Number(topK) })
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const filteredResults = results.filter(
    (r) => (r.similarity || 0) * 100 >= minSimilarity
  );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Search Bar & Controls */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            Live Vector Semantic Search Explorer
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Directly probe dense embeddings in ChromaDB using MiniLM-L6 cosine similarity
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all papers (e.g., self-attention computational complexity, BLEU evaluation)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-blue-400" />
              )}
              <span>Search Vectors</span>
            </button>
          </div>

          {/* Sliders & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <span className="text-xs text-slate-600 flex items-center gap-1.5 font-semibold">
                <Sliders className="w-3.5 h-3.5 text-blue-600" /> Top-K Chunks:
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  className="w-24 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 w-7 text-center">
                  {topK}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <span className="text-xs text-slate-600 flex items-center gap-1.5 font-semibold">
                <Filter className="w-3.5 h-3.5 text-emerald-600" /> Min Similarity:
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={minSimilarity}
                  onChange={(e) => setMinSimilarity(Number(e.target.value))}
                  className="w-24 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 w-11 text-center">
                  {minSimilarity}%
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Results Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Retrieved Embeddings ({filteredResults.length})
          </h3>
          {results.length > 0 && query && (
            <span className="text-xs font-mono text-slate-500 truncate max-w-xs sm:max-w-md">
              Query: "{query}"
            </span>
          )}
        </div>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 text-xs border border-slate-200/90 shadow-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No vector query performed yet</p>
            <p className="text-slate-500 mt-1">Enter a query above to inspect similarity matches from vector storage.</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 text-xs border border-slate-200/90 shadow-sm">
            No results met the minimum similarity threshold of <span className="font-bold text-slate-700">{minSimilarity}%</span>. Try lowering the threshold slider.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((hit, idx) => {
              const simPercent = Math.round((hit.similarity || 0) * 100);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-5 border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-mono border border-blue-200 font-bold">
                        Rank #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        {hit.source}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        Page {hit.page}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Similarity Meter */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(10, simPercent))}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                          {simPercent}% Match
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopy(hit.text, idx)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        title="Copy chunk text"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-mono leading-relaxed bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 whitespace-pre-wrap">
                    {hit.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}