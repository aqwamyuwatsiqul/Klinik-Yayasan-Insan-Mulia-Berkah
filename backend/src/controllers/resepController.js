const pool   = require('../config/database');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/db');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');

const getAntrian = async (req, res) => {
  try {
    const pg = parsePagination(req.query);
    const { status = 'menunggu' } = req.query;
    const validStatus = ['menunggu', 'diproses', 'selesai', 'batal'];
    if (!validStatus.includes(status)) return badRequest(res, 'Status tidak valid');

    // M5 FIX: paginateQuery — satu query COUNT(*) OVER()
    const result = await paginateQuery(
      pool,
      `SELECT r.id, r.tanggal, r.status, r.catatan,
              p.id AS pasien_id, p.no_rm, p.nama AS nama_pasien, p.kelas,
              d.nama AS nama_dokter,
              (SELECT COUNT(*) FROM resep_item ri WHERE ri.resep_id = r.id) AS jumlah_item
       FROM resep r
       JOIN pasien p ON r.pasien_id = p.id
       JOIN dokter d ON r.dokter_id = d.id
       WHERE r.status = $1 AND r.deleted_at IS NULL
       ORDER BY r.tanggal ASC`,
      [status],
      pg
    );
    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'resepController.getAntrian');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID resep tidak valid');

    const resep = (await pool.query(
      `SELECT r.*, p.no_rm, p.nama AS nama_pasien, p.tanggal_lahir, p.jenis_kelamin, p.kelas,
              d.nama AS nama_dokter, d.spesialisasi, u.nama AS nama_apoteker
       FROM resep r
       JOIN pasien p ON r.pasien_id = p.id
       JOIN dokter d ON r.dokter_id = d.id
       LEFT JOIN users u ON r.diserahkan_oleh = u.id
       WHERE r.id = $1 AND r.deleted_at IS NULL`, [id]
    )).rows[0];
    if (!resep) return notFound(res, 'Resep tidak ditemukan');

    if (req.user.role === 'dokter') {
      const dr = (await pool.query(
        'SELECT id FROM dokter WHERE user_id=$1 AND deleted_at IS NULL', [req.user.id]
      )).rows[0];
      if (!dr || dr.id !== resep.dokter_id) return forbidden(res, 'Akses ditolak');
    }

    const items = (await pool.query(
      `SELECT ri.*, o.kode_obat, o.nama AS nama_obat, o.satuan, o.stok
       FROM resep_item ri JOIN obat o ON ri.obat_id = o.id
       WHERE ri.resep_id = $1`, [id]
    )).rows;
    return success(res, { ...resep, items });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'resepController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const { kunjungan_id, catatan, items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return badRequest(res, 'Resep harus memiliki minimal 1 item obat');
    if (items.length > 50)
      return badRequest(res, 'Maksimal 50 item obat per resep');
    for (const item of items) {
      if (!item.obat_id || isNaN(parseInt(item.obat_id))) return badRequest(res, 'ID obat tidak valid');
      if (!item.jumlah || parseInt(item.jumlah) < 1)       return badRequest(res, 'Jumlah obat harus minimal 1');
    }

    // M2 FIX: gunakan withTransaction — ROLLBACK aman di-wrap try-catch
    const resep = await withTransaction(pool, async (client) => {
      const kj = (await client.query(
        'SELECT id, pasien_id, dokter_id FROM kunjungan WHERE id=$1 AND deleted_at IS NULL',
        [parseInt(kunjungan_id)]
      )).rows[0];
      if (!kj) throw Object.assign(new Error('Kunjungan tidak ditemukan'), { statusCode: 404 });

      let dokter_id = kj.dokter_id;
      if (req.user.role === 'dokter') {
        const dr = (await client.query(
          'SELECT id FROM dokter WHERE user_id=$1 AND deleted_at IS NULL', [req.user.id]
        )).rows[0];
        if (dr) dokter_id = dr.id;
      }

      const rm = (await client.query(
        'SELECT id FROM rekam_medis WHERE kunjungan_id=$1 AND deleted_at IS NULL', [kunjungan_id]
      )).rows[0];

      for (const item of items) {
        const obat = (await client.query(
          'SELECT id, nama, stok FROM obat WHERE id=$1 AND deleted_at IS NULL', [parseInt(item.obat_id)]
        )).rows[0];
        if (!obat) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });
        if (obat.stok < parseInt(item.jumlah))
          throw Object.assign(
            new Error(`Stok ${obat.nama} tidak cukup (tersisa: ${obat.stok})`),
            { statusCode: 400 }
          );
      }

      const newResep = (await client.query(
        `INSERT INTO resep(kunjungan_id, rekam_medis_id, dokter_id, pasien_id, catatan, status)
         VALUES($1,$2,$3,$4,$5,'menunggu') RETURNING *`,
        [kunjungan_id, rm?.id || null, dokter_id, kj.pasien_id, catatan || null]
      )).rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO resep_item(resep_id, obat_id, jumlah, dosis, aturan_pakai, keterangan)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [newResep.id, parseInt(item.obat_id), parseInt(item.jumlah),
            item.dosis || null, item.aturan_pakai || null, item.keterangan || null]
        );
      }
      return newResep;
    });

    return created(res, resep, 'Resep berhasil dibuat');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'resepController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const konfirmasi = async (req, res) => {
  try {
    const resepId = parseInt(req.params.id);
    if (isNaN(resepId)) return badRequest(res, 'ID resep tidak valid');

    // M2 FIX: withTransaction membungkus semua termasuk ROLLBACK
    const updated = await withTransaction(pool, async (client) => {
      const resep = (await client.query(
        'SELECT id, status, kunjungan_id FROM resep WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
        [resepId]
      )).rows[0];
      if (!resep) throw Object.assign(new Error('Resep tidak ditemukan'), { statusCode: 404 });
      if (!['menunggu', 'diproses'].includes(resep.status))
        throw Object.assign(new Error('Resep sudah diproses atau dibatalkan'), { statusCode: 400 });

      const items = (await client.query(
        'SELECT ri.obat_id, ri.jumlah, o.harga FROM resep_item ri JOIN obat o ON ri.obat_id = o.id WHERE ri.resep_id=$1',
        [resepId]
      )).rows;

      for (const item of items) {
        const obat = (await client.query(
          'SELECT id, stok, nama, harga FROM obat WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
          [item.obat_id]
        )).rows[0];
        if (!obat) throw Object.assign(new Error('Data obat tidak ditemukan'), { statusCode: 404 });
        if (obat.stok < item.jumlah)
          throw Object.assign(
            new Error(`Stok ${obat.nama} tidak cukup (tersisa: ${obat.stok})`),
            { statusCode: 400 }
          );
        const stokSesudah = obat.stok - item.jumlah;
        await client.query('UPDATE obat SET stok=$1 WHERE id=$2', [stokSesudah, item.obat_id]);
        await client.query(
          `INSERT INTO stok_log(obat_id,tipe,jumlah,stok_sebelum,stok_sesudah,referensi_id,referensi_tipe,keterangan,user_id)
           VALUES($1,'keluar',$2,$3,$4,$5,'resep','Penyerahan resep',$6)`,
          [item.obat_id, item.jumlah, obat.stok, stokSesudah, resepId, req.user.id]
        );
        // Simpan snapshot harga saat konfirmasi — data historis tidak berubah
        // jika harga obat direvisi di masa mendatang
        await client.query(
          'UPDATE resep_item SET harga_satuan=$1 WHERE resep_id=$2 AND obat_id=$3',
          [obat.harga, resepId, item.obat_id]
        );
      }

      const result = (await client.query(
        `UPDATE resep SET status='selesai', diserahkan_oleh=$1, waktu_serah=NOW()
         WHERE id=$2 RETURNING *`,
        [req.user.id, resepId]
      )).rows[0];

      // Status kunjungan → 'menunggu_bayar' (bukan 'selesai')
      // Kasir yang akan mengubah ke 'selesai' setelah pembayaran diterima
      await client.query(
        "UPDATE kunjungan SET status='menunggu_bayar' WHERE id=$1",
        [resep.kunjungan_id]
      );

      return result;
    });

    return success(res, updated, 'Obat berhasil diserahkan');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'resepController.konfirmasi');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAntrian, getById, create, konfirmasi };
