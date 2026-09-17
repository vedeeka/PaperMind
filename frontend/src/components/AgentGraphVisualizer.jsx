import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Brain,
  Search,
  FileText,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Activity
} from 'lucide-react';

const NODES = [
  {
    id: 'breakdown',
    label: 'Query Breakdown',
    desc: 'Deconstructs the prompt into targeted sub-queries',
    icon: Brain
  },
  {
    id: 'human_validation',
    label: 'Human Validation',
    desc: 'Review and verify the generated search plan',
    icon: ShieldCheck
  },
  {
    id: 'research_decision',
    label: 'ReAct Decision',
    desc: 'Dynamically routes the next research action',
    icon: Cpu
  },
  {
    id: 'search',
    label: 'Vector Retrieval',
    desc: 'Semantic retrieval via ChromaDB vectors',
    icon: Search
  },
  {
    id: 'answer',
    label: 'Report Synthesis',
    desc: 'Generates the final comprehensive synthesis',
    icon: FileText
  }
];

export default function AgentGraphVisualizer({
  activeNode,
  currentIteration = 0,
  isRunning = false
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Agent Execution Graph
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              LangGraph stateful orchestration pipeline
            </p>
          </div>
        </div>

        {isRunning && (
          <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200/80 bg-blue-50 text-blue-700 font-medium text-xs shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Cycle {currentIteration + 1} Running</span>
          </div>
        )}
      </div>

      {/* Workflow Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 relative">
        {NODES.map((node, index) => {
          const Icon = node.icon;

          const isActive =
            activeNode === node.id ||
            (activeNode === 'react_decision' && node.id === 'research_decision');

          const isCompleted = activeNode === 'completed';

          return (
            <div key={node.id} className="relative flex items-stretch">
              <motion.div
                animate={{
                  y: isActive ? -3 : 0
                }}
                transition={{ duration: 0.2 }}
                className={`w-full rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50/40 border-2 border-blue-500 ring-4 ring-blue-500/10 shadow-md'
                    : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  {/* Icon + Step Number */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      0{index + 1}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                    {node.label}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {node.desc}
                  </p>
                </div>

                {/* Status Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
                  {isActive ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                      </span>
                      Executing
                    </div>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passed
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-slate-400">
                      Idle
                    </div>
                  )}

                  {node.id === 'research_decision' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                      Loop
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Arrow Connector (Desktop) */}
              {index < NODES.length - 1 && (
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer State Bar */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium text-xs">Current State:</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-semibold text-slate-800">
            {activeNode ? activeNode.toUpperCase() : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Idle
          </span>
        </div>
      </div>
    </div>
  );
}