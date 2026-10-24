const { chromium } = require("playwright");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawn } = require("node:child_process");
(async () => {
  let apiPort;
  const probe = http.createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  apiPort = probe.address().port;
  await new Promise((r) => probe.close(r));
  const root = path.resolve(__dirname, "../dist/nativa-pos/browser");
  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      const proxy = http.request(
        {
          hostname: "127.0.0.1",
          port: apiPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (reply) => {
          res.writeHead(reply.statusCode, reply.headers);
          reply.pipe(res);
        },
      );
      proxy.on("error", () => {
        res.statusCode = 502;
        res.end();
      });
      req.pipe(proxy);
      return;
    }
    if (req.url === "/assets/runtime-config.json") {
      res.setHeader("Content-Type", "application/json");
      res.end('{"mode":"api","apiUrl":"/api"}');
      return;
    }
    const url = new URL(req.url, "http://local"),
      file = path.join(
        root,
        url.pathname === "/" ? "index.html" : url.pathname,
      );
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".svg": "image/svg+xml",
      }[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file)
      .on("error", () => {
        res.statusCode = 404;
        res.end();
      })
      .pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = path.resolve(
    __dirname,
    "../../backend/target/restaurant-pos-api-2.0.0.jar",
  );
  if (!fs.existsSync(jar))
    throw new Error("Ejecuta mvn package en backend antes de esta prueba.");
  const child = spawn(process.env.JAVA_BIN || "java", ["-jar", jar], {
    env: {
      ...process.env,
      SPRING_PROFILES_ACTIVE: "demo",
      PORT: String(apiPort),
      CORS_ORIGIN: base,
      COOKIE_SECURE: "false",
    },
  });
  let output = "";
  child.stdout.on("data", (v) => (output += v));
  child.stderr.on("data", (v) => (output += v));
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(output);
      try {
        const r = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 400));
    }
    assert(ready, "Backend did not start");
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      args: ["--no-sandbox"],
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('[name="username"]').fill("admin");
    await page.locator('[name="password"]').fill("DemoNativa2026!");
    await page.getByRole("button", { name: "Entrar a mi restaurante" }).click();
    await page.getByRole("heading", { name: /Un gran servicio/ }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: /Un gran servicio/ }).waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("accessToken")),
      null,
    );
    await page
      .getByRole("button", { name: "Mesas y salón", exact: true })
      .click();
    await page.locator(".table-card").filter({ hasText: "Mesa 01" }).click();
    await page.locator(".swal2-input").fill("2");
    await page.getByRole("button", { name: "Abrir mesa", exact: true }).click();
    await page
      .locator(".product-card")
      .filter({ hasText: "Hamburguesa Nativa" })
      .click();
    await page.getByRole("button", { name: "Enviar pedido a cocina" }).click();
    await page.waitForFunction(() => !document.querySelector(".cart-list"));
    await page.locator(".swal2-container").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: /^Cocina/ }).click();
    const ticket = page.locator(".ticket").filter({ hasText: "Mesa 01" });
    for (const name of ["Comenzar", "Marcar lista", "Entregar"])
      await ticket.getByRole("button", { name }).click();
    await page
      .getByRole("button", { name: "Caja y cobros", exact: true })
      .click();
    await page
      .locator(".bill-card")
      .filter({ hasText: "Mesa 01" })
      .getByRole("button", { name: "Cobrar y liberar mesa" })
      .click();
    await page.getByRole("button", { name: "Confirmar pago recibido" }).click();
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll(".bill-card")).some((e) =>
          e.textContent.includes("Mesa 01"),
        ),
    );
    await page.locator(".swal2-container").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Vista general", exact: true })
      .click();
    assert.match(
      await page.locator(".metric-grid article").first().innerText(),
      /38[.,]900/,
    );
    assert.equal(await page.locator(".api-error").count(), 0);
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await page.locator('[name="username"]').waitFor();
    await page.reload();
    await page.locator('[name="username"]').waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "API E2E OK: login JWT, refresh al recargar, mesa, comanda, cocina, cobro persistido, métricas y logout.",
    );
  } catch (e) {
    console.error(output.slice(-5000));
    throw e;
  } finally {
    if (browser) await browser.close();
    child.kill();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
