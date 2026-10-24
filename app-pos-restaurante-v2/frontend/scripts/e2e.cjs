const { chromium } = require("playwright");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../dist/nativa-pos/browser");
const errors = [],
  failures = [];
let checks = 0;
const server = http.createServer((req, res) => {
  const file = path.join(
    root,
    new URL(req.url, "http://local").pathname === "/"
      ? "index.html"
      : new URL(req.url, "http://local").pathname,
  );
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".json": "application/json",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
    }[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file)
    .on("error", () => {
      res.statusCode = 404;
      res.end();
    })
    .pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) failures.push(r.url());
    });
    await page.goto(url);
    await page.getByRole("button", { name: "Explorar demo" }).click();
    await page.getByRole("heading", { name: /Un gran servicio/ }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    checks++;
    await page.getByRole("button", { name: "Alternar menú" }).click();
    await page.waitForFunction(
      () =>
        parseFloat(
          getComputedStyle(document.querySelector("main")).marginLeft,
        ) < 90,
    );
    checks++;
    await page.getByRole("button", { name: "Alternar menú" }).click();
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
    await page.waitForFunction(
      () => document.querySelector(".cart-list") === null,
    );
    checks++;
    await page.locator(".swal2-container").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: /^Cocina/ }).click();
    let ticket = page.locator(".ticket").filter({ hasText: "Mesa 01" });
    await ticket.getByRole("button", { name: "Comenzar" }).click();
    await ticket.getByRole("button", { name: "Marcar lista" }).click();
    await ticket.getByRole("button", { name: "Entregar" }).click();
    checks++;
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
        !Array.from(document.querySelectorAll(".bill-card")).some((el) =>
          el.textContent.includes("Mesa 01"),
        ),
    );
    checks++;
    await page.locator(".swal2-container").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Vista general", exact: true })
      .click();
    assert.match(
      await page.locator(".metric-grid article").first().innerText(),
      /38[.,]900/,
    );
    checks++;
    if (process.env.SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(process.env.SCREENSHOT_DIR, "dashboard-desktop.png"),
        fullPage: true,
        animations: "disabled",
      });
    }
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `overflow ${width}`,
      );
      checks++;
      if (width === 390) {
        assert.equal(
          await page
            .locator(".sidebar")
            .evaluate((e) => e.getBoundingClientRect().right <= 0),
          true,
        );
        await page.getByRole("button", { name: "Alternar menú" }).click();
        await page
          .locator(".mobile-backdrop")
          .click({ position: { x: 300, y: 400 } });
        assert.equal(
          await page.locator(".sidebar").getAttribute("class"),
          "sidebar",
        );
        checks++;
        if (process.env.SCREENSHOT_DIR)
          await page.screenshot({
            path: path.join(process.env.SCREENSHOT_DIR, "dashboard-mobile.png"),
            fullPage: true,
            animations: "disabled",
          });
      }
    }
    // Every module remains within the viewport on mobile (reservation table scrolls inside its container).
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of [
      "Reservas",
      "Mesas y salón",
      "Punto de venta",
      "Cocina",
      "Caja y cobros",
      "Reportes",
      "Mi espacio",
    ]) {
      await page.getByRole("button", { name: "Alternar menú" }).click();
      await page.getByRole("button", { name: new RegExp("^" + name) }).click();
      await page.waitForTimeout(300);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `module ${name}`,
      );
      checks++;
    }
    await page.getByRole("button", { name: "Alternar menú" }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await page.getByRole("button", { name: "Explorar demo" }).waitFor();
    for (const [role, heading] of [
      ["COCINA", "Monitor de cocina"],
      ["MESERO", "Mapa de mesas"],
      ["CAJERO", "Caja y cobros"],
    ]) {
      await page.locator('select[name="role"]').selectOption(role);
      await page.getByRole("button", { name: "Explorar demo" }).click();
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.getByRole("button", { name: "Alternar menú" }).click();
      if (role === "COCINA") {
        assert.equal(
          await page
            .getByRole("button", { name: "Caja y cobros", exact: true })
            .count(),
          0,
        );
        assert.equal(
          await page
            .getByRole("button", { name: "Reservas", exact: true })
            .count(),
          0,
        );
      }
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Cerrar sesión", exact: true })
        .click();
      await page.getByRole("button", { name: "Explorar demo" }).waitFor();
      checks++;
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    checks++;
    console.log(
      `${checks} comprobaciones de navegador correctas; flujo mesa → pedido → cocina → pago, roles, iconos y responsive.`,
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
