export default async function run(page, ui) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL dan ADMIN_PASSWORD wajib diatur sebagai environment variable. Jangan menulis kredensial ke file QA."
    );
  }
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404 (Not Found)")) {
      consoleErrors.push(message.text());
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("/api/users/id/")) {
      failedRequests.push({
        url,
        error: request.failure()?.errorText || "unknown request failure",
      });
    }
  });

  const before = await ui.snapshot();
  const fields = page.getByRole("textbox");
  await fields.nth(0).fill(email);
  await fields.nth(1).fill(password);
  await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();

  await page.waitForFunction(
    () => window.location.pathname === "/admin",
    null,
    { timeout: 10000 },
  );

  await page.getByText("Dashboard Admin", { exact: false }).waitFor({
    state: "visible",
    timeout: 10000,
  });

  const body = await page.locator("body").innerText();
  const adminDashboardVisible = body.includes("Dashboard Admin");
  const offlineModeVisible = body.includes("Mode Offline");

  if (!adminDashboardVisible) {
    throw new Error("Dashboard admin tidak tampil setelah login.");
  }

  if (offlineModeVisible) {
    throw new Error("Dashboard admin masuk Mode Offline.");
  }

  if (pageErrors.length || consoleErrors.length || failedRequests.length) {
    throw new Error(JSON.stringify({ pageErrors, consoleErrors, failedRequests }));
  }

  return {
    passed: true,
    url: page.url(),
    body: body.slice(0, 500),
    adminDashboardVisible,
    offlineModeVisible,
    pageErrors,
    consoleErrors,
    failedRequests,
    before,
  };
}