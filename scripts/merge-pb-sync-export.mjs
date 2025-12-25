import { readFile, writeFile } from 'node:fs/promises'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  console.error('Uzycie: node scripts/merge-pb-sync-export.mjs <export.json> <output.json>')
  process.exit(1)
}

const loadJson = async (path) => {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw)
}

const saveJson = async (path, data) => {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const exportData = await loadJson(inputPath)

if (!Array.isArray(exportData)) {
  console.error('Plik exportu musi byc tablica kolekcji (jak w Settings > Sync > Export).')
  process.exit(1)
}

const existingIds = new Set(exportData.map((col) => col.id))
const existingNames = new Set(exportData.map((col) => col.name))
const existingFieldIds = new Set()

for (const col of exportData) {
  for (const field of col.fields ?? []) {
    if (field?.id) {
      existingFieldIds.add(field.id)
    }
  }
}

const nextId = (prefix, set) => {
  let n = 9000000001
  while (set.has(`${prefix}${n}`)) {
    n += 1
  }
  const id = `${prefix}${n}`
  set.add(id)
  return id
}

const fieldId = (prefix) => nextId(prefix, existingFieldIds)
const collectionId = () => nextId('pbc_', existingIds)

const baseField = (type, name, extra = {}) => ({
  id: fieldId(type),
  name,
  type,
  system: false,
  required: false,
  unique: false,
  hidden: false,
  presentable: false,
  primaryKey: false,
  ...extra,
})

const textField = (name, required = false, unique = false) =>
  baseField('text', name, {
    required,
    unique,
    min: 0,
    max: 0,
    pattern: '',
    autogeneratePattern: '',
  })

const numberField = (name) =>
  baseField('number', name, {
    min: null,
    max: null,
    noDecimal: false,
  })

const boolField = (name) => baseField('bool', name)

const dateField = (name, required = false) =>
  baseField('date', name, {
    required,
    min: '',
    max: '',
  })

const selectField = (name, values, required = false) =>
  baseField('select', name, {
    required,
    maxSelect: 1,
    values,
  })

const relationField = (name, targetId, maxSelect = 1, required = false) =>
  baseField('relation', name, {
    required,
    collectionId: targetId,
    cascadeDelete: false,
    minSelect: 0,
    maxSelect,
  })

const fileField = (name, maxSelect = 1) =>
  baseField('file', name, {
    maxSelect,
    maxSize: 0,
    mimeTypes: [],
    thumbs: null,
    protected: false,
  })

const createCollection = (name, fields) => ({
  id: collectionId(),
  name,
  type: 'base',
  system: false,
  fields,
  indexes: [],
  listRule: null,
  viewRule: null,
  createRule: null,
  updateRule: null,
  deleteRule: null,
})

const requiredCollections = ['departments', 'tags', 'items', 'documents', 'manuals', 'reminders']
const missing = requiredCollections.filter((name) => !existingNames.has(name))

if (!missing.length) {
  console.log('Brakujace kolekcje: brak. Nic do dodania.')
  await saveJson(outputPath, exportData)
  process.exit(0)
}

const departments = missing.includes('departments')
  ? createCollection('departments', [textField('name', true), textField('color'), textField('icon')])
  : exportData.find((col) => col.name === 'departments')

const tags = missing.includes('tags')
  ? createCollection('tags', [textField('label', true), textField('color')])
  : exportData.find((col) => col.name === 'tags')

if (!departments || !tags) {
  console.error('Brak kolekcji departments/tags w eksporcie i nie udalo sie ich utworzyc.')
  process.exit(1)
}

const items = missing.includes('items')
  ? createCollection('items', [
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
    ])
  : exportData.find((col) => col.name === 'items')

if (!items) {
  console.error('Brak kolekcji items w eksporcie i nie udalo sie jej utworzyc.')
  process.exit(1)
}

const documents = missing.includes('documents')
  ? createCollection('documents', [
      textField('title', true),
      selectField('type', ['invoice', 'receipt', 'warranty', 'other']),
      fileField('file', 10),
      textField('vendor'),
      dateField('issueDate'),
      relationField('items', items.id, 0),
      textField('notes'),
    ])
  : null

const manuals = missing.includes('manuals')
  ? createCollection('manuals', [
      textField('title', true),
      textField('language'),
      fileField('file', 10),
      relationField('items', items.id, 0),
    ])
  : null

const reminders = missing.includes('reminders')
  ? createCollection('reminders', [
      relationField('item', items.id, 1, true),
      dateField('remindAt', true),
      selectField('channel', ['email', 'push', 'none']),
      dateField('sentAt'),
    ])
  : null

const additions = [departments, tags, items, documents, manuals, reminders]
  .filter((col) => col && missing.includes(col.name))
  .map((col) => col)

const merged = [...exportData, ...additions]

await saveJson(outputPath, merged)
console.log(`Dodano kolekcje: ${missing.join(', ')}`)
console.log(`Zapisano plik: ${outputPath}`)
