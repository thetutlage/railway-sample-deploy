/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  /*
  |----------------------------------------------------------
  | Database
  |----------------------------------------------------------
  |
  | DB_CONNECTION selects the active connection defined in "config/database.ts".
  | The Railway template sets it to "postgres" or "mysql" depending on which
  | database variant you deploy. Only the matching connection string is
  | required, hence both URLs are optional.
  |
  */
  DB_CONNECTION: Env.schema.enum.optional(['postgres', 'mysql'] as const),
  DATABASE_URL: Env.schema.string.optional(),
  MYSQL_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring @adonisjs/queue
  |----------------------------------------------------------
  */
  QUEUE_DRIVER: Env.schema.enum(['redis', 'database', 'sync'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring @adonisjs/redis
  |----------------------------------------------------------
  */
  REDIS_HOST: Env.schema.string.optional({ format: 'host' }),
  REDIS_PORT: Env.schema.number.optional(),
  REDIS_PASSWORD: Env.schema.secret.optional(),
})
