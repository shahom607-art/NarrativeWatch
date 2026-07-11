const { execSync, exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function isDockerRunning() {
  try {
    const output = execSync("docker info", { stdio: "pipe" }).toString();
    return output.includes("Server Version:");
  } catch (e) {
    return false;
  }
}

function startDockerDesktop() {
  console.log("🤖 Docker daemon is not running.");
  
  if (process.platform === "win32") {
    const dockerPath = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    if (fs.existsSync(dockerPath)) {
      console.log("🚀 Attempting to launch Docker Desktop...");
      // Start Docker Desktop asynchronously without blocking the node script
      exec(`start "" "${dockerPath}"`);
    } else {
      console.error("❌ Docker Desktop not found at standard path.");
      process.exit(1);
    }
  } else if (process.platform === "darwin") {
    console.log("🚀 Attempting to launch Docker Desktop...");
    exec("open --background -a Docker");
  } else {
    console.error("❌ Please start Docker daemon on your system.");
    process.exit(1);
  }
}

async function waitSeconds(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

async function main() {
  if (!isDockerRunning()) {
    startDockerDesktop();
    
    console.log("⏳ Waiting for Docker daemon to initialize (this can take up to 60 seconds)...");
    let attempts = 30;
    while (attempts > 0) {
      await waitSeconds(2);
      if (isDockerRunning()) {
        console.log("✅ Docker daemon is now running!");
        break;
      }
      attempts--;
      if (attempts === 0) {
        console.error("❌ Docker daemon failed to start in time. Please open Docker Desktop manually.");
        process.exit(1);
      }
    }
  } else {
    console.log("✅ Docker daemon is already running.");
  }

  console.log("🐳 Starting docker containers via docker compose up...");
  try {
    execSync("docker compose up -d", { stdio: "inherit" });
    console.log("✅ Docker containers started.");
  } catch (err) {
    console.error("❌ Failed to run docker compose up -d:", err.message);
    process.exit(1);
  }

  // Brief pause for services like Redis/Postgres/OpenSearch to bind ports
  console.log("⏳ Waiting 3 seconds for services to warm up...");
  await waitSeconds(3);

  console.log("🚀 Launching development servers...");
  
  const devCommand = 'npx concurrently -n api,worker,web -c "blue,green,magenta" "npm run dev -w @narrativewatch/api" "npm run dev -w @narrativewatch/worker" "npm run dev -w @narrativewatch/web"';
  
  // Use spawn to correctly pipe output of concurrently and forward keyboard interrupts (ctrl+c)
  const child = spawn(devCommand, { shell: true, stdio: "inherit" });
  
  child.on("close", (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
