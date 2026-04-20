import { spawn } from "node:child_process";

const powershellPath = process.platform === "win32"
  ? "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
  : "powershell";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const extraArgs = process.argv.slice(2);

const backend = startProcess(
  powershellPath,
  [
    "-NoProfile",
    "-Command",
    "Set-Location '.'; dotnet .\\Weddingifts.Api\\bin\\Debug\\net8.0\\Weddingifts.Api.dll --urls http://127.0.0.1:5298"
  ],
  { ASPNETCORE_ENVIRONMENT: "FrontendSmoke" }
);

const frontend = startProcess(
  powershellPath,
  [
    "-NoProfile",
    "-Command",
    "Set-Location 'Weddingifts-web'; py -m http.server 5500 --bind 127.0.0.1"
  ]
);

try {
  await waitForUrl("http://127.0.0.1:5298/swagger/index.html", "backend FrontendSmoke", backend);
  await waitForUrl("http://127.0.0.1:5500/login.html", "frontend estático", frontend);

  await run(
    npxCommand,
    ["playwright", "test", ...extraArgs],
    { WG_DISABLE_MANAGED_SERVERS: "1" }
  );
} finally {
  stopProcess(backend);
  stopProcess(frontend);
}

function startProcess(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  child.stdoutText = "";
  child.stderrText = "";

  child.stdout.on("data", (chunk) => {
    child.stdoutText += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    child.stderrText += chunk.toString();
  });

  return child;
}

async function waitForUrl(url, label, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(buildProcessFailureMessage(label, child));
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await delay(1000);
  }

  throw new Error(`Tempo esgotado aguardando ${label} em ${url}.\n${buildProcessFailureMessage(label, child)}`);
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} falhou com código ${code}.`));
    });
  });
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
}

function buildProcessFailureMessage(label, child) {
  const stdout = child.stdoutText?.trim();
  const stderr = child.stderrText?.trim();
  return [
    `${label} encerrou prematuramente.`,
    stdout ? `stdout:\n${stdout}` : null,
    stderr ? `stderr:\n${stderr}` : null
  ].filter(Boolean).join("\n");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
