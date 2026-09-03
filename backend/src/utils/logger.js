// M8 FIX: gunakan pino bahkan untuk startup — bukan console.error
// Logger ini di-load lebih awal dari dotenv sehingga tidak bergantung env.
const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'warn' : 'info'),

  // Pretty print hanya di development
  ...(isProd
    ? {}
    : {
        transport: {
          target : 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),

  // M7 FIX: redact diperluas — semua field sensitif ditutup di log
  redact: {
    paths: [
      // Auth headers
      'req.headers.authorization',
      'req.headers.cookie',
      // Password variants di body
      'body.password',
      'body.password_baru',
      'body.password_lama',
      'body.password_confirm',
      'body.new_password',
      'body.old_password',
      // Token di body / response
      'body.token',
      '*.token',
      // Wildcard: password di object bersarang manapun
      '*.password',
      '*.password_baru',
      '*.password_lama',
      // Data sensitif pasien yang tidak perlu di log
      'body.no_telepon',
      'body.alamat',
    ],
    censor: '[REDACTED]',
  },

  // Format serializer — pastikan error object ter-log dengan lengkap
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

module.exports = logger;
