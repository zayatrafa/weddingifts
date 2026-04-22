import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extraArgs = process.argv.slice(2);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const frontendDir = path.join(workspaceRoot, "Weddingifts-web");
const backendDllPath = path.join(
  workspaceRoot,
  "Weddingifts.Api",
  "bin",
  "Debug",
  "net8.0",
  "Weddingifts.Api.dll"
);

const managedChildren = [];
let cleanupStarted = false;

assertPathExists(frontendDir, "Diretorio do frontend nao encontrado.");
assertPathExists(
  backendDllPath,
  "Backend nao encontrado em Weddingifts.Api/bin/Debug/net8.0/Weddingifts.Api.dll. Rode o build da API antes da smoke suite."
);

installCleanupHandlers();

const backend = startManagedProcess({
  name: "backend",
  command: "dotnet",
  args: [backendDllPath, "--urls", "http://127.0.0.1:5298"],
  cwd: workspaceRoot,
  env: { ASPNETCORE_ENVIRONMENT: "FrontendSmoke" }
});

const frontend = startManagedProcess({
  name: "frontend",
  command: "py",
  args: ["-m", "http.server", "5500", "--bind", "127.0.0.1"],
  cwd: frontendDir
});

try {
  await waitForUrl("http://127.0.0.1:5298/swagger/index.html", "backend FrontendSmoke", backend);
  await waitForUrl("http://127.0.0.1:5500/login.html", "frontend estatico", frontend);

  await runPlaywright(extraArgs);
} finally {
  await cleanupProcesses();
}

function startManagedProcess({ name, command, args, cwd, env = {} }) {
  const resolvedCommand = resolvePlatformCommand(command, args);

  console.log(`[smoke] iniciando ${name}: ${formatCommand(resolvedCommand.command, resolvedCommand.args)} (cwd: ${cwd})`);

  let child;

  try {
    child = spawn(resolvedCommand.command, resolvedCommand.args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true
    });
  } catch (error) {
    throw new Error(
      `Falha ao iniciar ${name}: ${formatCommand(resolvedCommand.command, resolvedCommand.args)}\n${error.message}`
    );
  }

  child.processName = name;
  child.stdoutText = "";
  child.stderrText = "";
  child.spawnError = null;

  child.on("error", (error) => {
    child.spawnError = error;
  });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  attachLogStream(child.stdout, name, "stdout", child);
  attachLogStream(child.stderr, name, "stderr", child);

  managedChildren.push(child);
  return child;
}

async function runPlaywright(args) {
  const environment = { WG_DISABLE_MANAGED_SERVERS: "1" };
  await runCommand("npx", ["playwright", "test", ...args], environment);
}

function runCommand(command, args, extraEnv = {}) {
  const resolvedCommand = resolvePlatformCommand(command, args);

  console.log(`[smoke] executando: ${formatCommand(resolvedCommand.command, resolvedCommand.args)}`);

  return new Promise((resolve, reject) => {
    let child;

    try {
      child = spawn(resolvedCommand.command, resolvedCommand.args, {
        cwd: workspaceRoot,
        env: { ...process.env, ...extraEnv },
        stdio: "inherit",
        shell: false,
        windowsHide: true
      });
    } catch (error) {
      reject(new Error(`Falha ao iniciar comando: ${formatCommand(resolvedCommand.command, resolvedCommand.args)}\n${error.message}`));
      return;
    }

    child.on("error", (error) => {
      reject(new Error(`Falha ao iniciar comando: ${formatCommand(resolvedCommand.command, resolvedCommand.args)}\n${error.message}`));
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${formatCommand(resolvedCommand.command, resolvedCommand.args)} falhou com codigo ${code ?? "null"}`
          + (signal ? ` (signal ${signal})` : ".")
        )
      );
    });
  });
}

async function waitForUrl(url, label, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.spawnError) {
      throw new Error(buildProcessFailureMessage(label, child));
    }

    if (child.exitCode !== null) {
      throw new Error(buildProcessFailureMessage(label, child));
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[smoke] ${label} pronto em ${url}`);
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await delay(1000);
  }

  throw new Error(`Tempo esgotado aguardando ${label} em ${url}.\n${buildProcessFailureMessage(label, child)}`);
}

async function cleanupProcesses() {
  if (cleanupStarted) {
    return;
  }

  cleanupStarted = true;

  const children = [...managedChildren].reverse();
  await Promise.allSettled(children.map((child) => stopProcess(child)));
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  console.log(`[smoke] encerrando ${child.processName} (pid ${child.pid})`);

  if (process.platform === "win32") {
    await killWindowsProcessTree(child.pid);
    return;
  }

  child.kill("SIGTERM");
  await waitForExit(child, 5000);
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, timeoutMs);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function killWindowsProcessTree(pid) {
  return new Promise((resolve) => {
    const killer = spawn(
      "taskkill.exe",
      ["/pid", String(pid), "/t", "/f"],
      {
        cwd: workspaceRoot,
        stdio: ["ignore", "ignore", "pipe"],
        shell: false,
        windowsHide: true
      }
    );

    let stderrText = "";
    killer.stderr.setEncoding("utf8");
    killer.stderr.on("data", (chunk) => {
      stderrText += chunk;
    });

    killer.on("error", () => {
      resolve();
    });

    killer.on("exit", () => {
      if (stderrText.trim()) {
        console.error(`[smoke] taskkill stderr:\n${stderrText.trim()}`);
      }

      resolve();
    });
  });
}

function attachLogStream(stream, name, label, child) {
  let pending = "";

  stream.on("data", (chunk) => {
    const text = chunk.toString();

    if (label === "stdout") {
      child.stdoutText += text;
    } else {
      child.stderrText += text;
    }

    const combined = pending + text;
    const lines = combined.split(/\r?\n/u);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length > 0) {
        console.log(`[${name}:${label}] ${line}`);
      }
    }
  });

  stream.on("end", () => {
    if (pending.length > 0) {
      console.log(`[${name}:${label}] ${pending}`);
    }
  });
}

function buildProcessFailureMessage(label, child) {
  const stdout = child.stdoutText?.trim();
  const stderr = child.stderrText?.trim();
  const spawnError = child.spawnError ? `spawn error:\n${child.spawnError.stack ?? child.spawnError.message}` : null;

  return [
    `${label} encerrou prematuramente.`,
    spawnError,
    stdout ? `stdout:\n${stdout}` : null,
    stderr ? `stderr:\n${stderr}` : null
  ].filter(Boolean).join("\n");
}

function buildWindowsCommandLine(command, args) {
  return [command, ...args].map(quoteWindowsArg).join(" ");
}

function resolvePlatformCommand(command, args) {
  if (process.platform !== "win32") {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", buildWindowsCommandLine(command, args)]
  };
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return "\"\"";
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/gu, "$1$1\\\"").replace(/(\\+)$/u, "$1$1")}"`;
}

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function assertPathExists(targetPath, message) {
  if (!existsSync(targetPath)) {
    throw new Error(`${message}\nCaminho esperado: ${targetPath}`);
  }
}

function installCleanupHandlers() {
  const terminate = async (code) => {
    await cleanupProcesses();
    process.exit(code);
  };

  process.once("SIGINT", () => {
    void terminate(130);
  });

  process.once("SIGTERM", () => {
    void terminate(143);
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
