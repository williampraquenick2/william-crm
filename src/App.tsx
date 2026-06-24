/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getSeededClients } from './data/initialClients';
import { getGuarulhosSeededClients } from './data/initialClientsGuarulhos';
import { Client, ProductType, PRODUCTS } from './types';
import { 
  getDaysSince, 
  formatPhoneNumber, 
  formatDateBR, 
  recalculateClientMetrics, 
  getProductSalesReport, 
  getPeriodSalesReport,
  CURRENT_DATE_STR
} from './utils/crmUtils';
import CommandBox from './components/CommandBox';
import NewOrderModal from './components/NewOrderModal';
import NewClientModal from './components/NewClientModal';
import { 
  Users, 
  Clock, 
  Briefcase, 
  ShoppingBag, 
  ShieldAlert, 
  Sparkles, 
  VolumeX, 
  Map, 
  Plus, 
  ChevronRight, 
  Filter, 
  Check, 
  BarChart4, 
  ArrowUpRight, 
  Database,
  Calendar,
  Layers,
  UserCheck,
  RotateCcw,
  UserPlus2,
  Search,
  Download,
  Upload,
  Pencil,
  FileText
} from 'lucide-react';

const getLocalStorageKey = (unit: 'SP' | 'Guarulhos') => {
  return unit === 'SP' ? 'alho_crm_clients_v3_data_sp' : 'alho_crm_clients_v3_data_guarulhos';
};

const PRODUCT_EMOJIS: Record<ProductType, string> = {
  '500G PURO': '🥇',
  '250G PURO': '🥈',
  'ALHO TEMPERADO': '🍗',
  'TEMPERO COMPLETO': '🧂',
  'TEMPERO DE BACON': '🥓',
  'CHIMICHURRI': '🌿',
  'ANA MARIA': '🌸',
  'PAPRICA DEFUMADA': '🌶️',
  'PEGA MARIDO': '💍',
  'TEMPERO PARA FEIJÃO': '🍲',
  'SAL DO HIMALAIA': '🏔'
};

export default function App() {
  // --------------------------------------------------------
  // State variables
  // --------------------------------------------------------
  const [activeUnit, setActiveUnit] = useState<'SP' | 'Guarulhos' | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<'clientes' | 'rankings' | 'relatorios'>('clientes');
  const [selectedSegment, setSelectedSegment] = useState<'todos' | 'sem-nome' | 'inativos-30' | 'inativos-60' | 'inativos-90' | 'uma-compra' | 'top-20'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [prefilledClientInOrder, setPrefilledClientInOrder] = useState<Client | null>(null);

  // Renaming client states
  const [renamingTelefone, setRenamingTelefone] = useState<string | null>(null);
  const [newNameValue, setNewNameValue] = useState<string>('');

  // Editing last purchase date states
  const [editingDateTelefone, setEditingDateTelefone] = useState<string | null>(null);
  const [newDateValue, setNewDateValue] = useState<string>('');

  // Stats toast alert state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --------------------------------------------------------
  // Load initial dataset from localStorage or seed
  // --------------------------------------------------------
  useEffect(() => {
    if (!activeUnit) {
      setClients([]);
      setSelectedClient(null);
      return;
    }
    const key = getLocalStorageKey(activeUnit);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const loaded: Client[] = JSON.parse(cached);
        const seeds = activeUnit === 'SP' ? getSeededClients() : getGuarulhosSeededClients();
        let hasChanges = false;
        
        const merged = loaded.map(lc => {
          const seedMatch = seeds.find(sc => sc.telefone === lc.telefone);
          if (seedMatch && !seedMatch.nome.startsWith('SEM NOME') && lc.nome.startsWith('SEM NOME')) {
            hasChanges = true;
            return {
              ...lc,
              nome: seedMatch.nome,
              historico: lc.historico.length === 0 ? seedMatch.historico : lc.historico,
              ultimaCompra: lc.historico.length === 0 ? seedMatch.ultimaCompra : lc.ultimaCompra,
              totaisPorProduto: lc.historico.length === 0 ? seedMatch.totaisPorProduto : lc.totaisPorProduto,
              totalPedidos: lc.historico.length === 0 ? seedMatch.totalPedidos : lc.totalPedidos,
              totalProdutosComprados: lc.historico.length === 0 ? seedMatch.totalProdutosComprados : lc.totalProdutosComprados
            };
          }
          return lc;
        });

        const missing = seeds.filter(sc => !loaded.some(lc => lc.telefone === sc.telefone));
        if (missing.length > 0) {
          hasChanges = true;
          merged.push(...missing);
        }

        if (hasChanges) {
          setClients(merged);
          localStorage.setItem(key, JSON.stringify(merged));
        } else {
          setClients(loaded);
        }
      } catch (err) {
        // Fallback to seeds on corruption
        console.error("Erro ao carregar dados do LocalStorage, reiniciando semente.", err);
        const seeds = activeUnit === 'SP' ? getSeededClients() : getGuarulhosSeededClients();
        setClients(seeds);
        localStorage.setItem(key, JSON.stringify(seeds));
      }
    } else {
      const seeds = activeUnit === 'SP' ? getSeededClients() : getGuarulhosSeededClients();
      setClients(seeds);
      localStorage.setItem(key, JSON.stringify(seeds));
    }
    setSelectedClient(null);
  }, [activeUnit]);

  // Sync state to localStorage whenever changed
  const saveToStorage = (updatedClients: Client[]) => {
    setClients(updatedClients);
    if (activeUnit) {
      localStorage.setItem(getLocalStorageKey(activeUnit), JSON.stringify(updatedClients));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reset page number on filter/query adjustments
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSegment]);

  // If a client details view is open and clients state gets updated, sync selectedClient details
  useEffect(() => {
    if (selectedClient) {
      const fresh = clients.find(c => c.telefone === selectedClient.telefone);
      if (fresh) {
        setSelectedClient(fresh);
      }
    }
  }, [clients]);

  // --------------------------------------------------------
  // CRM API Operations
  // --------------------------------------------------------

  /**
   * Registra um novo pedido para um cliente existente e atualiza os totais cumulativos
   */
  const handleSaveOrder = (telefone: string, date: string, items: { produto: ProductType; quantidade: number }[]) => {
    const updated = clients.map(client => {
      if (client.telefone === telefone) {
        // Create unique sub-ID
        const orderId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Append to history
        const newOrder = {
          id: orderId,
          data: date,
          itens: items
        };
        const updatedHistory = [...client.historico, newOrder];
        
        // Use crmUtils helper to completely recalculate totals cumulatively
        const metrics = recalculateClientMetrics(updatedHistory);

        return {
          ...client,
          historico: updatedHistory.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
          ...metrics
        };
      }
      return client;
    });

    saveToStorage(updated);
    
    // Find client details to feedback
    const matchedClient = clients.find(c => c.telefone === telefone);
    const clientName = matchedClient ? matchedClient.nome : telefone;
    showToast(`Pedido registrado com sucesso para ${clientName}! Totais acumulados atualizados.`);
  };

  /**
   * Cadastra um novo cliente no banco de dados.
   * Se o telefone já existir, o validador de formulário impedirá, mas fazemos dupla checagem.
   */
  const handleSaveClient = (clientData: { 
    nome: string; 
    telefone: string; 
    primeiroPedido?: { data: string; itens: { produto: ProductType; quantidade: number }[] } 
  }) => {
    const exists = clients.some(c => c.telefone === clientData.telefone);
    if (exists) {
      showToast(`Aviso: Cliente com telefone ${clientData.telefone} já cadastrado!`);
      return;
    }

    const firstOrderList = [];
    if (clientData.primeiroPedido) {
      firstOrderList.push({
        id: `order-first-${Date.now()}`,
        data: clientData.primeiroPedido.data,
        itens: clientData.primeiroPedido.itens
      });
    }

    const metrics = recalculateClientMetrics(firstOrderList);

    const newClient: Client = {
      telefone: clientData.telefone,
      nome: clientData.nome,
      historico: firstOrderList,
      ...metrics
    };

    const updated = [newClient, ...clients];
    saveToStorage(updated);
    setSelectedClient(newClient); // Automatically highlight the newly created client
    showToast(`Cliente "${clientData.nome}" cadastrado com sucesso!`);
  };

  /**
   * Atualiza o nome de um cliente existente
   */
  const handleUpdateClientName = (telefone: string, newNome: string) => {
    if (!newNome || !newNome.trim()) {
      showToast("Por favor, digite um nome válido.");
      return;
    }
    const updated = clients.map(client => {
      if (client.telefone === telefone) {
        return {
          ...client,
          nome: newNome.trim()
        };
      }
      return client;
    });

    saveToStorage(updated);
    showToast(`Nome do cliente atualizado com sucesso!`);
  };

  /**
   * Atualiza a data da última compra de um cliente
   */
  const handleUpdateClientLastPurchaseDate = (telefone: string, newDate: string) => {
    if (!newDate) return;
    const updated = clients.map(client => {
      if (client.telefone === telefone) {
        let updatedHistory = [...client.historico];
        
        if (updatedHistory.length > 0) {
          // Se houver pedidos, atualiza a data do pedido mais recente
          updatedHistory[0] = {
            ...updatedHistory[0],
            data: newDate
          };
          
          // Reordena o histórico por data decrescente
          updatedHistory.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
          
          const metrics = recalculateClientMetrics(updatedHistory);
          return {
            ...client,
            historico: updatedHistory,
            ...metrics
          };
        } else {
          // Sem histórico, atualiza o campo diretamente
          return {
            ...client,
            ultimaCompra: newDate
          };
        }
      }
      return client;
    });

    saveToStorage(updated);
    showToast("Data da última compra atualizada com sucesso!");
  };

  /**
   * Exporta os dados completos da unidade ativa como JSON
   */
  const handleExportBackupJSON = () => {
    if (clients.length === 0) {
      showToast("Não há dados para exportar.");
      return;
    }
    const unitName = activeUnit === 'SP' ? 'SP' : 'Guarulhos';
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clients, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_crm_alho_e_so_${unitName}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Backup exportado com sucesso!");
  };

  /**
   * Importa e restaura os dados completos a partir de um arquivo JSON
   */
  const handleImportBackupJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = e => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsedData)) {
          // Validação rápida de formato
          const isValid = parsedData.every(c => c && typeof c.telefone === 'string');
          if (isValid) {
            saveToStorage(parsedData);
            setSelectedClient(null);
            showToast("Backup restaurado com sucesso!");
          } else {
            alert("Formato de arquivo inválido. O arquivo de backup não contém telefones de clientes válidos.");
          }
        } else {
          alert("Formato de arquivo inválido. Deve ser uma lista de clientes.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo de backup. Certifique-se de que é um arquivo JSON válido.");
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  /**
   * Reseta o banco de dados de volta à semente inicial do Excel (para fins de testes limpos)
   */
  const handleResetDatabase = () => {
    if (!activeUnit) return;
    const unitName = activeUnit === 'SP' ? 'São Paulo' : 'Guarulhos';
    if (window.confirm(`Atenção! Isso irá apagar todos os novos pedidos e redefinir o banco de dados de ${unitName} com os dados semente da planilha. Deseja continuar?`)) {
      const seeds = activeUnit === 'SP' ? getSeededClients() : getGuarulhosSeededClients();
      saveToStorage(seeds);
      setSelectedClient(null);
      showToast(`Banco de dados de ${unitName} restaurado com sucesso para o estado semente!`);
    }
  };

  /**
   * Atualiza manualmente a data de um pedido específico
   */
  const handleUpdateOrderDate = (telefone: string, orderId: string, newDate: string) => {
    if (!newDate) return;
    const updated = clients.map(client => {
      if (client.telefone === telefone) {
        const updatedHistory = client.historico.map(order => {
          if (order.id === orderId) {
            return { ...order, data: newDate };
          }
          return order;
        });

        const sortedHistory = [...updatedHistory].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        );

        const metrics = recalculateClientMetrics(sortedHistory);

        return {
          ...client,
          historico: sortedHistory,
          ...metrics
        };
      }
      return client;
    });

    saveToStorage(updated);
    showToast("Data do pedido atualizada com sucesso!");
  };

  /**
   * Baixa a lista completa de clientes e telefones formatada em .txt (filtrada ou geral)
   */
  const handleDownloadClientsTXT = (filterType: 'todos' | '40' | '50' | '60') => {
    if (clients.length === 0) {
      showToast("Não há clientes cadastrados para exportar.");
      return;
    }

    let filteredList = [...clients];
    let filename = 'clientes_alho_e_so.txt';
    let label = 'Todos os Contatos';

    if (filterType === '40') {
      // Clientes sem compras nos últimos 40 dias ou nunca compraram (0 totalPedidos)
      filteredList = clients.filter(c => c.totalPedidos === 0 || (c.ultimaCompra && getDaysSince(c.ultimaCompra) > 40));
      filename = 'clientes_alho_e_so_inativos_40_dias.txt';
      label = 'Sem compras +40 dias';
    } else if (filterType === '50') {
      // Clientes sem compras nos últimos 50 dias ou nunca compraram
      filteredList = clients.filter(c => c.totalPedidos === 0 || (c.ultimaCompra && getDaysSince(c.ultimaCompra) > 50));
      filename = 'clientes_alho_e_so_inativos_50_dias.txt';
      label = 'Sem compras +50 dias';
    } else if (filterType === '60') {
      // Clientes sem compras nos últimos 60 dias ou nunca compraram
      filteredList = clients.filter(c => c.totalPedidos === 0 || (c.ultimaCompra && getDaysSince(c.ultimaCompra) > 60));
      filename = 'clientes_alho_e_so_inativos_60_dias.txt';
      label = 'Sem compras +60 dias';
    }

    if (filteredList.length === 0) {
      showToast(`Nenhum contato encontrado na categoria: ${label}`);
      return;
    }

    const sortedList = [...filteredList].sort((a, b) => a.nome.localeCompare(b.nome));

    const txtContent = sortedList
      .map(c => `${c.telefone} - ${c.nome}`)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Baixando ${filteredList.length} contatos (${label})!`);
  };

  // --------------------------------------------------------
  // Command Executor / Parser (For Terminal)
  // --------------------------------------------------------
  const handleExecuteCommand = (rawCommand: string) => {
    const cmd = rawCommand.trim().toLowerCase();

    if (cmd.startsWith("buscar cliente ")) {
      const term = rawCommand.substring(15).trim();
      setSearchQuery(term);
      setSelectedSegment('todos');
      setActiveTab('clientes');
    } 
    else if (cmd.startsWith("buscar telefone ")) {
      const term = rawCommand.substring(16).trim().replace(/\D/g, '');
      setSearchQuery(term);
      setSelectedSegment('todos');
      setActiveTab('clientes');
      
      const matched = clients.find(c => c.telefone.replace(/\D/g, '') === term);
      if (matched) {
        setSelectedClient(matched);
      }
    } 
    else if (cmd === "registrar pedido") {
      setPrefilledClientInOrder(null);
      setIsNewOrderOpen(true);
    } 
    else if (cmd === "mostrar ranking") {
      setActiveTab('rankings');
    } 
    else if (cmd === "mostrar top 20 clientes") {
      setSelectedSegment('top-20');
      setSearchQuery('');
      setActiveTab('clientes');
    } 
    else if (cmd === "mostrar clientes sem nome") {
      setSelectedSegment('sem-nome');
      setSearchQuery('');
      setActiveTab('clientes');
    } 
    else if (cmd === "mostrar clientes que não compram há mais de 60 dias") {
      setSelectedSegment('inativos-60');
      setSearchQuery('');
      setActiveTab('clientes');
    } 
    else if (cmd === "mostrar clientes que não compram há mais de 90 dias") {
      setSelectedSegment('inativos-90');
      setSearchQuery('');
      setActiveTab('clientes');
    } 
    else if (cmd === "mostrar clientes que compraram apenas uma vez") {
      setSelectedSegment('uma-compra');
      setSearchQuery('');
      setActiveTab('clientes');
    } 
    else {
      // General Smart Fallback: Text searches
      setSearchQuery(rawCommand);
      setSelectedSegment('todos');
      setActiveTab('clientes');
    }
  };

  // --------------------------------------------------------
  // Advanced Segmentation Filtering
  // --------------------------------------------------------
  const getFilteredClients = (): Client[] => {
    let list = [...clients];

    // 1. Text Search query (supports searching name or phone number)
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.nome.toLowerCase().includes(sq) || 
        c.telefone.includes(sq)
      );
    }

    // 2. Segment classification
    if (selectedSegment === 'sem-nome') {
      list = list.filter(c => c.nome.startsWith('SEM NOME'));
    } 
    else if (selectedSegment === 'inativos-30') {
      // Pedidos feitos mas última compra há mais de 30 dias
      list = list.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) > 30);
    }
    else if (selectedSegment === 'inativos-60') {
      // Pedidos feitos mas última compra há mais de 60 dias
      list = list.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) > 60);
    } 
    else if (selectedSegment === 'inativos-90') {
      // Pedidos feitos mas última compra há mais de 90 dias
      list = list.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) > 90);
    } 
    else if (selectedSegment === 'uma-compra') {
      // Clientes com apenas um pedido registrado
      list = list.filter(c => c.totalPedidos === 1);
    } 
    else if (selectedSegment === 'top-20') {
      // Sort by totals sold volume descending and take 20
      list.sort((a, b) => b.totalProdutosComprados - a.totalProdutosComprados);
      list = list.slice(0, 20);
    }

    return list;
  };

  const filteredClients = getFilteredClients();

  // --------------------------------------------------------
  // Global Aggregated Stats
  // --------------------------------------------------------
  const totalRegistered = clients.length;
  const noNameCount = clients.filter(c => c.nome.startsWith('SEM NOME')).length;
  
  // Active = purchased within last 60 days. Inactive = hasn't purchased in >60 days
  const activeCount = clients.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) <= 60).length;
  const inactive30Count = clients.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) > 30).length;
  const inactive60Count = clients.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) > 60).length;
  const inactive90Count = clients.filter(c => c.totalPedidos > 0 && getDaysSince(c.ultimaCompra) > 90).length;
  
  const totalOrdersCount = clients.reduce((sum, c) => sum + c.totalPedidos, 0);
  const totalProductsVolumeCount = clients.reduce((sum, c) => sum + c.totalProdutosComprados, 0);

  // --------------------------------------------------------
  // Pagination Calculations
  // --------------------------------------------------------
  const totalPageCount = Math.ceil(filteredClients.length / ITEMS_PER_PAGE) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // --------------------------------------------------------
  // Real-Time Rankings Computation
  // --------------------------------------------------------
  const getRankMostOrders = () => {
    return [...clients]
      .filter(c => c.totalPedidos > 0)
      .sort((a,b) => b.totalPedidos - a.totalPedidos)
      .slice(0, 10);
  };

  const getRankTotalBoughtOverall = () => {
    return [...clients]
      .filter(c => c.totalProdutosComprados > 0)
      .sort((a,b) => b.totalProdutosComprados - a.totalProdutosComprados)
      .slice(0, 10);
  };

  const getRankByProductType = (product: ProductType) => {
    return [...clients]
      .filter(c => (c.totaisPorProduto[product] || 0) > 0)
      .sort((a,b) => (b.totaisPorProduto[product] || 0) - (a.totaisPorProduto[product] || 0))
      .slice(0, 10);
  };

  // --------------------------------------------------------
  // Report Calculations
  // --------------------------------------------------------
  const productSalesReport = getProductSalesReport(clients);
  const periodSalesReport = getPeriodSalesReport(clients);

  if (!activeUnit) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-3">
            <div className="bg-amber-500 text-slate-950 p-5 rounded-3xl inline-block shadow-2xl relative">
              <span className="text-4xl">🧄</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-white mt-4">
              ALHO E SÓ CRM
            </h1>
            <p className="text-sm font-mono text-slate-400">
              Sistema de Gestão de Clientes, Pedidos e Rankings
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-8 rounded-3xl shadow-3xl space-y-6">
            <h2 className="text-sm font-black font-mono tracking-widest text-slate-500 uppercase">
              ESCOLHA UMA UNIDADE
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                id="btn-unit-sp"
                onClick={() => setActiveUnit('SP')}
                className="group relative flex flex-col items-start p-5 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-amber-550 hover:to-amber-600 rounded-2xl border border-slate-800 hover:border-transparent text-left transition-all duration-300 transform hover:-translate-y-1 hover:bg-slate-800 cursor-pointer w-full text-white hover:text-white"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-slate-105 font-mono text-lg uppercase tracking-tight group-hover:text-amber-400">
                    [ CRM SÃO PAULO ]
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Ativo SP
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans select-none leading-relaxed">
                  Mantém todos os clientes cadastrados anteriormente, históricos e relatórios de São Paulo.
                </p>
              </button>

              <button
                type="button"
                id="btn-unit-gru"
                onClick={() => setActiveUnit('Guarulhos')}
                className="group relative flex flex-col items-start p-5 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-amber-550 hover:to-amber-600 rounded-2xl border border-slate-800 hover:border-transparent text-left transition-all duration-300 transform hover:-translate-y-1 hover:bg-slate-800 cursor-pointer w-full text-white hover:text-white"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-slate-105 font-mono text-lg uppercase tracking-tight group-hover:text-amber-400">
                    [ CRM GUARULHOS ]
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Ativo GRU
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans select-none leading-relaxed">
                  Importação dos clientes do arquivo TXT de Guarulhos. Rankings e relatórios independentes.
                </p>
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 select-none">
            ALHO E SÓ CRM © 2026 • Os bancos de dados não são misturados.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-all selection:bg-amber-100">
      
      {/* 1. Header Area with Garlic Branding */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2.5 rounded-2xl shadow-md transition-transform hover:scale-105">
              <span className="font-extrabold text-lg tracking-wider block leading-none">🧄</span>
            </div>
            <div>
              <h1 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
                ALHO E SÓ
                <span className="text-[10px] bg-slate-900 text-amber-400 font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {activeUnit === 'SP' ? 'CRM SÃO PAULO' : 'CRM GUARULHOS'}
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-mono">Painel Administrativo • Unidade {activeUnit === 'SP' ? 'São Paulo' : 'Guarulhos'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewClientOpen(true)}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 text-xs font-bold font-mono px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 "
            >
              <UserPlus2 size={15} />
              NOVO CLIENTE
            </button>
            <button
              onClick={() => {
                setPrefilledClientInOrder(null);
                setIsNewOrderOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black font-mono px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 "
            >
              <Plus size={16} />
              REGISTRAR PEDIDO
            </button>
            <div className="relative">
              <button
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                title="Opções de Download da lista de contatos em formato .txt"
                className={`text-xs font-bold font-mono px-3.5 py-2 border rounded-xl transition-all flex items-center gap-2 ${
                  isDownloadMenuOpen 
                    ? 'bg-slate-200 text-slate-900 border-slate-300 shadow-inner' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-800 border-slate-200'
                }`}
              >
                <Download size={14} className="text-slate-500" />
                BAIXAR TXT
              </button>
              
              {isDownloadMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDownloadMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2.5 text-left">
                    <span className="text-[9px] font-black tracking-wider uppercase text-slate-400 font-mono block px-2.5 pb-2 border-b border-slate-100">
                      Exportar Contatos (.TXT)
                    </span>
                    <div className="mt-1.5 space-y-0.5">
                      <button
                        onClick={() => {
                          handleDownloadClientsTXT('todos');
                          setIsDownloadMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-xl transition-colors flex items-start gap-2.5 group"
                      >
                        <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg group-hover:bg-sky-100 transition-colors mt-0.5">
                          <Users size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">Todos os Contatos</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sem filtros ({clients.length} contatos)</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          handleDownloadClientsTXT('40');
                          setIsDownloadMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-amber-50/50 rounded-xl transition-colors flex items-start gap-2.5 group"
                      >
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors mt-0.5">
                          <Clock size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">Inativos há +40 Dias</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sem compras nos últimos 40 dias</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          handleDownloadClientsTXT('50');
                          setIsDownloadMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-amber-50/50 rounded-xl transition-colors flex items-start gap-2.5 group"
                      >
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors mt-0.5">
                          <Clock size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">Inativos há +50 Dias</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sem compras nos últimos 50 dias</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          handleDownloadClientsTXT('60');
                          setIsDownloadMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-rose-50/50 rounded-xl transition-colors flex items-start gap-2.5 group"
                      >
                        <div className="p-1.5 bg-rose-55 text-rose-600 rounded-lg group-hover:bg-rose-100 transition-colors mt-0.5">
                          <Clock size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">Inativos há +60 Dias</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Foco em reengajamento (+60 dias)</p>
                        </div>
                      </button>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <span className="text-[9px] font-black tracking-wider uppercase text-slate-400 font-mono block px-2.5 pb-2">
                          Backup Completo do CRM (JSON)
                        </span>
                        
                        <button
                          onClick={() => {
                            handleExportBackupJSON();
                            setIsDownloadMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 hover:bg-emerald-50/50 rounded-xl transition-colors flex items-start gap-2.5 group"
                        >
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors mt-0.5">
                            <Download size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">Exportar Backup JSON</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Salva todos os dados em arquivo</p>
                          </div>
                        </button>

                        <label className="w-full text-left px-2.5 py-2 hover:bg-indigo-50/50 rounded-xl transition-colors flex items-start gap-2.5 group cursor-pointer block">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors mt-0.5">
                            <Upload size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">Importar Backup JSON</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold text-amber-600">Restaurar do seu outro link/aba</p>
                            <input
                              type="file"
                              accept=".json"
                              onChange={(e) => {
                                handleImportBackupJSON(e);
                                setIsDownloadMenuOpen(false);
                              }}
                              className="hidden"
                            />
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setActiveUnit(null)}
              title="Trocar de Unidade / Voltar para Início"
              className="text-slate-400 hover:text-amber-500 p-2 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-colors"
            >
              <Map size={16} />
            </button>
            <button
              onClick={handleResetDatabase}
              title="Restaurar dados semente originais"
              className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 2. Global Performance Statistic Row */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80 transition-all hover:shadow">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1">Clientes Semente</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 leading-none">{totalRegistered}</span>
              <span className="text-[10px] text-slate-500 font-mono">({noNameCount} s/ nome)</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80 transition-all hover:shadow">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1">Clientes Ativos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 leading-none">{activeCount}</span>
              <span className="text-[10px] text-emerald-600/80 font-mono font-semibold">(&lt; 60 dias)</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80 transition-all hover:shadow">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1">Inativos (+60 dias)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 leading-none">{inactive60Count}</span>
              <span className="text-[10px] text-slate-500 font-mono">({inactive90Count} +90d)</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80 transition-all hover:shadow">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1">Total de Pedidos</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 leading-none">{totalOrdersCount}</span>
              <span className="text-[10px] text-slate-500 font-mono">acumulativos</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 col-span-2 md:col-span-1 shadow-sm border border-slate-100/80 transition-all hover:shadow bg-amber-500/5">
            <span className="text-[10px] font-bold text-amber-800 font-mono uppercase block mb-1">Volume Total Vendido</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600 leading-none">{totalProductsVolumeCount}</span>
              <span className="text-[10px] text-amber-700 font-mono font-medium">unidades</span>
            </div>
          </div>
        </section>

        {/* 3. Command Console Block */}
        <section className="relative">
          <CommandBox onExecuteCommand={handleExecuteCommand} />
        </section>

        {/* Tab Navigation Menu */}
        <section className="bg-slate-200/60 p-1 rounded-xl flex items-center gap-1.5 max-w-sm">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex-1 py-2 px-3 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'clientes' 
                ? 'bg-white shadow text-slate-900' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`flex-1 py-2 px-3 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'rankings' 
                ? 'bg-white shadow text-slate-900' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex-1 py-2 px-3 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'relatorios' 
                ? 'bg-white shadow text-slate-900' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            Relatórios
          </button>
        </section>

        {/* 4. Tab Views Router */}
        <div className="transition-all">
          
          {/* TAB 1: CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Clients Directory Card List */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col p-6 space-y-4">
                
                {/* Search Inputs and Segment Quick Filters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-md tracking-tight text-slate-900 flex items-center gap-2">
                      <Users size={18} className="text-amber-500" />
                      Diretório de Clientes
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {filteredClients.length} cadastrados
                      </span>
                    </h3>
                    <div className="flex items-center gap-1">
                      <Filter size={14} className="text-slate-400" />
                      <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">Filtros</span>
                    </div>
                  </div>

                  {/* Segment filter list */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'sem-nome', label: 'Sem Nome' },
                      { id: 'inativos-30', label: 'Inativos +30 dias' },
                      { id: 'inativos-60', label: 'Inativos +60 dias' },
                      { id: 'inativos-90', label: 'Inativos +90 dias' },
                      { id: 'uma-compra', label: 'Apenas 1 Compra' },
                      { id: 'top-20', label: 'Top 20 Volumes' }
                    ].map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => setSelectedSegment(seg.id as any)}
                        className={`text-[10px] font-mono font-bold uppercase py-1 px-2.5 rounded-lg border transition-all ${
                          selectedSegment === seg.id 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>

                  {/* Search input field inside tab */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Busca instantânea por nome ou telefone específico..."
                      className="w-full bg-slate-50/50 text-slate-800 text-xs pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-2 text-slate-400 hover:text-slate-600 uppercase font-mono text-[9px] font-black bg-slate-100 px-1 py-0.5 rounded"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Client Table / List Grid */}
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  {paginatedClients.length > 0 ? (
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider border-b border-slate-100">
                          <th className="py-2.5 pb-3">Nome / Telefone</th>
                          <th className="py-2.5 pb-3">Pedidos</th>
                          <th className="py-2.5 pb-3">Última Compra</th>
                          <th className="py-2.5 pb-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedClients.map((client) => {
                          const isSelected = selectedClient?.telefone === client.telefone;
                          const inDays = getDaysSince(client.ultimaCompra);
                          return (
                            <tr 
                              key={client.telefone}
                              onClick={() => setSelectedClient(client)}
                              className={`group cursor-pointer hover:bg-amber-500/5 transition-all ${
                                isSelected ? 'bg-amber-500/10 hover:bg-amber-500/10' : ''
                              }`}
                            >
                              <td className="py-3.5 pr-2">
                                <div className="flex flex-col">
                                  {renamingTelefone === client.telefone ? (
                                    <div className="flex items-center gap-1.5 py-1" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                        type="text"
                                        value={newNameValue}
                                        onChange={(e) => setNewNameValue(e.target.value)}
                                        className="bg-white border-2 border-amber-500 text-xs px-2 py-1 rounded font-bold uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full max-w-[180px]"
                                        placeholder="Nome"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleUpdateClientName(client.telefone, newNameValue);
                                            setRenamingTelefone(null);
                                          } else if (e.key === 'Escape') {
                                            setRenamingTelefone(null);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateClientName(client.telefone, newNameValue);
                                          setRenamingTelefone(null);
                                        }}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-1 rounded"
                                      >
                                        OK
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRenamingTelefone(null)}
                                        className="bg-slate-300 hover:bg-slate-400 text-slate-700 font-extrabold text-[10px] px-2 py-1 rounded"
                                      >
                                        X
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                                      {client.nome}
                                      {client.nome.startsWith('SEM NOME') && (
                                        <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.2 rounded font-mono">S/N</span>
                                      )}
                                      <button
                                        type="button"
                                        title="Alterar Nome"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenamingTelefone(client.telefone);
                                          setNewNameValue(client.nome.startsWith('SEM NOME') ? '' : client.nome);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatPhoneNumber(client.telefone)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 font-mono text-xs">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-800">{client.totalPedidos} compras</span>
                                  <span className="text-[10px] text-slate-400">{client.totalProdutosComprados} itens no total</span>
                                </div>
                              </td>
                              <td className="py-3.5 pr-1 font-mono text-xs">
                                {editingDateTelefone === client.telefone ? (
                                  <div className="flex items-center gap-1.5 py-1" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="date"
                                      value={newDateValue}
                                      onChange={(e) => setNewDateValue(e.target.value)}
                                      className="bg-white border-2 border-amber-500 text-xs px-2 py-1 rounded font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full max-w-[130px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateClientLastPurchaseDate(client.telefone, newDateValue);
                                          setEditingDateTelefone(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingDateTelefone(null);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateClientLastPurchaseDate(client.telefone, newDateValue);
                                        setEditingDateTelefone(null);
                                      }}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-1 rounded shrink-0"
                                    >
                                      OK
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingDateTelefone(null)}
                                      className="bg-slate-300 hover:bg-slate-400 text-slate-700 font-extrabold text-[10px] px-2 py-1 rounded shrink-0"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : client.ultimaCompra ? (
                                  <div className="flex flex-col group/date">
                                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                      {formatDateBR(client.ultimaCompra)}
                                      <button
                                        type="button"
                                        title="Alterar Data da Última Compra"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingDateTelefone(client.telefone);
                                          setNewDateValue(client.ultimaCompra || CURRENT_DATE_STR);
                                        }}
                                        className="opacity-0 group-hover/date:opacity-100 p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                    </span>
                                    {inDays > 90 ? (
                                      <span className="text-[9px] text-rose-500 font-bold bg-rose-50 border border-rose-100 self-start px-1.5 py-0.2 rounded mt-0.5 uppercase tracking-wide">Inativo +90d ({inDays} dias)</span>
                                    ) : inDays > 60 ? (
                                      <span className="text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-100 self-start px-1.5 py-0.2 rounded mt-0.5 uppercase tracking-wide">Inativo +60d ({inDays} dias)</span>
                                    ) : (
                                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 self-start px-1.5 py-0.2 rounded mt-0.5 uppercase tracking-wide">Ativo ({inDays} dias)</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic flex items-center gap-1 group/date">
                                    Sem registros
                                    <button
                                      type="button"
                                      title="Definir Data da Última Compra"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingDateTelefone(client.telefone);
                                        setNewDateValue(CURRENT_DATE_STR);
                                      }}
                                      className="opacity-0 group-hover/date:opacity-100 p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPrefilledClientInOrder(client);
                                      setIsNewOrderOpen(true);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold font-mono px-2 py-1 rounded-lg transition-opacity flex items-center gap-1"
                                  >
                                    <Plus size={11} /> Pedido
                                  </button>
                                  <div className="text-slate-300 shrink-0 pr-1">
                                    <ChevronRight size={16} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-mono text-xs">
                      Nenhum cliente atende aos filtros ou termos de pesquisa selecionados atualmente.
                    </div>
                  )}
                </div>

                {/* 12-Indexed Pagination Controller */}
                {totalPageCount > 1 && (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-semibold text-slate-500 select-none">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      &lt; Anterior
                    </button>
                    <span>Página {currentPage} de {totalPageCount}</span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPageCount, prev + 1))}
                      disabled={currentPage === totalPageCount}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      Próxima &gt;
                    </button>
                  </div>
                )}
              </div>

              {/* Master-Detail Client Right Panel */}
              <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden border border-slate-800 h-full flex flex-col min-h-[500px]">
                {selectedClient ? (
                  <div className="flex flex-col h-full flex-1 divide-y divide-slate-800">
                    
                    {/* Panel Header */}
                    <div className="p-5 relative bg-gradient-to-b from-slate-900 to-slate-950">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] bg-amber-500 text-slate-950 font-bold font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Ficha Ativa
                        </span>
                        <button
                          onClick={() => {
                            setPrefilledClientInOrder(selectedClient);
                            setIsNewOrderOpen(true);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[10px] font-bold font-mono px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                        >
                          <Plus size={11} /> Registrar Pedido
                        </button>
                      </div>

                      {renamingTelefone === selectedClient.telefone ? (
                        <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="text"
                            value={newNameValue}
                            onChange={(e) => setNewNameValue(e.target.value)}
                            className="bg-slate-800 border-2 border-amber-500 text-xs px-2 py-1.5 rounded font-bold uppercase text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full max-w-[200px]"
                            placeholder="Novo nome"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateClientName(selectedClient.telefone, newNameValue);
                                setRenamingTelefone(null);
                              } else if (e.key === 'Escape') {
                                setRenamingTelefone(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateClientName(selectedClient.telefone, newNameValue);
                              setRenamingTelefone(null);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded transition-all"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingTelefone(null)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-extrabold text-[10px] px-2.5 py-1.5 rounded transition-all"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-md font-bold text-slate-100 tracking-tight leading-none uppercase">
                            {selectedClient.nome}
                          </h3>
                          <button
                            type="button"
                            title="Alterar Nome"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingTelefone(selectedClient.telefone);
                              setNewNameValue(selectedClient.nome.startsWith('SEM NOME') ? '' : selectedClient.nome);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all flex items-center justify-center shrink-0"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 font-mono mt-1.5 flex items-center gap-1.5">
                        <span className="text-slate-500">Tel:</span>
                        {formatPhoneNumber(selectedClient.telefone)}
                      </p>
                      {editingDateTelefone === selectedClient.telefone ? (
                        <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-slate-500 font-mono">Última compra:</span>
                          <input 
                            type="date"
                            value={newDateValue}
                            onChange={(e) => setNewDateValue(e.target.value)}
                            className="bg-slate-800 border-2 border-amber-500 text-xs px-2 py-1 rounded font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full max-w-[140px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateClientLastPurchaseDate(selectedClient.telefone, newDateValue);
                                setEditingDateTelefone(null);
                              } else if (e.key === 'Escape') {
                                setEditingDateTelefone(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateClientLastPurchaseDate(selectedClient.telefone, newDateValue);
                              setEditingDateTelefone(null);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-1 rounded transition-all shrink-0"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDateTelefone(null)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-extrabold text-[10px] px-2 py-1 rounded transition-all shrink-0"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5 group/sidebar-date">
                          <span className="text-slate-500">Última Compra:</span>
                          <span className="text-amber-400 font-bold">
                            {selectedClient.ultimaCompra ? formatDateBR(selectedClient.ultimaCompra) : 'Nenhuma'}
                          </span>
                          <button
                            type="button"
                            title="Alterar Última Compra"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDateTelefone(selectedClient.telefone);
                              setNewDateValue(selectedClient.ultimaCompra || CURRENT_DATE_STR);
                            }}
                            className="opacity-40 group-hover/sidebar-date:opacity-100 p-0.5 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all flex items-center justify-center shrink-0"
                          >
                            <Pencil size={11} />
                          </button>
                        </p>
                      )}
                    </div>

                    {/* Quick Core Metrics Summary */}
                    <div className="p-5 bg-slate-950/40 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase mb-0.5">Pedidos</span>
                        <span className="text-md font-mono font-black text-amber-400 leading-none block">{selectedClient.totalPedidos}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase mb-0.5">Total Itens</span>
                        <span className="text-md font-mono font-black text-amber-400 leading-none block">{selectedClient.totalProdutosComprados}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 select-none">
                        <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase mb-0.5">Dias Inat.</span>
                        <span className="text-md font-mono font-black text-rose-400 leading-none block">
                          {selectedClient.ultimaCompra ? `${getDaysSince(selectedClient.ultimaCompra)}d` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Totals Por Produto Mapping Bars */}
                    <div className="p-5 space-y-3 flex-1 overflow-y-auto">
                      <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Layers size={11} className="text-amber-500" />
                        Total Acumulado Por Produto:
                      </h4>

                      <div className="space-y-2">
                        {PRODUCTS.map((prod) => {
                          const score = selectedClient.totaisPorProduto[prod] || 0;
                          const ratio = selectedClient.totalProdutosComprados > 0 
                            ? (score / selectedClient.totalProdutosComprados) * 100 
                            : 0;
                          return (
                            <div key={prod} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono leading-none">
                                <span className="font-extrabold text-slate-300">{prod}</span>
                                <span className="text-amber-400 font-bold">{score} unid.</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${ratio}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chronological Complete Historical Purchases Order List */}
                    <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[350px]">
                      <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={11} className="text-amber-500" />
                        Histórico de Compras:
                      </h4>

                      {selectedClient.historico.length > 0 ? (
                        <div className="space-y-3">
                          {selectedClient.historico.map((order, idx) => (
                            <div key={order.id} className="relative pl-4 border-l border-slate-800 space-y-1 bg-slate-950/20 p-2.5 rounded-lg border border-slate-800/40">
                              {/* Dot representing timeline index */}
                              <div className="absolute -left-1 top-3.5 w-2 h-2 rounded-full bg-amber-500 shadow-md"></div>
                              
                              <div className="flex items-center justify-between">
                                {editingOrderId === order.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input 
                                      type="date"
                                      value={order.data}
                                      onChange={(e) => {
                                        handleUpdateOrderDate(selectedClient.telefone, order.id, e.target.value);
                                      }}
                                      onBlur={() => {
                                        // Slight delay to allow buttons/clicks to fire
                                        setTimeout(() => setEditingOrderId(null), 180);
                                      }}
                                      autoFocus
                                      className="bg-slate-900 border border-amber-500/70 text-amber-400 font-mono text-[11px] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditingOrderId(null)}
                                      className="p-1 bg-slate-800 text-amber-400 hover:text-white rounded border border-slate-700"
                                      title="Confirmar"
                                    >
                                      <Check size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 group/editbtn">
                                    <span className="text-xs font-mono font-extrabold text-amber-400">
                                      {formatDateBR(order.data)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOrderId(order.id)}
                                      className="opacity-40 hover:opacity-100 text-slate-400 hover:text-amber-400 p-0.5 transition-all"
                                      title="Editar data deste pedido"
                                    >
                                      <Pencil size={10} />
                                    </button>
                                  </div>
                                )}
                                <span className="text-[9px] text-slate-500 font-mono">ID: {order.id.slice(-8)}</span>
                              </div>

                              <ul className="text-[11px] text-slate-300 space-y-0.5 mt-1 list-disc list-inside">
                                {order.itens.map((item, iIdx) => (
                                  <li key={iIdx} className="font-mono">
                                    <span className="font-extrabold text-white">{item.quantidade}x</span> {item.produto}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-500 italic font-mono">
                          Esse cliente não possui nenhuma compra registrada no histórico.
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700/60 animate-bounce">
                      <span className="text-3xl">🧄</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300 font-mono">Nenhum Cliente Selecionado</p>
                      <p className="text-xs text-slate-500 max-w-[250px] mx-auto leading-relaxed mt-1">
                        Selecione um cliente na lista à esquerda para carregar sua ficha de totais e histórico completo acumulado.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: RANKINGS */}
          {activeTab === 'rankings' && (
            <div className="space-y-6">
              
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
                <h3 className="text-md font-bold tracking-tight text-slate-100 flex items-center gap-2 mb-1.5 uppercase font-mono">
                  <BarChart4 size={18} className="text-amber-400" />
                  Ranqueamento de Vendas em Tempo Real (Top 10)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Rankings acumulativos recalculados automaticamente após o registro de qualquer pedido.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {PRODUCTS.map(prod => (
                  <RankingWidget 
                    key={prod}
                    title={`${PRODUCT_EMOJIS[prod] || '📦'} Mais Compraram ${prod}`} 
                    data={getRankByProductType(prod)} 
                    metricExtractor={(c) => c.totaisPorProduto[prod] || 0} 
                  />
                ))}

                {/* RANK: TOTAL PEDIDOS */}
                <RankingWidget 
                  title="🛍️ Clientes com mais Pedidos" 
                  data={getRankMostOrders()} 
                  metricExtractor={(c) => c.totalPedidos} 
                  unit="compras"
                />

                {/* RANK: TOTAL PRODUTOS COMPRADOS */}
                <RankingWidget 
                  title="📊 Clientes que mais compraram no Total" 
                  data={getRankTotalBoughtOverall()} 
                  metricExtractor={(c) => c.totalProdutosComprados} 
                  unit="unid."
                />

              </div>

            </div>
          )}

          {/* TAB 3: RELATORIOS */}
          {activeTab === 'relatorios' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Product breakdown aggregates */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 lg:col-span-2">
                <h3 className="font-extrabold text-md tracking-tight text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Database size={18} className="text-amber-500" />
                  Total Vendido por Produto (Volume Geral)
                </h3>

                <div className="space-y-4 pt-2">
                  {PRODUCTS.map((prod) => {
                    const data = productSalesReport[prod];
                    return (
                      <div key={prod} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between transition-all hover:border-slate-200">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-slate-800 font-mono tracking-wider block">
                            {prod}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            Adquirido por <strong className="text-slate-700">{data.clientesUnicos}</strong> clientes distintos
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-md font-mono font-black text-slate-900 block bg-white border border-slate-200/50 px-3 py-1.5 rounded-lg shadow-sm">
                            {data.unidades} unidades
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sales Period and summary aggregates */}
              <div className="space-y-6">
                
                {/* Sales periods list */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h3 className="font-extrabold text-md tracking-tight text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Calendar size={18} className="text-amber-500" />
                    Total Vendido por Período
                  </h3>

                  {periodSalesReport.length > 0 ? (
                    <div className="space-y-2">
                      {periodSalesReport.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between font-mono text-xs border-b border-slate-50 py-2.5">
                          <span className="font-bold text-slate-600">{item.period}</span>
                          <span className="font-extrabold text-slate-900 bg-amber-50 px-2 py-0.8 rounded text-amber-700">{item.total} unidades</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 font-mono italic">
                      Nenhum pedido registrado para geração do relatório por períodos.
                    </div>
                  )}
                </div>

                {/* Quick Status overview segments */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h3 className="font-extrabold text-md tracking-tight text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Layers size={18} className="text-amber-500" />
                    Segmentação Geral
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Clientes Ativos (&lt;= 60 dias)</span>
                      <span className="font-extrabold text-emerald-600 font-mono bg-emerald-55/40 px-2 py-0.5 rounded">{activeCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Clientes Inativos (&gt; 30 dias)</span>
                      <span className="font-extrabold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded">{inactive30Count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Clientes Inativos (&gt; 60 dias)</span>
                      <span className="font-extrabold text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded">{inactive60Count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Clientes Inativos (&gt; 90 dias)</span>
                      <span className="font-extrabold text-rose-600 font-mono bg-rose-50 px-2 py-0.5 rounded">{inactive90Count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Compraram Apenas Uma Vez</span>
                      <span className="font-extrabold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {clients.filter(c => c.totalPedidos === 1).length}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* 5. Modals Controls */}
      <NewOrderModal 
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        clients={clients}
        initialSelectedClient={prefilledClientInOrder}
        onSaveOrder={handleSaveOrder}
        onUpdateClientName={handleUpdateClientName}
      />

      <NewClientModal 
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        clients={clients}
        onSaveClient={handleSaveClient}
      />

      {/* Dynamic Toast Feedback Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in font-mono max-w-sm">
          <div className="bg-amber-500 rounded-lg p-1.5 text-slate-950 shrink-0">
            <Check size={16} />
          </div>
          <div>
            <span className="text-xs font-black block text-slate-100">Atualização do Sistema</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs font-mono text-slate-400 select-none">
        <p>ALHO E SÓ CRM © 2026 • Estado Operacional Estável • Banco de Dados Local Ativo</p>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------------------
// Custom Ranking Widget Subcomponent
// -------------------------------------------------------------------------
interface RankingWidgetProps {
  title: string;
  data: Client[];
  metricExtractor: (c: Client) => number;
  unit?: string;
  key?: React.Key;
}

function RankingWidget({ title, data, metricExtractor, unit = "unid." }: RankingWidgetProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col space-y-3.5 transition-all hover:border-slate-200">
      <h4 className="font-extrabold text-xs font-mono tracking-wider uppercase text-slate-800 border-b border-slate-50 pb-2">
        {title}
      </h4>

      {data.length > 0 ? (
        <div className="space-y-2 flex-1">
          {data.map((client, idx) => {
            const score = metricExtractor(client);
            return (
              <div key={client.telefone} className="flex items-center justify-between hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <div className="flex items-center gap-2 my-0.5">
                  {/* Position Badge */}
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                    idx === 0 ? 'bg-amber-100 border border-amber-300 text-amber-700' :
                    idx === 1 ? 'bg-slate-100 border border-slate-300 text-slate-500' :
                    idx === 2 ? 'bg-orange-50 border border-orange-200 text-orange-600' :
                    'bg-slate-50 border border-slate-100 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight line-clamp-1 max-w-[170px]">
                      {client.nome}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono select-none">{formatPhoneNumber(client.telefone)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black font-mono text-slate-900 block leading-none">
                    {score}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 block mt-0.5 select-none">{unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-[10px] font-mono italic flex items-center justify-center flex-1">
          Nenhum registro para este ranking.
        </div>
      )}
    </div>
  );
}
