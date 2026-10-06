// Must be imported before anything else so Sentry can trace http + fetch.
import 'dotenv/config';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0, environment: process.env.NODE_ENV || 'development' });
}
