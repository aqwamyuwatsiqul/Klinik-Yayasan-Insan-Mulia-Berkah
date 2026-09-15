/**
 * Entry point Vercel Serverless Function.
 *
 * Vercel membaca file ini dan menggunakan export default-nya
 * sebagai request handler. Kita cukup re-export Express app
 * yang sudah dikonfigurasi dari src/index.js.
 *
 * src/index.js sudah mendeteksi process.env.VERCEL — jika
 * ada, app.listen() tidak akan dipanggil.
 */
const app = require('../src/index');

module.exports = app;
