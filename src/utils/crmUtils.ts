/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, ProductType, PurchaseOrder, OrderItem, PRODUCTS } from '../types';

// O sistema considera como dia atual: 2026-06-11
export const CURRENT_DATE_STR = '2026-06-11';

/**
 * Retorna a diferença de dias entre o dia atual (2026-06-11) e a data especificada
 */
export function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity; // Se nunca comprou, retorna infinito
  
  const today = new Date(CURRENT_DATE_STR);
  const purchaseDate = new Date(dateStr);
  
  if (isNaN(purchaseDate.getTime())) return Infinity;
  
  const diffTime = today.getTime() - purchaseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

/**
 * Formata um número de telefone no padrão amigável (ex: 55 (11) 99452-2320)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    // 55 11 99999 9999
    return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
  } else if (cleaned.length === 12) {
    // 55 11 9999 9999
    return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
  } else if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Formata uma string de data YYYY-MM-DD para o padrão brasileiro DD/MM/YYYY
 */
export function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return 'Nunca comprou';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Recalcula de forma robusta e cumulativa todos os totais do cliente
 */
export function recalculateClientMetrics(historico: PurchaseOrder[]): {
  ultimaCompra: string | null;
  totaisPorProduto: Record<ProductType, number>;
  totalPedidos: number;
  totalProdutosComprados: number;
} {
  const totaisPorProduto: Record<ProductType, number> = {
    '500G PURO': 0,
    '250G PURO': 0,
    'ALHO TEMPERADO': 0,
    'TEMPERO COMPLETO': 0,
    'TEMPERO DE BACON': 0
  };

  let totalProdutosComprados = 0;

  // Percorre todo o histórico
  historico.forEach(order => {
    order.itens.forEach(item => {
      if (item.produto in totaisPorProduto) {
        totaisPorProduto[item.produto] += item.quantidade;
        totalProdutosComprados += item.quantidade;
      }
    });
  });

  // Ordena as ordens por data para pegar a mais recente
  const sortedOrders = [...historico].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const ultimaCompra = sortedOrders.length > 0 ? sortedOrders[0].data : null;

  return {
    ultimaCompra,
    totaisPorProduto,
    totalPedidos: historico.length,
    totalProdutosComprados
  };
}

/**
 * Encontra um cliente por telefone ou por parte do nome (case-insensitive)
 */
export function searchClients(clients: Client[], query: string): Client[] {
  const cleanedQuery = query.toLowerCase().trim();
  if (!cleanedQuery) return clients;

  return clients.filter(c => 
    c.nome.toLowerCase().includes(cleanedQuery) || 
    c.telefone.includes(cleanedQuery)
  );
}

/**
 * Gera relatório de vendas agrupado por produto
 */
export function getProductSalesReport(clients: Client[]): Record<ProductType, { unidades: number, clientesUnicos: number }> {
  const report: Record<ProductType, { unidades: number, clientesUnicos: number }> = {
    '500G PURO': { unidades: 0, clientesUnicos: 0 },
    '250G PURO': { unidades: 0, clientesUnicos: 0 },
    'ALHO TEMPERADO': { unidades: 0, clientesUnicos: 0 },
    'TEMPERO COMPLETO': { unidades: 0, clientesUnicos: 0 },
    'TEMPERO DE BACON': { unidades: 0, clientesUnicos: 0 }
  };

  clients.forEach(c => {
    PRODUCTS.forEach(p => {
      const gtd = c.totaisPorProduto[p] || 0;
      if (gtd > 0) {
        report[p].unidades += gtd;
        report[p].clientesUnicos += 1;
      }
    });
  });

  return report;
}

/**
 * Gera relatório de vendas agrupado por mês/ano (período)
 */
export function getPeriodSalesReport(clients: Client[]): { period: string, total: number }[] {
  const map: Record<string, number> = {};

  clients.forEach(c => {
    c.historico.forEach(order => {
      // Extrai YYYY-MM
      const dateParts = order.data.split('-');
      if (dateParts.length >= 2) {
        const key = `${dateParts[0]}-${dateParts[1]}`; // Ex: 2026-03
        const sumItems = order.itens.reduce((sum, item) => sum + item.quantidade, 0);
        map[key] = (map[key] || 0) + sumItems;
      }
    });
  });

  // Transforma em array e ordena cronologicamente
  return Object.entries(map)
    .map(([period, total]) => {
      const [year, month] = period.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const text = `${monthNames[parseInt(month, 10) - 1]} / ${year}`;
      return { period: text, total, sortKey: period };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
