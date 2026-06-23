/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductType = 
  | '500G PURO' 
  | '250G PURO' 
  | 'ALHO TEMPERADO' 
  | 'TEMPERO COMPLETO' 
  | 'TEMPERO DE BACON'
  | 'CHIMICHURRI'
  | 'ANA MARIA'
  | 'PAPRICA DEFUMADA'
  | 'PEGA MARIDO'
  | 'TEMPERO PARA FEIJÃO'
  | 'SAL DO HIMALAIA';

export const PRODUCTS: ProductType[] = [
  '500G PURO',
  '250G PURO',
  'ALHO TEMPERADO',
  'TEMPERO COMPLETO',
  'TEMPERO DE BACON',
  'CHIMICHURRI',
  'ANA MARIA',
  'PAPRICA DEFUMADA',
  'PEGA MARIDO',
  'TEMPERO PARA FEIJÃO',
  'SAL DO HIMALAIA'
];

export interface OrderItem {
  produto: ProductType;
  quantidade: number;
}

export interface PurchaseOrder {
  id: string;
  data: string; // Formato YYYY-MM-DD
  itens: OrderItem[];
}

export interface Client {
  telefone: string;
  nome: string; // Se do excel estiver "SEM NOME", usaremos "SEM NOME" ou o que vier de lá.
  historico: PurchaseOrder[];
  ultimaCompra: string | null; // YYYY-MM-DD
  totaisPorProduto: Record<ProductType, number>;
  totalPedidos: number; // Quantidade de compras registradas
  totalProdutosComprados: number; // Soma de todas as quantidades de todos os itens comprados
}
