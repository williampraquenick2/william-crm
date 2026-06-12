/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, ProductType, PRODUCTS } from '../types';
import { X, UserPlus, Phone, User, Calendar, Plus, Minus, Check } from 'lucide-react';
import { CURRENT_DATE_STR } from '../utils/crmUtils';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSaveClient: (clientData: { 
    nome: string; 
    telefone: string; 
    primeiroPedido?: { data: string; itens: { produto: ProductType; quantidade: number }[] } 
  }) => void;
}

export default function NewClientModal({
  isOpen,
  onClose,
  clients,
  onSaveClient
}: NewClientModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [hasFirstOrder, setHasFirstOrder] = useState(false);
  const [firstOrderDate, setFirstOrderDate] = useState(CURRENT_DATE_STR);
  
  // Quantities for first order items
  const [quantities, setQuantities] = useState<Record<ProductType, number>>({
    '500G PURO': 0,
    '250G PURO': 0,
    'ALHO TEMPERADO': 0,
    'TEMPERO COMPLETO': 0,
    'TEMPERO DE BACON': 0
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQtyChange = (product: ProductType, amount: number) => {
    setQuantities(prev => ({
      ...prev,
      [product]: Math.max(0, prev[product] + amount)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanPhone = telefone.replace(/\D/g, '');
    if (!cleanPhone) {
      setValidationError('Por favor, informe o número de telefone.');
      return;
    }

    if (!nome.trim()) {
      setValidationError('Por favor, informe o nome do cliente.');
      return;
    }

    // Verify if phone is already registered
    const exists = clients.some(c => c.telefone.replace(/\D/g, '') === cleanPhone);
    if (exists) {
      setValidationError(`Já existe um cliente cadastrado com o telefone "${telefone}".`);
      return;
    }

    let firstOrder = undefined;
    if (hasFirstOrder) {
      const itemsToSave = PRODUCTS.map(prod => ({
        produto: prod,
        quantidade: quantities[prod]
      })).filter(item => item.quantidade > 0);

      if (itemsToSave.length === 0) {
        setValidationError('Por favor, adicione pelo menos 1 unidade para o primeiro pedido ou desmarque a opção "Registrar primeiro pedido".');
        return;
      }

      if (!firstOrderDate) {
        setValidationError('Por favor, informe a data do primeiro pedido.');
        return;
      }

      firstOrder = {
        data: firstOrderDate,
        itens: itemsToSave
      };
    }

    // Call save handler
    onSaveClient({
      nome: nome.trim(),
      telefone: cleanPhone,
      primeiroPedido: firstOrder
    });

    // Reset fields
    setNome('');
    setTelefone('');
    setHasFirstOrder(false);
    setQuantities({
      '500G PURO': 0,
      '250G PURO': 0,
      'ALHO TEMPERADO': 0,
      'TEMPERO COMPLETO': 0,
      'TEMPERO DE BACON': 0
    });
    setFirstOrderDate(CURRENT_DATE_STR);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <UserPlus size={22} className="text-emerald-100 shrink-0" />
            <div>
              <h3 className="font-bold text-lg tracking-tight">Cadastrar Novo Cliente</h3>
              <p className="text-xs text-emerald-100/90">Lançamento de cadastro com integridade no banco de dados</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {validationError && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
              <strong>Atenção:</strong> {validationError}
            </div>
          )}

          {/* Phone Field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Número de Telefone (Apenas números):
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Nome do Cliente:
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Checkbox to add first order immediately */}
          <div className="pt-2">
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasFirstOrder}
                onChange={(e) => setHasFirstOrder(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 font-mono uppercase tracking-wider">
                Registrar primeiro pedido agora?
              </span>
            </label>
          </div>

          {/* First Order Block */}
          {hasFirstOrder && (
            <div className="border border-emerald-100 rounded-2xl bg-emerald-50/20 p-4 space-y-4 animate-fade-in">
              <h4 className="text-xs font-bold text-emerald-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Check size={14} />
                Dados do Primeiro Pedido
              </h4>

              {/* Order Date */}
              <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 font-mono uppercase">
                  Data da Compra:
                </label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={firstOrderDate}
                    onChange={(e) => setFirstOrderDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items Counter list */}
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-emerald-800 font-mono uppercase tracking-wider">
                  Selecione os produtos:
                </span>
                
                <div className="space-y-2">
                  {PRODUCTS.map((prod) => (
                    <div key={prod} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm">
                      <span className="text-xs font-bold text-slate-800 font-mono tracking-wider">{prod}</span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(prod, -1)}
                          disabled={quantities[prod] <= 0}
                          className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-500 p-1 rounded transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono text-slate-800">
                          {quantities[prod]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(prod, 1)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-500 p-1 rounded transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold font-mono tracking-wider transition-colors"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs font-mono tracking-wider shadow-md hover:shadow-lg transition-all"
          >
            SALVAR CADASTRO
          </button>
        </div>
      </div>
    </div>
  );
}
