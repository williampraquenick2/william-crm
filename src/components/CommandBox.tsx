/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Search, HelpCircle, CornerDownLeft, Sparkles } from 'lucide-react';

interface CommandBoxProps {
  onExecuteCommand: (commandText: string) => void;
}

export default function CommandBox({ onExecuteCommand }: CommandBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const commandShortcuts = [
    { label: "Mostrar ranking", cmd: "Mostrar ranking" },
    { label: "Top 20 clientes", cmd: "Mostrar top 20 clientes" },
    { label: "Clientes sem nome", cmd: "Mostrar clientes sem nome" },
    { label: "Inativos +60 dias", cmd: "Mostrar clientes que não compram há mais de 60 dias" },
    { label: "Inativos +90 dias", cmd: "Mostrar clientes que não compram há mais de 90 dias" },
    { label: "Compraram 1 vez", cmd: "Mostrar clientes que compraram apenas uma vez" },
    { label: "Registrar pedido", cmd: "Registrar pedido" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    onExecuteCommand(inputValue.trim());
    showFeedback(`Comando executado: "${inputValue.trim()}"`);
    setInputValue('');
  };

  const handleShortcutClick = (cmd: string) => {
    setInputValue(cmd);
    onExecuteCommand(cmd);
    showFeedback(`Comando executado: "${cmd}"`);
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-amber-500/20 text-amber-400 p-2 rounded-lg">
          <Terminal size={22} id="terminal-icon" />
        </div>
        <div>
          <h2 className="text-md font-semibold tracking-tight text-slate-100 flex items-center gap-2">
            Terminal de Comandos CRM Alho
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-mono">
              Ativo
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Digite um comando ou clique em um dos atalhos rápidos abaixo para gerenciar o CRM.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center mt-3">
        <Search className="absolute left-4 text-slate-400" size={18} />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ex: 'Buscar cliente Roberta', 'Registrar pedido', 'Mostrar ranking'..."
          className="w-full bg-slate-950 text-slate-200 pl-11 pr-32 py-3.5 rounded-xl border border-slate-705/30 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono text-sm placeholder:text-slate-500 focus:border-transparent shadow-inner"
        />
        <div className="absolute right-3 flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
            Enter <CornerDownLeft size={10} />
          </span>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold px-4 py-2 rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Executar
          </button>
        </div>
      </form>

      {/* Shortcuts Grid */}
      <div className="mt-4">
        <p className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
          <HelpCircle size={12} className="text-slate-500" />
          Atalhos de Comandos Rápidos:
        </p>
        <div className="flex flex-wrap gap-2">
          {commandShortcuts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleShortcutClick(item.cmd)}
              className="bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700/60 hover:border-amber-500/50 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-all font-medium font-mono flex items-center"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="mt-4 flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs py-2.5 px-3.5 rounded-xl animate-pulse font-mono shadow-md">
          <Sparkles size={14} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
