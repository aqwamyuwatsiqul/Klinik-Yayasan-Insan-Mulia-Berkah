const pool   = require('../config/database');
const logger = require('../utils/logger');
const cache  = require('../utils/cache');
const { success, badRequest } = require('../utils/response');
const { isValidDate } = require('../utils/validate');

const DASHBOARD_TTL = 60_000; // 60 detik cache dashboard

// ── H5: withTimeout helper ────────────────────────────────────────────────
// Membatasi setiap query agar tidak memblokir Promise.all terlalu lama.
// Jika salah satu query melebihi batas, seluruh getDashboard throw error
// dan user mendapat pesan "terjadi kesalahan server" daripada hang selamanya.
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query timeout (${ms}ms): ${label}`)),
        ms
      )
    ),
  ]);

const QUERY_TIMEOUT = 8_000; // 8 detik per query dashboard

// ── H5: getDashboard dengan timeout per query ─────────────────────────────
const getDashboard = async (req, res) => {
  try {
    // M6 FIX: cache dashboard 60 detik — semua user berbagi hasil yang sama
    const CACHE_KEY = 'dashboard';
    const cached    = cache.get(CACHE_KEY);
    if (cached) return success(res, cached);

    const today = new Date().toISOString().split('T')[0];

    const [
      tp, kjHari, kjBulan, resepMenunggu, totalObat,
      stokRendah, kadaluarsa, perStatus, chart7, terbaru,
    ] = await Promise.all([
      withTimeout(
        pool.query('SELECT COUNT(*) FROM pasien WHERE deleted_at IS NULL'),
        QUERY_TIMEOUT, 'total_pasien'
      ),
      withTimeout(
        pool.query('SELECT COUNT(*) FROM kunjungan WHERE tanggal=$1 AND deleted_at IS NULL', [today]),
        QUERY_TIMEOUT, 'kunjungan_hari_ini'
      ),
      withTimeout(
        pool.query(
          `SELECT COUNT(*) FROM kunjungan
           WHERE DATE_TRUNC('month',tanggal)=DATE_TRUNC('month',NOW())
             AND deleted_at IS NULL`
        ),
        QUERY_TIMEOUT, 'kunjungan_bulan_ini'
      ),
      withTimeout(
        pool.query(`SELECT COUNT(*) FROM resep WHERE status='menunggu' AND deleted_at IS NULL`),
        QUERY_TIMEOUT, 'resep_menunggu'
      ),
      withTimeout(
        pool.query('SELECT COUNT(*) FROM obat WHERE deleted_at IS NULL'),
        QUERY_TIMEOUT, 'total_obat'
      ),
      withTimeout(
        pool.query('SELECT COUNT(*) FROM obat WHERE stok<=stok_minimum AND deleted_at IS NULL'),
        QUERY_TIMEOUT, 'stok_rendah'
      ),
      withTimeout(
        pool.query(
          `SELECT COUNT(*) FROM obat
           WHERE tanggal_kadaluarsa<=(CURRENT_DATE+INTERVAL '30 days')
             AND deleted_at IS NULL`
        ),
        QUERY_TIMEOUT, 'hampir_kadaluarsa'
      ),
      withTimeout(
        pool.query(
          `SELECT status, COUNT(*) AS total
           FROM kunjungan WHERE tanggal=$1 AND deleted_at IS NULL
           GROUP BY status`,
          [today]
        ),
        QUERY_TIMEOUT, 'per_status'
      ),
      withTimeout(
        pool.query(
          `SELECT tanggal::date AS tanggal, COUNT(*) AS total
           FROM kunjungan
           WHERE tanggal >= CURRENT_DATE - INTERVAL '6 days' AND deleted_at IS NULL
           GROUP BY tanggal::date ORDER BY tanggal::date`
        ),
        QUERY_TIMEOUT, 'chart_7_hari'
      ),
      withTimeout(
        pool.query(
          `SELECT k.id, k.waktu_daftar, k.status, k.keluhan,
                  p.no_rm, p.nama AS nama_pasien, p.kelas, d.nama AS nama_dokter
           FROM kunjungan k
           JOIN pasien p ON k.pasien_id = p.id
           LEFT JOIN dokter d ON k.dokter_id = d.id
           WHERE k.tanggal=$1 AND k.deleted_at IS NULL
           ORDER BY k.waktu_daftar DESC LIMIT 5`,
          [today]
        ),
        QUERY_TIMEOUT, 'kunjungan_terbaru'
      ),
    ]);

    const result = {
      statistik: {
        total_pasien        : +tp.rows[0].count,
        kunjungan_hari_ini  : +kjHari.rows[0].count,
        kunjungan_bulan_ini : +kjBulan.rows[0].count,
        resep_menunggu      : +resepMenunggu.rows[0].count,
        total_obat          : +totalObat.rows[0].count,
        stok_rendah         : +stokRendah.rows[0].count,
        hampir_kadaluarsa   : +kadaluarsa.rows[0].count,
      },
      kunjungan_per_status : perStatus.rows,
      kunjungan_7_hari     : chart7.rows,
      kunjungan_terbaru    : terbaru.rows,
    };

    // M6: simpan ke cache sebelum kirim ke client
    cache.set(CACHE_KEY, result, DASHBOARD_TTL);
    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'laporanController.getDashboard');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── H4: getLaporanKunjungan — tanggal wajib, batas 3 bulan ───────────────
const getLaporanKunjungan = async (req, res) => {
  try {
    const { tanggal_awal, tanggal_akhir, dokter_id, status } = req.query;

    // H4: wajibkan rentang tanggal
    if (!tanggal_awal || !tanggal_akhir)
      return badRequest(res, 'Tanggal awal dan tanggal akhir wajib diisi');

    if (!isValidDate(tanggal_awal))
      return badRequest(res, 'Format tanggal awal tidak valid');
    if (!isValidDate(tanggal_akhir))
      return badRequest(res, 'Format tanggal akhir tidak valid');

    const start    = new Date(tanggal_awal);
    const end      = new Date(tanggal_akhir);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);

    if (diffDays < 0)
      return badRequest(res, 'Tanggal akhir tidak boleh sebelum tanggal awal');

    // H4: batas maksimal 3 bulan (92 hari) untuk cegah query besar
    if (diffDays > 92)
      return badRequest(res, 'Rentang laporan maksimal 3 bulan (92 hari)');

    const validStatus = ['menunggu', 'diperiksa', 'selesai', 'batal'];
    if (status && !validStatus.includes(status))
      return badRequest(res, 'Status tidak valid');

    const conditions = ['k.deleted_at IS NULL'];
    const params     = [];

    params.push(tanggal_awal);  conditions.push(`k.tanggal >= $${params.length}`);
    params.push(tanggal_akhir); conditions.push(`k.tanggal <= $${params.length}`);

    if (dokter_id) {
      const dId = parseInt(dokter_id);
      if (!isNaN(dId)) { params.push(dId); conditions.push(`k.dokter_id = $${params.length}`); }
    }
    if (status) { params.push(status); conditions.push(`k.status = $${params.length}`); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT k.id, k.tanggal, k.waktu_daftar, k.status, k.keluhan,
              p.no_rm, p.nama AS nama_pasien, p.jenis_kelamin, p.kelas,
              d.nama AS nama_dokter, rm.diagnosa,
              r.id AS resep_id, r.status AS status_resep
       FROM kunjungan k
       JOIN pasien p ON k.pasien_id = p.id
       LEFT JOIN dokter d ON k.dokter_id = d.id
       LEFT JOIN rekam_medis rm ON rm.kunjungan_id = k.id
       LEFT JOIN resep r ON r.kunjungan_id = k.id AND r.deleted_at IS NULL
       ${where}
       ORDER BY k.tanggal DESC, k.waktu_daftar DESC`,
      params
    );

    const ringkasan = { total: rows.length, selesai: 0, menunggu: 0, diperiksa: 0, batal: 0 };
    rows.forEach((r) => { if (ringkasan[r.status] !== undefined) ringkasan[r.status]++; });
    return success(res, { data: rows, ringkasan });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'laporanController.getLaporanKunjungan');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getLaporanObat = async (req, res) => {
  try {
    const { tanggal_awal, tanggal_akhir } = req.query;

    if (tanggal_awal && !isValidDate(tanggal_awal))
      return badRequest(res, 'Format tanggal awal tidak valid');
    if (tanggal_akhir && !isValidDate(tanggal_akhir))
      return badRequest(res, 'Format tanggal akhir tidak valid');

    // Batas rentang jika keduanya diisi
    if (tanggal_awal && tanggal_akhir) {
      const diffDays = (new Date(tanggal_akhir) - new Date(tanggal_awal)) / (1000 * 60 * 60 * 24);
      if (diffDays < 0)  return badRequest(res, 'Tanggal akhir tidak boleh sebelum tanggal awal');
      if (diffDays > 92) return badRequest(res, 'Rentang laporan maksimal 3 bulan (92 hari)');
    }

    const conditions = [`r.status = 'selesai'`, 'r.deleted_at IS NULL'];
    const params     = [];

    if (tanggal_awal)  { params.push(tanggal_awal);  conditions.push(`r.tanggal::date >= $${params.length}`); }
    if (tanggal_akhir) { params.push(tanggal_akhir); conditions.push(`r.tanggal::date <= $${params.length}`); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT o.kode_obat, o.nama AS nama_obat, o.satuan,
              SUM(ri.jumlah)::int        AS total_digunakan,
              COUNT(DISTINCT r.id)::int  AS jumlah_resep
       FROM resep_item ri
       JOIN resep r  ON ri.resep_id  = r.id
       JOIN obat  o  ON ri.obat_id   = o.id
       ${where}
       GROUP BY o.id, o.kode_obat, o.nama, o.satuan
       ORDER BY total_digunakan DESC`,
      params
    );
    return success(res, { data: rows });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'laporanController.getLaporanObat');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getDashboard, getLaporanKunjungan, getLaporanObat };
