import api from './axios';

export const authAPI = {
  login           : (d) => api.post('/auth/login', d),
  me              : ()  => api.get('/auth/me'),
  changePassword  : (d) => api.put('/auth/change-password', d),
  updateProfile   : (d) => api.put('/auth/profile', d),
  uploadFotoProfil: (formData) => api.post('/auth/foto-profil', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};
export const pasienAPI = {
  getAll:  (p) => api.get('/pasien', { params: p }),
  getById: (id) => api.get(`/pasien/${id}`),
  create:  (d)  => api.post('/pasien', d),
  update:  (id,d) => api.put(`/pasien/${id}`, d),
  remove:  (id) => api.delete(`/pasien/${id}`),
};
export const dokterAPI = {
  getAll:  (p) => api.get('/dokter', { params: p }),
  getById: (id) => api.get(`/dokter/${id}`),
  update:  (id,d) => api.put(`/dokter/${id}`, d),
  remove:  (id) => api.delete(`/dokter/${id}`),
};
export const userAPI = {
  getAll:        (p) => api.get('/users', { params: p }),
  getById:       (id) => api.get(`/users/${id}`),
  create:        (d)  => api.post('/users', d),
  update:        (id,d) => api.put(`/users/${id}`, d),
  resetPassword: (id,d) => api.put(`/users/${id}/reset-password`, d),
  remove:        (id) => api.delete(`/users/${id}`),
};
export const kunjunganAPI = {
  getAntrian:   (p) => api.get('/kunjungan/antrian', { params: p }),
  getById:      (id) => api.get(`/kunjungan/${id}`),
  create:       (d)  => api.post('/kunjungan', d),
  updateStatus: (id,d) => api.patch(`/kunjungan/${id}/status`, d),
  selesaikan:   (id,d) => api.patch(`/kunjungan/${id}/selesaikan`, d),
};
export const rekamMedisAPI = {
  getByKunjungan: (id)   => api.get(`/rekam-medis/kunjungan/${id}`),
  getByPasien:    (id,p) => api.get(`/rekam-medis/pasien/${id}`, { params: p }),
  create:         (d)    => api.post('/rekam-medis', d),
  update:         (id,d) => api.put(`/rekam-medis/${id}`, d),
};
export const resepAPI = {
  getAntrian: (p) => api.get('/resep/antrian', { params: p }),
  getById:    (id) => api.get(`/resep/${id}`),
  create:     (d)  => api.post('/resep', d),
  konfirmasi: (id) => api.patch(`/resep/${id}/konfirmasi`),
};
export const obatAPI = {
  getAll:     (p) => api.get('/obat', { params: p }),
  getById:    (id) => api.get(`/obat/${id}`),
  create:     (d)  => api.post('/obat', d),
  update:     (id,d) => api.put(`/obat/${id}`, d),
  updateStok: (id,d) => api.patch(`/obat/${id}/stok`, d),
  remove:     (id) => api.delete(`/obat/${id}`),
};
export const laporanAPI = {
  getDashboard:        ()  => api.get('/laporan/dashboard'),
  getLaporanKunjungan: (p) => api.get('/laporan/kunjungan', { params: p }),
  getLaporanObat:      (p) => api.get('/laporan/obat', { params: p }),
};

export const tarifAPI = {
  getAll:  (p)    => api.get('/tarif', { params: p }),
  getById: (id)   => api.get(`/tarif/${id}`),
  create:  (d)    => api.post('/tarif', d),
  update:  (id,d) => api.put(`/tarif/${id}`, d),
  remove:  (id)   => api.delete(`/tarif/${id}`),
};
export const pembayaranAPI = {
  getAntrian:      (p)           => api.get('/pembayaran/antrian', { params: p }),
  getPreview:      (kunjunganId) => api.get(`/pembayaran/preview/${kunjunganId}`),
  getRiwayat:      (p)           => api.get('/pembayaran/riwayat', { params: p }),
  getById:         (id)          => api.get(`/pembayaran/${id}`),
  proses:          (kunjunganId, d) => api.post(`/pembayaran/kunjungan/${kunjunganId}`, d),
  void:            (id, d)       => api.patch(`/pembayaran/${id}/void`, d),
};

export const auditAPI = {
  getAll:  (p) => api.get('/audit', { params: p }),
  getUsers: () => api.get('/audit/users'),
};
