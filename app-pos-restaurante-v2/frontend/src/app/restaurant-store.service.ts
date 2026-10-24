import { Injectable, computed, inject, signal } from "@angular/core";
import { DemoStore } from "./demo-store.service";
import { DemoState, OrderItem, Payment, Reservation } from "./models";
export type Role = "ADMIN" | "MESERO" | "COCINA" | "CAJERO";
export interface Staff {
  username: string;
  name: string;
  role: Role;
}
const EMPTY: DemoState = {
  tables: [],
  products: [],
  orders: [],
  reservations: [],
  payments: [],
  nextId: 0,
};
@Injectable({ providedIn: "root" })
export class RestaurantStore {
  private readonly demo = inject(DemoStore);
  readonly mode = signal<"demo" | "api">("demo");
  readonly user = signal<Staff | null>(null);
  readonly error = signal("");
  readonly updatedAt = signal<Date | null>(null);
  private readonly remote = signal<DemoState>(EMPTY);
  readonly state = computed(() =>
    this.mode() === "demo" ? this.demo.state() : this.remote(),
  );
  private token = "";
  private base = "/api";
  private refreshing?: Promise<boolean>;
  private polling = false;
  private readonly paymentKeys = new Map<
    number,
    { key: string; method: string }
  >();
  async initialize(): Promise<void> {
    try {
      const response = await fetch("assets/runtime-config.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No se pudo cargar la configuración.");
      const config = (await response.json()) as {
        mode: string;
        apiUrl: string;
      };
      if (!["demo", "api"].includes(config.mode) || !config.apiUrl)
        throw new Error("Configuración inválida.");
      this.mode.set(config.mode as "demo" | "api");
      this.base = config.apiUrl.replace(/\/$/, "");
      if (this.mode() === "api" && (await this.refreshSession()))
        await this.reload();
      if (this.mode() === "demo") {
        const role = sessionStorage.getItem("nativa-role") as Role;
        if (["ADMIN", "MESERO", "COCINA", "CAJERO"].includes(role))
          this.user.set({ username: "demo", name: "Equipo Nativa", role });
      }
    } catch (e) {
      this.mode.set("api");
      this.error.set(
        e instanceof Error ? e.message : "No se pudo iniciar la aplicación.",
      );
    }
    window.setInterval(() => {
      if (
        this.mode() === "api" &&
        this.user() &&
        !document.hidden &&
        !this.polling
      ) {
        this.polling = true;
        void this.reload()
          .catch(() => {})
          .finally(() => (this.polling = false));
      }
    }, 10000);
  }
  async login(username: string, password: string, role: Role): Promise<void> {
    if (this.mode() === "demo") {
      this.user.set({ username: "demo", name: "Equipo Nativa", role });
      sessionStorage.setItem("nativa-role", role);
      return;
    }
    const result = await this.request<{ accessToken: string; user: Staff }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      false,
    );
    this.token = result.accessToken;
    this.user.set(result.user);
    await this.reload();
  }
  async logout(): Promise<void> {
    if (this.mode() === "api")
      await this.request("/auth/logout", { method: "POST" }, false);
    this.token = "";
    this.user.set(null);
    this.remote.set(EMPTY);
    sessionStorage.removeItem("nativa-role");
    this.paymentKeys.clear();
  }
  async reload(): Promise<void> {
    if (this.mode() === "demo") return;
    try {
      this.remote.set(await this.request<DemoState>("/state"));
      this.error.set("");
      this.updatedAt.set(new Date());
    } catch (e) {
      this.error.set(
        e instanceof Error ? e.message : "No hay conexión con el servicio.",
      );
      throw e;
    }
  }
  private async refreshSession(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const r = await fetch(this.base + "/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "Nativa" },
        });
        if (!r.ok) {
          if (r.status === 401) {
            this.token = "";
            this.user.set(null);
            this.remote.set(EMPTY);
            return false;
          }
          throw new Error("No se pudo recuperar la sesión.");
        }
        const d = (await r.json()) as { accessToken: string; user: Staff };
        this.token = d.accessToken;
        this.user.set(d.user);
        return true;
      } finally {
        this.refreshing = undefined;
      }
    })();
    return this.refreshing;
  }
  private async request<T = unknown>(
    path: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const response = await fetch(this.base + path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "Nativa",
        ...(this.token ? { Authorization: "Bearer " + this.token } : {}),
        ...init.headers,
      },
    });
    if (response.status === 401 && retry && (await this.refreshSession()))
      return this.request<T>(path, init, false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(
        data.message || `El servicio respondió ${response.status}.`,
      );
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
  private async mutate<T>(
    path: string,
    body: unknown,
    method = "POST",
    headers: Record<string, string> = {},
  ): Promise<T> {
    const result = await this.request<T>(path, {
      method,
      body: JSON.stringify(body),
      headers,
    });
    // A successful mutation remains successful even if its following read fails.
    await this.reload().catch(() => {});
    return result;
  }
  async createReservation(
    input: Omit<Reservation, "id" | "status">,
  ): Promise<void> {
    if (this.mode() === "demo") {
      const r = this.demo.createReservation(input);
      if (!r.ok) throw new Error(r.message);
      return;
    }
    await this.mutate("/reservations", input);
  }
  async setReservationStatus(
    id: number,
    status: Reservation["status"],
  ): Promise<void> {
    if (this.mode() === "demo")
      return this.demo.setReservationStatus(id, status);
    await this.mutate(
      `/reservations/${id}/status?status=${status}`,
      {},
      "PATCH",
    );
  }
  async seatReservation(id: number): Promise<number> {
    if (this.mode() === "demo") {
      const table = this.demo.seatReservation(id);
      if (!table) throw new Error("No hay mesa disponible para esta reserva.");
      return table;
    }
    return (await this.mutate<{ id: number }>(`/reservations/${id}/seat`, {}))
      .id;
  }
  async openTable(id: number, guests: number): Promise<void> {
    if (this.mode() === "demo") return this.demo.openTable(id, guests);
    await this.mutate(`/tables/${id}/open`, { guests });
  }
  async createOrder(tableId: number, items: OrderItem[]): Promise<number> {
    if (this.mode() === "demo") return this.demo.createOrder(tableId, items);
    return (
      await this.mutate<{ id: number }>("/orders", {
        tableId,
        waiter: this.user()?.name,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      })
    ).id;
  }
  async advanceOrder(id: number): Promise<void> {
    if (this.mode() === "demo") return this.demo.advanceOrder(id);
    await this.mutate(`/orders/${id}/advance`, {});
  }
  async payTable(id: number, method: Payment["method"]): Promise<number> {
    if (this.mode() === "demo") return this.demo.payTable(id, method);
    let attempt = this.paymentKeys.get(id);
    if (attempt && attempt.method !== method)
      throw new Error(
        "Hay un cobro pendiente de confirmar con otro medio. Reintenta ese mismo medio y actualiza el estado.",
      );
    if (!attempt) {
      attempt = { key: crypto.randomUUID(), method };
      this.paymentKeys.set(id, attempt);
    }
    const result = await this.mutate<{ amount: number }>(
      `/tables/${id}/pay`,
      { method },
      "POST",
      { "Idempotency-Key": attempt.key },
    );
    this.paymentKeys.delete(id);
    return result.amount;
  }
  tableTotal(id: number): number {
    return this.state()
      .orders.filter((o) => o.tableId === id && !o.paid)
      .reduce(
        (s, o) => s + o.items.reduce((t, i) => t + i.price * i.quantity, 0),
        0,
      );
  }
  reset(): void {
    if (this.mode() !== "demo")
      throw new Error("El reinicio solo está disponible en la simulación.");
    this.demo.reset();
  }
}
