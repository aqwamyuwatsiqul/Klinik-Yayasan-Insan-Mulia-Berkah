const pool   = require('../config/database');
const logger = require('../utils/logger');
const { success, created, notFound, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');

const getAll = async (req, res) => {
  try {
    const pg     = parsePagination(req.query);
    const search = (req.query.search || '').trim();
    const { jenis_pasien, aktif } = req.query;

    const conditions = ['deleted_at IS NULL'];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nama ILIKE $${params.length} OR kode_tarif ILIKE $${params.length} OR jenis ILIKE $${params.length})`);
    }
    if (jenis_pasien && ['siswa', 'umum'].includes(jenis_pasien)) {
      params.push(jenis_pasien);
      conditions.push(`(jenis_pasien=$${params.length} OR jenis_pasien IS NULL)`);
    }
    // Filter aktif: '1'=aktif, '0'=nonaktif, tidak diisi=semua
    if (aktif === '1') conditions.push('aktif=TRUE');
    else if (aktif === '0') conditions.push('aktif=FALSE');

    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await paginateQuery(
      pool,
      `SELECT id, kode_tarif, nama, jenis, harga, jenis_pasien, aktif, keterangan, created_at
       FROM tarif_layanan ${where} ORDER BY jenis ASC, nama ASC`,
      params,
      pg
    );
    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'tarifController.getAll');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID tarif tidak valid');
    const row = (await pool.query(
      'SELECT * FROM tarif_layanan WHERE id=$1 AND deleted_at IS NULL', [id]
    )).rows[0];
    if (!row) return notFound(res, 'Tarif tidak ditemukan');
    return success(res, row);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'tarifController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const { nama, jenis, harga = 0, jenis_pasien, aktif = true, keterangan } = req.body;
    if (!nama || !nama.trim()) return badRequest(res, 'Nama tarif wajib diisi');
    const hargaF = Math.max(0, parseFloat(harga) || 0);
    if (jenis_pasien && !['siswa', 'umum'].includes(jenis_pasien))
      return badRequest(res, "jenis_pasien harus 'siswa', 'umum', atau kosong (berlaku semua)");

    const kode_tarif = (await pool.query('SELECT generate_kode_tarif() AS kode')).rows[0].kode;
    const { rows } = await pool.query(
      `INSERT INTO tarif_layanan(kode_tarif, nama, jenis, harga, jenis_pasien, aktif, keterangan)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [kode_tarif, nama.trim(), jenis || null, hargaF, jenis_pasien || null, aktif, keterangan || null]
    );
    return created(res, rows[0], 'Tarif berhasil ditambahkan');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'tarifController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID tarif tidak valid');
    const { nama, jenis, harga, jenis_pasien, aktif, keterangan } = req.body;
    if (!nama || !nama.trim()) return badRequest(res, 'Nama tarif wajib diisi');
    if (jenis_pasien && !['siswa', 'umum'].includes(jenis_pasien))
      return badRequest(res, "jenis_pasien harus 'siswa', 'umum', atau kosong");

    const { rows } = await pool.query(
      `UPDATE tarif_layanan SET nama=$1, jenis=$2, harga=$3, jenis_pasien=$4, aktif=$5, keterangan=$6
       WHERE id=$7 AND deleted_at IS NULL RETURNING *`,
      [nama.trim(), jenis || null, Math.max(0, parseFloat(harga) || 0),
        jenis_pasien || null, aktif !== undefined ? aktif : true, keterangan || null, id]
    );
    if (!rows.length) return notFound(res, 'Tarif tidak ditemukan');
    return success(res, rows[0], 'Tarif berhasil diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'tarifController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID tarif tidak valid');
    const { rows } = await pool.query(
      'UPDATE tarif_layanan SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [id]
    );
    if (!rows.length) return notFound(res, 'Tarif tidak ditemukan');
    return success(res, null, 'Tarif berhasil dihapus');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'tarifController.remove');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAll, getById, create, update, remove };
