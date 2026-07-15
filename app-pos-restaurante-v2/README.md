# Nativa POS Restaurante · V2

Demo profesional full stack para vender y presentar un sistema de operación gastronómica. Incluye el recorrido real **reserva → llegada → mesa → pedido → cocina → entrega → cobro**.

## Qué incluye

- Frontend Angular 17 Standalone, responsive y listo para Netlify.
- Motor de demo con `localStorage`: la información sobrevive al recargar la página.
- Reservas con fecha, hora, capacidad, área, mesa, ocasión, notas y estados.
- Mapa de mesas: disponible, reservada, ocupada y por cobrar.
- POS con menú visual, cantidades, notas para cocina y total.
- Monitor de cocina: nueva, preparando, lista y servida.
- Caja: consolida todas las comandas abiertas por mesa, registra el medio de pago y libera la mesa.
- Backend Spring Boot 3.5 / Java 17 con API REST, JPA, validaciones, MySQL, H2 y Flyway.
- Docker Compose para levantar frontend, backend y MySQL.
- Imágenes gastronómicas originales incluidas dentro del proyecto.

## Estructura

```text
app-pos-restaurante-v2/
├── frontend/          Angular 17 + demo persistente
├── backend/           Spring Boot + API REST
├── docker-compose.yml Front + API + MySQL
├── netlify.toml       Configuración de despliegue frontend
└── README.md
```

## Ejecutar el frontend

Requisitos: Node 20+ y npm.

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`. En la portada pulsa **Entrar a la demo**. La demo no exige usuario ni contraseña.

Para comprobar el paquete de producción:

```bash
npm run build
```

El resultado queda en `frontend/dist/nativa-pos/browser`.

## Subir a Netlify

### Opción recomendada: repositorio Git

1. Sube toda la carpeta `app-pos-restaurante-v2` a GitHub.
2. En Netlify selecciona **Add new site → Import an existing project**.
3. Elige el repositorio. Netlify leerá automáticamente `netlify.toml`.
4. Confirma:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist/nativa-pos/browser` (la interfaz puede mostrarlo relativo al repositorio).
5. Pulsa **Deploy site**.

### Opción rápida: arrastrar y soltar

1. Ejecuta `cd frontend && npm install && npm run build`.
2. En Netlify Drop arrastra **solo la carpeta** `frontend/dist/nativa-pos/browser`.

No subas `frontend/src` ni `backend` en el método de arrastrar y soltar. Netlify alojará la demo Angular; los datos se guardan en el navegador de cada visitante.

## Ejecutar el backend

Requisitos: Java 17 y Maven 3.9+.

```bash
cd backend
mvn spring-boot:run
```

El perfil predeterminado `demo` usa H2 en memoria y carga información de muestra. La API queda en `http://localhost:8080/api`.

Endpoints principales:

```text
GET    /api/health
GET    /api/products
GET    /api/tables
GET    /api/reservations
POST   /api/reservations
PATCH  /api/reservations/{id}/status?status=CONFIRMADA
POST   /api/reservations/{id}/seat
POST   /api/tables/{id}/open
GET    /api/orders
POST   /api/orders
POST   /api/orders/{id}/advance
POST   /api/tables/{id}/pay
GET    /api/payments
```

Ejemplo de una reserva:

```json
{
  "customerName": "Camila Rodríguez",
  "phone": "3001234567",
  "date": "2026-07-18",
  "time": "20:00",
  "guests": 4,
  "area": "Salón",
  "tableId": 4,
  "occasion": "Cumpleaños",
  "notes": "Silla para bebé"
}
```

Ejemplo de pedido:

```json
{
  "tableId": 4,
  "waiter": "Laura Gómez",
  "items": [
    {"productId": 1, "quantity": 2, "notes": "Una sin cebolla"},
    {"productId": 4, "quantity": 1, "notes": ""}
  ]
}
```

## Ejecutar el full stack con Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:8081`
- API: `http://localhost:8080/api`
- MySQL: `localhost:3306`

El perfil de producción usa variables `DB_URL`, `DB_USER`, `DB_PASSWORD` y `CORS_ORIGIN`. Cambia las contraseñas del archivo Compose antes de un despliegue real.

## Recorrido sugerido para vender la demo

1. En **Reservas**, crea o confirma una reservación.
2. Pulsa el icono de llegada para ubicar al cliente en una mesa.
3. Agrega platos en **Pedidos**, escribe una nota y envía la comanda.
4. En **Cocina**, avanza la comanda: nueva → preparando → lista → servida.
5. En **Caja**, cobra la mesa con efectivo, tarjeta, Nequi o Daviplata.
6. Comprueba en **Mesas** que volvió a quedar disponible.

## Alcance técnico de la demo

El frontend desplegable en Netlify usa un repositorio local de demostración para que funcione sin servidor. El backend contiene las mismas reglas de negocio y está listo para desplegarse por separado en un servicio Java (Render, Railway, Fly.io, AWS, etc.). Para una comercialización real, el siguiente paso es reemplazar el repositorio demo por un cliente HTTP, agregar autenticación JWT, permisos por rol, facturación electrónica e integración de impresión.
