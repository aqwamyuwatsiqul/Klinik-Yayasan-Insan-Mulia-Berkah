const { badRequest } = require('./response');

/** Validasi tanggal — menolak string bukan-tanggal */
const isValidDate = (d) => {
  if (!d) return true; // nullable OK
  const parsed = new Date(d);
  return !isNaN(parsed.getTime());
};

/** Validasi string wajib, trim, min/max length */
const requireString = (value, fieldName, min = 1, max = 500) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return `${fieldName} wajib diisi`;
  }
  if (value.trim().length < min) return `${fieldName} minimal ${min} karakter`;
  if (value.trim().length > max) return `${fieldName} maksimal ${max} karakter`;
  return null;
};

/** Middleware validasi body pasien */
const validatePasien = (req, res, next) => {
  const { nama, tanggal_lahir, jenis_kelamin, jenis_pasien, kelas, nik } = req.body;

  // Nama wajib
  const errNama = requireString(nama, 'Nama', 2, 200);
  if (errNama) return badRequest(res, errNama);

  // Tanggal lahir opsional tapi harus valid jika diisi
  if (tanggal_lahir && !isValidDate(tanggal_lahir))
    return badRequest(res, 'Format tanggal lahir tidak valid');

  // Jenis kelamin
  if (jenis_kelamin && !['Laki-laki', 'Perempuan'].includes(jenis_kelamin))
    return badRequest(res, 'Jenis kelamin harus Laki-laki atau Perempuan');

  // Jenis pasien — default ke 'siswa' jika tidak dikirim
  const jenisPasienVal = jenis_pasien || 'siswa';
  if (!['siswa', 'umum'].includes(jenisPasienVal))
    return badRequest(res, "Jenis pasien harus 'siswa' atau 'umum'");

  // Kelas wajib diisi jika jenis_pasien = siswa
  if (jenisPasienVal === 'siswa') {
    const errKelas = requireString(kelas, 'Kelas', 1, 50);
    if (errKelas) return badRequest(res, 'Kelas wajib diisi untuk pasien siswa');
  }

  // NIK: opsional, tapi jika diisi harus 16 digit angka
  if (nik && !/^\d{16}$/.test(String(nik).trim()))
    return badRequest(res, 'NIK harus berupa 16 digit angka');

  req.body.nama         = nama.trim();
  req.body.jenis_pasien = jenisPasienVal;
  next();
};

/** Middleware validasi body user (create) */
const validateUserCreate = (req, res, next) => {
  const { nama, username, password, role } = req.body;
  const validRoles = ['admin', 'dokter', 'apoteker', 'owner', 'kasir'];

  // FIX #4: tolak tipe non-primitif sebelum String() bisa menghasilkan "[object Object]"
  if (typeof username !== 'string' && typeof username !== 'number')
    return badRequest(res, 'Username harus berupa teks');

  let err = requireString(nama, 'Nama', 2, 200);
  if (err) return badRequest(res, err);
  err = requireString(String(username), 'Username', 3, 50);
  if (err) return badRequest(res, err);
  if (!/^[a-zA-Z0-9_]+$/.test(String(username)))
    return badRequest(res, 'Username hanya boleh huruf, angka, dan underscore');
  if (!validRoles.includes(role))
    return badRequest(res, 'Role tidak valid. Pilih: admin, dokter, apoteker, owner, atau kasir');
  if (!password || password.length < 8)
    return badRequest(res, 'Password minimal 8 karakter');
  next();
};

/** Middleware validasi body user (update) */
const validateUserUpdate = (req, res, next) => {
  const { nama, role } = req.body;
  const validRoles = ['admin', 'dokter', 'apoteker', 'owner', 'kasir'];
  const err = requireString(nama, 'Nama', 2, 200);
  if (err) return badRequest(res, err);
  if (role && !validRoles.includes(role))
    return badRequest(res, 'Role tidak valid');
  next();
};

/** Middleware validasi data obat */
const validateObat = (req, res, next) => {
  const { nama, satuan } = req.body;
  let err = requireString(nama, 'Nama obat', 2, 200);
  if (err) return badRequest(res, err);
  err = requireString(satuan, 'Satuan', 1, 50);
  if (err) return badRequest(res, err);
  next();
};

/** Middleware validasi kunjungan */
const validateKunjungan = (req, res, next) => {
  const { pasien_id, tanggal } = req.body;
  if (!pasien_id || isNaN(parseInt(pasien_id)))
    return badRequest(res, 'ID pasien tidak valid');
  if (tanggal && !isValidDate(tanggal))
    return badRequest(res, 'Format tanggal tidak valid');
  next();
};

module.exports = {
  isValidDate,
  requireString,
  validatePasien,
  validateUserCreate,
  validateUserUpdate,
  validateObat,
  validateKunjungan,
};
