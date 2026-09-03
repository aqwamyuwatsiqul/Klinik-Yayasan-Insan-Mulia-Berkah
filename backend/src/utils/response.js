const success  = (res, data = null, message = 'Berhasil', code = 200) =>
  res.status(code).json({ success: true, message, data });

const created  = (res, data = null, message = 'Data berhasil dibuat') =>
  success(res, data, message, 201);

const error    = (res, message = 'Terjadi kesalahan', code = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(code).json(body);
};

const notFound    = (res, msg = 'Data tidak ditemukan') => error(res, msg, 404);
const unauthorized = (res, msg = 'Tidak terautentikasi') => error(res, msg, 401);
const forbidden   = (res, msg = 'Akses ditolak')        => error(res, msg, 403);
const badRequest  = (res, msg = 'Request tidak valid', errs = null) => error(res, msg, 400, errs);

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest };
