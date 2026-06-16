import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   *
   * Driven by the DB_CONNECTION env variable so the same codebase can deploy
   * against either Postgres or MySQL. The Railway template sets this value for
   * you ("postgres" or "mysql") depending on which database variant you deploy.
   */
  connection: env.get('DB_CONNECTION', 'postgres'),

  connections: {
    /**
     * PostgreSQL connection.
     *
     * Reads a single DATABASE_URL connection string, which maps directly to
     * Railway's `${{Postgres.DATABASE_URL}}` reference variable. Connections go
     * over Railway's private network (*.railway.internal), so SSL is not
     * required. To connect over the public proxy instead, append
     * "?sslmode=require" to the URL.
     */
    postgres: {
      client: 'pg',

      connection: {
        connectionString: env.get('DATABASE_URL'),
      },

      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },

      debug: app.inDev,
    },

    /**
     * MySQL / MariaDB connection.
     *
     * Reads a single MYSQL_URL connection string, which maps directly to
     * Railway's `${{MySQL.MYSQL_URL}}` reference variable. Connections go over
     * Railway's private network (*.railway.internal), so SSL is not required.
     */
    mysql: {
      client: 'mysql2',
      connection: env.get('MYSQL_URL') as any,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },

      debug: app.inDev,
    },
  },
})

export default dbConfig
