import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface SendWeeklyReportPayload {
  userId: number
}

/**
 * Example background job. Dispatch it on demand from anywhere in the app:
 *
 *   await SendWeeklyReport.dispatch({ userId: user.id })
 *
 * Or run it on a recurring schedule from start/scheduler.ts. Either way it is
 * executed by the worker process (`node ace queue:work`).
 */
export default class SendWeeklyReport extends Job<SendWeeklyReportPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    // Your job logic here
    console.log('Processing SendWeeklyReport', this.payload)
  }

  async failed(error: Error) {
    console.error('SendWeeklyReport failed:', error.message)
  }
}
