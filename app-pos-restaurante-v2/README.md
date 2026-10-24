# Nativa POS · Frontend y backend

Angular 17.3.12 standalone, Bootstrap 5.3.8, Bootstrap Icons, CSS y SweetAlert2. API con Java 17 Amazon Corretto, Spring Boot 4.0.8, Spring Security, JWT, JPA y Flyway. H2 en perfil de demostración; MySQL 8.4 en perfil `prod`.

## 1. Descargar la rama

```powershell
git clone https://github.com/paladohorweb/app-pos-restaurante-demo.git
cd app-pos-restaurante-demo
git switch feature/restaurante-modernization
cd app-pos-restaurante-v2
```

Si ya tienes el repositorio:

```powershell
git fetch origin
git switch --track origin/feature/restaurante-modernization
```

No sobrescribas cambios locales pendientes. La modernización se encuentra en una rama independiente.

## 2. Solo demo visual, sin backend

En una terminal:

```powershell
cd frontend
npm ci
npm start
```

Abre http://localhost:4200. Elige Administración, Salón, Cocina o Caja. La selección de rol en este modo sirve para explorar el demo; no es un mecanismo de seguridad. Los datos se guardan en este navegador y se pueden reiniciar desde el menú superior o Mi espacio.

## 3. Frontend y backend conectados, sin instalar MySQL

Requisitos: Node 20, Maven 3.9 y Amazon Corretto 17. Comprueba `node -v`, `mvn -v` y `java -version`.

Terminal 1 desde `app-pos-restaurante-v2`:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Terminal 2 desde `app-pos-restaurante-v2`:

```powershell
cd frontend
npm ci
npm run start:api
```

Abre http://localhost:4200. El proxy lleva `/api` al puerto 8080. Este perfil usa una base H2 temporal que se elimina al reiniciar. No requiere licencias ni bootstrap de producción.

| Usuario | Contraseña del perfil demo | Rol |
|---|---|---|
| `admin` | `DemoNativa2026!` | Administración |
| `mesero` | `DemoNativa2026!` | Salón y comandas |
| `cocina` | `DemoNativa2026!` | Monitor de cocina |
| `cajero` | `DemoNativa2026!` | Caja y reportes |

Estas cuentas solo se crean con el perfil `demo`. No publiques este backend de prueba con datos reales.

## 4. MySQL persistente con Docker local

Desde `app-pos-restaurante-v2`:

```powershell
Copy-Item .env.example .env
```

Completa `.env`: contraseñas de MySQL, una contraseña propia de administrador de entre 14 y 72 bytes y `JWT_SECRET` aleatorio de al menos 32 bytes. Para generar el secreto:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Genera un valor diferente para cada secreto. `.env` está excluido de Git.

```powershell
docker compose up -d --build
docker compose logs -f backend
```

Frontend: http://localhost:8081. API: http://localhost:8080/api/health. MySQL local: puerto 3308. El frontend de Docker queda configurado en modo API automáticamente. Ingresa con `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD` de `.env`.

La variable correcta es `DB_PASSWORD`; se corrigió la incompatibilidad anterior entre Docker y `DB_PASS`. El bootstrap solo crea el administrador si no existe: no cambia una contraseña ya guardada. Las migraciones V1–V3 se aplican sin borrar tablas.

`docker compose down` conserva la base. No uses `down -v` si necesitas conservar sus datos. Esta configuración expone servicios solo en la máquina local y usa cookies sin Secure para HTTP local. Hosting público requiere HTTPS y `COOKIE_SECURE=true`.

## 5. Recorrido funcional

1. Mesas y salón → abre una mesa y registra comensales.
2. Punto de venta → selecciona platos y notas → envía a cocina.
3. Cocina → Comenzar → Marcar lista → Entregar.
4. Caja → confirma que recibiste el pago por un medio externo → registra el cobro.
5. La mesa vuelve a Disponible. El dashboard, la gráfica y los reportes se actualizan.

Las reservas permiten confirmar, cancelar y registrar llegada a una mesa con capacidad suficiente. Una mesa reservada exige registrar la llegada antes de enviar pedidos. Las comandas deben estar servidas antes de cobrar. El modo API calcula precios desde la base y serializa cobros concurrentes por mesa; el frontend mantiene una clave de idempotencia durante el reintento del mismo cobro en la sesión abierta.

Los cobros son registros manuales. Nequi, Daviplata y tarjeta no están conectados a una pasarela; debes verificar el ingreso externamente. No se emite factura electrónica.

## 6. Pruebas

```powershell
cd backend
mvn verify
cd ../frontend
npm ci
npm run build
npx playwright install chromium
npm test
npm run test:api
```

La última prueba levanta el JAR de backend, conecta Angular con la API, inicia sesión, renueva la sesión al recargar, abre una mesa, envía y sirve una comanda, registra el pago y cierra sesión. Requiere haber ejecutado `mvn verify` antes.

El workflow `.github/workflows/restaurante-ci.yml` realiza estos pasos con Node 20 y Corretto 17. Las pruebas de migración usan H2 en modo MySQL; no sustituyen una validación contra una instancia MySQL real. El formato se aplica con `npm run format` en frontend.

## 7. Netlify: conservar el demo estático

La configuración raíz establece:

- Base: `app-pos-restaurante-v2/frontend`.
- Comando: `npm ci && npm run build`.
- Publish, relativo a Base: `dist/nativa-pos/browser`.
- Node: 20.

Para revisar la rama usa un deploy de vista previa o configura una branch deploy. No es necesario reemplazar el sitio actual para revisar el cambio. Esta tarea prepara código y configuración; no publica ni cambia el sitio existente.

El build normal genera `assets/runtime-config.json` con `mode: demo`. `npm run start:api` utiliza una configuración Angular diferente que produce `mode: api` sin editar archivos fuente. En hosting con backend, sirve `/api` mediante un proxy del mismo origen y protege la cookie con HTTPS. No guardes JWT_SECRET, claves de integración ni credenciales en Angular.

## 8. Alcance

Lee [la auditoría y el trabajo pendiente](../docs/restaurante-modernization.md). La modernización visual y el flujo conectado están implementados. La paridad completa con las capacidades de seguridad y operación de BarberKong exige la siguiente etapa descrita allí.
