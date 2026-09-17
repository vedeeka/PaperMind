import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Send,
  Brain,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  ArrowRight,
  Layers,
  Clock,
  FileCheck,
  Zap,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import AgentGraphVisualizer from './AgentGraphVisualizer';

const EXAMPLE_PROMPTS = [
  "How does the Multi-Head Attention mechanism in Transformer compare to standard Recurrent models?",
  "What is the complete architecture and state flow of PaperMind's Agentic RAG pipeline?",
  "Synthesize the key empirical benchmarks, BLEU scores, and computational complexity of self-attention.",
  "Compare the advantages of vector database retrieval against basic prompt stuffing for scientific papers."
];

export default function DeepResearchStudio({ onSelectPaper, apiKey }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('hitl'); // 'hitl' (Human in loop) or 'autopilot'
  const [loading, setLoading] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [currentIteration, setCurrentIteration] = useState(0);

  // Sub-questions validation state
  const [subQuestions, setSubQuestions] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [newQuestionInput, setNewQuestionInput] = useState('');

  // Research execution results
  const [researchOutput, setResearchOutput] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);

  // Step 1: User submits query
  const handleStartResearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResearchOutput(null);
    setSelectedCitation(null);

    if (mode === 'hitl') {
      // Step 1: Breakdown only
      setActiveNode('breakdown');
      try {
        const res = await fetch('/api/research/breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: query, api_key: apiKey })
        });
        const data = await res.json();
        setSubQuestions(data.sub_questions || []);
        setActiveNode('human_validation');
        setShowValidation(true);
      } catch (err) {
        console.error('Breakdown error:', err);
        alert('Failed to generate sub-questions. Check backend connection.');
        setActiveNode(null);
      } finally {
        setLoading(false);
      }
    } else {
      // Autopilot: Run end-to-end
      executeFullResearch(null);
    }
  };

  // Step 2: Run research with approved/custom sub-questions
  const executeFullResearch = async (approvedQuestions) => {
    setLoading(true);
    setShowValidation(false);
    setActiveNode('research_decision');
    setCurrentIteration(0);

    try {
      const res = await fetch('/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          sub_questions: approvedQuestions || undefined,
          api_key: apiKey
        })
      });

      const data = await res.json();
      setResearchOutput(data);
      setActiveNode('completed');

      // Celebrate completion
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } catch (err) {
      console.error('Research pipeline failed:', err);
      alert('Research agent error occurred.');
      setActiveNode(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionInput.trim()) return;
    setSubQuestions([...subQuestions, newQuestionInput.trim()]);
    setNewQuestionInput('');
  };

  const handleRemoveQuestion = (idx) => {
    setSubQuestions(subQuestions.filter((_, i) => i !== idx));
  };

  const handleEditQuestion = (idx, val) => {
    const updated = [...subQuestions];
    updated[idx] = val;
    setSubQuestions(updated);
  };

  const handleCopyReport = () => {
    if (!researchOutput?.final_answer) return;
    navigator.clipboard.writeText(researchOutput.final_answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!researchOutput?.final_answer) return;
    const blob = new Blob([researchOutput.final_answer], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PaperMind_Synthesis_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Visual LangGraph State Machine */}
      <AgentGraphVisualizer
        activeNode={activeNode}
        currentIteration={currentIteration}
        isRunning={loading}
      />

      {/* Main Research Input Console */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              Agentic Deep Research Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Multi-step ReAct reasoning agent across all indexed scientific papers
            </p>
          </div>

          {/* Mode Selector Segmented Pill */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs self-start lg:self-auto">
            <button
              onClick={() => setMode('hitl')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'hitl'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Human-in-the-Loop
            </button>
            <button
              onClick={() => setMode('autopilot')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'autopilot'
                  ? 'bg-white text-purple-700 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              Autonomous Auto-Pilot
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleStartResearch} className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask an academic or technical research question (e.g., compare architectures, extract formulas, evaluate findings)..."
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-36 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Working...</span>
                </>
              ) : (
                <>
                  <span>Launch Agent</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example Prompt Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Suggestions:
          </span>
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(prompt)}
              className="text-[11px] text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 rounded-lg px-2.5 py-1 transition-all text-left truncate max-w-xs cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Human Validation Modal / Stage */}
      <AnimatePresence>
        {showValidation && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-amber-400/80 shadow-lg relative"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Human-in-the-Loop Validation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The research agent decomposed your question into the following sub-queries. Review or adjust before running.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Action Required
              </span>
            </div>

            {/* Sub-questions List */}
            <div className="my-5 space-y-2.5">
              {subQuestions.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xs font-mono font-bold text-slate-600 shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => handleEditQuestion(idx, e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => handleRemoveQuestion(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add Custom Question Row */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
                  placeholder="Add another sub-question to investigate..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all border border-slate-200/80 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Sub-query
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowValidation(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => executeFullResearch(subQuestions)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Execute Agent Pipeline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-Time Agent Execution Telemetry Feed */}
      {researchOutput && researchOutput.steps && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Agent Reasoning & Retrieval Trace
            </h3>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> {researchOutput.duration_seconds}s
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> {researchOutput.total_passages} passages
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {researchOutput.steps.map((step, idx) => {
              const isExpanded = expandedStep === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-50/70 border border-slate-200/80 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate">{step.title}</span>
                        {step.query && (
                          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded max-w-xs truncate">
                            query: "{step.query}"
                          </span>
                        )}
                        {step.action && (
                          <span className="text-[11px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                            {step.action}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 text-xs shrink-0">
                      {step.hits_count !== undefined && (
                        <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          {step.hits_count} hits
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </div>
                  </button>

                  {/* Expanded Step Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200/80 text-xs text-slate-700 space-y-2.5 bg-white font-mono">
                      {step.thought && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-500 font-semibold">Thought: </span>
                          <span className="text-slate-800">{step.thought}</span>
                        </div>
                      )}
                      {step.detail && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-500 font-semibold">Detail: </span>
                          <span className="text-slate-800">{step.detail}</span>
                        </div>
                      )}
                      {step.hits && step.hits.length > 0 && (
                        <div className="space-y-2 pt-1 font-sans">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                            Top Retrieved Chunks:
                          </span>
                          {step.hits.map((hit, hIdx) => (
                            <div key={hIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <div className="flex items-center justify-between text-xs text-blue-700 font-semibold mb-1">
                                <span>{hit.source} (Page {hit.page})</span>
                                <span className="text-emerald-700 font-mono text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Similarity: {(hit.similarity * 100).toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{hit.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Synthesized Research Report Output */}
      {researchOutput && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm"
        >
          {/* Header & Export Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 uppercase tracking-wider">
                  Grounding Verified
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {researchOutput.sources?.length || 0} Ingested Papers Cited
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Research Synthesis & Evidence Report
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export .md</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Source Badges */}
          {researchOutput.sources && researchOutput.sources.length > 0 && (
            <div className="my-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Verified Citations:</span>
              {researchOutput.sources.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedCitation(src)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                >
                  <BookOpen className="w-3 h-3 text-blue-600" />
                  <span className="truncate max-w-xs">{src}</span>
                </button>
              ))}
            </div>
          )}

          {/* Rendered Markdown Body */}
          <div className="mt-4 bg-slate-50/70 p-6 rounded-xl border border-slate-200/80 overflow-x-auto text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {researchOutput.final_answer}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}