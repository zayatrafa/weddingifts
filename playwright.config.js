import { defineConfig } from "@playwright/test";

const frontendBaseUrl = process.env.WG_FRONTEND_BASE_URL || "http://127.0.0.1:5500";
const apiBaseUrl = process.env.WG_API_BASE_URL || "http://127.0.0.1:5298";
const shouldManageLocalServers =
  process.env.WG_DISABLE_MANAGED_SERVERS !== "1"
  && frontendBaseUrl === "http://127.0.0.1:5500"
  && apiBaseUrl === "http://127.0.0.1:5298";

export default defineConfig({
  testDir: "./frontend-smoke",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  reporter: "list",
  webServer: shouldManageLocalServers ? [
    {
      command: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command \"Set-Location '.'; dotnet .\\Weddingifts.Api\\bin\\Debug\\net8.0\\Weddingifts.Api.dll --urls http://127.0.0.1:5298\"",
      url: "http://127.0.0.1:5298/swagger/index.html",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: "FrontendSmoke"
      }
    },
    {
      command: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command \"Set-Location 'Weddingifts-web'; py -m http.server 5500 --bind 127.0.0.1\"",
      url: "http://127.0.0.1:5500/login.html",
      reuseExistingServer: true,
      timeout: 30_000
    }
  ] : undefined,
  use: {
    baseURL: frontendBaseUrl,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  }
});
