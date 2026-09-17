import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Layers,
  Sparkles,
  BookOpen,
  RefreshCw,
  X,
  FileSearch,
  CheckCircle2,
  FileUp,
  Inbox
} from 'lucide-react';

export default function PaperLibrary({ onUpdateStats }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Modals state
  const [viewingPdf, setViewingPdf] = useState(null);
  const [inspectingChunks, setInspectingChunks] = useState(null);
  const [chunksList, setChunksList] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/papers');
      const data = await res.json();
      setPapers(data.papers || []);
      if (onUpdateStats) onUpdateStats();
    } catch (err) {
      console.error('Error loading papers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        fetchPapers();
      } else {
        alert(data.detail || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleIndexSamples = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/papers/index-samples', { method: 'POST' });
      const data = await res.json();
      fetchPapers();
    } catch (err) {
      console.error('Failed to index samples:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async (filename) => {
    if (!confirm(`Are you sure you want to delete '${filename}' from vector memory?`)) return;
    try {
      await fetch(`/api/papers/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      fetchPapers();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleInspectChunks = async (filename) => {
    setInspectingChunks(filename);
    setChunksLoading(true);
    try {
      const res = await fetch(`/api/papers/${encodeURIComponent(filename)}/chunks`);
      const data = await res.json();
      setChunksList(data.chunks || []);
    } catch (err) {
      console.error('Error fetching chunks:', err);
    } finally {
      setChunksLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Upload Zone & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Drag & Drop Card */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`lg:col-span-2 bg-white rounded-2xl p-7 border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10'
              : 'border-slate-300/90 hover:border-blue-400 hover:bg-slate-50/40'
          }`}
        >
          <input
            type="file"
            accept=".pdf"
            id="pdf-upload-input"
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
          />
          <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3.5 text-blue-600 shadow-xs">
            {uploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            ) : (
              <FileUp className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {uploading ? 'Processing & Chunking PDF...' : 'Ingest Academic Research Papers'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
            Drag and drop PDF research documents here, or click to browse. Text will be recursively chunked and embedded in ChromaDB.
          </p>
          <label
            htmlFor="pdf-upload-input"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs cursor-pointer shadow-xs hover:shadow transition-all"
          >
            Select PDF File
          </label>
        </div>

        {/* Quick Sample Indexer Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Sample Corpus
              </h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instantly ingest the foundational paper <em>"Attention Is All You Need"</em> and the <em>PaperMind Agentic Architecture</em> specification with 1 click.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={handleIndexSamples}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileSearch className="w-4 h-4 text-emerald-600" />
              {loading ? 'Indexing Papers...' : 'Auto-Index Sample Papers'}
            </button>
          </div>
        </div>
      </div>

      {/* Ingested Papers Table / Grid */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <BookOpen className="w-4 h-4" />
              </div>
              Indexed Academic Corpus ({papers.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active documents in Chroma vector collection ready for multi-paper retrieval
            </p>
          </div>
          <button
            onClick={fetchPapers}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer"
            title="Refresh Library"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {papers.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No research papers indexed yet</p>
            <p className="text-slate-500 mt-1 max-w-sm">
              Upload a PDF document or click 'Auto-Index Sample Papers' above to populate vector memory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((paper, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
                      Indexed
                    </span>
                  </div>

                  <h4
                    className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors"
                    title={paper.filename}
                  >
                    {paper.filename}
                  </h4>

                  <div className="mt-3 grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-mono text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans uppercase font-semibold">Chunks</span>
                      <span className="text-slate-900 font-bold">{paper.chunks}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans uppercase font-semibold">Pages</span>
                      <span className="text-slate-800 font-bold">{paper.pages}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans uppercase font-semibold">Size</span>
                      <span className="text-slate-600">{formatBytes(paper.file_size)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleInspectChunks(paper.filename)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Inspect extracted chunks"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      Chunks
                    </button>
                    {paper.has_pdf && (
                      <button
                        onClick={() => setViewingPdf(paper.filename)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="View original PDF"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        PDF
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeletePaper(paper.filename)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Delete paper"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Chunk Inspector Modal */}
      <AnimatePresence>
        {inspectingChunks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl p-6 border border-slate-200/90 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Chunk Vector Inspector</h3>
                    <p className="text-xs font-mono text-slate-500 truncate max-w-md">{inspectingChunks}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingChunks(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                {chunksLoading ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Loading vector chunks...</span>
                  </div>
                ) : chunksList.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">No chunks found for this document.</div>
                ) : (
                  chunksList.map((chunk, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Chunk #{i + 1} (Page {chunk.page})
                        </span>
                        <span className="text-slate-400 text-[10px]">{chunk.id}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-wrap">
                        {chunk.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-Browser PDF Reader Modal */}
      <AnimatePresence>
        {viewingPdf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl p-5 border border-slate-200/90 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-lg">{viewingPdf}</h3>
                </div>
                <button
                  onClick={() => setViewingPdf(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  src={`/api/papers/${encodeURIComponent(viewingPdf)}/pdf`}
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}