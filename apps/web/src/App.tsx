import { useEffect, useMemo, useState } from 'react'
import { baseUrl, pb } from './lib/pocketbase'
import './App.css'

type Department = {
  id: string
  name: string
  color: string
  icon?: string
}

type Tag = {
  id: string
  label: string
  color?: string
}

type Item = {
  id: string
  name: string
  brand: string
  model: string
  serialNumber: string
  departmentId: string
  tags: string[]
  purchaseDate: string
  purchaseType: 'online' | 'local'
  purchasePlace: string
  price: number
  currency: string
  warrantyMonths: number
  warrantyEndDate: string
  insuranceActive: boolean
  extendedWarranty: boolean
  status: 'active' | 'archived'
  notes: string
  thumbnail?: string
  createdAt?: string
}

type DocumentRecord = {
  id: string
  title: string
  type: string
  vendor: string
  issueDate: string
  items: string[]
  files: string[]
}

type ManualRecord = {
  id: string
  title: string
  language: string
  items: string[]
  files: string[]
}

type Reminder = {
  id: string
  itemId: string
  remindAt: string
  channel: string
  sentAt?: string
  itemName?: string
}

type ImportPayload = {
  departments?: Array<{ name: string; color?: string; icon?: string }>
  tags?: Array<{ label: string; color?: string }>
  items?: Array<{
    name?: string
    brand?: string
    model?: string
    serialNumber?: string
    departmentName?: string
    department?: string
    departmentId?: string
    tags?: string[]
    purchaseDate?: string
    purchaseType?: 'online' | 'local'
    purchasePlace?: string
    price?: number
    currency?: string
    warrantyMonths?: number
    warrantyEndDate?: string
    insuranceActive?: boolean
    extendedWarranty?: boolean
    status?: 'active' | 'archived'
    notes?: string
    thumbnailFileName?: string
  }>
  documents?: Array<{
    title?: string
    type?: string
    vendor?: string
    issueDate?: string
    items?: string[]
    itemSerials?: string[]
    itemNames?: string[]
    fileNames?: string[]
    notes?: string
  }>
  manuals?: Array<{
    title?: string
    language?: string
    items?: string[]
    itemSerials?: string[]
    itemNames?: string[]
    fileNames?: string[]
  }>
}

const emptyItem = (departmentId: string, id?: string): Item => ({
  id: id ?? `new-${crypto.randomUUID()}`,
  name: '',
  brand: '',
  model: '',
  serialNumber: '',
  departmentId,
  tags: [],
  purchaseDate: '',
  purchaseType: 'online',
  purchasePlace: '',
  price: 0,
  currency: 'PLN',
  warrantyMonths: 24,
  warrantyEndDate: '',
  insuranceActive: false,
  extendedWarranty: false,
  status: 'active',
  notes: '',
  createdAt: new Date().toISOString(),
})

const normalizeDate = (value?: string) => {
  if (!value) {
    return ''
  }
  if (value.includes('T')) {
    return value.slice(0, 10)
  }
  if (value.includes(' ')) {
    return value.split(' ')[0]
  }
  return value
}

const toIsoDate = (value: string) => (value ? `${value} 00:00:00.000Z` : '')

const daysUntil = (value: string) => {
  if (!value) {
    return null
  }
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return null
  }
  const diff = target.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const formatRelative = (value?: string) => {
  if (!value) {
    return 'brak daty'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) {
    return 'dzisiaj'
  }
  if (diffDays === 1) {
    return '1 dzien temu'
  }
  if (diffDays < 7) {
    return `${diffDays} dni temu`
  }
  return date.toISOString().slice(0, 10)
}

const buildSearchText = (item: Item, departmentName: string) =>
  [
    item.name,
    item.brand,
    item.model,
    item.serialNumber,
    item.purchasePlace,
    departmentName,
    item.tags.join(' '),
    item.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const escapeFilterValue = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const fileUrl = (collection: string, recordId: string, filename: string) =>
  `${baseUrl}/api/files/${collection}/${recordId}/${filename}`

const mapItem = (record: Record<string, any>): Item => {
  const expandedTags = Array.isArray(record.expand?.tags) ? record.expand.tags : []
  const thumbnail = Array.isArray(record.thumbnail)
    ? record.thumbnail[0]
    : record.thumbnail ?? ''

  return {
    id: record.id,
    name: record.name ?? '',
    brand: record.brand ?? '',
    model: record.model ?? '',
    serialNumber: record.serialNumber ?? '',
    departmentId: record.department ?? '',
    tags: expandedTags.map((tag: Record<string, any>) => tag.label ?? '').filter(Boolean),
    purchaseDate: normalizeDate(record.purchaseDate ?? ''),
    purchaseType: record.purchaseType ?? 'online',
    purchasePlace: record.purchasePlace ?? '',
    price: record.price ?? 0,
    currency: record.currency ?? 'PLN',
    warrantyMonths: record.warrantyMonths ?? 0,
    warrantyEndDate: normalizeDate(record.warrantyEndDate ?? ''),
    insuranceActive: record.insuranceActive ?? false,
    extendedWarranty: record.extendedWarranty ?? false,
    status: record.status ?? 'active',
    notes: record.notes ?? '',
    thumbnail,
    createdAt: record.created,
  }
}

const mapDocument = (record: Record<string, any>): DocumentRecord => ({
  id: record.id,
  title: record.title ?? '',
  type: record.type ?? '',
  vendor: record.vendor ?? '',
  issueDate: normalizeDate(record.issueDate ?? ''),
  items: Array.isArray(record.items) ? record.items : [],
  files: Array.isArray(record.file) ? record.file : record.file ? [record.file] : [],
})

const mapManual = (record: Record<string, any>): ManualRecord => ({
  id: record.id,
  title: record.title ?? '',
  language: record.language ?? '',
  items: Array.isArray(record.items) ? record.items : [],
  files: Array.isArray(record.file) ? record.file : record.file ? [record.file] : [],
})

const mapReminder = (record: Record<string, any>): Reminder => {
  const expandedItem = Array.isArray(record.expand?.item)
    ? record.expand?.item[0]
    : record.expand?.item

  return {
    id: record.id,
    itemId: Array.isArray(record.item) ? record.item[0] ?? '' : record.item ?? '',
    remindAt: normalizeDate(record.remindAt ?? ''),
    channel: record.channel ?? 'none',
    sentAt: normalizeDate(record.sentAt ?? ''),
    itemName: expandedItem?.name ?? '',
  }
}

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [manuals, setManuals] = useState<ManualRecord[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState<Item | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importAttachments, setImportAttachments] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [docDraft, setDocDraft] = useState({
    title: '',
    type: 'invoice',
    vendor: '',
    issueDate: '',
    files: [] as File[],
  })
  const [manualDraft, setManualDraft] = useState({
    title: '',
    language: '',
    files: [] as File[],
  })

  const departmentMap = useMemo(
    () => new Map(departments.map((dept) => [dept.id, dept] as const)),
    [departments],
  )

  const stats = useMemo(() => {
    const activeCount = items.filter((item) => item.status === 'active').length
    const archivedCount = items.filter((item) => item.status === 'archived').length
    const insuredCount = items.filter((item) => item.insuranceActive).length
    const expiringSoon = items.filter((item) => {
      if (item.status !== 'active') {
        return false
      }
      const left = daysUntil(item.warrantyEndDate)
      return left !== null && left <= 30
    }).length

    return [
      { label: 'Aktywne sprzety', value: String(activeCount) },
      { label: 'Wygasa w 30 dni', value: String(expiringSoon) },
      { label: 'Z ubezpieczeniem', value: String(insuredCount) },
      { label: 'Zarchiwizowane', value: String(archivedCount) },
    ]
  }, [items])

  const expiringItems = useMemo(() => {
    return items
      .filter((item) => item.status === 'active')
      .map((item) => {
        const daysLeft = daysUntil(item.warrantyEndDate)
        if (daysLeft === null) {
          return null
        }
        return {
          ...item,
          daysLeft,
        }
      })
      .filter((item): item is Item & { daysLeft: number } => item !== null)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3)
  }, [items])

  const upcomingReminderCount = useMemo(() => {
    return reminders.filter((reminder) => {
      const daysLeft = daysUntil(reminder.remindAt)
      return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
    }).length
  }, [reminders])

  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 3)
  }, [items])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return items
    }
    return items.filter((item) => {
      const deptName = departmentMap.get(item.departmentId)?.name ?? ''
      return buildSearchText(item, deptName).includes(q)
    })
  }, [items, query, departmentMap])

  const activeItem = useMemo(() => items.find((item) => item.id === activeId), [items, activeId])

  const activeDocuments = useMemo(
    () => documents.filter((doc) => activeItem && doc.items.includes(activeItem.id)),
    [documents, activeItem],
  )

  const activeManuals = useMemo(
    () => manuals.filter((manual) => activeItem && manual.items.includes(activeItem.id)),
    [manuals, activeItem],
  )

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        departmentRecords,
        tagRecords,
        itemRecords,
        docRecords,
        manualRecords,
        reminderRecords,
      ] = await Promise.all([
        pb.collection('departments').getFullList({ sort: 'name' }),
        pb.collection('tags').getFullList({ sort: 'label' }),
        pb.collection('items').getFullList({ expand: 'department,tags' }),
        pb.collection('documents').getFullList(),
        pb.collection('manuals').getFullList(),
        pb.collection('reminders').getFullList({ sort: 'remindAt', expand: 'item' }),
      ])

      setDepartments(
        departmentRecords.map((record) => ({
          id: record.id,
          name: record.name ?? '',
          color: record.color ?? '#1b2f63',
          icon: record.icon ?? '',
        })),
      )

      setTags(
        tagRecords.map((record) => ({
          id: record.id,
          label: record.label ?? '',
          color: record.color ?? '',
        })),
      )

      const mappedItems = itemRecords.map(mapItem)
      setItems(mappedItems)
      setActiveId(mappedItems[0]?.id ?? '')
      setDraft(mappedItems[0] ?? null)

      setDocuments(docRecords.map(mapDocument))
      setManuals(manualRecords.map(mapManual))
      setReminders(reminderRecords.map(mapReminder))
    } catch (err) {
      setError('Brak polaczenia z PocketBase lub brak kolekcji. Sprawdz pb/schema.md.')
      setItems([])
      setDepartments([])
      setTags([])
      setDocuments([])
      setManuals([])
      setReminders([])
      setActiveId('')
      setDraft(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (activeItem) {
      setDraft(activeItem)
      setThumbnailFile(null)
      setDocDraft((prev) => ({ ...prev, title: '', vendor: '', issueDate: '', files: [] }))
      setManualDraft((prev) => ({ ...prev, title: '', language: '', files: [] }))
    } else if (items[0]) {
      setActiveId(items[0].id)
      setDraft(items[0])
    } else {
      setDraft(null)
    }
  }, [activeItem, items])

  const ensureTags = async (labels: string[]) => {
    const normalized = labels.map((label) => label.trim()).filter(Boolean)
    if (!normalized.length) {
      return []
    }

    const existingMap = new Map(tags.map((tag) => [tag.label.toLowerCase(), tag] as const))
    const missing = normalized.filter((label) => !existingMap.has(label.toLowerCase()))

    if (missing.length) {
      const created = await Promise.all(
        missing.map((label) => pb.collection('tags').create({ label })),
      )
      const newTags = created.map((record) => ({
        id: record.id,
        label: record.label ?? '',
        color: record.color ?? '',
      }))
      setTags((prev) => [...prev, ...newTags])
      newTags.forEach((tag) => existingMap.set(tag.label.toLowerCase(), tag))
    }

    return normalized
      .map((label) => existingMap.get(label.toLowerCase())?.id)
      .filter(Boolean) as string[]
  }

  const ensureDepartments = async (entries: Array<{ name: string; color?: string; icon?: string }>) => {
    const existingMap = new Map(
      departments.map((dept) => [dept.name.toLowerCase(), dept] as const),
    )
    const missing = entries.filter((dept) => !existingMap.has(dept.name.toLowerCase()))

    if (missing.length) {
      const created = await Promise.all(
        missing.map((dept) =>
          pb.collection('departments').create({
            name: dept.name,
            color: dept.color ?? '#1b2f63',
            icon: dept.icon ?? '',
          }),
        ),
      )
      const newDepartments = created.map((record) => ({
        id: record.id,
        name: record.name ?? '',
        color: record.color ?? '#1b2f63',
        icon: record.icon ?? '',
      }))
      setDepartments((prev) => [...prev, ...newDepartments])
      newDepartments.forEach((dept) => existingMap.set(dept.name.toLowerCase(), dept))
    }

    return existingMap
  }

  const handleNew = () => {
    if (!departments[0]) {
      setError('Najpierw dodaj co najmniej jeden dzial w PocketBase.')
      return
    }
    const newItem = emptyItem(departments[0].id)
    setDraft(newItem)
    setActiveId(newItem.id)
  }

  const handleSave = async () => {
    if (!draft) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const departmentName = departmentMap.get(draft.departmentId)?.name ?? ''
      const tagIds = await ensureTags(draft.tags)
      const payload: Record<string, any> = {
        name: draft.name,
        brand: draft.brand,
        model: draft.model,
        serialNumber: draft.serialNumber,
        department: draft.departmentId || null,
        tags: tagIds,
        purchaseDate: draft.purchaseDate ? toIsoDate(draft.purchaseDate) : null,
        purchaseType: draft.purchaseType,
        purchasePlace: draft.purchasePlace,
        price: draft.price,
        currency: draft.currency,
        warrantyMonths: draft.warrantyMonths,
        warrantyEndDate: draft.warrantyEndDate ? toIsoDate(draft.warrantyEndDate) : null,
        insuranceActive: draft.insuranceActive,
        extendedWarranty: draft.extendedWarranty,
        status: draft.status,
        notes: draft.notes,
        searchText: buildSearchText(draft, departmentName),
      }

      if (thumbnailFile) {
        payload.thumbnail = thumbnailFile
      }

      const isNew = draft.id.startsWith('new-')
      const record = isNew
        ? await pb.collection('items').create(payload, { expand: 'department,tags' })
        : await pb.collection('items').update(draft.id, payload, { expand: 'department,tags' })

      const mapped = mapItem(record)
      setItems((prev) => {
        if (isNew) {
          return [mapped, ...prev]
        }
        return prev.map((item) => (item.id === mapped.id ? mapped : item))
      })
      setActiveId(mapped.id)
      setDraft(mapped)
      setThumbnailFile(null)
    } catch (err) {
      setError('Nie udalo sie zapisac zmian. Sprawdz polaczenie z PocketBase.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!draft) {
      return
    }
    if (draft.id.startsWith('new-')) {
      const resetItem = emptyItem(draft.departmentId, draft.id)
      setDraft(resetItem)
      setThumbnailFile(null)
      return
    }
    const activeEntry = items.find((item) => item.id === draft.id)
    if (activeEntry) {
      setDraft(activeEntry)
      setThumbnailFile(null)
    }
  }

  const handleArchive = async (id: string) => {
    const item = items.find((entry) => entry.id === id)
    if (!item) {
      return
    }
    const nextStatus = item.status === 'active' ? 'archived' : 'active'
    setSaving(true)
    setError(null)
    try {
      await pb.collection('items').update(id, { status: nextStatus })
      setItems((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, status: nextStatus } : entry)),
      )
    } catch (err) {
      setError('Nie udalo sie zmienic statusu sprzetu.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Usunac ten sprzet? Tej operacji nie da sie cofnac.')) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await pb.collection('items').delete(id)
      const nextItems = items.filter((item) => item.id !== id)
      setItems(nextItems)
      setActiveId(nextItems[0]?.id ?? '')
      setDraft(nextItems[0] ?? null)
    } catch (err) {
      setError('Nie udalo sie usunac sprzetu.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateDocument = async () => {
    if (!activeItem) {
      return
    }
    if (!docDraft.title.trim()) {
      setError('Podaj tytul dokumentu.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, any> = {
        title: docDraft.title.trim(),
        type: docDraft.type,
        vendor: docDraft.vendor.trim(),
        issueDate: docDraft.issueDate ? toIsoDate(docDraft.issueDate) : null,
        items: [activeItem.id],
      }
      if (docDraft.files.length) {
        payload.file = docDraft.files
      }
      const record = await pb.collection('documents').create(payload)
      setDocuments((prev) => [mapDocument(record), ...prev])
      setDocDraft({ title: '', type: 'invoice', vendor: '', issueDate: '', files: [] })
    } catch (err) {
      setError('Nie udalo sie dodac dokumentu.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateManual = async () => {
    if (!activeItem) {
      return
    }
    if (!manualDraft.title.trim()) {
      setError('Podaj tytul instrukcji.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, any> = {
        title: manualDraft.title.trim(),
        language: manualDraft.language.trim(),
        items: [activeItem.id],
      }
      if (manualDraft.files.length) {
        payload.file = manualDraft.files
      }
      const record = await pb.collection('manuals').create(payload)
      setManuals((prev) => [mapManual(record), ...prev])
      setManualDraft({ title: '', language: '', files: [] })
    } catch (err) {
      setError('Nie udalo sie dodac instrukcji.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Usunac dokument?')) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await pb.collection('documents').delete(id)
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    } catch (err) {
      setError('Nie udalo sie usunac dokumentu.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteManual = async (id: string) => {
    if (!confirm('Usunac instrukcje?')) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await pb.collection('manuals').delete(id)
      setManuals((prev) => prev.filter((manual) => manual.id !== id))
    } catch (err) {
      setError('Nie udalo sie usunac instrukcji.')
    } finally {
      setSaving(false)
    }
  }

  const exportJson = async () => {
    setExporting(true)
    setError(null)
    try {
      const itemMap = new Map(items.map((item) => [item.id, item] as const))
      const payload = {
        exportedAt: new Date().toISOString(),
        baseUrl,
        departments: departments.map((dept) => ({
          name: dept.name,
          color: dept.color,
          icon: dept.icon ?? '',
        })),
        tags: tags.map((tag) => ({ label: tag.label, color: tag.color ?? '' })),
        items: items.map((item) => ({
          name: item.name,
          brand: item.brand,
          model: item.model,
          serialNumber: item.serialNumber,
          departmentName: departmentMap.get(item.departmentId)?.name ?? '',
          tags: item.tags,
          purchaseDate: item.purchaseDate,
          purchaseType: item.purchaseType,
          purchasePlace: item.purchasePlace,
          price: item.price,
          currency: item.currency,
          warrantyMonths: item.warrantyMonths,
          warrantyEndDate: item.warrantyEndDate,
          insuranceActive: item.insuranceActive,
          extendedWarranty: item.extendedWarranty,
          status: item.status,
          notes: item.notes,
          thumbnailFileName: item.thumbnail ?? '',
          thumbnailUrl: item.thumbnail ? fileUrl('items', item.id, item.thumbnail) : '',
        })),
        documents: documents.map((doc) => ({
          title: doc.title,
          type: doc.type,
          vendor: doc.vendor,
          issueDate: doc.issueDate,
          itemSerials: doc.items
            .map((id) => itemMap.get(id)?.serialNumber ?? '')
            .filter(Boolean),
          itemNames: doc.items.map((id) => itemMap.get(id)?.name ?? '').filter(Boolean),
          fileNames: doc.files,
          fileUrls: doc.files.map((file) => fileUrl('documents', doc.id, file)),
        })),
        manuals: manuals.map((manual) => ({
          title: manual.title,
          language: manual.language,
          itemSerials: manual.items
            .map((id) => itemMap.get(id)?.serialNumber ?? '')
            .filter(Boolean),
          itemNames: manual.items.map((id) => itemMap.get(id)?.name ?? '').filter(Boolean),
          fileNames: manual.files,
          fileUrls: manual.files.map((file) => fileUrl('manuals', manual.id, file)),
        })),
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gwgg-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Nie udalo sie wyeksportowac danych.')
    } finally {
      setExporting(false)
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    setError(null)
    try {
      const rows = [
        [
          'name',
          'brand',
          'model',
          'serialNumber',
          'department',
          'tags',
          'purchaseDate',
          'purchaseType',
          'purchasePlace',
          'price',
          'currency',
          'warrantyMonths',
          'warrantyEndDate',
          'insuranceActive',
          'extendedWarranty',
          'status',
          'notes',
        ],
      ]

      items.forEach((item) => {
        rows.push([
          item.name,
          item.brand,
          item.model,
          item.serialNumber,
          departmentMap.get(item.departmentId)?.name ?? '',
          item.tags.join('|'),
          item.purchaseDate,
          item.purchaseType,
          item.purchasePlace,
          String(item.price),
          item.currency,
          String(item.warrantyMonths),
          item.warrantyEndDate,
          item.insuranceActive ? 'true' : 'false',
          item.extendedWarranty ? 'true' : 'false',
          item.status,
          item.notes,
        ])
      })

      const csv = rows
        .map((row) =>
          row
            .map((cell) => {
              const safe = String(cell ?? '')
              if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
                return `"${safe.replace(/"/g, '""')}"`
              }
              return safe
            })
            .join(','),
        )
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gwgg-items-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Nie udalo sie wyeksportowac CSV.')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setImportMessage('Wybierz plik JSON do importu.')
      return
    }
    setImporting(true)
    setImportMessage(null)
    setError(null)
    try {
      const raw = await importFile.text()
      const payload = JSON.parse(raw) as ImportPayload

      const filesByName = new Map(importAttachments.map((file) => [file.name, file] as const))

      const deptEntries = payload.departments ?? []
      const deptMap = await ensureDepartments(deptEntries)

      const tagLabels = new Set<string>()
      payload.tags?.forEach((tag) => tag.label && tagLabels.add(tag.label))
      payload.items?.forEach((item) => item.tags?.forEach((tag) => tagLabels.add(tag)))
      const tagIds = await ensureTags([...tagLabels])
      const tagIdMap = new Map(
        tags
          .concat(
            tagIds
              .map((id) => tags.find((tag) => tag.id === id))
              .filter(Boolean) as Tag[],
          )
          .map((tag) => [tag.label.toLowerCase(), tag.id] as const),
      )

      const createdItemMap = new Map<string, string>()

      if (payload.items?.length) {
        for (const entry of payload.items) {
          const departmentName = entry.departmentName || entry.department || ''
          const departmentId =
            entry.departmentId ||
            (departmentName ? deptMap.get(departmentName.toLowerCase())?.id : '') ||
            departments[0]?.id ||
            ''

          const itemTags = (entry.tags ?? [])
            .map((tag) => tagIdMap.get(tag.toLowerCase()) || '')
            .filter(Boolean)

          const payloadItem: Record<string, any> = {
            name: entry.name ?? '',
            brand: entry.brand ?? '',
            model: entry.model ?? '',
            serialNumber: entry.serialNumber ?? '',
            department: departmentId || null,
            tags: itemTags,
            purchaseDate: entry.purchaseDate ? toIsoDate(normalizeDate(entry.purchaseDate)) : null,
            purchaseType: entry.purchaseType ?? 'online',
            purchasePlace: entry.purchasePlace ?? '',
            price: entry.price ?? 0,
            currency: entry.currency ?? 'PLN',
            warrantyMonths: entry.warrantyMonths ?? 0,
            warrantyEndDate: entry.warrantyEndDate
              ? toIsoDate(normalizeDate(entry.warrantyEndDate))
              : null,
            insuranceActive: entry.insuranceActive ?? false,
            extendedWarranty: entry.extendedWarranty ?? false,
            status: entry.status ?? 'active',
            notes: entry.notes ?? '',
          }

          const thumbnailFileName = entry.thumbnailFileName ?? ''
          const thumbnailFile = thumbnailFileName ? filesByName.get(thumbnailFileName) : null
          if (thumbnailFile) {
            payloadItem.thumbnail = thumbnailFile
          }

          let record: Record<string, any>
          if (entry.serialNumber) {
            try {
              const existing = await pb
                .collection('items')
                .getFirstListItem(`serialNumber="${escapeFilterValue(entry.serialNumber)}"`)
              record = await pb.collection('items').update(existing.id, payloadItem)
            } catch {
              record = await pb.collection('items').create(payloadItem)
            }
          } else {
            record = await pb.collection('items').create(payloadItem)
          }

          if (entry.serialNumber) {
            createdItemMap.set(entry.serialNumber, record.id)
          }
          if (entry.name) {
            createdItemMap.set(entry.name, record.id)
          }
        }
      }

      const importFiles = async (fileNames?: string[]) => {
        if (!fileNames?.length) {
          return []
        }
        return fileNames
          .map((name) => filesByName.get(name))
          .filter(Boolean) as File[]
      }

      if (payload.documents?.length) {
        for (const doc of payload.documents) {
          const itemIds =
            doc.items?.filter(Boolean) ??
            doc.itemSerials
              ?.map((serial) => createdItemMap.get(serial) || '')
              .filter(Boolean) ??
            doc.itemNames
              ?.map((name) => createdItemMap.get(name) || '')
              .filter(Boolean) ??
            []

          if (!doc.title || !itemIds.length) {
            continue
          }

          const fileEntries = await importFiles(doc.fileNames)
          const payloadDoc: Record<string, any> = {
            title: doc.title,
            type: doc.type ?? 'other',
            vendor: doc.vendor ?? '',
            issueDate: doc.issueDate ? toIsoDate(normalizeDate(doc.issueDate)) : null,
            items: itemIds,
            notes: doc.notes ?? '',
          }
          if (fileEntries.length) {
            payloadDoc.file = fileEntries
          }
          await pb.collection('documents').create(payloadDoc)
        }
      }

      if (payload.manuals?.length) {
        for (const manual of payload.manuals) {
          const itemIds =
            manual.items?.filter(Boolean) ??
            manual.itemSerials
              ?.map((serial) => createdItemMap.get(serial) || '')
              .filter(Boolean) ??
            manual.itemNames
              ?.map((name) => createdItemMap.get(name) || '')
              .filter(Boolean) ??
            []

          if (!manual.title || !itemIds.length) {
            continue
          }

          const fileEntries = await importFiles(manual.fileNames)
          const payloadManual: Record<string, any> = {
            title: manual.title,
            language: manual.language ?? '',
            items: itemIds,
          }
          if (fileEntries.length) {
            payloadManual.file = fileEntries
          }
          await pb.collection('manuals').create(payloadManual)
        }
      }

      await loadData()
      setImportMessage('Import zakonczony. Sprawdz liste sprzetow i dokumenty.')
    } catch (err) {
      setImportMessage('Import nie powiodl sie. Sprawdz format pliku.')
    } finally {
      setImporting(false)
    }
  }

  const isNew = draft?.id.startsWith('new-') ?? false
  const actionsDisabled = loading || saving

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            G
          </span>
          <div>
            <p className="brand__name">Gwarancje</p>
            <p className="brand__subtitle">centrum kontroli gwarancji</p>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--ghost" onClick={handleNew} disabled={actionsDisabled}>
            Nowy sprzet
          </button>
          <button className="btn btn--primary" disabled>
            Dodaj dokument
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="hero">
          <div className="hero__content">
            <h1>Sprawdzaj gwarancje zanim bedzie za pozno.</h1>
            <p>
              Szybko kataloguj zakupy, przypisuj dokumenty i dostawaj powiadomienia
              o zblizajacym sie koncu gwarancji.
            </p>
            <div className="hero__search">
              <input
                type="search"
                placeholder="Szukaj po nazwie, numerze seryjnym, dokumencie..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className="btn btn--primary" disabled={actionsDisabled}>
                Szukaj
              </button>
            </div>
            <div className="hero__filters">
              <span>Filtry:</span>
              <button className="chip" disabled>
                Online
              </button>
              <button className="chip" disabled>
                Lokalnie
              </button>
              <button className="chip" disabled>
                Z ubezpieczeniem
              </button>
              <button className="chip" disabled>
                Wygasa wkrotce
              </button>
            </div>
          </div>
          <div className="hero__panel">
            <div className="panel">
              <h3>Nastepne przypomnienia</h3>
              <p>
                {upcomingReminderCount
                  ? `${upcomingReminderCount} urzadzenia wymagaja akcji w tym tygodniu.`
                  : expiringItems.length
                    ? `${expiringItems.length} urzadzenia wygasa wkrotce.`
                    : 'Brak zaplanowanych powiadomien.'}
              </p>
              <div className="panel__footer">
                <span>Backend: {baseUrl}</span>
                <button className="btn btn--ghost" disabled>
                  Otworz panel
                </button>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="notice notice--error">
            <div>
              <strong>Uwaga:</strong> {error}
            </div>
            <div className="notice__actions">
              <button className="btn btn--ghost" onClick={() => window.location.reload()}>
                Sprobuj ponownie
              </button>
            </div>
          </div>
        )}

        {loading && <div className="notice">Ladowanie danych z PocketBase...</div>}

        <section className="stats">
          {stats.map((stat, index) => (
            <div className="stat-card" style={{ animationDelay: `${index * 80}ms` }} key={stat.label}>
              <p className="stat-card__label">{stat.label}</p>
              <p className="stat-card__value">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="grid">
          <div className="card">
            <div className="card__header">
              <h2>Wygasa wkrotce</h2>
              <button className="btn btn--ghost" disabled>
                Zobacz wszystko
              </button>
            </div>
            {expiringItems.length ? (
              <ul className="list">
                {expiringItems.map((item) => (
                  <li key={item.id} className="list__item">
                    <div>
                      <p className="list__title">{item.name}</p>
                      <p className="list__meta">
                        {item.purchasePlace || 'Brak miejsca zakupu'}
                      </p>
                    </div>
                    <div className="list__right">
                      <span className="badge">{item.daysLeft} dni</span>
                      <span className="list__meta">{item.warrantyEndDate}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Brak sprzetu z wygasajaca gwarancja.</p>
            )}
          </div>

          <div className="card">
            <div className="card__header">
              <h2>Ostatnio dodane</h2>
              <button className="btn btn--ghost" onClick={handleNew} disabled={actionsDisabled}>
                Dodaj sprzet
              </button>
            </div>
            {recentItems.length ? (
              <ul className="list">
                {recentItems.map((item) => (
                  <li key={item.id} className="list__item">
                    <div>
                      <p className="list__title">{item.name}</p>
                      <p className="list__meta">Dodano {formatRelative(item.createdAt)}</p>
                    </div>
                    <div className="list__right">
                      <span className="tag">
                        {departmentMap.get(item.departmentId)?.name ?? 'Brak'}
                      </span>
                      <span
                        className={
                          item.status === 'active' ? 'status status--ok' : 'status status--warn'
                        }
                      >
                        {item.status === 'active' ? 'Aktywny' : 'Archiwum'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Brak ostatnio dodanych sprzetow.</p>
            )}
          </div>
        </section>

        <section className="grid grid--full">
          <div className="card full-list">
            <div className="card__header">
              <h2>Pelna lista sprzetow</h2>
              <span className="table__count">{filteredItems.length} pozycji</span>
            </div>
            <div className="table">
              <div className="table__row table__row--head">
                <span>Sprzet</span>
                <span>Dzial</span>
                <span>Gwarancja do</span>
                <span>Status</span>
                <span>Akcje</span>
              </div>
              {filteredItems.length ? (
                filteredItems.map((item) => {
                  const dept = departmentMap.get(item.departmentId)
                  return (
                    <div
                      key={item.id}
                      className={`table__row ${item.id === activeId ? 'table__row--active' : ''}`}
                    >
                      <div>
                        <p className="list__title">{item.name || 'Bez nazwy'}</p>
                        <p className="list__meta">{item.serialNumber || 'Brak SN'}</p>
                      </div>
                      <div className="table__dept">
                        <span
                          className="department__dot"
                          style={{ background: dept?.color ?? '#1b2f63' }}
                        />
                        <span>{dept?.name ?? 'Brak'}</span>
                      </div>
                      <span className="table__date">{item.warrantyEndDate || '---'}</span>
                      <span
                        className={`status ${item.status === 'active' ? 'status--ok' : 'status--warn'}`}
                      >
                        {item.status === 'active' ? 'Aktywny' : 'Archiwum'}
                      </span>
                      <div className="table__actions">
                        <button
                          className="btn btn--ghost"
                          onClick={() => setActiveId(item.id)}
                          disabled={actionsDisabled}
                        >
                          Edytuj
                        </button>
                        <button
                          className="btn btn--ghost"
                          onClick={() => handleArchive(item.id)}
                          disabled={actionsDisabled}
                        >
                          {item.status === 'active' ? 'Archiwizuj' : 'Przywroc'}
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="empty">Brak sprzetu spelniajacego filtr.</p>
              )}
            </div>
          </div>

          <div className="card editor">
            <div className="card__header">
              <h2>Edytuj sprzet</h2>
              <span className="table__pill">
                {departmentMap.get(draft?.departmentId ?? '')?.name ?? 'Brak dzialu'}
              </span>
            </div>
            {!draft ? (
              <p className="empty">Wybierz sprzet z listy lub dodaj nowy.</p>
            ) : (
              <form
                className="editor__form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSave()
                }}
              >
                {isNew && <p className="editor__hint">Tryb tworzenia nowego sprzetu.</p>}
                <label className="field">
                  Nazwa
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                    }
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    Marka
                    <input
                      value={draft.brand}
                      onChange={(event) =>
                        setDraft((prev) => (prev ? { ...prev, brand: event.target.value } : prev))
                      }
                    />
                  </label>
                  <label className="field">
                    Model
                    <input
                      value={draft.model}
                      onChange={(event) =>
                        setDraft((prev) => (prev ? { ...prev, model: event.target.value } : prev))
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  Numer seryjny
                  <input
                    value={draft.serialNumber}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, serialNumber: event.target.value } : prev,
                      )
                    }
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    Data zakupu
                    <input
                      type="date"
                      value={draft.purchaseDate}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, purchaseDate: event.target.value } : prev,
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Zakup
                    <select
                      value={draft.purchaseType}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                purchaseType: event.target.value as Item['purchaseType'],
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="online">Online</option>
                      <option value="local">Lokalnie</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  Miejsce zakupu
                  <input
                    value={draft.purchasePlace}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, purchasePlace: event.target.value } : prev,
                      )
                    }
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    Cena
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, price: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Waluta
                    <input
                      value={draft.currency}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, currency: event.target.value } : prev,
                        )
                      }
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    Gwarancja (miesiace)
                    <input
                      type="number"
                      value={draft.warrantyMonths}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, warrantyMonths: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Koniec gwarancji
                    <input
                      type="date"
                      value={draft.warrantyEndDate}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, warrantyEndDate: event.target.value } : prev,
                        )
                      }
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    Dzial
                    <select
                      value={draft.departmentId}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, departmentId: event.target.value } : prev,
                        )
                      }
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Tagi (po przecinku)
                    <input
                      value={draft.tags.join(', ')}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                tags: event.target.value
                                  .split(',')
                                  .map((tag) => tag.trim())
                                  .filter(Boolean),
                              }
                            : prev,
                        )
                      }
                    />
                  </label>
                </div>
                <div className="field-row field-row--checks">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={draft.insuranceActive}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, insuranceActive: event.target.checked } : prev,
                        )
                      }
                    />
                    Ubezpieczenie aktywne
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={draft.extendedWarranty}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, extendedWarranty: event.target.checked } : prev,
                        )
                      }
                    />
                    Dodatkowa gwarancja
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={draft.status === 'archived'}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                status: event.target.checked ? 'archived' : 'active',
                              }
                            : prev,
                        )
                      }
                    />
                    Zarchiwizowany
                  </label>
                </div>
                <label className="field">
                  Notatki
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                    }
                  />
                </label>
                <label className="field">
                  Miniatura sprzetu
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setThumbnailFile(event.target.files ? event.target.files[0] : null)
                    }
                  />
                  {draft.thumbnail && !thumbnailFile && (
                    <div className="thumb-preview">
                      <img src={fileUrl('items', draft.id, draft.thumbnail)} alt="Miniatura" />
                      <a
                        className="link"
                        href={fileUrl('items', draft.id, draft.thumbnail)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Otworz aktualna miniature
                      </a>
                    </div>
                  )}
                  {thumbnailFile && <p className="file-hint">Nowy plik: {thumbnailFile.name}</p>}
                </label>
                <div className="editor__actions">
                  <button type="button" className="btn btn--ghost" onClick={handleReset}>
                    Cofnij
                  </button>
                  {!isNew && (
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDelete(draft.id)}
                      disabled={actionsDisabled}
                    >
                      Usun
                    </button>
                  )}
                  <button type="submit" className="btn btn--primary" disabled={actionsDisabled}>
                    Zapisz zmiany
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="grid">
          <div className="card">
            <div className="card__header">
              <h2>Dokumenty sprzedazowe</h2>
              <span className="table__count">{activeDocuments.length} plikow</span>
            </div>
            {activeDocuments.length ? (
              <ul className="list">
                {activeDocuments.map((doc) => (
                  <li key={doc.id} className="list__item">
                    <div>
                      <p className="list__title">{doc.title}</p>
                      <p className="list__meta">
                        {doc.type || 'dokument'} • {doc.issueDate || 'brak daty'}
                      </p>
                      <div className="file-list">
                        {doc.files.map((file) => (
                          <a
                            key={file}
                            className="file-chip"
                            href={fileUrl('documents', doc.id, file)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {file}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="list__right">
                      <button
                        className="btn btn--ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={actionsDisabled}
                      >
                        Usun
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Brak dokumentow dla tego sprzetu.</p>
            )}
            <div className="divider" />
            <div className="form-title">Dodaj dokument</div>
            <div className="form-grid">
              <label className="field">
                Tytul
                <input
                  value={docDraft.title}
                  onChange={(event) => setDocDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label className="field">
                Typ
                <select
                  value={docDraft.type}
                  onChange={(event) => setDocDraft((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="invoice">Faktura</option>
                  <option value="receipt">Paragon</option>
                  <option value="warranty">Gwarancja</option>
                  <option value="other">Inne</option>
                </select>
              </label>
              <label className="field">
                Sprzedawca
                <input
                  value={docDraft.vendor}
                  onChange={(event) => setDocDraft((prev) => ({ ...prev, vendor: event.target.value }))}
                />
              </label>
              <label className="field">
                Data wystawienia
                <input
                  type="date"
                  value={docDraft.issueDate}
                  onChange={(event) =>
                    setDocDraft((prev) => ({ ...prev, issueDate: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                Pliki
                <input
                  type="file"
                  multiple
                  onChange={(event) =>
                    setDocDraft((prev) => ({
                      ...prev,
                      files: event.target.files ? Array.from(event.target.files) : [],
                    }))
                  }
                />
              </label>
            </div>
            <div className="editor__actions">
              <button
                className="btn btn--primary"
                onClick={() => void handleCreateDocument()}
                disabled={actionsDisabled || !activeItem}
              >
                Dodaj dokument
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h2>Instrukcje i gwarancje</h2>
              <span className="table__count">{activeManuals.length} plikow</span>
            </div>
            {activeManuals.length ? (
              <ul className="list">
                {activeManuals.map((manual) => (
                  <li key={manual.id} className="list__item">
                    <div>
                      <p className="list__title">{manual.title}</p>
                      <p className="list__meta">{manual.language || 'brak jezyka'}</p>
                      <div className="file-list">
                        {manual.files.map((file) => (
                          <a
                            key={file}
                            className="file-chip"
                            href={fileUrl('manuals', manual.id, file)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {file}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="list__right">
                      <button
                        className="btn btn--ghost"
                        onClick={() => handleDeleteManual(manual.id)}
                        disabled={actionsDisabled}
                      >
                        Usun
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Brak instrukcji dla tego sprzetu.</p>
            )}
            <div className="divider" />
            <div className="form-title">Dodaj instrukcje</div>
            <div className="form-grid">
              <label className="field">
                Tytul
                <input
                  value={manualDraft.title}
                  onChange={(event) =>
                    setManualDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                Jezyk
                <input
                  value={manualDraft.language}
                  onChange={(event) =>
                    setManualDraft((prev) => ({ ...prev, language: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                Pliki
                <input
                  type="file"
                  multiple
                  onChange={(event) =>
                    setManualDraft((prev) => ({
                      ...prev,
                      files: event.target.files ? Array.from(event.target.files) : [],
                    }))
                  }
                />
              </label>
            </div>
            <div className="editor__actions">
              <button
                className="btn btn--primary"
                onClick={() => void handleCreateManual()}
                disabled={actionsDisabled || !activeItem}
              >
                Dodaj instrukcje
              </button>
            </div>
          </div>
        </section>

        <section className="grid">
          <div className="card">
            <div className="card__header">
              <h2>Import / eksport</h2>
              <span className="table__count">JSON + CSV</span>
            </div>
            <div className="import-grid">
              <div>
                <p className="import-title">Eksport danych</p>
                <p className="muted">
                  Eksportuje metadane sprzetu, dokumentow i instrukcji wraz z linkami do plikow.
                </p>
                <div className="editor__actions">
                  <button
                    className="btn btn--ghost"
                    onClick={() => void exportCsv()}
                    disabled={exporting}
                  >
                    Eksport CSV (sprzet)
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={() => void exportJson()}
                    disabled={exporting}
                  >
                    Eksport JSON (pelny)
                  </button>
                </div>
              </div>
              <div>
                <p className="import-title">Import danych</p>
                <p className="muted">
                  Wspiera import JSON oraz dopasowanie zalacznikow po nazwie pliku.
                </p>
                <label className="field">
                  Plik JSON
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(event) =>
                      setImportFile(event.target.files ? event.target.files[0] : null)
                    }
                  />
                </label>
                <label className="field">
                  Zalaczniki (opcjonalnie)
                  <input
                    type="file"
                    multiple
                    onChange={(event) =>
                      setImportAttachments(
                        event.target.files ? Array.from(event.target.files) : [],
                      )
                    }
                  />
                </label>
                <div className="editor__actions">
                  <button
                    className="btn btn--primary"
                    onClick={() => void handleImport()}
                    disabled={importing}
                  >
                    Importuj dane
                  </button>
                </div>
                {importMessage && <p className="muted">{importMessage}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="card departments">
          <div className="card__header">
            <h2>Dzialy</h2>
            <p className="card__subtitle">Kolorowe etykiety pomagaja filtrowac sprzet.</p>
          </div>
          <div className="department-grid">
            {departments.length ? (
              departments.map((dept) => (
                <div className="department" key={dept.id}>
                  <span className="department__dot" style={{ background: dept.color }} />
                  <span>{dept.name}</span>
                </div>
              ))
            ) : (
              <p className="empty">Brak zdefiniowanych dzialow.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
