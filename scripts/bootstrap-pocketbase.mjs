const baseUrl = process.env.PB_URL ?? 'http://127.0.0.1:8090'
const email = process.env.PB_EMAIL
const password = process.env.PB_PASSWORD

if (!email || !password) {
  console.error('Brak PB_EMAIL lub PB_PASSWORD w srodowisku.')
  process.exit(1)
}

const openRules = '@request.auth.id != "" || @request.auth.id = ""'

const textField = (name, required = false, unique = false) => ({
  name,
  type: 'text',
  required,
  unique,
  options: { min: null, max: null, pattern: '' },
})

const numberField = (name, required = false) => ({
  name,
  type: 'number',
  required,
  unique: false,
  options: { min: null, max: null, noDecimal: false },
})

const boolField = (name) => ({
  name,
  type: 'bool',
  required: false,
  unique: false,
  options: {},
})

const dateField = (name) => ({
  name,
  type: 'date',
  required: false,
  unique: false,
  options: { min: '', max: '' },
})

const selectField = (name, values, required = false) => ({
  name,
  type: 'select',
  required,
  unique: false,
  options: { maxSelect: 1, values },
})

const relationField = (name, collectionId, maxSelect = 1) => ({
  name,
  type: 'relation',
  required: false,
  unique: false,
  options: {
    collectionId,
    cascadeDelete: false,
    minSelect: 0,
    maxSelect,
  },
})

const fileField = (name, maxSelect = 1) => ({
  name,
  type: 'file',
  required: false,
  unique: false,
  options: {
    maxSelect,
    maxSize: 0,
    mimeTypes: [],
    thumbs: [],
    protected: false,
  },
})

const adminAuth = async () => {
  const response = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Nie udalo sie zalogowac do PocketBase: ${message}`)
  }

  return response.json()
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Blad API: ${response.status} ${message}`)
  }
  return response.json()
}

const run = async () => {
  const { token } = await adminAuth()
  const headers = {
    Authorization: token,
    'Content-Type': 'application/json',
  }

  const collectionsList = await fetchJson(`${baseUrl}/api/collections?perPage=200`, {
    headers,
  })
  const byName = new Map(collectionsList.items.map((item) => [item.name, item]))

  const ensureCollection = async (name, payload) => {
    const existing = byName.get(name)
    if (existing) {
      await fetchJson(`${baseUrl}/api/collections/${existing.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          listRule: openRules,
          viewRule: openRules,
          createRule: openRules,
          updateRule: openRules,
          deleteRule: openRules,
        }),
      })
      return existing
    }

    const created = await fetchJson(`${baseUrl}/api/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    byName.set(name, created)
    return created
  }

  const departments = await ensureCollection('departments', {
    name: 'departments',
    type: 'base',
    schema: [textField('name', true), textField('color'), textField('icon')],
    indexes: [],
    listRule: openRules,
    viewRule: openRules,
    createRule: openRules,
    updateRule: openRules,
    deleteRule: openRules,
  })

  const tags = await ensureCollection('tags', {
    name: 'tags',
    type: 'base',
    schema: [textField('label', true), textField('color')],
    indexes: [],
    listRule: openRules,
    viewRule: openRules,
    createRule: openRules,
    updateRule: openRules,
    deleteRule: openRules,
  })

  await ensureCollection('items', {
    name: 'items',
    type: 'base',
    schema: [
      textField('name', true),
      textField('brand'),
      textField('model'),
      textField('serialNumber', false, true),
      dateField('purchaseDate'),
      selectField('purchaseType', ['online', 'local']),
      textField('purchasePlace'),
      numberField('price'),
      textField('currency'),
      numberField('warrantyMonths'),
      dateField('warrantyEndDate'),
      boolField('insuranceActive'),
      textField('insuranceProvider'),
      boolField('extendedWarranty'),
      selectField('status', ['active', 'archived']),
      relationField('department', departments.id, 1),
      relationField('tags', tags.id, 0),
      fileField('thumbnail', 1),
      textField('notes'),
      textField('searchText'),
    ],
    indexes: [],
    listRule: openRules,
    viewRule: openRules,
    createRule: openRules,
    updateRule: openRules,
    deleteRule: openRules,
  })

  const items = byName.get('items')
  if (!items) {
    throw new Error('Nie udalo sie utworzyc kolekcji items.')
  }

  await ensureCollection('documents', {
    name: 'documents',
    type: 'base',
    schema: [
      textField('title', true),
      selectField('type', ['invoice', 'receipt', 'warranty', 'other']),
      fileField('file', 10),
      textField('vendor'),
      dateField('issueDate'),
      relationField('items', items.id, 0),
      textField('notes'),
    ],
    indexes: [],
    listRule: openRules,
    viewRule: openRules,
    createRule: openRules,
    updateRule: openRules,
    deleteRule: openRules,
  })

  await ensureCollection('manuals', {
    name: 'manuals',
    type: 'base',
    schema: [
      textField('title', true),
      textField('language'),
      fileField('file', 10),
      relationField('items', items.id, 0),
    ],
    indexes: [],
    listRule: openRules,
    viewRule: openRules,
    createRule: openRules,
    updateRule: openRules,
    deleteRule: openRules,
  })

  await ensureCollection('reminders', {
    name: 'reminders',
    type: 'base',
    schema: [
      relationField('item', items.id, 1),
      dateField('remindAt'),
      selectField('channel', ['email', 'push', 'none']),
      dateField('sentAt'),
    ],
    indexes: [],
    listRule: openRules,
    viewRule: openRules,
    createRule: openRules,
    updateRule: openRules,
    deleteRule: openRules,
  })

  const deptList = await fetchJson(
    `${baseUrl}/api/collections/departments/records?page=1&perPage=1`,
    { headers },
  )

  if (deptList.totalItems === 0) {
    const defaults = [
      { name: 'IT', color: '#0B6E4F' },
      { name: 'Foto', color: '#E4572E' },
      { name: 'Audio', color: '#1B2F63' },
      { name: 'Dom', color: '#6C4AB6' },
    ]

    await Promise.all(
      defaults.map((entry) =>
        fetchJson(`${baseUrl}/api/collections/departments/records`, {
          method: 'POST',
          headers,
          body: JSON.stringify(entry),
        }),
      ),
    )
  }

  console.log('PocketBase: kolekcje i dane startowe gotowe.')
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
