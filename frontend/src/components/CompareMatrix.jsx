import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GitCompare,
  FileText,
  Sparkles,
  CheckSquare,
  Square,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Inbox
} from 'lucide-react';

export default function CompareMatrix({ apiKey }) {
  const [papers, setPapers] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/papers')
      .then(res => res.json())
      .then(data => {
        const pList = data.papers || [];
        setPapers(pList);
        if (pList.length >= 2) {
          setSelectedPapers([pList[0].filename, pList[1].filename]);
        } else if (pList.length === 1) {
          setSelectedPapers([pList[0].filename]);
        }
      })
      .catch(err => console.error('Error fetching papers for comparison:', err));
  }, []);

  const togglePaper = (filename) => {
    if (selectedPapers.includes(filename)) {
      setSelectedPapers(selectedPapers.filter(p => p !== filename));
    } else {
      setSelectedPapers([...selectedPapers, filename]);
    }
  };

  const handleGenerateComparison = async () => {
    if (selectedPapers.length === 0) {
      alert('Please select at least 1 paper to compare.');
      return;
    }

    setLoading(true);
    setComparisonResult(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          papers: selectedPapers,
          api_key: apiKey
        })
      });
      const data = await res.json();
      setComparisonResult(data.comparison_report);
    } catch (err) {
      console.error('Comparison error:', err);
      alert('Comparison generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!comparisonResult) return;
    navigator.clipboard.writeText(comparisonResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Selector Console */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <GitCompare className="w-5 h-5" />
              </div>
              Multi-Paper Comparative Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Side-by-side synthesis across model architectures, benchmarks, mechanisms, and trade-offs.
            </p>
          </div>

          <button
            onClick={handleGenerateComparison}
            disabled={loading || selectedPapers.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400" />
            )}
            <span>Synthesize Matrix ({selectedPapers.length} Selected)</span>
          </button>
        </div>

        {/* Papers Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Select Papers to Compare
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {selectedPapers.length} of {papers.length} selected
            </span>
          </div>

          {papers.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Inbox className="w-6 h-6 text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">
                No papers indexed yet. Please ingest papers in the Paper Library first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {papers.map((p, idx) => {
                const isSelected = selectedPapers.includes(p.filename);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => togglePaper(p.filename)}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-200/80 text-blue-950 ring-1 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="text-xs font-medium truncate">{p.filename}</span>
                    </div>
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Output */}
      {comparisonResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Layers className="w-4 h-4" />
              </div>
              Comparative Synthesis Matrix
            </h3>
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all border border-slate-200/60 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Matrix</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50/70 p-6 rounded-xl border border-slate-200/70 overflow-x-auto text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {comparisonResult}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}