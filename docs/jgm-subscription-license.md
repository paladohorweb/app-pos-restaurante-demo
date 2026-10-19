# Restaurante POS: control de licencia del backend

El backend en app-pos-restaurante-v2/backend admite el mismo protocolo de licencia que StayManager, BarberKong y Guía. En el ecosistema crea una instalación del producto RESTAURANTE_POS y vincula el acuerdo con tenant `default`.

Variables del servidor:

```dotenv
JGM_LICENSE_ENABLED=true
JGM_CONTROL_URL=https://URL-DEL-BACKEND-ECOSISTEMA
JGM_INTEGRATION_KEY=CLAVE_DE_ESTA_INSTALACION
```

Con estas variables, una licencia suspendida bloquea nuevas reservas, apertura de mesas, pedidos y avance de órdenes con HTTP 402. Conserva consultas y el cierre/pago de mesas existentes. Si el control no responde, las nuevas operaciones fallan con HTTP 503. Las decisiones se conservan como máximo 30 segundos, limitadas por validUntil. GET /api/jgm/license permite comprobar el vínculo. La clave no se envía al navegador.

La demo pública usa datos locales y no contrata ni representa una instancia comercial. El backend POS todavía no incluye autenticación de usuarios: esta integración controla la suscripción, no sustituye los permisos que requiere una versión comercial. El producto permanece como piloto/adaptación en el catálogo; no se presenta como SaaS listo para producción. No habilitar el perfil prod en una red pública como servicio comercial sin terminar la autenticación y los permisos del POS.

Sin las variables se conserva el modo STANDALONE para la demo. El flujo de pago es el del ecosistema: generar cobro, reportar transferencia, verificar ingreso y habilitar periodo. No hay débitos bancarios automáticos.

La verificación del repositorio ejecuta el arranque y pruebas HTTP reales de bloqueo, reactivación, caída del control, credenciales y conservación de consultas/pagos.
