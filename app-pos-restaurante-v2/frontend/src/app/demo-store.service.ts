import { Injectable, signal } from '@angular/core';
import { DemoState, KitchenStatus, Order, OrderItem, Payment, Reservation, RestaurantTable } from './models';

const KEY = 'nativa-pos-demo-v2';

@Injectable({providedIn: 'root'})
export class DemoStore {
  readonly state = signal<DemoState>(this.load());

  reset(): void {
    localStorage.removeItem(KEY);
    this.state.set(this.seed());
    this.save();
  }

  createReservation(input: Omit<Reservation, 'id' | 'status'>): {ok: boolean; message: string} {
    const state = this.copy();
    const duplicate = state.reservations.some(r =>
      r.date === input.date && r.time === input.time && r.tableId === input.tableId &&
      !['CANCELADA', 'NO_ASISTIO'].includes(r.status));
    if (duplicate) return {ok: false, message: 'La mesa ya está reservada en ese horario.'};
    state.reservations.unshift({...input, id: state.nextId++, status: 'PENDIENTE'});
    this.commit(state);
    return {ok: true, message: 'Reserva creada correctamente'};
  }

  setReservationStatus(id: number, status: Reservation['status']): void {
    const state = this.copy();
    const reservation = state.reservations.find(r => r.id === id);
    if (!reservation) return;
    reservation.status = status;
    if (reservation.tableId) {
      const table = state.tables.find(t => t.id === reservation.tableId);
      if (table && status === 'CONFIRMADA') table.status = 'RESERVADA';
      if (table && ['CANCELADA', 'NO_ASISTIO'].includes(status) && table.status === 'RESERVADA') table.status = 'DISPONIBLE';
    }
    this.commit(state);
  }

  seatReservation(id: number): number | null {
    const state = this.copy();
    const reservation = state.reservations.find(r => r.id === id);
    if (!reservation) return null;
    let table = reservation.tableId ? state.tables.find(t => t.id === reservation.tableId) : undefined;
    if (!table) table = state.tables.find(t => t.area === reservation.area && t.capacity >= reservation.guests && t.status === 'DISPONIBLE');
    if (!table || !['DISPONIBLE', 'RESERVADA'].includes(table.status)) return null;
    reservation.tableId = table.id;
    reservation.status = 'EN_MESA';
    table.status = 'OCUPADA';
    table.guests = reservation.guests;
    table.openedAt = new Date().toISOString();
    this.commit(state);
    return table.id;
  }

  openTable(tableId: number, guests: number): void {
    const state = this.copy();
    const table = state.tables.find(t => t.id === tableId);
    if (!table) return;
    table.status = 'OCUPADA'; table.guests = guests; table.openedAt = new Date().toISOString();
    this.commit(state);
  }

  createOrder(tableId: number, items: OrderItem[]): number {
    const state = this.copy();
    const order: Order = {id: state.nextId++, tableId, waiter: 'Laura Gómez', createdAt: new Date().toISOString(), status: 'NUEVA', items, paid: false};
    state.orders.unshift(order);
    const table = state.tables.find(t => t.id === tableId);
    if (table) table.status = 'OCUPADA';
    this.commit(state);
    return order.id;
  }

  advanceOrder(id: number): void {
    const state = this.copy();
    const order = state.orders.find(o => o.id === id);
    if (!order) return;
    const next: Record<KitchenStatus, KitchenStatus> = {NUEVA: 'PREPARANDO', PREPARANDO: 'LISTA', LISTA: 'SERVIDA', SERVIDA: 'SERVIDA'};
    order.status = next[order.status];
    if (order.status === 'SERVIDA') {
      const open = state.orders.filter(o => o.tableId === order.tableId && !o.paid);
      if (open.every(o => o.status === 'SERVIDA')) {
        const table = state.tables.find(t => t.id === order.tableId);
        if (table) table.status = 'POR_COBRAR';
      }
    }
    this.commit(state);
  }

  payTable(tableId: number, method: Payment['method']): number {
    const state = this.copy();
    const orders = state.orders.filter(o => o.tableId === tableId && !o.paid);
    const amount = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0);
    orders.forEach(o => o.paid = true);
    state.payments.unshift({id: state.nextId++, tableId, method, amount, createdAt: new Date().toISOString()});
    const table = state.tables.find(t => t.id === tableId);
    if (table) { table.status = 'DISPONIBLE'; delete table.guests; delete table.openedAt; }
    this.commit(state);
    return amount;
  }

  tableTotal(tableId: number): number {
    return this.state().orders.filter(o => o.tableId === tableId && !o.paid)
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0);
  }

  private commit(state: DemoState): void { this.state.set(state); this.save(); }
  private copy(): DemoState { return structuredClone(this.state()); }
  private save(): void { localStorage.setItem(KEY, JSON.stringify(this.state())); }
  private load(): DemoState {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as DemoState : this.seed(); }
    catch { return this.seed(); }
  }

  private seed(): DemoState {
    const iso = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
    const tables: RestaurantTable[] = [
      {id: 1, name: 'Mesa 01', area: 'Salón', capacity: 2, status: 'DISPONIBLE'},
      {id: 2, name: 'Mesa 02', area: 'Salón', capacity: 4, status: 'OCUPADA', guests: 3, openedAt: new Date(Date.now() - 32 * 60000).toISOString()},
      {id: 3, name: 'Mesa 03', area: 'Salón', capacity: 4, status: 'POR_COBRAR', guests: 4, openedAt: new Date(Date.now() - 75 * 60000).toISOString()},
      {id: 4, name: 'Mesa 04', area: 'Salón', capacity: 6, status: 'DISPONIBLE'},
      {id: 5, name: 'Terraza 01', area: 'Terraza', capacity: 2, status: 'RESERVADA'},
      {id: 6, name: 'Terraza 02', area: 'Terraza', capacity: 4, status: 'DISPONIBLE'},
      {id: 7, name: 'Terraza 03', area: 'Terraza', capacity: 6, status: 'DISPONIBLE'},
      {id: 8, name: 'Privado', area: 'VIP', capacity: 10, status: 'DISPONIBLE'}
    ];
    const products = [
      {id: 1, name: 'Hamburguesa Nativa', category: 'Fuertes', description: 'Carne madurada, queso, cebolla caramelizada y papas rústicas.', price: 38900, image: 'assets/images/burger.webp', available: true},
      {id: 2, name: 'Salmón cítrico', category: 'Fuertes', description: 'Salmón sellado, vegetales de temporada y beurre blanc.', price: 52900, image: 'assets/images/salmon.webp', available: true},
      {id: 3, name: 'Lomo de la casa', category: 'Fuertes', description: 'Medallones de res, puré sedoso y reducción de vino.', price: 58900, image: 'assets/images/lomo.webp', available: true},
      {id: 4, name: 'Burrata de huerta', category: 'Entradas', description: 'Tomates confitados, albahaca, focaccia y aceite de oliva.', price: 29900, image: 'assets/images/salmon.webp', available: true},
      {id: 5, name: 'Croquetas de costilla', category: 'Entradas', description: 'Cremosas, apanado crocante y alioli ahumado.', price: 26900, image: 'assets/images/burger.webp', available: true},
      {id: 6, name: 'Arroz meloso', category: 'Fuertes', description: 'Mariscos, azafrán, bisque y limón.', price: 48900, image: 'assets/images/salmon.webp', available: true},
      {id: 7, name: 'Cheesecake vasco', category: 'Postres', description: 'Queso horneado, maracuyá y frutos rojos.', price: 21900, image: 'assets/images/postre.webp', available: true},
      {id: 8, name: 'Limonada de coco', category: 'Bebidas', description: 'Coco, limón tahití y hielo frappé.', price: 13900, image: 'assets/images/postre.webp', available: true}
    ];
    const orders: Order[] = [
      {id: 101, tableId: 2, waiter: 'Laura Gómez', createdAt: new Date(Date.now() - 20 * 60000).toISOString(), status: 'PREPARANDO', paid: false, items: [{productId: 1, name: 'Hamburguesa Nativa', price: 38900, quantity: 2, notes: 'Una sin cebolla'}]},
      {id: 102, tableId: 3, waiter: 'Carlos Ruiz', createdAt: new Date(Date.now() - 58 * 60000).toISOString(), status: 'SERVIDA', paid: false, items: [{productId: 3, name: 'Lomo de la casa', price: 58900, quantity: 2, notes: 'Término medio'}, {productId: 7, name: 'Cheesecake vasco', price: 21900, quantity: 2, notes: ''}]}
    ];
    const reservations: Reservation[] = [
      {id: 201, customerName: 'Mariana Torres', phone: '300 555 0198', date: iso(0), time: '19:30', guests: 2, area: 'Terraza', tableId: 5, occasion: 'Aniversario', notes: 'Mesa tranquila', status: 'CONFIRMADA'},
      {id: 202, customerName: 'Andrés Mejía', phone: '315 444 8210', date: iso(0), time: '20:00', guests: 6, area: 'Salón', tableId: 4, occasion: 'Cumpleaños', notes: 'Traen torta', status: 'PENDIENTE'},
      {id: 203, customerName: 'Sofía Vargas', phone: '310 722 1105', date: iso(1), time: '13:00', guests: 4, area: 'Salón', tableId: null, occasion: '', notes: '', status: 'CONFIRMADA'}
    ];
    return {tables, products, orders, reservations, payments: [], nextId: 300};
  }
}
