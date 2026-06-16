import SendWeeklyReport from '#jobs/send_weekly_report'

/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| Define recurring jobs here using cron expressions or duration strings. The
| schedule is registered when the app boots; the jobs themselves are executed
| by the worker process (`node ace queue:work`) — there is no separate
| scheduler process to run.
|
*/

SendWeeklyReport.schedule({ userId: 1 })
  .cron('0 9 * * MON')
  .run()
