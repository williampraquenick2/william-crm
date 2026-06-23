/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Client, ProductType, PRODUCTS } from '../types';
import { X, Search, Plus, Minus, Calendar, ShoppingBag, UserCheck, Pencil } from 'lucide-react';
import { CURRENT_DATE_STR, formatDateBR } from '../utils/crmUtils';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  initialSelectedClient?: Client | null;
  onSaveOrder: (telefone: string, date: string, items: { produto: ProductType; quantidade: number }[]) => void;
  onUpdateClientName?: (telefone: string, newNome: string) => void;
}

export default function NewOrderModal({
  isOpen,
  onClose,
  clients,
  initialSelectedClient,
  onSaveOrder,
  onUpdateClientName
}: NewOrderModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [orderDate, setOrderDate] = useState(CURRENT_DATE_STR);
  
  // Quantities for each of the products
  const [quantities, setQuantities] = useState<Record<ProductType, number>>(() => {
    const initial = {} as Record<ProductType, number>;
    PRODUCTS.forEach(p => {
      initial[p] = 0;
    });
    return initial;
  });

  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // States for inline renaming within the order modal
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Sync initial client selection if provided from parent (e.g. clicking "Novo Pedido" directly on a client record)
  useEffect(() => {
    if (initialSelectedClient) {
      setSelectedClient(initialSelectedClient);
      setSearchQuery(initialSelectedClient.nome);
    } else {
      setSelectedClient(null);
      setSearchQuery('');
    }
  }, [initialSelectedClient, isOpen]);

  // Autocomplete search logic
  useEffect(() => {
    if (!searchQuery.trim() || (selectedClient && searchQuery === selectedClient.nome)) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(
      c => c.nome.toLowerCase().includes(query) || c.telefone.includes(query)
    ).slice(0, 5); // Limit dropdown to top 5 results for sleekness

    setSearchResults(filtered);
    setShowSearchDropdown(true);
  }, [searchQuery, clients, selectedClient]);

  // Keep selected client in sync with latest list updates (e.g., when renaming)
  useEffect(() => {
    if (selectedClient) {
      const fresh = clients.find(c => c.telefone === selectedClient.telefone);
      if (fresh) {
        setSelectedClient(fresh);
        setSearchQuery(fresh.nome);
      }
    }
  }, [clients]);

  if (!isOpen) return null;

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearchQuery(client.nome);
    setShowSearchDropdown(false);
    setValidationError(null);
  };

  const handleQtyChange = (product: ProductType, amount: number) => {
    setQuantities(prev => ({
      ...prev,
      [product]: Math.max(0, prev[product] + amount)
    }));
    setValidationError(null);
  };

  const handleQtyDirectChange = (product: ProductType, value: string) => {
    const parsed = parseInt(value, 10);
    setQuantities(prev => ({
      ...prev,
      [product]: isNaN(parsed) ? 0 : Math.max(0, parsed)
    }));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      setValidationError('Por favor, selecione ou busque um cliente válido.');
      return;
    }

    if (!orderDate) {
      setValidationError('Por favor, defina uma data de pedido válida.');
      return;
    }

    // Prepare items list
    const itemsToSave = PRODUCTS.map(prod => ({
      produto: prod,
      quantidade: quantities[prod]
    })).filter(item => item.quantidade > 0);

    if (itemsToSave.length === 0) {
      setValidationError('Por favor, adicione pelo menos 1 unidade de algum produto.');
      return;
    }

    onSaveOrder(selectedClient.telefone, orderDate, itemsToSave);
    
    // Reset quantities and states
    const resetQty = {} as Record<ProductType, number>;
    PRODUCTS.forEach(p => {
      resetQty[p] = 0;
    });
    setQuantities(resetQty);
    setSelectedClient(null);
    setSearchQuery('');
    setOrderDate(CURRENT_DATE_STR);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} className="text-amber-100 shrink-0 animate-bounce" />
            <div>
              <h3 className="font-bold text-lg tracking-tight">Registrar Novo Pedido</h3>
              <p className="text-xs text-amber-50">Lançamento acumulativo no histórico do cliente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {validationError && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
              <strong>Atenção:</strong> {validationError}
            </div>
          )}

          {/* Client Search Block */}
          <div className="space-y-1.5 relative">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Cliente:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedClient && e.target.value !== selectedClient.nome) {
                    setSelectedClient(null);
                  }
                }}
                placeholder="Busque por Nome do Cliente ou Telefone..."
                className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
              />
              {selectedClient && (
                <div className="absolute right-3 top-2.5 text-emerald-600 animate-pulse bg-emerald-50 p-1 rounded">
                  <UserCheck size={18} />
                </div>
              )}
            </div>

            {/* Suggestions list */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto animate-fade-in-down">
                {searchResults.map((client) => (
                  <button
                    key={client.telefone}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex flex-col"
                  >
                    <span className="text-sm font-bold text-slate-800">{client.nome}</span>
                    <span className="text-xs text-slate-500 font-mono">Tel: {client.telefone}</span>
                  </button>
                ))}
              </div>
            )}
            {showSearchDropdown && searchResults.length === 0 && searchQuery.trim() !== '' && !selectedClient && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-4 text-center text-xs text-slate-500 font-mono">
                Nenhum cliente cadastrado com este nome/telefone. Recomenda-se cadastrar o cliente primeiro.
              </div>
            )}
            {selectedClient && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex items-center justify-between text-slate-600">
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 flex-wrap py-0.5">
                      <span className="font-semibold text-slate-700">Comprador ativo:</span>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Novo nome"
                        className="bg-white border-2 border-amber-500 rounded px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold uppercase w-full max-w-[160px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (tempName.trim() && onUpdateClientName) {
                              onUpdateClientName(selectedClient.telefone, tempName);
                              setIsEditingName(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsEditingName(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempName.trim() && onUpdateClientName) {
                            onUpdateClientName(selectedClient.telefone, tempName);
                            setIsEditingName(false);
                          }
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-extrabold text-[9px] px-2 py-0.5 rounded"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                      Comprador ativo: <span className="font-bold text-amber-600">{selectedClient.nome}</span>
                      <button
                        type="button"
                        title="Alterar Nome"
                        onClick={() => {
                          setTempName(selectedClient.nome.startsWith('SEM NOME') ? '' : selectedClient.nome);
                          setIsEditingName(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-200 transition-all flex items-center justify-center"
                      >
                        <Pencil size={11} />
                      </button>
                    </span>
                  )}
                  <p className="text-[10px] text-slate-400 font-mono">Tel: {selectedClient.telefone} | Última Compra: {formatOrderDate(selectedClient.ultimaCompra)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setSearchQuery('');
                  }}
                  className="text-[10px] text-rose-500 hover:underline hover:text-rose-700 uppercase font-bold font-mono shrink-0 ml-2"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Data do Pedido:
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Garlic Products Counters List */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Produtos & Quantidades:
            </label>
            <p className="text-[10px] text-slate-400 italic">Incremente as unidades adquiridas deste pedido:</p>

            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3.5">
              {PRODUCTS.map((prod) => (
                <div key={prod} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-sm transition-all hover:border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-800 tracking-wider font-mono">
                      {prod}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Total histórico do cliente: {selectedClient ? (selectedClient.totaisPorProduto[prod] || 0) : 0} unid.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(prod, -1)}
                      disabled={quantities[prod] <= 0}
                      className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 disabled:hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                      <Minus size={15} />
                    </button>
                    
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quantities[prod]}
                      onChange={(e) => handleQtyDirectChange(prod, e.target.value)}
                      className="w-12 text-center text-sm font-bold border border-slate-100 focus:outline-none focus:border-amber-400 rounded-md py-1 text-slate-800 font-mono"
                    />

                    <button
                      type="button"
                      onClick={() => handleQtyChange(prod, 1)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer actions */}
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
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs font-mono tracking-wider shadow-md hover:shadow-lg transition-all"
          >
            REGISTRAR PEDIDO
          </button>
        </div>
      </div>
    </div>
  );
}

function formatOrderDate(date: string | null) {
  if (!date) return 'Sem registro';
  return formatDateBR(date);
}
