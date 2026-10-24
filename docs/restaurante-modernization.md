# Auditoría y modernización de Restaurante POS

Base revisada: `main`, commit `0994a8b330e5af6d4848f4d37f906b277072bd20`, repositorio `paladohorweb/app-pos-restaurante-demo`. Fecha: 24 de octubre de 2026. Se recuperó el contexto de Nativa V2 y se conservó su estructura frontend/backend y su demo local.

## Hallazgos y cambios

| Hallazgo en la base | Cambio de esta rama |
|---|---|
| Login que solo guardaba `nativa-session=true` | Demo etiquetada y modo API con usuarios BCrypt, JWT en memoria y refresh HttpOnly rotativo |
| Endpoints de negocio sin control de acceso | ADMIN, MESERO, COCINA y CAJERO verificados por Spring Security; las vistas también filtran navegación |
| Frontend sin consumir la API | Configuración explícita demo/API, contratos de snapshot y comandos conectados |
| Ventas con un sumando fijo de 872.400 y porcentajes ilustrativos | Ventas y ticket calculados con pagos del día; gráfica por franjas, distribución por medio y exportación CSV |
| Panel con tipografía diminuta, sidebar fijo y diseño anterior | Nuevo sistema visual, tarjetas, gráficos, estados, vistas de equipo, menú desktop colapsable y navegación móvil |
| Pago sin clave de solicitud ni bloqueo concurrente | Índice único, clave de idempotencia, verificación de mesa/medio y bloqueo transaccional de mesa |
| Reserva sin mesa interpretada como duplicada de otra sin asignar | Valida duplicados solo cuando hay una mesa asignada; valida capacidad, área y estados |
| Lecturas y mutaciones con entidades que podían serializar colecciones lazy | Snapshot con DTOs y contratos probados con `open-in-view=false` |
| `DB_PASSWORD` en Compose pero `DB_PASS` en backend | Variables consistentes y credenciales propias obligatorias en Compose |
| Contraseñas por defecto en perfil persistente | `.env.example` sin secretos, bootstrap explícito y cuentas conocidas limitadas a `demo` |
| Caché Angular subida a Git y configuración de build incompleta | Exclusiones, eliminación de cachés versionadas en esta rama y CI de frontend/backend |

## Seguridad y operación implementadas

- Access token de 15 minutos en memoria; sesión de 12 horas con refresh rotativo y hash en base. Logout revoca también los access tokens vinculados a la sesión.
- Cookie HttpOnly y SameSite=Strict, con Secure por defecto en perfil `prod`. Las operaciones de refresh/logout requieren una cabecera propia; se valida Origin y CORS.
- Límite local de 20 solicitudes de autenticación por minuto por dirección remota. En despliegues distribuidos se debe centralizar el límite y configurar el proxy.
- Errores de autenticación genéricos y sin stack traces para el navegador, límites de tamaño y cantidad en DTOs, precios calculados desde catálogo en servidor.
- Cobros exclusivamente ADMIN/CAJERO; reservas y creación de pedidos exclusivamente ADMIN/MESERO. COCINA no recibe pagos ni reservas en el snapshot.
- Licenciamiento JGMSolutions ya existente conservado; login, refresh, logout y cobros continúan según la política existente aunque una suscripción esté suspendida. No se habilita el licenciamiento por defecto para la simulación.
- No hay cambio automático a simulación cuando falla la API. Se conserva el último snapshot visible con un aviso y reintento; puede estar desactualizado.

## Validación

Pruebas backend: autenticación, permisos, serialización, validación de entradas, clave requerida para pago, repetición de cobro, cobros concurrentes, rotación de refresh, revocación por logout, CORS, cabecera contra CSRF, migraciones V1–V3 y licencia JGMSolutions.

Pruebas de navegador: flujo mesa → pedido → cocina → cobro → métricas, navegación de cada rol, cierre de menú móvil, sidebar desktop, ausencia de errores de carga/iconos y de desbordamiento global a 360, 390, 768 y 1280 px. La agenda usa scroll interno para sus columnas.

Prueba adicional con frontend y backend reales: autenticación y refresh al recargar, persistencia de una comanda y su pago, actualización del dashboard y cierre de sesión.

Las comprobaciones locales usan Java 17 Amazon Corretto y H2. Los dos workflows de GitHub Actions también completaron correctamente las pruebas con Corretto 17 y Node 20. Se fijó Ubuntu 24.04 porque Playwright 1.58.2 no admite el nuevo runner Ubuntu 26.04 de ubuntu-latest. Docker/MySQL no se presentan como comprobados localmente.

## Pendiente para paridad completa y venta como SaaS

Esta entrega sigue siendo un demo/piloto. No equivale a toda la seguridad y operación de BarberKong.

1. MFA/2FA, recuperación segura y cambio/restablecimiento de contraseña con correo SMTP; alta e invitación de personal y administración de usuarios.
2. Gestión persistente del catálogo, inventario, costos, anulaciones/devoluciones y apertura/cierre formal de caja con conciliación.
3. Separación comprobada de negocios/tenants y sedes. El licenciamiento actual usa tenant `default`; no autoriza tratar la base compartida como multiempresa.
4. Portal de cliente, reservas públicas con protección anti-spam y consentimiento, recordatorios y documentos legales propios del negocio.
5. Gestión completa de planes trial/business/pro/premium, incorporación por invitación y cobranza según JGMSolutions. La comprobación de licencia existente no implementa por sí sola todo ese ciclo.
6. Backups con restauración comprobada, observabilidad, auditoría de acciones, retención de datos, pruebas de carga y ejecución contra MySQL real.
7. Revisión de dependencias, especialmente las restricciones de mantenimiento de Angular 17, antes de un despliegue productivo. Mantener Angular 17 fue una restricción del proyecto.
8. Facturación electrónica/DIAN, pasarelas y conciliación automática solo como integraciones separadas. Actualmente el operador confirma manualmente el pago recibido.
9. Accesibilidad más exhaustiva y lector de pantalla; la revisión responsive y las etiquetas no acreditan conformidad WCAG completa. Modo offline real con sincronización de operaciones requiere una etapa independiente.

Se conservan estas limitaciones de forma explícita para que el demo muestre funciones operativas comprobables sin anunciar capacidades productivas pendientes.

## Dependencias: hallazgos que siguen abiertos

El 24 de octubre de 2026, `npm audit` informó inicialmente 68 paquetes afectados: 4 bajos, 24 moderados, 36 altos y 4 críticos. Se ejecutó una actualización compatible, sin `--force` y sin cambiar Angular 17. El resultado es 51 paquetes: 4 bajos, 20 moderados, 25 altos y 2 críticos. La compilación y las pruebas funcionales se repitieron después del cambio del lockfile.

Los dos paquetes críticos restantes son `piscina` y `tar`, dependencias transitivas del entorno de construcción/CLI. El informe sugiere cambios mayores de Angular DevKit/CLI para resolver sus cadenas. No se aplicaron overrides de versiones mayores sin comprobar todas las herramientas. También permanecen avisos sobre Angular 17 y sus dependencias. Las cifras incluyen herramientas de desarrollo; no son una prueba de 51 fallos explotables en el sitio compilado. Tampoco se descarta el riesgo en las máquinas y procesos de construcción.

El equipo de Angular ya no mantiene Angular 17 en soporte oficial: [política de versiones](https://angular.dev/reference/releases) y [avisos oficiales](https://github.com/angular/angular/security/advisories). La restricción de conservar Angular 17 se mantuvo para esta demo. Antes de producción debe acordarse una migración a una línea con soporte o una estrategia de parches mantenidos y verificar los hallazgos restantes. El éxito del CI funcional no constituye aprobación de seguridad para producción.
