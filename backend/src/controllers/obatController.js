const pool   = require('../config/database');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/db');
const { success, created, notFound, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');
const { isValidDate } = require('../utils/validate');

const getAll = async (req, res) => {
  try {
    const pg     = parsePagination(req.query);
    const search = (req.query.search || '').trim();
    const { alert } = req.query;

    const validAlerts = ['stok_rendah', 'kadaluarsa', ''];
    if (alert && !validAlerts.includes(alert))
      return badRequest(res, 'Parameter alert tidak valid');

    const conditions = ['deleted_at IS NULL'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nama ILIKE $${params.length} OR kode_obat ILIKE $${params.length})`);
    }
    if (alert === 'stok_rendah')  conditions.push('stok <= stok_minimum');
    else if (alert === 'kadaluarsa') conditions.push(`tanggal_kadaluarsa <= (CURRENT_DATE + INTERVAL '30 days')`);

    const where = 'WHERE ' + conditions.join(' AND ');

    // M5 FIX: paginateQuery — satu query COUNT(*) OVER() menggantikan double round-trip
    const result = await paginateQuery(
      pool,
      `SELECT id, kode_obat, nama, jenis, satuan, stok, stok_minimum, harga,
              tanggal_kadaluarsa, keterangan,
              (stok <= stok_minimum) AS stok_rendah,
              (tanggal_kadaluarsa <= (CURRENT_DATE + INTERVAL '30 days')) AS hampir_kadaluarsa
       FROM obat ${where} ORDER BY nama ASC`,
      params,
      pg
    );

    const alertRow = (await pool.query(
      `SELECT COUNT(*) FILTER(WHERE stok <= stok_minimum) AS stok_rendah,
              COUNT(*) FILTER(WHERE tanggal_kadaluarsa <= (CURRENT_DATE + INTERVAL '30 days')) AS hampir_kadaluarsa
       FROM obat WHERE deleted_at IS NULL`
    )).rows[0];

    return success(res, { ...result, alerts: alertRow });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'obatController.getAll');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID obat tidak valid');

    const obat = (await pool.query(
      'SELECT * FROM obat WHERE id=$1 AND deleted_at IS NULL', [id]
    )).rows[0];
    if (!obat) return notFound(res, 'Obat tidak ditemukan');

    const log = (await pool.query(
      `SELECT sl.*, u.nama AS nama_user
       FROM stok_log sl LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.obat_id = $1 ORDER BY sl.created_at DESC LIMIT 10`,
      [id]
    )).rows;
    return success(res, { ...obat, log_stok: log });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'obatController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const {
      nama, jenis, satuan, stok = 0, stok_minimum = 10,
      harga = 0, tanggal_kadaluarsa, keterangan,
    } = req.body;

    if (tanggal_kadaluarsa && !isValidDate(tanggal_kadaluarsa))
      return badRequest(res, 'Format tanggal kadaluarsa tidak valid');

    const stokInt = Math.max(0, parseInt(stok) || 0);
    const minInt  = Math.max(0, parseInt(stok_minimum) || 10);
    const hargaF  = Math.max(0, parseFloat(harga) || 0);

    const obat = await withTransaction(pool, async (client) => {
      const kode_obat = (await client.query('SELECT generate_kode_obat() AS kode')).rows[0].kode;
      const { rows } = await client.query(
        `INSERT INTO obat(kode_obat, nama, jenis, satuan, stok, stok_minimum, harga, tanggal_kadaluarsa, keterangan)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [kode_obat, nama.trim(), jenis || null, satuan.trim(), stokInt, minInt, hargaF,
          tanggal_kadaluarsa || null, keterangan || null]
      );
      if (stokInt > 0) {
        await client.query(
          `INSERT INTO stok_log(obat_id, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan, user_id)
           VALUES($1,'masuk',$2,0,$3,'Stok awal',$4)`,
          [rows[0].id, stokInt, stokInt, req.user.id]
        );
      }
      return rows[0];
    });

    return created(res, obat, 'Obat berhasil ditambahkan');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'obatController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID obat tidak valid');

    const { nama, jenis, satuan, stok_minimum = 10, harga = 0, tanggal_kadaluarsa, keterangan } = req.body;
    if (!nama?.trim()) return badRequest(res, 'Nama obat wajib diisi');
    if (!satuan?.trim()) return badRequest(res, 'Satuan wajib diisi');
    if (tanggal_kadaluarsa && !isValidDate(tanggal_kadaluarsa))
      return badRequest(res, 'Format tanggal kadaluarsa tidak valid');

    const { rows } = await pool.query(
      `UPDATE obat SET nama=$1, jenis=$2, satuan=$3, stok_minimum=$4, harga=$5,
              tanggal_kadaluarsa=$6, keterangan=$7
       WHERE id=$8 AND deleted_at IS NULL RETURNING *`,
      [nama.trim(), jenis || null, satuan.trim(),
        Math.max(0, parseInt(stok_minimum) || 10),
        Math.max(0, parseFloat(harga) || 0),
        tanggal_kadaluarsa || null, keterangan || null, id]
    );
    if (!rows.length) return notFound(res, 'Obat tidak ditemukan');
    return success(res, rows[0], 'Data obat diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'obatController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateStok = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID obat tidak valid');

    const { tipe, jumlah, keterangan } = req.body;
    if (!['masuk', 'keluar', 'koreksi'].includes(tipe))
      return badRequest(res, 'Tipe harus masuk, keluar, atau koreksi');

    const jumlahInt = parseInt(jumlah);
    if (!jumlah || isNaN(jumlahInt) || jumlahInt < 1)
      return badRequest(res, 'Jumlah harus berupa angka positif');

    // Gunakan withTransaction — BEGIN/ROLLBACK/COMMIT aman (M2 fix)
    const result = await withTransaction(pool, async (client) => {
      // FOR UPDATE untuk cegah race condition (lock baris sebelum baca stok)
      const obat = (await client.query(
        'SELECT id, stok, nama FROM obat WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
        [id]
      )).rows[0];
      if (!obat) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

      const stokSebelum = obat.stok;
      let stokSesudah;

      if (tipe === 'masuk') {
        stokSesudah = stokSebelum + jumlahInt;
      } else if (tipe === 'keluar') {
        if (stokSebelum < jumlahInt)
          throw Object.assign(
            new Error(`Stok tidak mencukupi (tersisa: ${stokSebelum})`),
            { statusCode: 400 }
          );
        stokSesudah = stokSebelum - jumlahInt;
      } else {
        stokSesudah = jumlahInt; // koreksi: set langsung
      }

      await client.query('UPDATE obat SET stok=$1 WHERE id=$2', [stokSesudah, id]);
      await client.query(
        `INSERT INTO stok_log(obat_id,tipe,jumlah,stok_sebelum,stok_sesudah,keterangan,user_id)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, tipe, jumlahInt, stokSebelum, stokSesudah, keterangan || null, req.user.id]
      );

      return { stok_sebelum: stokSebelum, stok_sesudah: stokSesudah };
    });

    return success(res, result, 'Stok berhasil diperbarui');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'obatController.updateStok');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID obat tidak valid');

    // Cegah hapus obat yang sedang ada di resep aktif — akan membuat
    // resep tidak bisa dikonfirmasi dan kunjungan stuck
    const resepAktif = (await pool.query(
      `SELECT r.id FROM resep_item ri
       JOIN resep r ON ri.resep_id = r.id
       WHERE ri.obat_id = $1
         AND r.status IN ('menunggu', 'diproses')
         AND r.deleted_at IS NULL
       LIMIT 1`,
      [id]
    )).rows;
    if (resepAktif.length)
      return badRequest(res, 'Obat tidak dapat dihapus karena masih digunakan di resep aktif. Selesaikan atau batalkan resep terkait terlebih dahulu.');

    const { rows } = await pool.query(
      'UPDATE obat SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [id]
    );
    if (!rows.length) return notFound(res, 'Obat tidak ditemukan');
    return success(res, null, 'Obat berhasil dihapus');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'obatController.remove');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAll, getById, create, update, updateStok, remove };
