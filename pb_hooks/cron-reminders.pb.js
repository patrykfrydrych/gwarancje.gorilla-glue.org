const LEAD_DAYS = 30
const CRON_SCHEDULE = '0 7 * * *'

const formatPbDate = (value) => value.toISOString().replace('T', ' ')

const getField = (record, field) =>
  typeof record?.get === 'function' ? record.get(field) : record?.[field]

cron.Add('warranty-reminders', CRON_SCHEDULE, () => {
  const dao = app.dao()
  const remindersCollection = dao.findCollectionByNameOrId('reminders')
  const items = dao.findRecordsByFilter(
    'items',
    "status = 'active' && warrantyEndDate != ''",
    'warrantyEndDate',
    0,
    0,
  )

  if (!items.length) {
    return
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const limit = new Date(today)
  limit.setUTCDate(limit.getUTCDate() + LEAD_DAYS)

  items.forEach((item) => {
    const itemId = item.id ?? getField(item, 'id')
    if (!itemId) {
      return
    }

    const rawDate = getField(item, 'warrantyEndDate')
    if (!rawDate) {
      return
    }

    const endDate = new Date(String(rawDate))
    if (Number.isNaN(endDate.getTime())) {
      return
    }
    const remindAt = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
    )
    if (remindAt < today || remindAt > limit) {
      return
    }
    const remindValue = formatPbDate(remindAt)
    const existing = dao.findRecordsByFilter(
      'reminders',
      `item="${itemId}" && remindAt="${remindValue}"`,
      '',
      1,
      0,
    )

    if (existing.length) {
      return
    }

    const reminder = new Record(remindersCollection)
    reminder.set('item', itemId)
    reminder.set('remindAt', remindValue)
    reminder.set('channel', 'none')
    dao.saveRecord(reminder)
  })
})
