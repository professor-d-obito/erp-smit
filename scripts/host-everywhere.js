const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const http = require('http');

console.clear();
console.log('='.repeat(78));
console.log('   SRI MUTHUKUMARAN INSTITUTE OF TECHNOLOGY (SMIT) - COLLEGE ERP');
console.log('   LOCAL HOSTING & MULTI-DEVICE ACCESSIBILITY ENGINE');
console.log('='.repeat(78));
console.log('\n[*] Detecting network interfaces and preparing services...\n');

// 1. Detect IPv4 LAN Address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIpAddress();

// 2. Check if Next.js dev server is already running on port 3000
function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/auth/session`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  const isRunning = await isPortOpen(3000);
  let nextProcess = null;

  if (!isRunning) {
    console.log('[+] Starting Next.js ERP server on 0.0.0.0:3000...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    nextProcess = spawn(npxCmd, ['next', 'dev', '-H', '0.0.0.0', '-p', '3000'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'ignore',
      shell: false,
    });
    // Wait briefly for Next.js to start
    await new Promise((r) => setTimeout(r, 4000));
  } else {
    console.log('[+] Existing ERP server detected on port 3000.');
  }

  // 3. Start Cloudflare Tunnel
  console.log('[+] Launching Cloudflare Tunnel for mobile & outside network access...');
  const cloudflaredPath = path.join(__dirname, '..', 'cloudflared.exe');
  const tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:3000'], {
    cwd: path.join(__dirname, '..'),
    shell: false,
  });

  let tunnelUrlFound = false;

  const onData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelUrlFound) {
      tunnelUrlFound = true;
      const publicUrl = match[0];

      console.clear();
      console.log('='.repeat(78));
      console.log('   🎉 SMIT COLLEGE ERP IS NOW HOSTED & ACCESSIBLE FROM ANY DEVICE!');
      console.log('='.repeat(78));
      console.log('');
      console.log('  🌐 1. OUTSIDE NETWORK / MOBILE PHONES (ANYWHERE IN THE WORLD):');
      console.log(`     👉  ${publicUrl}`);
      console.log('     (Open this link on any mobile phone, 4G/5G cellular data, or PC)');
      console.log('');
      console.log('  📱 2. SAME WI-FI NETWORK (Local Devices):');
      console.log(`     👉  http://${localIp}:3000`);
      console.log('');
      console.log('  💻 3. ON THIS COMPUTER:');
      console.log('     👉  http://localhost:3000');
      console.log('');
      console.log('-'.repeat(78));
      console.log('  🔑 DEFAULT LOGIN CREDENTIALS:');
      console.log('     - Email / Employee ID: admin@smit.edu.in  (or EMP-ADMIN-001)');
      console.log('     - Password:            Admin@123456');
      console.log('-'.repeat(78));
      console.log('  [i] Keep this window OPEN while you use the website.');
      console.log('  [i] Press Ctrl+C at any time to stop hosting.');
      console.log('='.repeat(78));
    }
  };

  tunnelProcess.stderr.on('data', onData);
  tunnelProcess.stdout.on('data', onData);

  tunnelProcess.on('exit', () => {
    if (nextProcess) nextProcess.kill();
    process.exit();
  });

  process.on('SIGINT', () => {
    tunnelProcess.kill();
    if (nextProcess) nextProcess.kill();
    process.exit();
  });
}

start();
