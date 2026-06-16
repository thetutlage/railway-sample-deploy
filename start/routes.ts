/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').renderInertia('home', {}).as('home')

/**
 * Health-check endpoint used by Railway (and any uptime monitor) to verify the
 * process is live before routing traffic to a new deployment. Kept lightweight
 * on purpose: it does not touch the database so a transient DB hiccup never
 * blocks an otherwise healthy rollout.
 */
router.get('/health', ({ response }) => response.ok({ status: 'ok' })).as('health')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
