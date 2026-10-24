import { CommonModule } from "@angular/common";
import {
  Component,
  computed,
  inject,
  signal,
  HostListener,
  OnDestroy,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import Swal from "sweetalert2";
import { RestaurantStore, Role } from "./restaurant-store.service";
import { businessDate } from "./business-date";
import {
  AreaCountPipe,
  AreaTablesPipe,
  FilterTodayPipe,
  GuestSumPipe,
  OrderStatusPipe,
  StatusCountPipe,
  UnpaidTotalPipe,
} from "./demo-pipes";
import {
  Order,
  OrderItem,
  Page,
  Payment,
  Product,
  Reservation,
  RestaurantTable,
} from "./models";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FilterTodayPipe,
    StatusCountPipe,
    GuestSumPipe,
    AreaCountPipe,
    AreaTablesPipe,
    OrderStatusPipe,
    UnpaidTotalPipe,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnDestroy {
  readonly store = inject(RestaurantStore);
  readonly state = this.store.state;
  readonly clock = signal(new Date());
  readonly today = computed(() => businessDate(this.clock()));
  readonly loggedIn = computed(() => !!this.store.user());
  readonly role = computed(() => this.store.user()?.role ?? "ADMIN");
  readonly isFinance = computed(() =>
    ["ADMIN", "CAJERO"].includes(this.role()),
  );
  page = signal<Page>("inicio");
  menuOpen = signal(false);
  collapsed = signal(false);
  reservationModal = signal(false);
  busy = signal(false);
  selectedTableId = signal<number | null>(null);
  selectedCategory = signal("Todos");
  productSearch = signal("");
  reservationFilter = signal("ACTIVAS");
  cart = signal<OrderItem[]>([]);
  roleDraft: Role = "ADMIN";
  username = "";
  password = "";
  showPassword = false;
  reservationDraft = this.emptyReservation();
  private timer = window.setInterval(() => this.clock.set(new Date()), 15000);
  readonly categories = computed(() => [
    "Todos",
    ...new Set(this.state().products.map((p) => p.category)),
  ]);
  readonly filteredProducts = computed(() =>
    this.state().products.filter(
      (p) =>
        p.available &&
        (this.selectedCategory() === "Todos" ||
          p.category === this.selectedCategory()) &&
        `${p.name} ${p.category}`
          .toLowerCase()
          .includes(this.productSearch().toLowerCase()),
    ),
  );
  readonly activeOrders = computed(() =>
    this.state().orders.filter((o) => !o.paid),
  );
  readonly filteredReservations = computed(() =>
    this.state().reservations.filter(
      (r) =>
        this.reservationFilter() === "TODAS" ||
        (this.reservationFilter() === "HOY"
          ? r.date === this.today()
          : !["CANCELADA", "NO_ASISTIO", "EN_MESA"].includes(r.status)),
    ),
  );
  readonly nextArrival = computed(
    () => this.arrivals().at(0)?.time ?? "Sin llegadas",
  );
  readonly arrivals = computed(() =>
    this.state()
      .reservations.filter(
        (r) =>
          r.date === this.today() &&
          ["PENDIENTE", "CONFIRMADA"].includes(r.status),
      )
      .sort((a, b) => a.time.localeCompare(b.time)),
  );
  readonly todayPayments = computed(() =>
    this.state().payments.filter(
      (p) => businessDate(p.createdAt) === this.today(),
    ),
  );
  readonly salesToday = computed(() =>
    this.todayPayments().reduce((s, p) => s + p.amount, 0),
  );
  readonly averageTicket = computed(() =>
    this.todayPayments().length
      ? this.salesToday() / this.todayPayments().length
      : 0,
  );
  readonly occupied = computed(
    () =>
      this.state().tables.filter((t) =>
        ["OCUPADA", "POR_COBRAR"].includes(t.status),
      ).length,
  );
  readonly occupancy = computed(() =>
    this.state().tables.length
      ? Math.round((this.occupied() / this.state().tables.length) * 100)
      : 0,
  );
  readonly pendingTotal = computed(() =>
    this.activeOrders().reduce((s, o) => s + this.orderTotal(o), 0),
  );
  readonly billingTables = computed(() =>
    this.state().tables.filter((t) => this.store.tableTotal(t.id) > 0),
  );
  readonly totalSeats = computed(() =>
    this.state().tables.reduce((s, t) => s + t.capacity, 0),
  );
  readonly hourlySales = computed(() =>
    Array.from({ length: 12 }, (_, i) => {
      const hour = i * 2;
      return {
        label: `${String(hour).padStart(2, "0")}h`,
        amount: this.todayPayments()
          .filter((p) => {
            const h = Number(
              new Intl.DateTimeFormat("en-GB", {
                timeZone: "America/Bogota",
                hour: "2-digit",
                hourCycle: "h23",
              }).format(new Date(p.createdAt)),
            );
            return h >= hour && h < hour + 2;
          })
          .reduce((s, p) => s + p.amount, 0),
      };
    }),
  );
  readonly maxHourly = computed(() =>
    Math.max(1, ...this.hourlySales().map((h) => h.amount)),
  );
  readonly paymentMethods = computed(() =>
    ["EFECTIVO", "TARJETA", "NEQUI", "DAVIPLATA"].map((method) => ({
      method,
      amount: this.todayPayments()
        .filter((p) => p.method === method)
        .reduce((s, p) => s + p.amount, 0),
    })),
  );
  readonly topProducts = computed(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; amount: number }
    >();
    this.state()
      .orders.filter(
        (o) => o.paid && businessDate(o.createdAt) === this.today(),
      )
      .forEach((o) =>
        o.items.forEach((i) => {
          const prev = map.get(i.name) ?? {
            name: i.name,
            quantity: 0,
            amount: 0,
          };
          prev.quantity += i.quantity;
          prev.amount += i.price * i.quantity;
          map.set(i.name, prev);
        }),
      );
    return [...map.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  });
  readonly kitchenMinutes = computed(() => {
    const orders = this.activeOrders().filter((o) => o.status !== "SERVIDA");
    return orders.length
      ? Math.round(
          orders.reduce((s, o) => s + this.elapsedMinutes(o.createdAt), 0) /
            orders.length,
        )
      : 0;
  });
  readonly canReserve = computed(() =>
    ["ADMIN", "MESERO"].includes(this.role()),
  );
  constructor() {
    this.page.set(
      this.role() === "COCINA"
        ? "cocina"
        : this.role() === "MESERO"
          ? "salon"
          : this.role() === "CAJERO"
            ? "caja"
            : "inicio",
    );
  }
  ngOnDestroy(): void {
    window.clearInterval(this.timer);
  }
  @HostListener("document:keydown.escape") closeOverlays(): void {
    this.menuOpen.set(false);
    this.reservationModal.set(false);
  }
  toggleMenu(): void {
    if (window.innerWidth <= 850) this.menuOpen.update((v) => !v);
    else this.collapsed.update((v) => !v);
  }
  async run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      return await action();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "No se completó la operación",
        text: e instanceof Error ? e.message : "Intenta nuevamente.",
        confirmButtonColor: "#3768ef",
      });
      return undefined;
    } finally {
      this.busy.set(false);
    }
  }
  async login(): Promise<void> {
    await this.run(async () => {
      await this.store.login(this.username, this.password, this.roleDraft);
      this.password = "";
      this.page.set(
        this.role() === "COCINA"
          ? "cocina"
          : this.role() === "MESERO"
            ? "salon"
            : this.role() === "CAJERO"
              ? "caja"
              : "inicio",
      );
    });
  }
  async logout(): Promise<void> {
    await this.run(async () => {
      await this.store.logout();
      this.cart.set([]);
      this.selectedTableId.set(null);
      this.menuOpen.set(false);
      this.reservationModal.set(false);
    });
  }
  go(page: Page): void {
    if (!this.nav().some((n) => n.page === page)) return;
    this.page.set(page);
    this.menuOpen.set(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  pageTitle(): string {
    return {
      inicio: "Centro de operación",
      reservas: "Agenda de reservas",
      salon: "Mapa de mesas",
      pos: "Punto de venta",
      cocina: "Monitor de cocina",
      caja: "Caja y cobros",
      reportes: "Análisis del servicio",
      configuracion: "Mi espacio de trabajo",
    }[this.page()];
  }
  nav(): { page: Page; icon: string; label: string }[] {
    const all: { page: Page; icon: string; label: string; roles: Role[] }[] = [
      {
        page: "inicio",
        icon: "bi-grid-1x2",
        label: "Vista general",
        roles: ["ADMIN"],
      },
      {
        page: "salon",
        icon: "bi-layout-text-window",
        label: "Mesas y salón",
        roles: ["ADMIN", "MESERO"],
      },
      {
        page: "reservas",
        icon: "bi-calendar2-check",
        label: "Reservas",
        roles: ["ADMIN", "MESERO"],
      },
      {
        page: "pos",
        icon: "bi-receipt-cutoff",
        label: "Punto de venta",
        roles: ["ADMIN", "MESERO"],
      },
      {
        page: "cocina",
        icon: "bi-fire",
        label: "Cocina",
        roles: ["ADMIN", "MESERO", "COCINA"],
      },
      {
        page: "caja",
        icon: "bi-wallet2",
        label: "Caja y cobros",
        roles: ["ADMIN", "CAJERO"],
      },
      {
        page: "reportes",
        icon: "bi-bar-chart-line",
        label: "Reportes",
        roles: ["ADMIN", "CAJERO"],
      },
      {
        page: "configuracion",
        icon: "bi-sliders",
        label: "Mi espacio",
        roles: ["ADMIN", "MESERO", "COCINA", "CAJERO"],
      },
    ];
    return all.filter((n) => n.roles.includes(this.role()));
  }
  openReservation(): void {
    if (!this.canReserve()) return;
    this.reservationDraft = this.emptyReservation();
    this.reservationModal.set(true);
  }
  async saveReservation(): Promise<void> {
    await this.run(async () => {
      const d = this.reservationDraft;
      if (
        !d.customerName.trim() ||
        !d.phone.trim() ||
        !d.date ||
        !d.time ||
        d.guests < 1
      )
        throw new Error("Completa nombre, teléfono, fecha, hora y comensales.");
      await this.store.createReservation({ ...d });
      this.reservationModal.set(false);
      this.toast("Reserva registrada");
    });
  }
  async confirmReservation(r: Reservation): Promise<void> {
    await this.run(() => this.store.setReservationStatus(r.id, "CONFIRMADA"));
  }
  async cancelReservation(r: Reservation): Promise<void> {
    const answer = await Swal.fire({
      title: "¿Cancelar reserva?",
      text: r.customerName,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Cancelar reserva",
      cancelButtonText: "Volver",
    });
    if (answer.isConfirmed)
      await this.run(() => this.store.setReservationStatus(r.id, "CANCELADA"));
  }
  async seatReservation(r: Reservation): Promise<void> {
    await this.run(async () => {
      this.selectedTableId.set(await this.store.seatReservation(r.id));
      this.go("pos");
      this.toast("Cliente ubicado en mesa");
    });
  }
  async selectTable(t: RestaurantTable): Promise<void> {
    if (this.cart().length && this.selectedTableId() !== t.id) {
      await Swal.fire({
        icon: "info",
        title: "Tienes una comanda en curso",
        text: "Envía el pedido antes de cambiar de mesa.",
      });
      return;
    }
    if (t.status === "RESERVADA") {
      this.go("reservas");
      return;
    }
    if (t.status === "DISPONIBLE") {
      const result = await Swal.fire({
        title: `Abrir ${t.name}`,
        input: "number",
        inputValue: 2,
        inputAttributes: { min: "1", max: String(t.capacity) },
        showCancelButton: true,
        confirmButtonText: "Abrir mesa",
        cancelButtonText: "Cancelar",
        inputValidator: (value) =>
          !Number.isInteger(Number(value)) ||
          Number(value) < 1 ||
          Number(value) > t.capacity
            ? `Entre 1 y ${t.capacity} personas`
            : null,
      });
      if (!result.isConfirmed) return;
      const ok = await this.run(async () => {
        await this.store.openTable(t.id, Number(result.value));
        return true;
      });
      if (!ok) return;
    }
    this.selectedTableId.set(t.id);
    this.go(t.status === "POR_COBRAR" && this.isFinance() ? "caja" : "pos");
  }
  changeTable(id: number | null): void {
    if (this.cart().length) {
      void Swal.fire({
        icon: "info",
        title: "Envía la comanda actual antes de cambiar de mesa",
      });
      return;
    }
    this.selectedTableId.set(id === null ? null : Number(id));
  }
  addProduct(p: Product): void {
    const items = structuredClone(this.cart());
    const found = items.find((i) => i.productId === p.id);
    if (found) {
      if (found.quantity >= 99) return;
      found.quantity++;
    } else
      items.push({
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1,
        notes: "",
      });
    this.cart.set(items);
  }
  changeQty(id: number, delta: number): void {
    const items = structuredClone(this.cart());
    const item = items.find((i) => i.productId === id);
    if (!item) return;
    item.quantity = Math.min(99, item.quantity + delta);
    this.cart.set(items.filter((i) => i.quantity > 0));
  }
  cartTotal(): number {
    return this.cart().reduce((s, i) => s + i.price * i.quantity, 0);
  }
  async sendOrder(): Promise<void> {
    await this.run(async () => {
      const id = this.selectedTableId();
      if (!id || !this.cart().length)
        throw new Error("Selecciona una mesa y agrega productos.");
      const number = await this.store.createOrder(id, this.cart());
      this.cart.set([]);
      this.toast(`Comanda #${number} enviada a cocina`);
    });
  }
  async advance(o: Order): Promise<void> {
    await this.run(() => this.store.advanceOrder(o.id));
  }
  actionLabel(o: Order): string {
    return {
      NUEVA: "Comenzar",
      PREPARANDO: "Marcar lista",
      LISTA: "Entregar",
      SERVIDA: "Servida",
    }[o.status];
  }
  actionIcon(o: Order): string {
    return {
      NUEVA: "bi-play-fill",
      PREPARANDO: "bi-check2",
      LISTA: "bi-bell",
      SERVIDA: "bi-check2-all",
    }[o.status];
  }
  async pay(id: number): Promise<void> {
    const total = this.store.tableTotal(id);
    if (!total) return;
    const result = await Swal.fire({
      title: `Cobrar ${this.tableName(id)}`,
      text: `${this.money(total)} · Registro manual del pago recibido`,
      input: "select",
      inputOptions: {
        EFECTIVO: "Efectivo",
        TARJETA: "Tarjeta (datáfono externo)",
        NEQUI: "Nequi",
        DAVIPLATA: "Daviplata",
      },
      showCancelButton: true,
      confirmButtonText: "Confirmar pago recibido",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed)
      await this.run(async () => {
        const amount = await this.store.payTable(
          id,
          result.value as Payment["method"],
        );
        this.toast(`${this.money(amount)} registrados. Mesa disponible.`);
      });
  }
  async resetDemo(): Promise<void> {
    const r = await Swal.fire({
      title: "Reiniciar la simulación",
      text: "Se borrarán los cambios guardados en este navegador.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Reiniciar",
      cancelButtonText: "Cancelar",
    });
    if (r.isConfirmed) {
      this.store.reset();
      this.cart.set([]);
      this.selectedTableId.set(null);
    }
  }
  async refresh(): Promise<void> {
    await this.run(() => this.store.reload());
  }
  notifications(): void {
    void Swal.fire({
      title: "Pendientes del servicio",
      text: `${this.arrivals().length} llegadas hoy, ${this.activeOrders().filter((o) => o.status === "LISTA").length} comandas listas y ${this.state().tables.filter((t) => t.status === "POR_COBRAR").length} mesas por cobrar.`,
      confirmButtonText: "Entendido",
    });
  }
  exportReport(): void {
    if (!this.isFinance()) return;
    const data = [
      ["Fecha", "Medio", "Importe COP"],
      ...this.todayPayments().map((p) => [p.createdAt, p.method, p.amount]),
    ];
    const blob = new Blob(
      ["\uFEFF" + data.map((r) => r.join(";")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nativa-caja-${this.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  table(id: number): RestaurantTable | undefined {
    return this.state().tables.find((t) => t.id === id);
  }
  tableName(id: number): string {
    return this.table(id)?.name ?? `Mesa ${id}`;
  }
  tableOrders(id: number): Order[] {
    return this.state().orders.filter((o) => o.tableId === id && !o.paid);
  }
  orderTotal(o: Order): number {
    return o.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }
  elapsedMinutes(iso?: string): number {
    this.clock();
    return iso
      ? Math.max(
          0,
          Math.floor(
            (this.clock().getTime() - new Date(iso).getTime()) / 60000,
          ),
        )
      : 0;
  }
  elapsed(iso?: string): string {
    return iso ? `${this.elapsedMinutes(iso)} min` : "";
  }
  money(v: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(v);
  }
  statusText(s: string): string {
    return s
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (v) => v.toUpperCase());
  }
  initials(n: string): string {
    return n
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  private toast(title: string): void {
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title,
      timer: 2400,
      showConfirmButton: false,
    });
  }
  private emptyReservation(): Omit<Reservation, "id" | "status"> {
    return {
      customerName: "",
      phone: "",
      date: businessDate(),
      time: "19:00",
      guests: 2,
      area: "Salón",
      tableId: null,
      occasion: "",
      notes: "",
    };
  }
}
