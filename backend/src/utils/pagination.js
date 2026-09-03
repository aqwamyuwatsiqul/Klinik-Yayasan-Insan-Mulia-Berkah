/**
 * parsePagination — sanitasi parameter pagination dari query string.
 * Mencegah NaN, nilai negatif, dan limit tidak wajar.
 */
const parsePagination = (query = {}) => {
  const page   = Math.max(1, parseInt(query.page)  || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * M5 FIX: paginateQuery — wrapper yang menggabungkan COUNT dan SELECT
 * dalam SATU query menggunakan window function COUNT(*) OVER().
 *
 * Sebelumnya: 2 round-trip ke DB (SELECT COUNT(*) + SELECT data)
 * Sekarang  : 1 round-trip — lebih efisien terutama saat connection pool penuh.
 *
 * @param {object} pool      - pg Pool instance
 * @param {string} baseQuery - Query SELECT tanpa LIMIT/OFFSET, harus include kolom yang dibutuhkan
 * @param {Array}  params    - Parameter untuk WHERE clause (LIMIT & OFFSET ditambah otomatis)
 * @param {object} pagination - Hasil parsePagination({ page, limit, offset })
 * @returns {{ data: Array, pagination: object }}
 *
 * Catatan: baseQuery TIDAK boleh menyertakan LIMIT/OFFSET.
 * Contoh baseQuery:
 *   `SELECT id, nama FROM pasien WHERE deleted_at IS NULL ORDER BY created_at DESC`
 */
const paginateQuery = async (pool, baseQuery, params, pagination) => {
  const { page, limit, offset } = pagination;

  // Inject COUNT(*) OVER() sebagai kolom tambahan
  const wrappedQuery = `
    WITH _base AS (${baseQuery})
    SELECT *, COUNT(*) OVER() AS _total_count
    FROM _base
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const { rows } = await pool.query(wrappedQuery, [...params, limit, offset]);

  const total = rows.length > 0 ? parseInt(rows[0]._total_count) : 0;

  // Hapus kolom _total_count dari setiap baris sebelum dikembalikan
  const data = rows.map(({ _total_count, ...rest }) => rest);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
  };
};

module.exports = { parsePagination, paginateQuery };
