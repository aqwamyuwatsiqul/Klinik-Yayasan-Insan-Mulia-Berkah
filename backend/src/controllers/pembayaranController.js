const pool   = require('../config/database');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/db');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');
const { isValidDate } = require('../utils/validate');
const { recordAudit } = require('../utils/audit');

// ── Antrian kasir: kunjungan menunggu_bayar hari ini ──────────────────────
const getAntrian = async (req, res) => {
  try {
    const tanggal = req.query.tanggal || new Date().toISOString().split('T')[0];
    if (!isValidDate(tanggal)) return badRequest(res, 'Format tanggal tidak valid');

    const { rows } = await pool.query(
      `SELECT
         k.id AS kunjungan_id,
         k.waktu_daftar,
         k.status,
         k.keluhan,
         p.id   AS pasien_id,
         p.no_rm,
         p.nama AS nama_pasien,
         p.kelas,
         p.jenis_pasien,
         d.nama AS nama_dokter,
         -- Sudah ada pembayaran (sudah pernah di-void lalu diproses ulang)?
         pb.id   AS pembayaran_id,
         pb.status AS status_bayar,
         pb.total_tagihan
       FROM kunjungan k
       JOIN pasien p  ON k.pasien_id  = p.id
       LEFT JOIN dokter d  ON k.dokter_id  = d.id
       LEFT JOIN pembayaran pb ON pb.kunjungan_id = k.id
       WHERE k.tanggal = $1
         AND k.status = 'menunggu_bayar'
         AND k.deleted_at IS NULL
       ORDER BY k.waktu_daftar ASC`,
      [tanggal]
    );
    return success(res, rows);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pembayaranController.getAntrian');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Preview tagihan sebelum proses bayar ──────────────────────────────────
// Mengambil data dari resep_item (obat) yang sudah dikonfirmasi
// + tarif yang akan ditambahkan kasir. Tidak ada state yang diubah.
const getPreviewTagihan = async (req, res) => {
  try {
    const kunjunganId = parseInt(req.params.kunjunganId);
    if (isNaN(kunjunganId)) return badRequest(res, 'ID kunjungan tidak valid');

    const kj = (await pool.query(
      `SELECT k.id, k.status, k.pasien_id, p.nama AS nama_pasien, p.no_rm,
              p.jenis_pasien, d.nama AS nama_dokter, k.keluhan, k.waktu_daftar
       FROM kunjungan k
       JOIN pasien p ON k.pasien_id = p.id
       LEFT JOIN dokter d ON k.dokter_id = d.id
       WHERE k.id=$1 AND k.deleted_at IS NULL`, [kunjunganId]
    )).rows[0];
    if (!kj) return notFound(res, 'Kunjungan tidak ditemukan');
    if (kj.status !== 'menunggu_bayar')
      return badRequest(res, `Kunjungan berstatus '${kj.status}', bukan 'menunggu_bayar'`);

    // Item obat dari resep yang sudah dikonfirmasi apoteker
    const itemObat = (await pool.query(
      `SELECT
         ri.obat_id      AS referensi_id,
         o.nama,
         COALESCE(ri.harga_satuan, o.harga) AS harga_satuan,
         ri.jumlah,
         COALESCE(ri.harga_satuan, o.harga) * ri.jumlah AS subtotal
       FROM resep r
       JOIN resep_item ri ON ri.resep_id = r.id
       JOIN obat o        ON o.id = ri.obat_id
       WHERE r.kunjungan_id = $1
         AND r.status = 'selesai'
         AND r.deleted_at IS NULL`,
      [kunjunganId]
    )).rows;

    return success(res, { kunjungan: kj, item_obat: itemObat });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pembayaranController.getPreviewTagihan');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Detail pembayaran yang sudah ada ─────────────────────────────────────
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pembayaran tidak valid');

    const pb = (await pool.query(
      `SELECT pb.*,
              p.nama AS nama_pasien, p.no_rm, p.jenis_pasien,
              k.waktu_daftar, k.keluhan,
              d.nama AS nama_dokter,
              u.nama AS nama_kasir,
              v.nama AS nama_void_oleh
       FROM pembayaran pb
       JOIN kunjungan k  ON pb.kunjungan_id = k.id
       JOIN pasien p     ON pb.pasien_id    = p.id
       LEFT JOIN dokter d  ON k.dokter_id   = d.id
       LEFT JOIN users u   ON pb.kasir_id   = u.id
       LEFT JOIN users v   ON pb.void_oleh  = v.id
       WHERE pb.id=$1`, [id]
    )).rows[0];
    if (!pb) return notFound(res, 'Data pembayaran tidak ditemukan');

    const items = (await pool.query(
      'SELECT * FROM pembayaran_item WHERE pembayaran_id=$1 ORDER BY jenis, nama', [id]
    )).rows;

    return success(res, { ...pb, items });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pembayaranController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Proses pembayaran (kasir/admin) ───────────────────────────────────────
// Body: { metode_bayar, total_bayar, catatan, tarif_ids: [1,2,...] }
// tarif_ids = tarif layanan yang dipilih dokter/admin (dikonfirmasi kasir)
const proses = async (req, res) => {
  try {
    const kunjunganId = parseInt(req.params.kunjunganId);
    if (isNaN(kunjunganId)) return badRequest(res, 'ID kunjungan tidak valid');

    const { metode_bayar, total_bayar, catatan, tarif_ids = [] } = req.body;
    const metodeBayarValid = ['tunai', 'transfer', 'bpjs'];
    if (!metodeBayarValid.includes(metode_bayar))
      return badRequest(res, "metode_bayar harus 'tunai', 'transfer', atau 'bpjs'");
    if (!Array.isArray(tarif_ids))
      return badRequest(res, 'tarif_ids harus berupa array');

    const pembayaran = await withTransaction(pool, async (client) => {
      // Lock kunjungan
      const kj = (await client.query(
        `SELECT k.id, k.status, k.pasien_id, p.jenis_pasien
         FROM kunjungan k JOIN pasien p ON k.pasien_id=p.id
         WHERE k.id=$1 AND k.deleted_at IS NULL FOR UPDATE`, [kunjunganId]
      )).rows[0];
      if (!kj) throw Object.assign(new Error('Kunjungan tidak ditemukan'), { statusCode: 404 });
      if (kj.status !== 'menunggu_bayar')
        throw Object.assign(new Error(`Kunjungan berstatus '${kj.status}', bukan 'menunggu_bayar'`), { statusCode: 400 });

      // Cegah double-pembayaran: cek apakah sudah ada pembayaran lunas
      const existing = (await client.query(
        "SELECT id FROM pembayaran WHERE kunjungan_id=$1 AND status='lunas'", [kunjunganId]
      )).rows[0];
      if (existing)
        throw Object.assign(new Error('Kunjungan ini sudah memiliki pembayaran yang lunas'), { statusCode: 400 });

      // Kumpulkan item obat dari resep yang selesai
      const itemObat = (await client.query(
        `SELECT ri.obat_id AS referensi_id, o.nama,
                COALESCE(ri.harga_satuan, o.harga) AS harga_satuan, ri.jumlah,
                COALESCE(ri.harga_satuan, o.harga) * ri.jumlah AS subtotal
         FROM resep r
         JOIN resep_item ri ON ri.resep_id = r.id
         JOIN obat o        ON o.id = ri.obat_id
         WHERE r.kunjungan_id=$1 AND r.status='selesai' AND r.deleted_at IS NULL`,
        [kunjunganId]
      )).rows;

      // Kumpulkan item tarif layanan
      const itemTarif = [];
      for (const tid of tarif_ids) {
        const tarif = (await client.query(
          'SELECT id, nama, harga FROM tarif_layanan WHERE id=$1 AND aktif=TRUE AND deleted_at IS NULL',
          [parseInt(tid)]
        )).rows[0];
        if (!tarif)
          throw Object.assign(new Error(`Tarif ID ${tid} tidak ditemukan atau tidak aktif`), { statusCode: 400 });
        itemTarif.push({ referensi_id: tarif.id, nama: tarif.nama, harga_satuan: tarif.harga, jumlah: 1, subtotal: tarif.harga });
      }

      const semuaItem = [...itemTarif, ...itemObat];
      const totalTagihan = semuaItem.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

      // Validasi nominal bayar (tunai: harus >= total; lainnya tidak wajib input uang)
      const totalBayarNum = parseFloat(total_bayar) || 0;
      if (metode_bayar === 'tunai' && totalBayarNum < totalTagihan)
        throw Object.assign(
          new Error(`Nominal pembayaran (Rp ${totalBayarNum.toLocaleString('id')}) kurang dari total tagihan (Rp ${totalTagihan.toLocaleString('id')})`),
          { statusCode: 400 }
        );

      const kembalian = metode_bayar === 'tunai' ? totalBayarNum - totalTagihan : 0;

      // Buat record pembayaran
      const pb = (await client.query(
        `INSERT INTO pembayaran(kunjungan_id, pasien_id, total_tagihan, total_bayar, kembalian,
                                metode_bayar, status, kasir_id, waktu_bayar, catatan)
         VALUES($1,$2,$3,$4,$5,$6,'lunas',$7,NOW(),$8)
         RETURNING *`,
        [kunjunganId, kj.pasien_id, totalTagihan,
          metode_bayar === 'tunai' ? totalBayarNum : totalTagihan,
          kembalian, metode_bayar, req.user.id, catatan || null]
      )).rows[0];

      // Insert rincian item
      for (const item of semuaItem) {
        await client.query(
          `INSERT INTO pembayaran_item(pembayaran_id, jenis, referensi_id, nama, harga_satuan, jumlah, subtotal)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [pb.id,
           item.referensi_id && itemTarif.find(t => t.referensi_id === item.referensi_id) ? 'tarif' : 'obat',
           item.referensi_id, item.nama, item.harga_satuan, item.jumlah, item.subtotal]
        );
      }

      // Kunjungan selesai
      await client.query("UPDATE kunjungan SET status='selesai' WHERE id=$1", [kunjunganId]);

      return { ...pb, kembalian, total_tagihan: totalTagihan };
    });

    return created(res, pembayaran, 'Pembayaran berhasil dicatat');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'pembayaranController.proses');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Void transaksi (owner only) ───────────────────────────────────────────
const voidPembayaran = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pembayaran tidak valid');

    const { alasan_void } = req.body;
    if (!alasan_void || String(alasan_void).trim().length < 10)
      return badRequest(res, 'Alasan void wajib diisi (minimal 10 karakter)');

    const updated = await withTransaction(pool, async (client) => {
      const pb = (await client.query(
        "SELECT id, status, kunjungan_id FROM pembayaran WHERE id=$1 FOR UPDATE", [id]
      )).rows[0];
      if (!pb) throw Object.assign(new Error('Data pembayaran tidak ditemukan'), { statusCode: 404 });
      if (pb.status !== 'lunas')
        throw Object.assign(new Error(`Hanya pembayaran berstatus 'lunas' yang dapat di-void`), { statusCode: 400 });

      const result = (await client.query(
        `UPDATE pembayaran
         SET status='void', void_oleh=$1, waktu_void=NOW(), alasan_void=$2
         WHERE id=$3 RETURNING *`,
        [req.user.id, alasan_void.trim(), id]
      )).rows[0];

      // Kembalikan kunjungan ke menunggu_bayar agar bisa diproses ulang
      await client.query(
        "UPDATE kunjungan SET status='menunggu_bayar' WHERE id=$1", [pb.kunjungan_id]
      );

      return result;
    });

    // Catat void ke audit log setelah response terkirim (fire-and-forget)
    // Menggunakan res.on('finish') agar tidak menunda response ke client
    res.on('finish', () => {
      // Ambil info pasien untuk deskripsi yang informatif
      pool.query(
        `SELECT p.nama AS nama_pasien, pb.total_tagihan
         FROM pembayaran pb JOIN pasien p ON pb.pasien_id=p.id WHERE pb.id=$1`, [id]
      ).then(({ rows }) => {
        const info = rows[0] || {};
        recordAudit(pool, logger, {
          userId    : req.user.id,
          userName  : req.user.nama,
          userRole  : req.user.role,
          aksi      : 'VOID_PEMBAYARAN',
          entitas   : 'pembayaran',
          entitasId : id,
          deskripsi : `Pembayaran #${id} di-void (pasien: ${info.nama_pasien ?? '-'}, total: Rp ${Number(info.total_tagihan ?? 0).toLocaleString('id')})`,
          perubahan : { alasan: alasan_void.trim() },
          ipAddress : req.ip,
        });
      }).catch(() => {});
    });

    return success(res, updated, 'Transaksi berhasil di-void');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'pembayaranController.void');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Riwayat transaksi (admin & owner) ────────────────────────────────────
const getRiwayat = async (req, res) => {
  try {
    const pg = parsePagination(req.query);
    const { tanggal_awal, tanggal_akhir, status, metode_bayar } = req.query;

    const conditions = ['pb.waktu_bayar IS NOT NULL OR pb.status=\'void\''];
    const params     = [];

    if (tanggal_awal) {
      if (!isValidDate(tanggal_awal)) return badRequest(res, 'Format tanggal awal tidak valid');
      params.push(tanggal_awal);
      conditions.push(`pb.created_at::date >= $${params.length}`);
    }
    if (tanggal_akhir) {
      if (!isValidDate(tanggal_akhir)) return badRequest(res, 'Format tanggal akhir tidak valid');
      params.push(tanggal_akhir);
      conditions.push(`pb.created_at::date <= $${params.length}`);
    }
    if (status && ['lunas', 'void'].includes(status)) {
      params.push(status);
      conditions.push(`pb.status=$${params.length}`);
    }
    if (metode_bayar && ['tunai', 'transfer', 'bpjs'].includes(metode_bayar)) {
      params.push(metode_bayar);
      conditions.push(`pb.metode_bayar=$${params.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await paginateQuery(
      pool,
      `SELECT pb.id, pb.status, pb.metode_bayar, pb.total_tagihan, pb.total_bayar,
              pb.kembalian, pb.waktu_bayar, pb.alasan_void, pb.waktu_void,
              p.no_rm, p.nama AS nama_pasien, p.jenis_pasien,
              d.nama AS nama_dokter,
              k.waktu_daftar,
              u.nama AS nama_kasir,
              v.nama AS nama_void_oleh
       FROM pembayaran pb
       JOIN pasien p    ON pb.pasien_id     = p.id
       JOIN kunjungan k ON pb.kunjungan_id  = k.id
       LEFT JOIN dokter d ON k.dokter_id    = d.id
       LEFT JOIN users u  ON pb.kasir_id    = u.id
       LEFT JOIN users v  ON pb.void_oleh   = v.id
       ${where}
       ORDER BY pb.created_at DESC`,
      params,
      pg
    );

    // Agregat total untuk summary
    const agg = (await pool.query(
      `SELECT
         COUNT(*) FILTER(WHERE pb.status='lunas') AS total_transaksi,
         COALESCE(SUM(pb.total_tagihan) FILTER(WHERE pb.status='lunas'), 0) AS total_pendapatan,
         COUNT(*) FILTER(WHERE pb.status='void')  AS total_void
       FROM pembayaran pb ${where}`,
      params
    )).rows[0];

    return success(res, { ...result, summary: agg });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pembayaranController.getRiwayat');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAntrian, getPreviewTagihan, getById, proses, voidPembayaran, getRiwayat };
