require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs   = require('fs');
const path = require('path');
const pool = require('../../src/config/database');

async function run() {
  const client = await pool.connect();
  try {
    console.log('🌱 Menjalankan seed data...');
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      console.log(`   ▶ ${f}`);
      await client.query(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    }
    console.log('\n✅ Seed selesai.\n');
    console.log('Akun default (password: Password123!):');
    console.log('  admin      → role Admin');
    console.log('  dokter1    → role Dokter');
    console.log('  dokter2    → role Dokter');
    console.log('  apoteker1  → role Apoteker');
  } catch (err) {
    console.error('❌ Seed gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
