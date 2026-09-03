/**
 * Helper transaksi database yang aman.
 *
 * M2 FIX: ROLLBACK dibungkus try-catch agar tidak throw jika koneksi
 * sudah terputus di tengah transaksi (double-fail scenario).
 *
 * Penggunaan:
 *   const result = await withTransaction(pool, async (client) => {
 *     await client.query('INSERT ...');
 *     return someValue;
 *   });
 */
const withTransaction = async (pool, fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    // M2 FIX: ROLLBACK di-wrap try-catch — jika DB terputus saat rollback,
    // tidak melempar error baru yang menimpa error asli.
    try { await client.query('ROLLBACK'); } catch (rbErr) {
      // Log rollback failure tapi jangan lempar — error asli lebih penting
      const logger = require('./logger');
      logger.warn({ rbErr }, 'ROLLBACK gagal setelah error transaksi');
    }
    throw err; // re-throw error asli ke caller
  } finally {
    client.release();
  }
};

module.exports = { withTransaction };
