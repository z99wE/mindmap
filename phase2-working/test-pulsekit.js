const { Pool } = require('pg');
const { createPulseKit } = require('./src/pulsekit/index.js');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const pulseKit = await createPulseKit(pool, null, null);
  
  // mock getUserChannels
  const mockUserId = '1234';
  
  // Try sending
  const res = await pulseKit.send({
    channel: 'discord',
    to: mockUserId,
    message: 'Test'
  });
  
  console.log("SEND RESULT:", res);
  
  await pulseKit.destroy();
  await pool.end();
}
run().catch(console.error);
