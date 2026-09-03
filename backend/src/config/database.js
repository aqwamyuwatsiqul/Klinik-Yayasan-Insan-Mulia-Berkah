const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host    : process.env.DB_HOST     || 'localhost',
  port    : parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'klinik_sekolah',
  user    : process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',

  // ── Connection pool ────────────────────────────────────────────────────
  max                    : 20,      // maks 20 koneksi serentak
  idleTimeoutMillis      : 30_000,  // koneksi idle > 30 detik dikembalikan ke pool
  connectionTimeoutMillis: 5_000,   // gagal connect setelah 5 detik (sebelumnya 2 detik)

  // ── H3: Query & transaction timeouts ──────────────────────────────────
  // statement_timeout: query yang berjalan > 30 detik dibatalkan otomatis.
  // Mencegah satu query lambat memblokir seluruh connection pool.
  statement_timeout: 30_000,

  // idle_in_transaction_session_timeout: transaksi yang terbuka tapi idle
  // > 10 detik (misal karena bug atau koneksi terputus) dibatalkan otomatis.
  // Mencegah lock/deadlock yang tidak terselesaikan.
  idle_in_transaction_session_timeout: 10_000,
});

// Log error pada koneksi idle yang tidak terduga
const logger = require('../utils/logger');
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected idle client error — pool connection lost');
});

// ── H3: Graceful shutdown ──────────────────────────────────────────────────
// Pastikan semua koneksi DB ditutup dengan benar saat proses dihentikan.
// Tanpa ini, PostgreSQL meninggalkan koneksi "idle" yang bisa memenuhi max_connections.
const shutdown = async (signal) => {
  logger.info(`[DB] Menerima ${signal} — menutup connection pool...`);
  try {
    await pool.end();
    logger.info('[DB] Connection pool ditutup dengan bersih.');
  } catch (err) {
    logger.error({ err }, '[DB] Gagal menutup pool');
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = pool;
