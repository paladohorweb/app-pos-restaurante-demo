import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { DemoStore } from './demo-store.service';
import { AreaCountPipe, AreaTablesPipe, FilterTodayPipe, GuestSumPipe, OrderStatusPipe, StatusCountPipe, UnpaidTotalPipe } from './demo-pipes';
import { Order, OrderItem, Page, Payment, Product, Reservation, RestaurantTable } from './models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterTodayPipe, StatusCountPipe, GuestSumPipe, AreaCountPipe, AreaTablesPipe, OrderStatusPipe, UnpaidTotalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly store = inject(DemoStore);
  readonly state = this.store.state;
  readonly today = new Date().toISOString().slice(0, 10);
  loggedIn = signal(sessionStorage.getItem('nativa-session') === 'true');
  page = signal<Page>('inicio');
  menuOpen = signal(false);
  reservationModal = signal(false);
  selectedTableId = signal<number | null>(2);
  selectedCategory = signal('Todos');
  reservationFilter = signal('ACTIVAS');
  cart = signal<OrderItem[]>([]);
  reservationDraft = this.emptyReservation();

  readonly categories = computed(() => ['Todos', ...new Set(this.state().products.map(p => p.category))]);
  readonly filteredProducts = computed(() => this.state().products.filter(p =>
    p.available && (this.selectedCategory() === 'Todos' || p.category === this.selectedCategory())));
  readonly activeOrders = computed(() => this.state().orders.filter(o => !o.paid));
  readonly filteredReservations = computed(() => this.state().reservations.filter(r => {
    const filter = this.reservationFilter();
    if (filter === 'TODAS') return true;
    if (filter === 'HOY') return r.date === this.today;
    return !['CANCELADA', 'NO_ASISTIO'].includes(r.status);
  }));
  readonly salesToday = computed(() => this.state().payments.reduce((s, p) => s + p.amount, 0) + 872400);

  login(): void { sessionStorage.setItem('nativa-session', 'true'); this.loggedIn.set(true); }
  logout(): void { sessionStorage.removeItem('nativa-session'); this.loggedIn.set(false); }
  go(page: Page): void { this.page.set(page); this.menuOpen.set(false); }

  pageTitle(): string {
    return ({inicio: 'Resumen de operación', reservas: 'Reservas', salon: 'Mapa de mesas', pos: 'Tomar pedido', cocina: 'Monitor de cocina', caja: 'Caja y cobros'})[this.page()];
  }

  nav(): {page: Page; icon: string; label: string}[] {
    return [
      {page: 'inicio', icon: 'bi-grid-1x2', label: 'Inicio'},
      {page: 'reservas', icon: 'bi-calendar2-check', label: 'Reservas'},
      {page: 'salon', icon: 'bi-layout-text-window', label: 'Mesas'},
      {page: 'pos', icon: 'bi-receipt-cutoff', label: 'Pedidos'},
      {page: 'cocina', icon: 'bi-fire', label: 'Cocina'},
      {page: 'caja', icon: 'bi-credit-card-2-front', label: 'Caja'}
    ];
  }

  openReservation(): void { this.reservationDraft = this.emptyReservation(); this.reservationModal.set(true); }
  saveReservation(): void {
    const d = this.reservationDraft;
    if (!d.customerName.trim() || !d.phone.trim() || !d.date || !d.time || d.guests < 1) {
      void Swal.fire({icon: 'warning', title: 'Completa los datos', text: 'Nombre, teléfono, fecha, hora y número de personas son obligatorios.', confirmButtonColor: '#14372b'});
      return;
    }
    const result = this.store.createReservation({...d});
    if (!result.ok) { void Swal.fire({icon: 'error', title: 'Horario no disponible', text: result.message, confirmButtonColor: '#14372b'}); return; }
    this.reservationModal.set(false);
    void Swal.fire({icon: 'success', title: 'Reserva registrada', text: 'Quedó guardada en la agenda del restaurante.', timer: 1800, showConfirmButton: false});
  }

  confirmReservation(r: Reservation): void { this.store.setReservationStatus(r.id, 'CONFIRMADA'); }
  cancelReservation(r: Reservation): void {
    void Swal.fire({title: '¿Cancelar reserva?', text: `${r.customerName} · ${r.date} ${r.time}`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, cancelar', cancelButtonText: 'Volver', confirmButtonColor: '#b04b3c'}).then(result => {
      if (result.isConfirmed) this.store.setReservationStatus(r.id, 'CANCELADA');
    });
  }
  seatReservation(r: Reservation): void {
    const tableId = this.store.seatReservation(r.id);
    if (!tableId) { void Swal.fire({icon: 'error', title: 'No hay mesa disponible', text: 'Revisa la capacidad y el estado de las mesas.', confirmButtonColor: '#14372b'}); return; }
    this.selectedTableId.set(tableId); this.go('pos');
    void Swal.fire({icon: 'success', title: `Cliente ubicado en ${this.table(tableId)?.name}`, text: 'Ya puedes registrar y enviar su pedido.', timer: 1800, showConfirmButton: false});
  }

  selectTable(table: RestaurantTable): void {
    this.selectedTableId.set(table.id);
    if (table.status === 'DISPONIBLE') {
      void Swal.fire({title: `Abrir ${table.name}`, text: '¿Cuántos comensales llegaron?', input: 'number', inputValue: 2, inputAttributes: {min: '1', max: String(table.capacity)}, showCancelButton: true, confirmButtonText: 'Abrir mesa', cancelButtonText: 'Cancelar', confirmButtonColor: '#14372b'}).then(result => {
        if (result.isConfirmed) { this.store.openTable(table.id, Number(result.value) || 1); this.go('pos'); }
      });
    } else if (table.status === 'POR_COBRAR') this.go('caja');
    else this.go('pos');
  }

  addProduct(product: Product): void {
    const items = structuredClone(this.cart());
    const item = items.find(i => i.productId === product.id);
    if (item) item.quantity++; else items.push({productId: product.id, name: product.name, price: product.price, quantity: 1, notes: ''});
    this.cart.set(items);
  }
  changeQty(productId: number, delta: number): void {
    const items = structuredClone(this.cart());
    const item = items.find(i => i.productId === productId);
    if (!item) return;
    item.quantity += delta;
    this.cart.set(items.filter(i => i.quantity > 0));
  }
  cartTotal(): number { return this.cart().reduce((s, i) => s + i.price * i.quantity, 0); }
  sendOrder(): void {
    const tableId = this.selectedTableId();
    if (!tableId || !this.cart().length) { void Swal.fire({icon: 'warning', title: 'Pedido incompleto', text: 'Selecciona una mesa y agrega al menos un producto.', confirmButtonColor: '#14372b'}); return; }
    const id = this.store.createOrder(tableId, this.cart());
    this.cart.set([]);
    void Swal.fire({icon: 'success', title: `Comanda #${id} enviada`, text: `${this.table(tableId)?.name} ya aparece en el monitor de cocina.`, confirmButtonText: 'Ver cocina', showCancelButton: true, cancelButtonText: 'Seguir vendiendo', confirmButtonColor: '#14372b'}).then(r => { if (r.isConfirmed) this.go('cocina'); });
  }

  advance(order: Order): void { this.store.advanceOrder(order.id); }
  actionLabel(order: Order): string { return ({NUEVA: 'Comenzar', PREPARANDO: 'Marcar lista', LISTA: 'Entregar', SERVIDA: 'Servida'})[order.status]; }
  actionIcon(order: Order): string { return ({NUEVA: 'bi-play-fill', PREPARANDO: 'bi-check2', LISTA: 'bi-bell', SERVIDA: 'bi-check2-all'})[order.status]; }

  pay(tableId: number): void {
    const total = this.store.tableTotal(tableId);
    if (!total) return;
    void Swal.fire({title: `Cobrar ${this.table(tableId)?.name}`, html: `<div class="swal-total">${this.money(total)}</div><p>Selecciona el medio de pago</p>`, input: 'select', inputOptions: {EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata'}, inputValue: 'TARJETA', showCancelButton: true, confirmButtonText: 'Registrar pago', cancelButtonText: 'Cancelar', confirmButtonColor: '#14372b'}).then(result => {
      if (result.isConfirmed) {
        const amount = this.store.payTable(tableId, result.value as Payment['method']);
        void Swal.fire({icon: 'success', title: 'Pago aprobado', text: `${this.money(amount)} · La mesa quedó disponible.`, timer: 2200, showConfirmButton: false});
      }
    });
  }

  async resetDemo(): Promise<void> {
    const result = await Swal.fire({title: 'Reiniciar la demo', text: 'Volverán las reservas, mesas y comandas de ejemplo.', icon: 'question', showCancelButton: true, confirmButtonText: 'Reiniciar', cancelButtonText: 'Cancelar', confirmButtonColor: '#14372b'});
    if (result.isConfirmed) { this.store.reset(); this.cart.set([]); this.selectedTableId.set(2); this.go('inicio'); }
  }

  table(id: number): RestaurantTable | undefined { return this.state().tables.find(t => t.id === id); }
  tableName(id: number): string { return this.table(id)?.name ?? `Mesa ${id}`; }
  tableOrders(id: number): Order[] { return this.state().orders.filter(o => o.tableId === id && !o.paid); }
  orderTotal(order: Order): number { return order.items.reduce((s, i) => s + i.price * i.quantity, 0); }
  elapsed(iso?: string): string { if (!iso) return ''; const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return `${minutes} min`; }
  money(value: number): string { return new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP', maximumFractionDigits: 0}).format(value); }
  statusText(status: string): string { return status.replaceAll('_', ' ').toLowerCase().replace(/^./, s => s.toUpperCase()); }
  initials(name: string): string { return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase(); }

  private emptyReservation(): Omit<Reservation, 'id' | 'status'> {
    return {customerName: '', phone: '', date: this.today, time: '19:00', guests: 2, area: 'Salón', tableId: null, occasion: '', notes: ''};
  }
}
