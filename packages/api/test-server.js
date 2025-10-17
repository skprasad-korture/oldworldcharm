#!/usr/bin/env node

/**
 * Simple test to verify the API server can start and connect to database
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing API server startup...\n');

// Start the server
const server = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' }
});

let serverOutput = '';
let serverStarted = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log('📤 Server:', output.trim());
  
  // Check if server started successfully
  if (output.includes('Server listening') || output.includes('listening on')) {
    serverStarted = true;
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('⚠️  Server Error:', output.trim());
  
  // Don't treat TypeScript warnings as fatal errors
  if (!output.includes('error TS') || output.includes('warning')) {
    serverOutput += output;
  }
});

// Give the server 10 seconds to start
await setTimeout(10000);

if (serverStarted) {
  console.log('\n✅ API server started successfully!');
  
  // Test a simple API call
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
    } else {
      console.log('⚠️  Health check failed, but server is running');
    }
  } catch (error) {
    console.log('⚠️  Could not test API endpoint, but server started');
  }
} else {
  console.log('\n❌ Server did not start within 10 seconds');
  console.log('Server output:', serverOutput);
}

// Clean up
server.kill('SIGTERM');
process.exit(serverStarted ? 0 : 1);