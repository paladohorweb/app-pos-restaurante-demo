export type Page = 'inicio' | 'reservas' | 'salon' | 'pos' | 'cocina' | 'caja';
export type TableStatus = 'DISPONIBLE' | 'RESERVADA' | 'OCUPADA' | 'POR_COBRAR';
export type ReservationStatus = 'PENDIENTE' | 'CONFIRMADA' | 'EN_MESA' | 'CANCELADA' | 'NO_ASISTIO';
export type KitchenStatus = 'NUEVA' | 'PREPARANDO' | 'LISTA' | 'SERVIDA';

export interface RestaurantTable {
  id: number;
  name: string;
  area: 'Salón' | 'Terraza' | 'VIP';
  capacity: number;
  status: TableStatus;
  guests?: number;
  openedAt?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface Order {
  id: number;
  tableId: number;
  waiter: string;
  createdAt: string;
  status: KitchenStatus;
  items: OrderItem[];
  paid: boolean;
}

export interface Reservation {
  id: number;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: 'Salón' | 'Terraza' | 'VIP';
  tableId: number | null;
  occasion: string;
  notes: string;
  status: ReservationStatus;
}

export interface Payment {
  id: number;
  tableId: number;
  createdAt: string;
  amount: number;
  method: 'EFECTIVO' | 'TARJETA' | 'NEQUI' | 'DAVIPLATA';
}

export interface DemoState {
  tables: RestaurantTable[];
  products: Product[];
  orders: Order[];
  reservations: Reservation[];
  payments: Payment[];
  nextId: number;
}
