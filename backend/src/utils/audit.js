/**
 * audit.js — Fire-and-forget helper untuk mencatat aktivitas sensitif.
 *
 * Prinsip: pencatatan audit TIDAK BOLEH mengganggu proses utama.
 * Fungsi ini TIDAK pernah throw. Jika INSERT gagal, error di-log saja.
 *
 * Penggunaan:
 *   recordAudit(pool, logger, { userId, userName, userRole,
 *     aksi, entitas, entitasId, deskripsi, perubahan, ipAddress });
 *
 * Caller tidak perlu await, tidak perlu .catch() — sudah aman.
 *
 * @param {object} pool    - pg Pool
 * @param {object} logger  - Pino logger
 * @param {object} payload
 */
const recordAudit = async (pool, logger, {
  userId,
  userName,
  userRole,
  aksi,
  entitas,
  entitasId  = null,
  deskripsi  = null,
  perubahan  = null,
  ipAddress  = null,
}) => {
  try {
    await pool.query(
      `INSERT INTO audit_log
         (user_id, user_nama, user_role, aksi, entitas, entitas_id,
          deskripsi, perubahan, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        userId,
        userName,
        userRole,
        aksi,
        entitas,
        entitasId,
        deskripsi,
        perubahan  ? JSON.stringify(perubahan) : null,
        ipAddress,
      ]
    );
  } catch (err) {
    // Log tapi jangan lempar — proses utama harus tetap jalan
    logger.error(
      { err, aksi, entitas, entitasId, userId },
      'audit.recordAudit: gagal mencatat audit log'
    );
  }
};

module.exports = { recordAudit };
