import { useCallback, useEffect, useMemo, useState, useRef, useId } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { utils, writeFile } from 'xlsx'
import { API_URL } from './config'
import './App.css'

const QUERIES = {
  login: `mutation Login($usuario: String!, $password: String!) {
    login(usuario: $usuario, password: $password)
  }`,
  perfilActual: `query PerfilActual {
    perfilActual {
      id
      nombre
      nombreUsuario
      rol
    }
  }`,
  items: `query Items {
    items {
      id
      categoriaId
      ubicacionId
      codigoMaterial
      nombreMaterial
      descripcionMaterial
      cantidadStock
      localizacion
      unidadMedida
    }
  }`,
  categorias: `query Categorias {
    categorias {
      id
      nombre
      descripcion
    }
  }`,
  ubicaciones: `query Ubicaciones {
    ubicaciones {
      id
      nombre
      descripcion
    }
  }`,
  recepciones: `query Recepciones {
    recepciones {
      id
      itemId
      fecha
      recibidoDe
      codigoMaterial
      descripcionMaterial
      cantidadRecibida
      unidadMedida
      observaciones
      esSinRegistro
    }
  }`,
  entregas: `query Entregas {
    entregas {
      id
      itemId
      fecha
      entregadoA
      codigoMaterial
      descripcionMaterial
      cantidadEntregada
      unidadMedida
      observaciones
      esSinRegistro
    }
  }`,
  reporte: `query ReporteMensual($desde: DateTime!, $hasta: DateTime!) {
    reporteMensual(desde: $desde, hasta: $hasta) {
      itemId
      codigoMaterial
      nombreMaterial
      descripcionMaterial
      totalEntradas
      totalSalidas
      totalEntradasSinRegistro
      totalSalidasSinRegistro
      stockDespuesBalance
      unidadMedida
    }
  }`,
  kardex: `query KardexPorCodigo($codigoMaterial: String!, $itemId: String) {
    kardexPorCodigoMaterial(codigoMaterial: $codigoMaterial, itemId: $itemId) {
      codigoMaterial
      nombreMaterial
      stockActual
      movimientos {
        fecha
        tipo
        referencia
        descripcion
        observaciones
        cantidad
        unidadMedida
        origen
        registroId
        esSinRegistro
      }
    }
  }`,
  crearItem: `mutation CrearItem($input: ItemInput!) {
    crearItem(input: $input) {
      id
      categoriaId
      ubicacionId
      codigoMaterial
      nombreMaterial
      descripcionMaterial
      cantidadStock
      localizacion
      unidadMedida
    }
  }`,
  actualizarItem: `mutation ActualizarItem($input: ItemUpdateInput!) {
    actualizarItem(input: $input) {
      id
      categoriaId
      ubicacionId
      codigoMaterial
      nombreMaterial
      descripcionMaterial
      cantidadStock
      localizacion
      unidadMedida
    }
  }`,
  eliminarItem: `mutation EliminarItem($id: String!) {
    eliminarItem(id: $id)
  }`,
  crearCategoria: `mutation CrearCategoria($input: CategoriaInput!) {
    crearCategoria(input: $input) {
      id
      nombre
      descripcion
    }
  }`,
  actualizarCategoria: `mutation ActualizarCategoria($input: CategoriaUpdateInput!) {
    actualizarCategoria(input: $input) {
      id
      nombre
      descripcion
    }
  }`,
  eliminarCategoria: `mutation EliminarCategoria($id: String!) {
    eliminarCategoria(id: $id)
  }`,
  crearUbicacion: `mutation CrearUbicacion($input: UbicacionInput!) {
    crearUbicacion(input: $input) {
      id
      nombre
      descripcion
    }
  }`,
  actualizarUbicacion: `mutation ActualizarUbicacion($input: UbicacionUpdateInput!) {
    actualizarUbicacion(input: $input) {
      id
      nombre
      descripcion
    }
  }`,
  eliminarUbicacion: `mutation EliminarUbicacion($id: String!) {
    eliminarUbicacion(id: $id)
  }`,
  crearRecepcion: `mutation CrearRecepcion($input: RecepcionInput!) {
    crearRecepcion(input: $input) {
      id
      itemId
      fecha
      recibidoDe
      codigoMaterial
      descripcionMaterial
      cantidadRecibida
      unidadMedida
      observaciones
      esSinRegistro
    }
  }`,
  actualizarRecepcion: `mutation ActualizarRecepcion($input: RecepcionUpdateInput!) {
    actualizarRecepcion(input: $input) {
      id
      itemId
      fecha
      recibidoDe
      codigoMaterial
      descripcionMaterial
      cantidadRecibida
      unidadMedida
      observaciones
      esSinRegistro
    }
  }`,
  eliminarRecepcion: `mutation EliminarRecepcion($id: String!) {
    eliminarRecepcion(id: $id)
  }`,
  crearEntrega: `mutation CrearEntrega($input: EntregaInput!) {
    crearEntrega(input: $input) {
      id
      itemId
      fecha
      entregadoA
      codigoMaterial
      descripcionMaterial
      cantidadEntregada
      unidadMedida
      observaciones
      esSinRegistro
    }
  }`,
  actualizarEntrega: `mutation ActualizarEntrega($input: EntregaUpdateInput!) {
    actualizarEntrega(input: $input) {
      id
      itemId
      fecha
      entregadoA
      codigoMaterial
      descripcionMaterial
      cantidadEntregada
      unidadMedida
      observaciones
      esSinRegistro
    }
  }`,
  eliminarEntrega: `mutation EliminarEntrega($id: String!) {
    eliminarEntrega(id: $id)
  }`
}

const formatDecimal = (value) => {
  if (value === null || value === undefined) return ''
  const number = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(number)) return ''
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)
}

const formatDate = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(date)
}

const formatDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toLocalDate = (value, endOfDay = false) => {
  if (!value) return null
  let date = null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const patternMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(trimmed)
    if (patternMatch) {
      const [, yearStr, monthStr, dayStr] = patternMatch
      const year = Number(yearStr)
      const month = Number(monthStr)
      const day = Number(dayStr)
      if ([year, month, day].some((part) => Number.isNaN(part))) {
        return null
      }
      date = new Date(year, month - 1, day, 0, 0, 0, 0)
    } else {
      date = new Date(trimmed)
    }
  } else {
    const base = value instanceof Date ? new Date(value.getTime()) : new Date(value)
    if (Number.isNaN(base.getTime())) return null
    date = base
  }

  if (!date || Number.isNaN(date.getTime())) return null

  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date
}

const toUtcIso = (value, endOfDay = false) => {
  const date = toLocalDate(value, endOfDay)
  if (!date) return ''
  return date.toISOString()
}

const getColumnValue = (row, column) => {
  const rawValue = column.accessor ? column.accessor(row) : row[column.key]
  const formatted = column.format ? column.format(rawValue, row) : rawValue
  if (formatted === undefined || formatted === null) return ''
  return formatted
}

const buildFilename = (base) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${base}-${stamp}`
}

const generateAdjustmentId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const exportToExcel = (rows, columns, filenameBase) => {
  const worksheetData = [columns.map((col) => col.header)]
  rows.forEach((row) => {
    worksheetData.push(columns.map((col) => getColumnValue(row, col)))
  })
  const worksheet = utils.aoa_to_sheet(worksheetData)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, 'Datos')
  writeFile(workbook, `${buildFilename(filenameBase)}.xlsx`)
}

const exportToPdf = (rows, columns, filenameBase, title) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' })
  doc.setFontSize(14)
  doc.text(title, 40, 40)
  autoTable(doc, {
    startY: 60,
    head: [columns.map((col) => col.header)],
    body: rows.map((row) => columns.map((col) => getColumnValue(row, col))),
    styles: { fontSize: 10, cellPadding: 6 }
  })
  doc.save(`${buildFilename(filenameBase)}.pdf`)
}

const TEXT_LIMITS = {
  codigoMaterial: 25,
  nombreMaterial: 60,
  descripcionMaterial: 140,
  localizacion: 40,
  unidadMedida: 10,
  recibidoDe: 60,
  entregadoA: 60,
  observaciones: 220
}

const QUANTITY_LIMITS = {
  stock: { min: 0, max: 999999, maxInteger: 6, maxDecimals: 2 },
  movement: { min: 0.01, max: 999999, maxInteger: 6, maxDecimals: 2 }
}

const CODE_REGEX = /^[A-Z0-9-]+$/
const CODE_WITH_SPACES_REGEX = /^[A-Z0-9- ]+$/
const PLAIN_TEXT_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,()'\-\s]+$/
const CATEGORY_PALETTE = ['#0f766e', '#2563eb', '#f97316', '#0ea5e9', '#dc2626', '#059669', '#f59e0b']
const UNIT_OPTIONS = Object.freeze(['Lt', 'Kg', 'Mts', 'Und'])
const UNIT_LOOKUP = UNIT_OPTIONS.reduce((acc, option) => {
  acc[option.toUpperCase()] = option
  return acc
}, {})

const getCanonicalUnit = (value) => {
  if (!value) return null
  const normalized = String(value).trim().toUpperCase()
  return UNIT_LOOKUP[normalized] ?? null
}

const ensureUnitValue = (value, fallback = '') => getCanonicalUnit(value) ?? fallback

const sanitizeCodeInput = (value, maxLength = TEXT_LIMITS.codigoMaterial, options = {}) => {
  if (!value) return ''
  const { allowSpaces = false, preserveTrailingSpace = false } = options
  const regex = allowSpaces ? /[^A-Z0-9-\s]/g : /[^A-Z0-9-]/g
  const hadTrailingSpace = allowSpaces && preserveTrailingSpace && /\s$/.test(value)
  let cleaned = value.toUpperCase().replace(regex, '')
  if (allowSpaces) {
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    if (preserveTrailingSpace && hadTrailingSpace && cleaned.length < maxLength) {
      cleaned = `${cleaned} `
    }
  } else {
    cleaned = cleaned.trim()
  }
  return cleaned.slice(0, maxLength)
}

const titleCase = (value) => value
  .split(' ')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ')

const sanitizePlainText = (value, maxLength, { titleCaseEnabled = false, preserveTrailingSpace = false } = {}) => {
  if (!value) return ''
  const hadTrailingSpace = preserveTrailingSpace && /\s$/.test(value)
  let normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim()
  if (!PLAIN_TEXT_REGEX.test(normalized)) {
    normalized = normalized.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,()'\-\s]/g, '')
  }
  normalized = normalized.slice(0, maxLength)
  if (titleCaseEnabled && normalized) {
    normalized = titleCase(normalized)
  }
  if (preserveTrailingSpace && hadTrailingSpace && normalized && normalized.length < maxLength) {
    normalized = `${normalized} `
  }
  return normalized
}

const sanitizeOptionalText = (value, maxLength, options = {}) => {
  if (!value) return ''
  return sanitizePlainText(value, maxLength, options)
}

const isSinRegistroLabel = (value) => typeof value === 'string' && value.trim().toUpperCase() === 'S/R'

const resolveMovementDetail = (value, fallback = '') => {
  if (!value) return fallback ?? ''
  return isSinRegistroLabel(value) ? (fallback ?? '') : value
}

const shouldUseSinRegistroPlaceholder = (value) => {
  if (typeof value !== 'string') return true
  return value.trim() === '' || isSinRegistroLabel(value)
}

const getObservationDisplayValue = (value, esSinRegistro, placeholder = 'S/R') => {
  if (esSinRegistro && shouldUseSinRegistroPlaceholder(value)) {
    return placeholder
  }
  return value ?? ''
}

const getObservationEditableValue = (value, esSinRegistro) => {
  if (esSinRegistro && shouldUseSinRegistroPlaceholder(value)) {
    return ''
  }
  return value ?? ''
}

const sanitizeDecimalInput = (value, limits = QUANTITY_LIMITS.movement) => {
  if (!value) return ''
  const cleaned = value.replace(/,/g, '.').replace(/[^\d.]/g, '')
  if (!cleaned) return ''
  const [integerPartRaw = '', ...decimalParts] = cleaned.split('.')
  const integerPart = integerPartRaw.slice(0, limits.maxInteger)
  const decimals = decimalParts.join('').slice(0, limits.maxDecimals)
  return decimals ? `${integerPart}.${decimals}` : integerPart
}

const parseDecimalInput = (value) => {
  if (value === null || value === undefined) return null
  if (String(value).trim() === '') return null
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return null
  return Number(numeric.toFixed(2))
}

const blockInvalidNumberKeys = (event) => {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault()
  }
}

const buildRangeMessage = (min, max) => `Ingresa un número entre ${min} y ${max}.`

const validateItemForm = (form) => {
  const errors = {}

  if (!form.codigoMaterial) {
    errors.codigoMaterial = 'Este campo no puede quedar vacío.'
  } else if (!CODE_WITH_SPACES_REGEX.test(form.codigoMaterial)) {
    errors.codigoMaterial = 'Usa letras, números, guiones o espacios.'
  }

  if (!form.categoriaId) {
    errors.categoriaId = 'Selecciona una categoría existente.'
  }

  if (!form.ubicacionId) {
    errors.ubicacionId = 'Selecciona una ubicación disponible.'
  }

  if (!form.descripcionMaterial) {
    errors.descripcionMaterial = 'Este campo es obligatorio.'
  }

  const stockValue = parseDecimalInput(form.cantidadStock)
  if (stockValue === null) {
    errors.cantidadStock = 'Ingresa un número válido.'
  } else if (stockValue < QUANTITY_LIMITS.stock.min || stockValue > QUANTITY_LIMITS.stock.max) {
    errors.cantidadStock = buildRangeMessage(QUANTITY_LIMITS.stock.min, QUANTITY_LIMITS.stock.max)
  }

  if (!getCanonicalUnit(form.unidadMedida)) {
    errors.unidadMedida = 'Selecciona una unidad válida.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    quantity: stockValue ?? 0
  }
}

const validateCategoriaForm = (form) => {
  const errors = {}

  if (!form.nombre) {
    errors.nombre = 'Dale un nombre descriptivo a la categoría.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  }
}

const validateUbicacionForm = (form) => {
  const errors = {}

  if (!form.nombre) {
    errors.nombre = 'Asigna un nombre descriptivo.'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  }
}

const validateRecepcionForm = (form, itemsById) => {
  const errors = {}
  const quantityValue = parseDecimalInput(form.cantidadRecibida)
  const selectedItem = form.itemId ? itemsById[form.itemId] : null

  if (!selectedItem) {
    errors.codigoMaterial = 'Selecciona un item del inventario.'
  }

  if (!form.recibidoDe) {
    errors.recibidoDe = 'Indica quién entrega el material.'
  }

  if (quantityValue === null) {
    errors.cantidadRecibida = 'Ingresa un número válido.'
  } else if (quantityValue < QUANTITY_LIMITS.movement.min || quantityValue > QUANTITY_LIMITS.movement.max) {
    errors.cantidadRecibida = buildRangeMessage(QUANTITY_LIMITS.movement.min, QUANTITY_LIMITS.movement.max)
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    quantity: quantityValue ?? 0
  }
}

const validateEntregaForm = (form, itemsById) => {
  const errors = {}
  const quantityValue = parseDecimalInput(form.cantidadEntregada)
  const selectedItem = form.itemId ? itemsById[form.itemId] : null
  const availableStock = selectedItem ? Number(selectedItem.cantidadStock ?? 0) : null

  if (!selectedItem) {
    errors.codigoMaterial = 'Selecciona un item con stock.'
  }

  if (!form.entregadoA) {
    errors.entregadoA = 'Indica a quién se entrega el material.'
  }

  if (quantityValue === null) {
    errors.cantidadEntregada = 'Ingresa un número válido.'
  } else if (quantityValue < QUANTITY_LIMITS.movement.min || quantityValue > QUANTITY_LIMITS.movement.max) {
    errors.cantidadEntregada = buildRangeMessage(QUANTITY_LIMITS.movement.min, QUANTITY_LIMITS.movement.max)
  } else if (availableStock !== null && quantityValue > availableStock) {
    errors.cantidadEntregada = `Solo hay ${formatDecimal(availableStock)} ${selectedItem?.unidadMedida ?? ''} disponibles.`
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    quantity: quantityValue ?? 0,
    availableStock
  }
}

const EXPORT_CONFIG = {
  items: {
    filename: 'inventario-general',
    title: 'Inventario General',
    columns: [
      { header: '#', key: '__itemIndex' },
      { header: 'Código material', key: 'codigoMaterial' },
      { header: 'Categoría', key: 'nombreMaterial' },
      { header: 'Nombre del item', key: 'descripcionMaterial' },
      { header: 'Stock', key: 'cantidadStock', format: (value) => formatDecimal(value) },
      { header: 'Unidad', key: 'unidadMedida' },
      { header: 'Ubicación', key: 'localizacion' }
    ]
  },
  recepciones: {
    filename: 'recepciones',
    title: 'Historial de Recepciones',
    columns: [
      { header: '#', key: '__itemIndex' },
      { header: 'Fecha', accessor: (row) => formatDate(row.fecha) },
      { header: 'Código material', key: 'codigoMaterial' },
      { header: 'Categoría', key: 'nombreMaterial' },
      { header: 'Descripción', key: 'descripcionMaterial' },
      { header: 'Recibido de', key: 'recibidoDe' },
      { header: 'Cantidad', key: 'cantidadRecibida', format: (value) => formatDecimal(value) },
      { header: 'Unidad', key: 'unidadMedida' },
      { header: 'Observaciones', key: 'observaciones' }
    ]
  },
  entregas: {
    filename: 'entregas',
    title: 'Historial de Entregas',
    columns: [
      { header: '#', key: '__itemIndex' },
      { header: 'Fecha', accessor: (row) => formatDate(row.fecha) },
      { header: 'Código material', key: 'codigoMaterial' },
      { header: 'Categoría', key: 'nombreMaterial' },
      { header: 'Descripción', key: 'descripcionMaterial' },
      { header: 'Entregado a', key: 'entregadoA' },
      { header: 'Cantidad', key: 'cantidadEntregada', format: (value) => formatDecimal(value) },
      { header: 'Unidad', key: 'unidadMedida' },
      { header: 'Observaciones', key: 'observaciones' }
    ]
  },
  kardex: {
    filename: 'kardex',
    title: 'Movimientos Kardex',
    columns: [
      { header: '#', key: '__itemIndex' },
      { header: 'Fecha', accessor: (row) => formatDate(row.fecha) },
      { header: 'Tipo', key: 'tipo' },
      { header: 'Referencia', key: 'referencia' },
      { header: 'Descripción', key: 'descripcion' },
      { header: 'Observación', key: 'observaciones' },
      { header: 'Cantidad', key: 'cantidad', format: (value) => formatDecimal(value) },
      { header: 'Unidad', key: 'unidadMedida' }
    ]
  },
  reportes: {
    filename: 'reporte-mensual',
    title: 'Reporte de Movimientos',
    columns: [
      { header: '#', key: '__itemIndex' },
      { header: 'Código material', key: 'codigoMaterial' },
      { header: 'Categoría', key: 'nombreMaterial' },
      { header: 'Entradas', key: 'totalEntradas', format: (value) => formatDecimal(value) },
      { header: 'Salidas', key: 'totalSalidas', format: (value) => formatDecimal(value) },
      {
        header: 'Entradas S/R',
        accessor: (row) => formatDecimal(Number(row.totalEntradasSinRegistro) || 0)
      },
      {
        header: 'Salidas S/R',
        accessor: (row) => formatDecimal(Number(row.totalSalidasSinRegistro) || 0)
      },
      {
        header: 'Balance',
        accessor: (row) => {
          const entradas = Number(row.totalEntradas) || 0
          const salidas = Number(row.totalSalidas) || 0
          return formatDecimal(entradas - salidas)
        }
      },
      {
        header: 'Stock después del balance',
        accessor: (row) => {
          const stock = Number(row.stockDespuesBalance ?? row.cantidadStock ?? 0)
          return formatDecimal(stock)
        }
      },
      { header: 'Unidad', key: 'unidadMedida' }
    ]
  }
}

const graphQLRequest = async (query, variables = {}, token) => {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.errors?.[0]?.message ?? response.statusText ?? 'Error de red'
    throw new Error(message)
  }
  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'Error en la operación')
  }
  return payload?.data ?? {}
}

export default function App() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  useEffect(() => {
    document.title = 'Inventario Silo Tres Cruces'
  }, [])
  useEffect(() => {
    const controller = new AbortController()

    fetch('https://inventario-silo.onrender.com/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => {
      // Silenciar fallos: el objetivo es despertar el backend en Render.
    })

    return () => controller.abort()
  }, [])
  const [token, setToken] = useState(() => localStorage.getItem('inventarioToken') ?? '')
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(token))
  const [authError, setAuthError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [items, setItems] = useState([])
  const [recepciones, setRecepciones] = useState([])
  const [entregas, setEntregas] = useState([])
  const [kardex, setKardex] = useState(null)
  const [reporte, setReporte] = useState([])
  const [selectedKardexId, setSelectedKardexId] = useState('')
  const [kardexHistory, setKardexHistory] = useState([])
  const [kardexUsage, setKardexUsage] = useState({})
  const [kardexRange, setKardexRange] = useState(() => {
    const fromDate = new Date(now)
    fromDate.setDate(fromDate.getDate() - 30)
    return {
      from: formatDateInput(fromDate),
      to: formatDateInput(now)
    }
  })
  const [reporteFilter, setReporteFilter] = useState({
    from: formatDateInput(startOfMonth),
    to: formatDateInput(now)
  })
  const [hideZeroReportRows, setHideZeroReportRows] = useState(false)
  const [toasts, setToasts] = useState([])
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '', hint: '' })
  const [itemModalState, setItemModalState] = useState({ open: false, mode: 'create', id: '', originalStock: null })
  const [categoriaModalState, setCategoriaModalState] = useState({ open: false, mode: 'create', id: '' })
  const [ubicacionModalState, setUbicacionModalState] = useState({ open: false, mode: 'create', id: '' })
  const [recepcionModalState, setRecepcionModalState] = useState({ open: false, mode: 'create', id: '' })
  const [entregaModalState, setEntregaModalState] = useState({ open: false, mode: 'create', id: '' })
  const [confirmState, setConfirmState] = useState({
    open: false,
    resource: '',
    id: '',
    message: '',
    details: '',
    payload: null,
    requireMatch: false,
    matchValue: '',
    matchLabel: '',
    confirmHint: ''
  })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [loading, setLoading] = useState({
    categorias: true,
    ubicaciones: true,
    items: true,
    recepciones: true,
    entregas: true,
    kardex: false,
    reporte: false
  })
  const [saving, setSaving] = useState({
    categoria: false,
    ubicacion: false,
    item: false,
    recepcion: false,
    entrega: false
  })
  const [stockAdjustmentPrompt, setStockAdjustmentPrompt] = useState({ open: false, intent: null })
  const [stockPromptSubmitting, setStockPromptSubmitting] = useState(false)
  const [manualAdjustments, setManualAdjustments] = useState([])
  const [duplicateCodePrompt, setDuplicateCodePrompt] = useState({
    open: false,
    code: '',
    conflictItem: null,
    pendingOptions: null
  })

  const isAuthenticated = Boolean(token)

  const updateLastSync = useCallback((candidate) => {
    if (!candidate || Number.isNaN(candidate.getTime())) return
    setLastSync((prev) => {
      if (!prev || candidate.getTime() > prev.getTime()) {
        return candidate
      }
      return prev
    })
  }, [])

  const [itemForm, setItemForm] = useState({
    categoriaId: '',
    ubicacionId: '',
    codigoMaterial: '',
    descripcionMaterial: '',
    cantidadStock: '',
    unidadMedida: ''
  })

  const [categoriaForm, setCategoriaForm] = useState({
    nombre: ''
  })

  const [ubicacionForm, setUbicacionForm] = useState({
    nombre: ''
  })

  const [recepcionForm, setRecepcionForm] = useState({
    itemId: '',
    recibidoDe: '',
    codigoMaterial: '',
    descripcionMaterial: '',
    cantidadRecibida: '',
    unidadMedida: '',
    observaciones: ''
  })

  const [entregaForm, setEntregaForm] = useState({
    itemId: '',
    entregadoA: '',
    codigoMaterial: '',
    descripcionMaterial: '',
    cantidadEntregada: '',
    unidadMedida: '',
    observaciones: ''
  })

  const [itemFormDirty, setItemFormDirty] = useState(false)
  const [categoriaFormDirty, setCategoriaFormDirty] = useState(false)
  const [ubicacionFormDirty, setUbicacionFormDirty] = useState(false)
  const [recepcionFormDirty, setRecepcionFormDirty] = useState(false)
  const [entregaFormDirty, setEntregaFormDirty] = useState(false)

  const resetItemForm = useCallback((categoriaId = '', ubicacionId = '') => {
    setItemForm({
      categoriaId,
      ubicacionId,
      codigoMaterial: '',
      descripcionMaterial: '',
      cantidadStock: '',
      unidadMedida: ''
    })
    setItemFormDirty(false)
  }, [])

  const resetCategoriaForm = useCallback(() => {
    setCategoriaForm({ nombre: '' })
    setCategoriaFormDirty(false)
  }, [])

  const resetUbicacionForm = useCallback(() => {
    setUbicacionForm({ nombre: '' })
    setUbicacionFormDirty(false)
  }, [])

  const resetRecepcionForm = useCallback((overrides = {}) => {
    setRecepcionForm({
      itemId: '',
      recibidoDe: '',
      codigoMaterial: '',
      descripcionMaterial: '',
      cantidadRecibida: '',
      unidadMedida: '',
      observaciones: '',
      ...overrides
    })
    setRecepcionFormDirty(false)
  }, [])

  const resetEntregaForm = useCallback((overrides = {}) => {
    setEntregaForm({
      itemId: '',
      entregadoA: '',
      codigoMaterial: '',
      descripcionMaterial: '',
      cantidadEntregada: '',
      unidadMedida: '',
      observaciones: '',
      ...overrides
    })
    setEntregaFormDirty(false)
  }, [])

  const registerManualAdjustment = useCallback((intent) => {
    if (!intent?.snapshot) return
    const entry = {
      id: generateAdjustmentId(),
      itemId: intent.snapshot.id ?? '',
      codigoMaterial: intent.snapshot.codigoMaterial ?? '—',
      descripcionMaterial: intent.snapshot.descripcionMaterial ?? '',
      amount: intent.amount ?? 0,
      type: intent.type === 'entrega' ? 'decrease' : 'increase',
      timestamp: new Date().toISOString()
    }
    setManualAdjustments((prev) => [entry, ...prev].slice(0, 20))
  }, [])

  const openItemModal = useCallback((mode = 'create', item = null, categoriaOverrideId = null, ubicacionOverrideId = null) => {
    if (mode === 'edit' && item) {
      setItemForm({
        categoriaId: item.categoriaId ?? '',
        ubicacionId: item.ubicacionId ?? '',
        codigoMaterial: sanitizeCodeInput(item.codigoMaterial ?? '', TEXT_LIMITS.codigoMaterial, { allowSpaces: true }),
        descripcionMaterial: sanitizePlainText(item.descripcionMaterial ?? '', TEXT_LIMITS.descripcionMaterial),
        cantidadStock: sanitizeDecimalInput(String(item.cantidadStock ?? ''), QUANTITY_LIMITS.stock),
        unidadMedida: ensureUnitValue(item.unidadMedida, '')
      })
      setItemModalState({ open: true, mode: 'edit', id: item.id ?? '', originalStock: Number(item.cantidadStock ?? 0) })
      setItemFormDirty(false)
    } else {
      const defaultCategoriaId = categoriaOverrideId ?? categorias[0]?.id ?? ''
      const defaultUbicacionId = ubicacionOverrideId ?? ubicaciones[0]?.id ?? ''
      resetItemForm(defaultCategoriaId, defaultUbicacionId)
      setItemModalState({ open: true, mode: 'create', id: '', originalStock: null })
      setItemFormDirty(false)
    }
  }, [categorias, ubicaciones, resetItemForm])

  const closeItemModal = useCallback(() => {
    setItemModalState({ open: false, mode: 'create', id: '', originalStock: null })
    resetItemForm(categorias[0]?.id ?? '', ubicaciones[0]?.id ?? '')
  }, [categorias, ubicaciones, resetItemForm])

  const openCategoriaModal = useCallback((mode = 'create', categoria = null) => {
    if (mode === 'edit' && categoria) {
      setCategoriaForm({
        nombre: sanitizePlainText(categoria.nombre ?? '', TEXT_LIMITS.nombreMaterial, { titleCaseEnabled: true })
      })
      setCategoriaModalState({ open: true, mode: 'edit', id: categoria.id ?? '' })
      setCategoriaFormDirty(false)
    } else {
      resetCategoriaForm()
      setCategoriaModalState({ open: true, mode: 'create', id: '' })
    }
  }, [resetCategoriaForm])

  const closeCategoriaModal = useCallback(() => {
    setCategoriaModalState({ open: false, mode: 'create', id: '' })
    resetCategoriaForm()
  }, [resetCategoriaForm])

  const openUbicacionModal = useCallback((mode = 'create', ubicacion = null) => {
    if (mode === 'edit' && ubicacion) {
      setUbicacionForm({
        nombre: sanitizePlainText(ubicacion.nombre ?? '', TEXT_LIMITS.nombreMaterial, { titleCaseEnabled: true })
      })
      setUbicacionModalState({ open: true, mode: 'edit', id: ubicacion.id ?? '' })
      setUbicacionFormDirty(false)
    } else {
      resetUbicacionForm()
      setUbicacionModalState({ open: true, mode: 'create', id: '' })
    }
  }, [resetUbicacionForm])

  const closeUbicacionModal = useCallback(() => {
    setUbicacionModalState({ open: false, mode: 'create', id: '' })
    resetUbicacionForm()
  }, [resetUbicacionForm])

  const openRecepcionModal = useCallback((mode = 'create', record = null, overrides = null) => {
    if (mode === 'edit' && record) {
      const observationValue = getObservationEditableValue(record.observaciones, record.esSinRegistro)
      setRecepcionForm({
        itemId: record.itemId ?? '',
        recibidoDe: sanitizePlainText(record.recibidoDe ?? '', TEXT_LIMITS.recibidoDe, { titleCaseEnabled: true }),
        codigoMaterial: sanitizeCodeInput(record.codigoMaterial ?? '', TEXT_LIMITS.codigoMaterial, { allowSpaces: true }),
        descripcionMaterial: sanitizePlainText(record.descripcionMaterial ?? '', TEXT_LIMITS.descripcionMaterial),
        cantidadRecibida: sanitizeDecimalInput(String(record.cantidadRecibida ?? '')),
        unidadMedida: ensureUnitValue(record.unidadMedida, ''),
        observaciones: sanitizeOptionalText(observationValue, TEXT_LIMITS.observaciones)
      })
      setRecepcionModalState({ open: true, mode: 'edit', id: record.id ?? '' })
      setRecepcionFormDirty(false)
    } else {
      resetRecepcionForm(overrides ?? {})
      setRecepcionModalState({ open: true, mode: 'create', id: '' })
      setRecepcionFormDirty(false)
    }
  }, [resetRecepcionForm])

  const closeRecepcionModal = useCallback(() => {
    setRecepcionModalState({ open: false, mode: 'create', id: '' })
    resetRecepcionForm()
  }, [resetRecepcionForm])

  const openEntregaModal = useCallback((mode = 'create', record = null, overrides = null) => {
    if (mode === 'edit' && record) {
      const observationValue = getObservationEditableValue(record.observaciones, record.esSinRegistro)
      setEntregaForm({
        itemId: record.itemId ?? '',
        entregadoA: sanitizePlainText(record.entregadoA ?? '', TEXT_LIMITS.entregadoA, { titleCaseEnabled: true }),
        codigoMaterial: sanitizeCodeInput(record.codigoMaterial ?? '', TEXT_LIMITS.codigoMaterial, { allowSpaces: true }),
        descripcionMaterial: sanitizePlainText(record.descripcionMaterial ?? '', TEXT_LIMITS.descripcionMaterial),
        cantidadEntregada: sanitizeDecimalInput(String(record.cantidadEntregada ?? '')),
        unidadMedida: ensureUnitValue(record.unidadMedida, ''),
        observaciones: sanitizeOptionalText(observationValue, TEXT_LIMITS.observaciones)
      })
      setEntregaModalState({ open: true, mode: 'edit', id: record.id ?? '' })
      setEntregaFormDirty(false)
    } else {
      resetEntregaForm(overrides ?? {})
      setEntregaModalState({ open: true, mode: 'create', id: '' })
      setEntregaFormDirty(false)
    }
  }, [resetEntregaForm])

  const closeEntregaModal = useCallback(() => {
    setEntregaModalState({ open: false, mode: 'create', id: '' })
    resetEntregaForm()
  }, [resetEntregaForm])

  const openConfirmDialog = useCallback((resource, entity) => {
    if (!entity) return
    const resourceLabels = {
      item: 'item del inventario',
      recepcion: 'recepción',
      entrega: 'entrega',
      categoria: 'categoría',
      ubicacion: 'ubicación'
    }
    const title = resourceLabels[resource] ?? 'registro'
    const nextState = {
      open: true,
      resource,
      id: entity.id ?? '',
      message: `¿Estás seguro de que deseas eliminar este ${title}?`,
      details: 'Esta acción no se puede deshacer y ajustará el stock automáticamente.',
      payload: entity,
      requireMatch: false,
      matchValue: '',
      matchLabel: '',
      confirmHint: ''
    }

    if (resource === 'item') {
      const codigoMaterial = entity.codigoMaterial?.trim() ?? ''
      const friendlyName = entity.descripcionMaterial?.trim() || entity.nombreMaterial?.trim() || codigoMaterial || 'este item'
      nextState.message = `Eliminar ${friendlyName}${codigoMaterial ? ` (${codigoMaterial})` : ''}`
      nextState.details = 'Se eliminará este item y todo resquicio asociado: recepciones, entregas, movimientos del kardex y resúmenes del reporte. Si deseas conservar el historial, edita su stock a 0 en lugar de eliminarlo.'
      nextState.requireMatch = Boolean(codigoMaterial)
      nextState.matchValue = codigoMaterial
      nextState.matchLabel = codigoMaterial
        ? `Escribe "${codigoMaterial}" para confirmar`
        : 'Escribe el código del item para confirmar'
      nextState.confirmHint = 'Por seguridad, escribe el código exactamente como aparece para habilitar la eliminación definitiva.'
    }

    setConfirmState(nextState)
  }, [])

  const closeConfirmDialog = useCallback(() => {
    setConfirmState({
      open: false,
      resource: '',
      id: '',
      message: '',
      details: '',
      payload: null,
      requireMatch: false,
      matchValue: '',
      matchLabel: '',
      confirmHint: ''
    })
  }, [])

  const authedRequest = useCallback((query, variables = {}) => {
    if (!token) {
      throw new Error('Sesión no válida. Vuelve a iniciar sesión.')
    }
    return graphQLRequest(query, variables, token)
  }, [token])

  const buildErrorHint = useCallback((message = '') => {
    const text = message.toLowerCase()
    if (text.includes('valid') || text.includes('campo') || text.includes('ingresa')) {
      return 'Revisa los campos resaltados, completa los obligatorios y asegúrate de respetar los formatos sugeridos.'
    }
    if (text.includes('token') || text.includes('sesión')) {
      return 'Tu sesión puede haber expirado. Vuelve a iniciar sesión y repite la acción.'
    }
    if (text.includes('network') || text.includes('fetch') || text.includes('conexión')) {
      return 'Verifica tu conexión a internet o intenta nuevamente en unos segundos.'
    }
    if (text.includes('graphql')) {
      return 'La API devolvió un error. Intenta refrescar los datos o repite la operación.'
    }
    return 'Intenta nuevamente. Si el problema persiste, toma una captura y contacta al administrador del sistema.'
  }, [])

  const openErrorDialog = useCallback((message, title = 'Necesitamos tu atención') => {
    if (!message) return
    setErrorDialog({
      open: true,
      title,
      message,
      hint: buildErrorHint(message)
    })
  }, [buildErrorHint])

  const closeErrorDialog = useCallback(() => {
    setErrorDialog({ open: false, title: '', message: '', hint: '' })
  }, [])

  const itemsByCodigo = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item?.codigoMaterial) {
        acc[item.codigoMaterial] = item
      }
      return acc
    }, {})
  }, [items])

  const itemsById = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item?.id) {
        acc[item.id] = item
      }
      return acc
    }, {})
  }, [items])

  const itemValidation = useMemo(() => validateItemForm(itemForm), [itemForm])
  const categoriaValidation = useMemo(() => validateCategoriaForm(categoriaForm), [categoriaForm])
  const ubicacionValidation = useMemo(() => validateUbicacionForm(ubicacionForm), [ubicacionForm])
  const recepcionValidation = useMemo(() => validateRecepcionForm(recepcionForm, itemsById), [recepcionForm, itemsById])
  const entregaValidation = useMemo(() => validateEntregaForm(entregaForm, itemsById), [entregaForm, itemsById])

  const sortedItems = useMemo(() => {
    const collator = new Intl.Collator('es', { sensitivity: 'base' })
    const normalize = (value) => (value ?? '').trim()

    return [...items].sort((a, b) => {
      const categoriaComparison = collator.compare(
        normalize(a?.nombreMaterial),
        normalize(b?.nombreMaterial)
      )
      if (categoriaComparison !== 0) {
        return categoriaComparison
      }

      const ubicacionComparison = collator.compare(
        normalize(a?.localizacion),
        normalize(b?.localizacion)
      )
      if (ubicacionComparison !== 0) {
        return ubicacionComparison
      }

      return collator.compare(
        normalize(a?.descripcionMaterial),
        normalize(b?.descripcionMaterial)
      )
    })
  }, [items])

  const recentKardexItems = useMemo(() => {
    return kardexHistory
      .map((identifier) => itemsById[identifier] ?? itemsByCodigo[identifier])
      .filter(Boolean)
  }, [itemsByCodigo, itemsById, kardexHistory])

  const topKardexItems = useMemo(() => {
    const ranked = Object.entries(kardexUsage)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([identifier]) => itemsById[identifier] ?? itemsByCodigo[identifier])
      .filter(Boolean)
    return ranked.slice(0, 5)
  }, [itemsByCodigo, itemsById, kardexUsage])

  const selectedKardexItem = useMemo(() => {
    if (selectedKardexId) {
      return itemsById[selectedKardexId] ?? null
    }
    if (kardex?.codigoMaterial) {
      return itemsByCodigo[kardex.codigoMaterial] ?? null
    }
    return null
  }, [itemsByCodigo, itemsById, kardex, selectedKardexId])

  const showStatus = useCallback((intent, message) => {
    if (!message) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, intent, message }])
    if (intent === 'error') {
      openErrorDialog(message)
    }
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4500)
  }, [openErrorDialog])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const handleKardexRangeChange = useCallback((field, value) => {
    setKardexRange((prev) => ({ ...prev, [field]: value }))
  }, [])

  const recordKardexSelection = useCallback((item) => {
    const identifier = item?.id || item?.codigoMaterial
    if (!identifier) return
    setKardexHistory((prev) => {
      const filtered = prev.filter((entry) => entry !== identifier)
      return [identifier, ...filtered].slice(0, 5)
    })
    setKardexUsage((prev) => ({
      ...prev,
      [identifier]: (prev[identifier] ?? 0) + 1
    }))
  }, [])

  const handleLogin = useCallback(async ({ usuario, password }) => {
    setLoginLoading(true)
    setAuthError('')
    try {
      const data = await graphQLRequest(QUERIES.login, { usuario, password })
      const receivedToken = data?.login
      if (!receivedToken) {
        throw new Error('No se pudo obtener el token de acceso')
      }
      localStorage.setItem('inventarioToken', receivedToken)
      setToken(receivedToken)
      showStatus('success', 'Sesión iniciada correctamente')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión'
      setAuthError(message)
      throw error
    } finally {
      setLoginLoading(false)
    }
  }, [showStatus])

  const logout = useCallback(() => {
    localStorage.removeItem('inventarioToken')
    setToken('')
    setAuthUser(null)
    showStatus('success', 'Sesión finalizada')
  }, [showStatus])


  useEffect(() => {
    let cancelled = false
    const bootstrapSession = async () => {
      if (!token) {
        setAuthUser(null)
        setAuthLoading(false)
        return
      }
      setAuthLoading(true)
      try {
        const data = await graphQLRequest(QUERIES.perfilActual, {}, token)
        if (!cancelled) {
          setAuthUser(data?.perfilActual ?? null)
          setAuthError('')
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Sesión inválida'
          setAuthError(message)
          localStorage.removeItem('inventarioToken')
          setToken('')
          setAuthUser(null)
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }

    bootstrapSession()
    return () => {
      cancelled = true
    }
  }, [token])

  const fetchItems = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading((prev) => ({ ...prev, items: true }))
    try {
      const data = await authedRequest(QUERIES.items)
      const normalizedItems = (data.items ?? []).map((item) => ({
        ...item,
        unidadMedida: ensureUnitValue(item?.unidadMedida, '')
      }))
      setItems(normalizedItems)
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setLoading((prev) => ({ ...prev, items: false }))
    }
  }, [authedRequest, isAuthenticated, showStatus])

  const fetchCategorias = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading((prev) => ({ ...prev, categorias: true }))
    try {
      const data = await authedRequest(QUERIES.categorias)
      setCategorias(data.categorias ?? [])
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setLoading((prev) => ({ ...prev, categorias: false }))
    }
  }, [authedRequest, isAuthenticated, showStatus])

  const fetchUbicaciones = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading((prev) => ({ ...prev, ubicaciones: true }))
    try {
      const data = await authedRequest(QUERIES.ubicaciones)
      setUbicaciones(data.ubicaciones ?? [])
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setLoading((prev) => ({ ...prev, ubicaciones: false }))
    }
  }, [authedRequest, isAuthenticated, showStatus])

  const fetchRecepciones = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading((prev) => ({ ...prev, recepciones: true }))
    try {
      const data = await authedRequest(QUERIES.recepciones)
      setRecepciones(data.recepciones ?? [])
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setLoading((prev) => ({ ...prev, recepciones: false }))
    }
  }, [authedRequest, isAuthenticated, showStatus])

  const fetchEntregas = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading((prev) => ({ ...prev, entregas: true }))
    try {
      const data = await authedRequest(QUERIES.entregas)
      setEntregas(data.entregas ?? [])
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setLoading((prev) => ({ ...prev, entregas: false }))
    }
  }, [authedRequest, isAuthenticated, showStatus])

  const refreshLiveData = useCallback(async () => {
    await Promise.all([
      fetchCategorias(),
      fetchUbicaciones(),
      fetchItems(),
      fetchRecepciones(),
      fetchEntregas()
    ])
  }, [fetchCategorias, fetchEntregas, fetchItems, fetchRecepciones, fetchUbicaciones])

  const fetchReporte = useCallback(async ({ from, to }) => {
    if (!isAuthenticated) return
    if (!from || !to) {
      showStatus('error', 'Selecciona ambas fechas para generar el reporte')
      return
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      showStatus('error', 'Formato de fecha inválido')
      return
    }

    if (toDate < fromDate) {
      showStatus('error', 'La fecha "hasta" debe ser mayor o igual a la fecha "desde"')
      return
    }

    setLoading((prev) => ({ ...prev, reporte: true }))
    try {
      const data = await authedRequest(QUERIES.reporte, {
        desde: toUtcIso(from),
        hasta: toUtcIso(to, true)
      })
      setReporte(data.reporteMensual ?? [])
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setLoading((prev) => ({ ...prev, reporte: false }))
    }
  }, [authedRequest, isAuthenticated, showStatus])

  const handleDeleteConfirmed = useCallback(async () => {
    if (!confirmState.id) return
    setDeleteLoading(true)
    try {
      if (confirmState.resource === 'item') {
        await authedRequest(QUERIES.eliminarItem, { id: confirmState.id })
        showStatus('success', 'Item eliminado')
        await Promise.all([
          fetchItems(),
          fetchRecepciones(),
          fetchEntregas(),
          fetchReporte(reporteFilter)
        ])
      } else if (confirmState.resource === 'categoria') {
        await authedRequest(QUERIES.eliminarCategoria, { id: confirmState.id })
        showStatus('success', 'Categoría eliminada')
        await Promise.all([
          fetchCategorias(),
          fetchItems(),
          fetchReporte(reporteFilter)
        ])
      } else if (confirmState.resource === 'ubicacion') {
        await authedRequest(QUERIES.eliminarUbicacion, { id: confirmState.id })
        showStatus('success', 'Ubicación eliminada')
        await Promise.all([
          fetchUbicaciones(),
          fetchItems(),
          fetchReporte(reporteFilter)
        ])
      } else if (confirmState.resource === 'recepcion') {
        await authedRequest(QUERIES.eliminarRecepcion, { id: confirmState.id })
        showStatus('success', 'Recepción eliminada')
        await Promise.all([
          fetchRecepciones(),
          fetchItems(),
          fetchReporte(reporteFilter)
        ])
      } else if (confirmState.resource === 'entrega') {
        await authedRequest(QUERIES.eliminarEntrega, { id: confirmState.id })
        showStatus('success', 'Entrega eliminada')
        await Promise.all([
          fetchEntregas(),
          fetchItems(),
          fetchReporte(reporteFilter)
        ])
      }
      updateLastSync(new Date())
      closeConfirmDialog()
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setDeleteLoading(false)
    }
  }, [authedRequest, closeConfirmDialog, confirmState.id, confirmState.resource, fetchEntregas, fetchItems, fetchRecepciones, fetchReporte, reporteFilter, showStatus, updateLastSync])

  useEffect(() => {
    if (!isAuthenticated) {
      setCategorias([])
      setItems([])
      setRecepciones([])
      setEntregas([])
      setReporte([])
      setKardex(null)
      setSelectedKardexId('')
      setKardexHistory([])
      setKardexUsage({})
      return
    }
    refreshLiveData()
    const intervalId = setInterval(() => {
      refreshLiveData()
    }, 30000)
    return () => clearInterval(intervalId)
  }, [isAuthenticated, refreshLiveData])

  useEffect(() => {
    fetchReporte(reporteFilter)
  }, [fetchReporte, reporteFilter])

  useEffect(() => {
    const timestamps = [
      ...recepciones.map((r) => (r.fecha ? new Date(r.fecha).getTime() : Number.NaN)),
      ...entregas.map((e) => (e.fecha ? new Date(e.fecha).getTime() : Number.NaN))
    ].filter((time) => Number.isFinite(time))

    if (timestamps.length === 0) return
    updateLastSync(new Date(Math.max(...timestamps)))
  }, [entregas, recepciones, updateLastSync])

  const handleItemFormChange = (field, value) => {
    if (field === 'categoriaId' || field === 'ubicacionId') {
      setItemFormDirty(true)
      setItemForm((prev) => ({ ...prev, [field]: value }))
      return
    }

    if (field === 'unidadMedida') {
      setItemFormDirty(true)
      setItemForm((prev) => ({ ...prev, unidadMedida: getCanonicalUnit(value) ?? '' }))
      return
    }

    const sanitizers = {
      codigoMaterial: (input) => sanitizeCodeInput(input, TEXT_LIMITS.codigoMaterial, { allowSpaces: true, preserveTrailingSpace: true }),
      descripcionMaterial: (input) => sanitizePlainText(input, TEXT_LIMITS.descripcionMaterial, { preserveTrailingSpace: true }),
      cantidadStock: (input) => sanitizeDecimalInput(input, QUANTITY_LIMITS.stock)
    }
    const sanitizer = sanitizers[field] ?? ((input) => input)
    const sanitizedValue = sanitizer(value)
    setItemFormDirty(true)
    setItemForm((prev) => ({ ...prev, [field]: sanitizedValue }))
  }

  const handleCategoriaFormChange = (field, value) => {
    if (field !== 'nombre') return
    const sanitizedValue = sanitizePlainText(value, TEXT_LIMITS.nombreMaterial, {
      titleCaseEnabled: true,
      preserveTrailingSpace: true
    })
    setCategoriaFormDirty(true)
    setCategoriaForm((prev) => ({ ...prev, nombre: sanitizedValue }))
  }

  const handleUbicacionFormChange = (field, value) => {
    if (field !== 'nombre') return
    const sanitizedValue = sanitizePlainText(value, TEXT_LIMITS.nombreMaterial, {
      titleCaseEnabled: true,
      preserveTrailingSpace: true
    })
    setUbicacionFormDirty(true)
    setUbicacionForm((prev) => ({ ...prev, nombre: sanitizedValue }))
  }

  const handleRecepcionChange = (field, value) => {
    const sanitizers = {
      recibidoDe: (input) => sanitizePlainText(input, TEXT_LIMITS.recibidoDe, { titleCaseEnabled: true, preserveTrailingSpace: true }),
      cantidadRecibida: (input) => sanitizeDecimalInput(input),
      observaciones: (input) => sanitizeOptionalText(input, TEXT_LIMITS.observaciones, { preserveTrailingSpace: true })
    }
    const sanitizer = sanitizers[field] ?? ((input) => input)
    const sanitizedValue = sanitizer(value)
    setRecepcionFormDirty(true)
    setRecepcionForm((prev) => ({ ...prev, [field]: sanitizedValue }))
  }

  const handleRecepcionSelectItem = (item) => {
    setRecepcionFormDirty(true)
    if (!item) {
      setRecepcionForm((prev) => ({
        ...prev,
        itemId: '',
        codigoMaterial: '',
        descripcionMaterial: '',
        unidadMedida: ''
      }))
      return
    }

    setRecepcionForm((prev) => ({
      ...prev,
      itemId: item.id ?? '',
      codigoMaterial: sanitizeCodeInput(item.codigoMaterial ?? '', TEXT_LIMITS.codigoMaterial, { allowSpaces: true }),
      descripcionMaterial: sanitizePlainText(item.descripcionMaterial ?? '', TEXT_LIMITS.descripcionMaterial),
      unidadMedida: ensureUnitValue(item.unidadMedida, '')
    }))
  }

  const handleEntregaChange = (field, value) => {
    const sanitizers = {
      entregadoA: (input) => sanitizePlainText(input, TEXT_LIMITS.entregadoA, { titleCaseEnabled: true, preserveTrailingSpace: true }),
      cantidadEntregada: (input) => sanitizeDecimalInput(input),
      observaciones: (input) => sanitizeOptionalText(input, TEXT_LIMITS.observaciones, { preserveTrailingSpace: true })
    }
    const sanitizer = sanitizers[field] ?? ((input) => input)
    const sanitizedValue = sanitizer(value)
    setEntregaFormDirty(true)
    setEntregaForm((prev) => ({ ...prev, [field]: sanitizedValue }))
  }

  const handleEntregaSelectItem = (item) => {
    setEntregaFormDirty(true)
    if (!item) {
      setEntregaForm((prev) => ({
        ...prev,
        itemId: '',
        codigoMaterial: '',
        descripcionMaterial: '',
        unidadMedida: ''
      }))
      return
    }

    setEntregaForm((prev) => ({
      ...prev,
      itemId: item.id ?? '',
      codigoMaterial: sanitizeCodeInput(item.codigoMaterial ?? '', TEXT_LIMITS.codigoMaterial, { allowSpaces: true }),
      descripcionMaterial: sanitizePlainText(item.descripcionMaterial ?? '', TEXT_LIMITS.descripcionMaterial),
      unidadMedida: ensureUnitValue(item.unidadMedida, '')
    }))
  }

  const launchMovementFromItem = async (intent) => {
    if (!intent?.type || !intent?.snapshot) return
    const base = {
      itemId: intent.snapshot.id ?? intent.snapshot.itemId ?? '',
      codigoMaterial: intent.snapshot.codigoMaterial ?? '',
      descripcionMaterial: intent.snapshot.descripcionMaterial ?? '',
      unidadMedida: ensureUnitValue(intent.snapshot.unidadMedida, '')
    }
    const rawQuantity = intent.quickForm?.cantidad ?? intent.amount
    const parsedQuantity = parseDecimalInput(rawQuantity)
    if (parsedQuantity === null || parsedQuantity <= 0) {
      throw new Error('Define una cantidad válida para registrar el movimiento.')
    }

    const defaultNote = 'Ajuste de stock registrado desde la edición del item.'
    const rawNote = intent.quickForm?.observaciones ?? defaultNote
    const observaciones = sanitizeOptionalText(rawNote, TEXT_LIMITS.observaciones)

    if (intent.type === 'recepcion') {
      const rawCounterpart = intent.quickForm?.contraparte || 'Ajuste automatizado'
      const recibidoDe = sanitizePlainText(rawCounterpart, TEXT_LIMITS.recibidoDe, { titleCaseEnabled: true })
      await authedRequest(QUERIES.crearRecepcion, {
        input: {
          ...base,
          recibidoDe,
          cantidadRecibida: parsedQuantity,
          observaciones
        }
      })
      await fetchRecepciones()
      await fetchReporte(reporteFilter)
      showStatus('success', 'Recepción registrada automáticamente')
    }
    if (intent.type === 'entrega') {
      const rawCounterpart = intent.quickForm?.contraparte || 'Ajuste automatizado'
      const entregadoA = sanitizePlainText(rawCounterpart, TEXT_LIMITS.entregadoA, { titleCaseEnabled: true })
      await authedRequest(QUERIES.crearEntrega, {
        input: {
          ...base,
          entregadoA,
          cantidadEntregada: parsedQuantity,
          observaciones
        }
      })
      await fetchEntregas()
      await fetchReporte(reporteFilter)
      showStatus('success', 'Entrega registrada automáticamente')
    }
    const viewingKardexItem = selectedKardexId ? itemsById[selectedKardexId] : null
    const matchesCurrentKardex = viewingKardexItem
      ? (base.itemId && viewingKardexItem.id === base.itemId) || viewingKardexItem.codigoMaterial === base.codigoMaterial
      : Boolean(!selectedKardexId && kardex?.codigoMaterial === base.codigoMaterial)
    if (matchesCurrentKardex) {
      await fetchKardex({ codigoMaterial: base.codigoMaterial, itemId: viewingKardexItem?.id })
    }
    updateLastSync(new Date())
  }

  const submitItem = async (event, options = {}) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
    const { force = false, movementIntent = null, skipDuplicateCheck = false } = options
    setItemFormDirty(true)
    const validation = itemValidation
    if (!validation.isValid) {
      showStatus('error', 'Corrige los campos resaltados antes de continuar')
      return false
    }

    const isEditMode = itemModalState.mode === 'edit' && Boolean(itemModalState.id)
    const originalStock = Number.isFinite(itemModalState.originalStock)
      ? Number(itemModalState.originalStock)
      : null
    const normalizedCode = (itemForm.codigoMaterial ?? '').trim().toUpperCase()

    if (!skipDuplicateCheck && normalizedCode) {
      const conflict = (Array.isArray(items) ? items : []).find((candidate) => {
        if (!candidate?.codigoMaterial) return false
        const candidateCode = candidate.codigoMaterial.trim().toUpperCase()
        if (!candidateCode) return false
        if (isEditMode && candidate.id === itemModalState.id) return false
        return candidateCode === normalizedCode
      })

      if (conflict) {
        setDuplicateCodePrompt({
          open: true,
          code: itemForm.codigoMaterial,
          conflictItem: conflict,
          pendingOptions: {
            ...options,
            force,
            movementIntent,
            skipDuplicateCheck: true
          }
        })
        return false
      }
    }

    const stockDelta = isEditMode && originalStock !== null
      ? Number((validation.quantity - originalStock).toFixed(2))
      : 0
    const needsPrompt = isEditMode && !force && Math.abs(stockDelta) >= QUANTITY_LIMITS.movement.min

    if (needsPrompt) {
      setStockAdjustmentPrompt({
        open: true,
        intent: {
          type: stockDelta < 0 ? 'entrega' : 'recepcion',
          amount: Number(Math.abs(stockDelta).toFixed(2)),
          snapshot: {
            id: itemModalState.id ?? '',
            codigoMaterial: itemForm.codigoMaterial,
            descripcionMaterial: itemForm.descripcionMaterial,
            unidadMedida: itemForm.unidadMedida
          },
          overrideQuantity: originalStock ?? validation.quantity,
          targetQuantity: validation.quantity
        }
      })
      return false
    }

    setSaving((prev) => ({ ...prev, item: true }))
    const payloadQuantity = movementIntent?.overrideQuantity ?? validation.quantity
    let success = false
    try {
      const buildItemInput = (cantidad) => ({
        categoriaId: itemForm.categoriaId,
        ubicacionId: itemForm.ubicacionId,
        codigoMaterial: itemForm.codigoMaterial,
        descripcionMaterial: itemForm.descripcionMaterial,
        cantidadStock: cantidad,
        unidadMedida: itemForm.unidadMedida
      })

      if (isEditMode) {
        await authedRequest(QUERIES.actualizarItem, {
          input: {
            ...buildItemInput(payloadQuantity),
            id: itemModalState.id
          }
        })
        showStatus('success', 'Item actualizado correctamente')
      } else {
        await authedRequest(QUERIES.crearItem, {
          input: buildItemInput(validation.quantity)
        })
        showStatus('success', 'Item creado correctamente')
      }

      closeItemModal()
      await Promise.all([
        fetchItems(),
        fetchReporte(reporteFilter)
      ])
      updateLastSync(new Date())

      if (movementIntent?.type) {
        await launchMovementFromItem(movementIntent)
      }
      success = true
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setSaving((prev) => ({ ...prev, item: false }))
    }
    return success
  }

  const dismissDuplicateCodePrompt = useCallback(() => {
    setDuplicateCodePrompt({
      open: false,
      code: '',
      conflictItem: null,
      pendingOptions: null
    })
  }, [])

  const confirmDuplicateCodePrompt = useCallback(async () => {
    const pendingOptions = duplicateCodePrompt.pendingOptions
    dismissDuplicateCodePrompt()
    if (pendingOptions) {
      await submitItem(null, pendingOptions)
    }
  }, [dismissDuplicateCodePrompt, duplicateCodePrompt.pendingOptions, submitItem])

  const submitCategoria = async (event) => {
    event?.preventDefault?.()
    setCategoriaFormDirty(true)
    if (!categoriaValidation.isValid) {
      showStatus('error', 'Completa los campos obligatorios de la categoría')
      return
    }

    setSaving((prev) => ({ ...prev, categoria: true }))
    try {
      const buildInput = () => ({ nombre: categoriaForm.nombre, descripcion: '' })
      if (categoriaModalState.mode === 'edit' && categoriaModalState.id) {
        await authedRequest(QUERIES.actualizarCategoria, {
          input: {
            ...buildInput(),
            id: categoriaModalState.id
          }
        })
        showStatus('success', 'Categoría actualizada')
      } else {
        await authedRequest(QUERIES.crearCategoria, {
          input: buildInput()
        })
        showStatus('success', 'Categoría creada')
      }

      closeCategoriaModal()
      await Promise.all([
        fetchCategorias(),
        fetchItems(),
        fetchReporte(reporteFilter)
      ])
      updateLastSync(new Date())
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setSaving((prev) => ({ ...prev, categoria: false }))
    }
  }

  const submitUbicacion = async (event) => {
    event?.preventDefault?.()
    setUbicacionFormDirty(true)
    if (!ubicacionValidation.isValid) {
      showStatus('error', 'Completa los campos obligatorios de la ubicación')
      return
    }

    setSaving((prev) => ({ ...prev, ubicacion: true }))
    try {
      const buildInput = () => ({ nombre: ubicacionForm.nombre, descripcion: '' })
      if (ubicacionModalState.mode === 'edit' && ubicacionModalState.id) {
        await authedRequest(QUERIES.actualizarUbicacion, {
          input: {
            ...buildInput(),
            id: ubicacionModalState.id
          }
        })
        showStatus('success', 'Ubicación actualizada')
      } else {
        await authedRequest(QUERIES.crearUbicacion, {
          input: buildInput()
        })
        showStatus('success', 'Ubicación creada')
      }

      closeUbicacionModal()
      await Promise.all([
        fetchUbicaciones(),
        fetchItems(),
        fetchReporte(reporteFilter)
      ])
      updateLastSync(new Date())
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setSaving((prev) => ({ ...prev, ubicacion: false }))
    }
  }

  const handleStockPromptSkip = useCallback(async () => {
    const intentSnapshot = stockAdjustmentPrompt.intent
    setStockAdjustmentPrompt({ open: false, intent: null })
    const success = await submitItem(null, { force: true })
    if (success && intentSnapshot) {
      registerManualAdjustment(intentSnapshot)
    }
  }, [registerManualAdjustment, stockAdjustmentPrompt.intent, submitItem])

  const handleStockPromptCancel = useCallback(() => {
    setStockAdjustmentPrompt({ open: false, intent: null })
  }, [])

  const handleStockPromptQuickSubmit = useCallback(async (formData) => {
    const intent = stockAdjustmentPrompt.intent
    if (!intent) return
    const counterpartLimit = intent.type === 'entrega' ? TEXT_LIMITS.entregadoA : TEXT_LIMITS.recibidoDe
    const enhancedIntent = {
      ...intent,
      quickForm: {
        cantidad: sanitizeDecimalInput(formData.cantidad ?? ''),
        contraparte: sanitizePlainText(formData.contraparte ?? '', counterpartLimit, { titleCaseEnabled: true, preserveTrailingSpace: true }),
        observaciones: sanitizeOptionalText(formData.observaciones ?? '', TEXT_LIMITS.observaciones, { preserveTrailingSpace: true })
      }
    }
    setStockPromptSubmitting(true)
    try {
      const success = await submitItem(null, { force: true, movementIntent: enhancedIntent })
      if (success) {
        setStockAdjustmentPrompt({ open: false, intent: null })
      }
    } finally {
      setStockPromptSubmitting(false)
    }
  }, [stockAdjustmentPrompt.intent, submitItem])

  const submitRecepcion = async (event) => {
    event.preventDefault()
    setRecepcionFormDirty(true)
    const validation = recepcionValidation
    if (!validation.isValid) {
      showStatus('error', 'Verifica los datos obligatorios de la recepción')
      return
    }
    setSaving((prev) => ({ ...prev, recepcion: true }))
    try {
      if (recepcionModalState.mode === 'edit' && recepcionModalState.id) {
        await authedRequest(QUERIES.actualizarRecepcion, {
          input: {
            ...recepcionForm,
            id: recepcionModalState.id,
            cantidadRecibida: validation.quantity
          }
        })
        showStatus('success', 'Recepción actualizada')
      } else {
        await authedRequest(QUERIES.crearRecepcion, {
          input: {
            ...recepcionForm,
            cantidadRecibida: validation.quantity
          }
        })
        showStatus('success', 'Recepción registrada')
      }

      closeRecepcionModal()
      await Promise.all([
        fetchRecepciones(),
        fetchItems(),
        fetchReporte(reporteFilter)
      ])
      updateLastSync(new Date())
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setSaving((prev) => ({ ...prev, recepcion: false }))
    }
  }

  const submitEntrega = async (event) => {
    event.preventDefault()
    setEntregaFormDirty(true)
    const validation = entregaValidation
    if (!validation.isValid) {
      showStatus('error', 'Confirma que la entrega cumple las validaciones indicadas')
      return
    }
    setSaving((prev) => ({ ...prev, entrega: true }))
    try {
      if (entregaModalState.mode === 'edit' && entregaModalState.id) {
        await authedRequest(QUERIES.actualizarEntrega, {
          input: {
            ...entregaForm,
            id: entregaModalState.id,
            cantidadEntregada: validation.quantity
          }
        })
        showStatus('success', 'Entrega actualizada')
      } else {
        await authedRequest(QUERIES.crearEntrega, {
          input: {
            ...entregaForm,
            cantidadEntregada: validation.quantity
          }
        })
        showStatus('success', 'Entrega registrada')
      }

      closeEntregaModal()
      await Promise.all([
        fetchEntregas(),
        fetchItems(),
        fetchReporte(reporteFilter)
      ])
      updateLastSync(new Date())
    } catch (error) {
      showStatus('error', error.message)
    } finally {
      setSaving((prev) => ({ ...prev, entrega: false }))
    }
  }

  const fetchKardex = useCallback(async ({ codigoMaterial, itemId = '' }) => {
    if (!codigoMaterial) return false
    setLoading((prev) => ({ ...prev, kardex: true }))
    try {
      const variables = { codigoMaterial }
      if (itemId) {
        variables.itemId = itemId
      }
      const data = await authedRequest(QUERIES.kardex, variables)
      setKardex(data.kardexPorCodigoMaterial)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el kardex'
      showStatus('error', message)
      return false
    } finally {
      setLoading((prev) => ({ ...prev, kardex: false }))
    }
  }, [authedRequest, showStatus])

  const handleSelectKardexItem = useCallback(async (item) => {
    if (!item) return
    const codigoMaterial = item.codigoMaterial ?? ''
    if (!codigoMaterial) {
      showStatus('error', 'El ítem seleccionado no tiene código material.')
      return
    }
    const itemId = item.id ?? ''
    setSelectedKardexId(itemId)
    const success = await fetchKardex({ codigoMaterial, itemId })
    if (success) {
      recordKardexSelection(item)
    }
  }, [fetchKardex, recordKardexSelection, showStatus])

  const handleReporteChange = (field, value) => {
    setReporteFilter((prev) => ({ ...prev, [field]: value }))
  }

  const rangeLabel = useMemo(() => {
    const fromDate = reporteFilter.from ? new Date(reporteFilter.from) : null
    const toDate = reporteFilter.to ? new Date(reporteFilter.to) : null
    if (!fromDate || !toDate || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return 'Rango sin definir'
    }
    const formatter = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' })
    return `Del ${formatter.format(fromDate)} al ${formatter.format(toDate)}`
  }, [reporteFilter])

  const filteredReporteRows = useMemo(() => {
    if (!hideZeroReportRows) return reporte
    return reporte.filter((row) => {
      const entradas = Number(row.totalEntradas) || 0
      const salidas = Number(row.totalSalidas) || 0
      return entradas !== 0 || salidas !== 0
    })
  }, [hideZeroReportRows, reporte])

  const heroIsSyncing = loading.items || loading.recepciones || loading.entregas
  const headerDisplayName = authUser?.nombre?.trim() || authUser?.nombreUsuario || 'operador'
  const duplicateConflictItem = duplicateCodePrompt.conflictItem
  const duplicateConflictName = duplicateConflictItem?.descripcionMaterial?.trim()
    || duplicateConflictItem?.nombreMaterial?.trim()
    || duplicateConflictItem?.codigoMaterial?.trim()
    || 'otro item del inventario'
  const duplicateConflictLocation = duplicateConflictItem?.localizacion?.trim() || ''
  const duplicateConflictDetails = duplicateConflictItem
    ? `Coincide con "${duplicateConflictName}"${duplicateConflictLocation ? ` en ${duplicateConflictLocation}` : ''}.`
    : 'Otro item ya usa este código.'

  const handleExport = useCallback((kind, rows, extra = {}) => {
    const map = {
      'items-excel': 'items',
      'items-pdf': 'items',
      'recepciones-excel': 'recepciones',
      'recepciones-pdf': 'recepciones',
      'entregas-excel': 'entregas',
      'entregas-pdf': 'entregas',
      'kardex-excel': 'kardex',
      'kardex-pdf': 'kardex',
      'reportes-excel': 'reportes',
      'reportes-pdf': 'reportes'
    }
    const key = map[kind]
    if (!key) return
    const config = EXPORT_CONFIG[key]
    if (!config) return
    if (!Array.isArray(rows) || rows.length === 0) {
      showStatus('error', 'No hay datos para exportar')
      return
    }
    const rowsWithIndex = rows.map((row, idx) => ({ __itemIndex: idx + 1, ...row }))
    const columns = config.columns
    if (kind.endsWith('excel')) {
      exportToExcel(rowsWithIndex, columns, config.filename)
    } else {
      const title = extra.title ?? config.title
      exportToPdf(rowsWithIndex, columns, config.filename, title)
    }
  }, [showStatus])

  return (
    <Router>
      <div className="app-shell">
        <header className="main-header">
          <div className="brand-mark">
            <img src="/logo_inv_cereales.png" alt="Inventario Tres Cruces" className="brand-logo" width="56" height="56" loading="lazy" />
            <div>
              <span className="brand-pill">Silo Tres Cruces</span>
              <p className="brand-title">Inventario inteligente</p>
              <p className="brand-subtitle">
                Bienvenido de nuevo, <strong>{headerDisplayName}</strong>.
              </p>
            </div>
          </div>
          <nav>
            {isAuthenticated ? (
              <>
                <NavLink to="/" end>Inicio</NavLink>
                <NavLink to="/inventario">Inventario</NavLink>
                <NavLink to="/categorias">Categorías</NavLink>
                <NavLink to="/recepciones">Recepciones</NavLink>
                <NavLink to="/entregas">Entregas</NavLink>
                <NavLink to="/kardex">Kardex</NavLink>
                <NavLink to="/reportes">Reportes</NavLink>
                <button className="btn ghost" type="button" onClick={logout}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <NavLink to="/login">Iniciar sesión</NavLink>
            )}
          </nav>
        </header>

        <main>
          <Routes>
            <Route
              path="/login"
              element={(
                <LoginPage
                  onLogin={handleLogin}
                  loading={loginLoading}
                  error={authError}
                  authUser={authUser}
                />
              )}
            />
            <Route
              path="/"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <HomePage
                    lastSync={lastSync}
                    isSyncing={heroIsSyncing}
                    authUser={authUser}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/inventario"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <InventoryPage
                    items={items}
                    loadingItems={loading.items}
                    formatDecimal={formatDecimal}
                    onRequestAdd={() => openItemModal('create')}
                    onRequestEdit={(item) => openItemModal('edit', item)}
                    onRequestDelete={(item) => openConfirmDialog('item', item)}
                    onExport={(type, rows) => handleExport(type, rows ?? items)}
                    hasCategorias={categorias.length > 0}
                    hasUbicaciones={ubicaciones.length > 0}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/categorias"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <CategoriasPage
                    categorias={categorias}
                    ubicaciones={ubicaciones}
                    items={items}
                    loadingCategorias={loading.categorias}
                    loadingUbicaciones={loading.ubicaciones}
                    onRequestAdd={() => openCategoriaModal('create')}
                    onRequestEdit={(categoria) => openCategoriaModal('edit', categoria)}
                    onRequestDelete={(categoria) => openConfirmDialog('categoria', categoria)}
                    onQuickAddItem={(categoria) => openItemModal('create', null, categoria.id)}
                    onRequestAddUbicacion={() => openUbicacionModal('create')}
                    onRequestEditUbicacion={(ubicacion) => openUbicacionModal('edit', ubicacion)}
                    onRequestDeleteUbicacion={(ubicacion) => openConfirmDialog('ubicacion', ubicacion)}
                    onQuickAddItemWithUbicacion={(ubicacion) => openItemModal('create', null, null, ubicacion.id)}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/recepciones"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <RecepcionesPage
                    recepciones={recepciones}
                    loadingRecepciones={loading.recepciones}
                    formatDate={formatDate}
                    formatDecimal={formatDecimal}
                    itemsByCodigo={itemsByCodigo}
                    onRequestAdd={() => openRecepcionModal('create')}
                    onRequestEdit={(record) => openRecepcionModal('edit', record)}
                    onRequestDelete={(record) => openConfirmDialog('recepcion', record)}
                    onExport={(type, rows) => {
                      const source = rows ?? recepciones
                      const dataset = source.map((row) => ({
                        ...row,
                        codigoMaterial: row.__display?.codigoMaterial || row.codigoMaterial,
                        descripcionMaterial: row.__display?.descripcionMaterial || row.descripcionMaterial,
                        unidadMedida: row.__display?.unidadMedida || row.unidadMedida,
                        observaciones: row.__display?.observaciones
                          ?? getObservationDisplayValue(row.observaciones, row.esSinRegistro)
                          ?? '',
                        nombreMaterial: row.__categoria ?? itemsByCodigo[row.codigoMaterial]?.nombreMaterial ?? ''
                      }))
                      handleExport(type, dataset)
                    }}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/entregas"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <EntregasPage
                    entregas={entregas}
                    loadingEntregas={loading.entregas}
                    formatDate={formatDate}
                    formatDecimal={formatDecimal}
                    itemsByCodigo={itemsByCodigo}
                    onRequestAdd={() => openEntregaModal('create')}
                    onRequestEdit={(record) => openEntregaModal('edit', record)}
                    onRequestDelete={(record) => openConfirmDialog('entrega', record)}
                    onExport={(type, rows) => {
                      const source = rows ?? entregas
                      const dataset = source.map((row) => ({
                        ...row,
                        codigoMaterial: row.__display?.codigoMaterial || row.codigoMaterial,
                        descripcionMaterial: row.__display?.descripcionMaterial || row.descripcionMaterial,
                        unidadMedida: row.__display?.unidadMedida || row.unidadMedida,
                        observaciones: row.__display?.observaciones
                          ?? getObservationDisplayValue(row.observaciones, row.esSinRegistro)
                          ?? '',
                        nombreMaterial: row.__categoria ?? itemsByCodigo[row.codigoMaterial]?.nombreMaterial ?? ''
                      }))
                      handleExport(type, dataset)
                    }}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/kardex"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <KardexPage
                    items={items}
                    selectedItem={selectedKardexItem}
                    onSelectItem={handleSelectKardexItem}
                    loading={loading.kardex}
                    kardex={kardex}
                    recentItems={recentKardexItems}
                    topItems={topKardexItems}
                    range={kardexRange}
                    onRangeChange={handleKardexRangeChange}
                    formatDate={formatDate}
                    formatDecimal={formatDecimal}
                    onExport={(type, rows, meta = {}) => {
                      const selected = selectedKardexItem
                      const dynamicTitle = meta.title ?? selected?.descripcionMaterial ?? kardex?.nombreMaterial ?? 'Kardex'
                      handleExport(type, rows ?? kardex?.movimientos ?? [], { title: dynamicTitle })
                    }}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/reportes"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={authLoading}>
                  <ReportesPage
                    reporte={filteredReporteRows}
                    loading={loading.reporte}
                    formatDecimal={formatDecimal}
                    formatDate={formatDate}
                    filter={reporteFilter}
                    onFilterChange={handleReporteChange}
                    onConsult={() => fetchReporte(reporteFilter)}
                    rangeLabel={rangeLabel}
                    now={now}
                    itemsByCodigo={itemsByCodigo}
                    itemsById={itemsById}
                    hideZeroRows={hideZeroReportRows}
                    onToggleHideZero={(value) => setHideZeroReportRows(value)}
                    manualAdjustments={manualAdjustments}
                    onExport={(type, rows) => {
                      const dataset = rows ?? filteredReporteRows
                      const enrichedReport = dataset.map((row) => {
                        const itemFromId = row.itemId ? itemsById[row.itemId] : null
                        const fallbackItem = !itemFromId && row.codigoMaterial ? itemsByCodigo[row.codigoMaterial] : null
                        const sourceItem = itemFromId ?? fallbackItem
                        return {
                          ...row,
                          descripcionMaterial: row.descripcionMaterial ?? sourceItem?.descripcionMaterial ?? ''
                        }
                      })
                      handleExport(type, enrichedReport, { title: `Reporte ${rangeLabel}` })
                    }}
                  />
                </ProtectedRoute>
              )}
            />
            <Route
              path="*"
              element={isAuthenticated ? (
                <HomePage lastSync={lastSync} isSyncing={heroIsSyncing} authUser={authUser} />
              ) : (
                <Navigate to="/login" replace />
              )}
            />
          </Routes>
        </main>

        <footer>
          <p>Inventario Tres Cruces · API GraphQL · {now.getFullYear()}</p>
          <p className="muted">© 2026 Guilherme da Silva | Todos los derechos reservados.</p>
        </footer>

        <ToastStack toasts={toasts} onDismiss={dismissToast} />

        <StockAdjustmentPrompt
          prompt={stockAdjustmentPrompt}
          onSubmitMovement={handleStockPromptQuickSubmit}
          onSkip={handleStockPromptSkip}
          onCancel={handleStockPromptCancel}
          submitting={stockPromptSubmitting}
          formatDecimal={formatDecimal}
        />

        <ErrorOverlay dialog={errorDialog} onClose={closeErrorDialog} />

        <FormModal
          isOpen={categoriaModalState.open}
          title={categoriaModalState.mode === 'edit' ? 'Editar categoría' : 'Crear categoría'}
          description="Define grupos reutilizables para clasificar tus materiales."
          onClose={closeCategoriaModal}
          onSubmit={submitCategoria}
          submitLabel={categoriaModalState.mode === 'edit' ? 'Guardar cambios' : 'Guardar categoría'}
          loading={saving.categoria}
          submitDisabled={!categoriaValidation.isValid}
        >
          <div className="form-grid">
            <label>
              Nombre de la categoría
              <input
                required
                value={categoriaForm.nombre}
                onChange={(e) => handleCategoriaFormChange('nombre', e.target.value)}
                placeholder="Ej. Lubricantes"
                maxLength={TEXT_LIMITS.nombreMaterial}
                aria-invalid={categoriaFormDirty && categoriaValidation.errors.nombre ? 'true' : 'false'}
                className={categoriaFormDirty && categoriaValidation.errors.nombre ? 'invalid' : ''}
              />
              {categoriaFormDirty && categoriaValidation.errors.nombre && (
                <p className="field-error">{categoriaValidation.errors.nombre}</p>
              )}
            </label>
          </div>
        </FormModal>

        <FormModal
          isOpen={ubicacionModalState.open}
          title={ubicacionModalState.mode === 'edit' ? 'Editar ubicación' : 'Registrar ubicación'}
          description="Administra máquinas, silos o zonas para usarlas en tus items."
          onClose={closeUbicacionModal}
          onSubmit={submitUbicacion}
          submitLabel={ubicacionModalState.mode === 'edit' ? 'Guardar cambios' : 'Guardar ubicación'}
          loading={saving.ubicacion}
          submitDisabled={!ubicacionValidation.isValid}
        >
          <div className="form-grid">
            <label>
              Nombre de la ubicación
              <input
                required
                value={ubicacionForm.nombre}
                onChange={(e) => handleUbicacionFormChange('nombre', e.target.value)}
                placeholder="Ej. Tolva 2, Molino A"
                maxLength={TEXT_LIMITS.nombreMaterial}
                aria-invalid={ubicacionFormDirty && ubicacionValidation.errors.nombre ? 'true' : 'false'}
                className={ubicacionFormDirty && ubicacionValidation.errors.nombre ? 'invalid' : ''}
              />
              {ubicacionFormDirty && ubicacionValidation.errors.nombre && (
                <p className="field-error">{ubicacionValidation.errors.nombre}</p>
              )}
            </label>
          </div>
        </FormModal>

        <FormModal
          isOpen={itemModalState.open}
          title={itemModalState.mode === 'edit' ? 'Editar item' : 'Registrar nuevo item'}
          description="Simplifica el alta o edición de items sin abandonar la tabla."
          onClose={closeItemModal}
          onSubmit={submitItem}
          submitLabel={itemModalState.mode === 'edit' ? 'Guardar cambios' : 'Registrar item'}
          loading={saving.item}
          submitDisabled={!itemValidation.isValid}
        >
          <div className="form-grid">
            <label>
              Código material
              <input
                required
                value={itemForm.codigoMaterial}
                onChange={(e) => handleItemFormChange('codigoMaterial', e.target.value)}
                placeholder="Código SAP u otro"
                maxLength={TEXT_LIMITS.codigoMaterial}
                autoComplete="off"
                aria-invalid={itemFormDirty && itemValidation.errors.codigoMaterial ? 'true' : 'false'}
                className={itemFormDirty && itemValidation.errors.codigoMaterial ? 'invalid' : ''}
              />
              {itemFormDirty && itemValidation.errors.codigoMaterial && (
                <p className="field-error">{itemValidation.errors.codigoMaterial}</p>
              )}
            </label>
            <label>
              Categoría / familia
              <select
                required
                value={itemForm.categoriaId}
                onChange={(e) => handleItemFormChange('categoriaId', e.target.value)}
                disabled={categorias.length === 0}
                aria-invalid={itemFormDirty && itemValidation.errors.categoriaId ? 'true' : 'false'}
                className={itemFormDirty && itemValidation.errors.categoriaId ? 'invalid' : ''}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
              {categorias.length === 0 && (
                <p className="field-hint warning">Crea una categoría antes de registrar items.</p>
              )}
              {itemFormDirty && itemValidation.errors.categoriaId && (
                <p className="field-error">{itemValidation.errors.categoriaId}</p>
              )}
            </label>
            <label className="full">
              Descripción del item
              <textarea
                required
                rows={3}
                value={itemForm.descripcionMaterial}
                onChange={(e) => handleItemFormChange('descripcionMaterial', e.target.value)}
                placeholder="Nombre amigable del material"
                maxLength={TEXT_LIMITS.descripcionMaterial}
                aria-invalid={itemFormDirty && itemValidation.errors.descripcionMaterial ? 'true' : 'false'}
                className={itemFormDirty && itemValidation.errors.descripcionMaterial ? 'invalid' : ''}
              />
              <div className="field-hint-row">
                <p className="field-hint">Máx. {TEXT_LIMITS.descripcionMaterial} caracteres.</p>
              </div>
              {itemFormDirty && itemValidation.errors.descripcionMaterial && (
                <p className="field-error">{itemValidation.errors.descripcionMaterial}</p>
              )}
            </label>
            <label>
              Cantidad en stock
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={itemForm.cantidadStock}
                onChange={(e) => handleItemFormChange('cantidadStock', e.target.value)}
                placeholder="0"
                inputMode="decimal"
                onKeyDown={blockInvalidNumberKeys}
                max={QUANTITY_LIMITS.stock.max}
                aria-invalid={itemFormDirty && itemValidation.errors.cantidadStock ? 'true' : 'false'}
                className={itemFormDirty && itemValidation.errors.cantidadStock ? 'invalid' : ''}
              />
              {itemFormDirty && itemValidation.errors.cantidadStock && (
                <p className="field-error">{itemValidation.errors.cantidadStock}</p>
              )}
            </label>
            <label>
              Unidad de medida
              <select
                required
                value={itemForm.unidadMedida}
                onChange={(e) => handleItemFormChange('unidadMedida', e.target.value)}
                aria-invalid={itemFormDirty && itemValidation.errors.unidadMedida ? 'true' : 'false'}
                className={itemFormDirty && itemValidation.errors.unidadMedida ? 'invalid' : ''}
              >
                <option value="">Selecciona una unidad</option>
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {itemFormDirty && itemValidation.errors.unidadMedida && (
                <p className="field-error">{itemValidation.errors.unidadMedida}</p>
              )}
            </label>
            <label>
              Ubicación / máquina
              <select
                required
                value={itemForm.ubicacionId}
                onChange={(e) => handleItemFormChange('ubicacionId', e.target.value)}
                disabled={ubicaciones.length === 0}
                aria-invalid={itemFormDirty && itemValidation.errors.ubicacionId ? 'true' : 'false'}
                className={itemFormDirty && itemValidation.errors.ubicacionId ? 'invalid' : ''}
              >
                <option value="">Selecciona una ubicación</option>
                {!ubicaciones.some((ubicacion) => ubicacion.id === itemForm.ubicacionId) && itemForm.ubicacionId && (
                  <option value={itemForm.ubicacionId} disabled>Ubicación asignada no disponible</option>
                )}
                {ubicaciones.map((ubicacion) => (
                  <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</option>
                ))}
              </select>
              {ubicaciones.length === 0 && (
                <p className="field-hint warning">Registra una ubicación en la sección de categorías.</p>
              )}
              {itemFormDirty && itemValidation.errors.ubicacionId && (
                <p className="field-error">{itemValidation.errors.ubicacionId}</p>
              )}
            </label>
          </div>
        </FormModal>

        <FormModal
          isOpen={recepcionModalState.open}
          title={recepcionModalState.mode === 'edit' ? 'Editar recepción' : 'Registrar recepción'}
          description="Registra entradas con validación automática del item seleccionado."
          onClose={closeRecepcionModal}
          onSubmit={submitRecepcion}
          submitLabel={recepcionModalState.mode === 'edit' ? 'Guardar cambios' : 'Registrar recepción'}
          loading={saving.recepcion}
          submitDisabled={!recepcionValidation.isValid}
        >
          <div className="form-grid">
            <ItemAutocompleteField
              label="Item"
              items={sortedItems}
              value={recepcionForm.codigoMaterial}
              selectedItem={itemsById[recepcionForm.itemId]}
              onSelect={handleRecepcionSelectItem}
              dirty={recepcionFormDirty}
              error={recepcionFormDirty ? recepcionValidation.errors.codigoMaterial : ''}
              placeholder="Busca por código o nombre"
              helper={recepcionForm.itemId
                ? `Seleccionado: ${itemsById[recepcionForm.itemId]?.descripcionMaterial ?? ''}`
                : 'Escribe al menos dos caracteres y confirma con Enter o clic.'}
              disabled={sortedItems.length === 0}
            />
            <label>
              Recibido de
              <input
                required
                value={recepcionForm.recibidoDe}
                onChange={(e) => handleRecepcionChange('recibidoDe', e.target.value)}
                placeholder="Proveedor o responsable"
                maxLength={TEXT_LIMITS.recibidoDe}
                autoComplete="off"
                aria-invalid={recepcionFormDirty && recepcionValidation.errors.recibidoDe ? 'true' : 'false'}
                className={recepcionFormDirty && recepcionValidation.errors.recibidoDe ? 'invalid' : ''}
              />
              {recepcionFormDirty && recepcionValidation.errors.recibidoDe && (
                <p className="field-error">{recepcionValidation.errors.recibidoDe}</p>
              )}
            </label>
            <label>
              Código material
              <input value={recepcionForm.codigoMaterial} readOnly placeholder="Automático" />
            </label>
            <label>
              Unidad de medida
              <input value={recepcionForm.unidadMedida} readOnly placeholder="Automático" />
            </label>
            <label className="full">
              Nombre del item
              <input value={recepcionForm.descripcionMaterial} readOnly placeholder="Automático" />
            </label>
            <label>
              Cantidad recibida
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={recepcionForm.cantidadRecibida}
                onChange={(e) => handleRecepcionChange('cantidadRecibida', e.target.value)}
                placeholder="0"
                inputMode="decimal"
                onKeyDown={blockInvalidNumberKeys}
                max={QUANTITY_LIMITS.movement.max}
                aria-invalid={recepcionFormDirty && recepcionValidation.errors.cantidadRecibida ? 'true' : 'false'}
                className={recepcionFormDirty && recepcionValidation.errors.cantidadRecibida ? 'invalid' : ''}
              />
              {recepcionFormDirty && recepcionValidation.errors.cantidadRecibida && (
                <p className="field-error">{recepcionValidation.errors.cantidadRecibida}</p>
              )}
            </label>
            <label className="full">
              Observaciones
              <textarea
                rows={3}
                value={recepcionForm.observaciones}
                onChange={(e) => handleRecepcionChange('observaciones', e.target.value)}
                placeholder="Notas adicionales"
                maxLength={TEXT_LIMITS.observaciones}
              />
              <p className="field-hint">Opcional · Máx. {TEXT_LIMITS.observaciones} caracteres.</p>
            </label>
          </div>
        </FormModal>

        <FormModal
          isOpen={entregaModalState.open}
          title={entregaModalState.mode === 'edit' ? 'Editar entrega' : 'Registrar entrega'}
          description="Registra salidas asegurando stock suficiente antes de confirmar."
          onClose={closeEntregaModal}
          onSubmit={submitEntrega}
          submitLabel={entregaModalState.mode === 'edit' ? 'Guardar cambios' : 'Registrar entrega'}
          loading={saving.entrega}
          submitDisabled={!entregaValidation.isValid}
        >
          <div className="form-grid">
            <ItemAutocompleteField
              label="Item"
              items={sortedItems}
              value={entregaForm.codigoMaterial}
              selectedItem={itemsById[entregaForm.itemId]}
              onSelect={handleEntregaSelectItem}
              dirty={entregaFormDirty}
              error={entregaFormDirty ? entregaValidation.errors.codigoMaterial : ''}
              placeholder="Busca por código o nombre"
              helper={entregaForm.itemId
                ? `Seleccionado: ${itemsById[entregaForm.itemId]?.descripcionMaterial ?? ''}`
                : 'Escribe al menos dos caracteres y confirma con Enter o clic.'}
              disabled={sortedItems.length === 0}
            />
            <label>
              Entregado a
              <input
                required
                value={entregaForm.entregadoA}
                onChange={(e) => handleEntregaChange('entregadoA', e.target.value)}
                placeholder="Área solicitante"
                maxLength={TEXT_LIMITS.entregadoA}
                autoComplete="off"
                aria-invalid={entregaFormDirty && entregaValidation.errors.entregadoA ? 'true' : 'false'}
                className={entregaFormDirty && entregaValidation.errors.entregadoA ? 'invalid' : ''}
              />
              {entregaFormDirty && entregaValidation.errors.entregadoA && (
                <p className="field-error">{entregaValidation.errors.entregadoA}</p>
              )}
            </label>
            <label>
              Código material
              <input value={entregaForm.codigoMaterial} readOnly placeholder="Automático" />
            </label>
            <label>
              Unidad de medida
              <input value={entregaForm.unidadMedida} readOnly placeholder="Automático" />
            </label>
            <label className="full">
              Nombre del item
              <input value={entregaForm.descripcionMaterial} readOnly placeholder="Automático" />
            </label>
            <label>
              Cantidad entregada
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={entregaForm.cantidadEntregada}
                onChange={(e) => handleEntregaChange('cantidadEntregada', e.target.value)}
                placeholder="0"
                inputMode="decimal"
                onKeyDown={blockInvalidNumberKeys}
                max={QUANTITY_LIMITS.movement.max}
                aria-invalid={entregaFormDirty && entregaValidation.errors.cantidadEntregada ? 'true' : 'false'}
                className={entregaFormDirty && entregaValidation.errors.cantidadEntregada ? 'invalid' : ''}
              />
              {entregaForm.codigoMaterial && (
                <p className={`field-hint ${entregaFormDirty && entregaValidation.errors.cantidadEntregada ? 'error' : ''}`}>
                  Stock disponible: {entregaValidation.availableStock !== null
                    ? `${formatDecimal(entregaValidation.availableStock)} ${itemsByCodigo[entregaForm.codigoMaterial]?.unidadMedida ?? ''}`
                    : 'Selecciona un item'}
                </p>
              )}
              {entregaFormDirty && entregaValidation.errors.cantidadEntregada && (
                <p className="field-error">{entregaValidation.errors.cantidadEntregada}</p>
              )}
            </label>
            <label className="full">
              Observaciones
              <textarea
                rows={3}
                value={entregaForm.observaciones}
                onChange={(e) => handleEntregaChange('observaciones', e.target.value)}
                placeholder="Justifica la entrega"
                maxLength={TEXT_LIMITS.observaciones}
              />
              <p className="field-hint">Opcional · Máx. {TEXT_LIMITS.observaciones} caracteres.</p>
            </label>
          </div>
        </FormModal>

        <ConfirmModal
          isOpen={duplicateCodePrompt.open}
          title="Código duplicado detectado"
          message={`Ya existe un item con el código ${(duplicateCodePrompt.code ?? '').trim() || 'ingresado'}.`}
          details={duplicateConflictDetails}
          onCancel={dismissDuplicateCodePrompt}
          onConfirm={confirmDuplicateCodePrompt}
          loading={saving.item}
          confirmLabel="Guardar de todas formas"
          confirmLoadingLabel="Guardando…"
          confirmKind="primary"
          hint="Cancela para corregirlo o confirma si necesitas repetir el código."
        />

        <ConfirmModal
          isOpen={confirmState.open}
          title="Confirmar eliminación"
          message={confirmState.message}
          details={confirmState.details}
          onCancel={closeConfirmDialog}
          onConfirm={handleDeleteConfirmed}
          loading={deleteLoading}
          requireMatch={confirmState.requireMatch}
          matchValue={confirmState.matchValue}
          matchLabel={confirmState.matchLabel}
          hint={confirmState.confirmHint}
        />
      </div>
    </Router>
  )
}

function ProtectedRoute({ children, isAuthenticated, loading }) {
  if (loading) {
    return <div className="loading-state">Verificando sesión…</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function HomePage({ lastSync, isSyncing, authUser }) {
  const lastSyncLabel = lastSync
    ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(lastSync)
    : 'Sin registros aún'
  const displayName = authUser?.nombre?.trim() || authUser?.nombreUsuario || 'operador'
  const usernameLabel = authUser?.nombreUsuario?.trim() || '—'
  const heroCopy = authUser
    ? 'Gestiona existencias, registra movimientos y consulta reportes en segundos.'
    : 'Visualiza existencias, registra entradas y salidas, genera kardex y reportes mensuales. Todo conectado directamente con la API GraphQL del sistema.'

  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Operación sin fricciones</p>
          <h1>Inventario en tiempo real para el Silo Tres Cruces</h1>
          {authUser && (
            <p className="muted">Sesión iniciada como <strong>{usernameLabel}</strong></p>
          )}
          <p className="hero-copy">{heroCopy}</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/inventario">Ver inventario</Link>
          </div>
        </div>
        <div className="hero-visual">
          <article className="hero-card compact">
            <div className="hero-card-heading">
              <p>Última actualización</p>
              {isSyncing && <span className="pill">Actualizando…</span>}
            </div>
            <h3>{lastSyncLabel}</h3>
            <p className="muted">Se refresca automáticamente al registrar movimientos.</p>
          </article>
          <figure className="hero-logo-card compact">
            <div className="hero-logo-circle small">
              <img src="/logo_inv_cereales.png" alt="Logotipo inventario Tres Cruces" loading="lazy" width="120" height="120" />
            </div>
            <figcaption>
              <p className="hero-logo-title">Silo Tres Cruces</p>
              <p className="hero-logo-note">Monitoreo constante</p>
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  )
}

function LoginPage({ onLogin, loading, error, authUser }) {
  const [form, setForm] = useState({ usuario: '', password: '' })
  const navigate = useNavigate()

  useEffect(() => {
    if (authUser) {
      navigate('/', { replace: true })
    }
  }, [authUser, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await onLogin(form)
      navigate('/', { replace: true })
    } catch {
      // el error ya se muestra desde la prop "error"
    }
  }

  return (
    <section className="login-section">
      <div className="login-card">
        <p className="eyebrow">Acceso seguro</p>
        <h2>Inicia sesión</h2>
        <p className="muted">Ingresa tus credenciales para acceder al panel.</p>
        {error && <div className="alert-banner error">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Usuario
            <input
              required
              value={form.usuario}
              onChange={(e) => setForm((prev) => ({ ...prev, usuario: e.target.value }))}
            />
          </label>
          <label>
            Contraseña
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Validando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </section>
  )
}

function ExportMenu({ onExportExcel, onExportPdf }) {
  return (
    <div className="export-menu">
      <button className="btn outline" type="button" onClick={onExportExcel}>
        Excel
      </button>
      <button className="btn ghost" type="button" onClick={onExportPdf}>
        PDF
      </button>
    </div>
  )
}

function InventoryPage({
  items,
  loadingItems,
  formatDecimal,
  onRequestAdd,
  onRequestEdit,
  onRequestDelete,
  onExport,
  hasCategorias,
  hasUbicaciones
}) {
  const canCreateItems = hasCategorias && hasUbicaciones
  const creationHint = useMemo(() => {
    if (canCreateItems) return null
    if (!hasCategorias && !hasUbicaciones) {
      return (
        <>
          Crea una <Link to="/categorias">categoría</Link> y una ubicación antes de registrar items.
        </>
      )
    }
    if (!hasCategorias) {
      return (
        <>
          Crea una <Link to="/categorias">categoría</Link> antes de registrar items.
        </>
      )
    }
    return 'Registra al menos una ubicación desde la sección de categorías antes de registrar items.'
  }, [canCreateItems, hasCategorias, hasUbicaciones])
  const [filters, setFilters] = useState({
    ubicacion: 'all',
    search: ''
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const ubicaciones = useMemo(() => {
    const valores = items.map((item) => item.localizacion).filter(Boolean)
    return Array.from(new Set(valores)).sort()
  }, [items])

  const normalizedSearch = useMemo(() => filters.search.trim().toLowerCase(), [filters.search])
  const normalizedUbicacion = useMemo(() => (
    filters.ubicacion === 'all' ? 'all' : filters.ubicacion.trim().toLowerCase()
  ), [filters.ubicacion])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoria = item.nombreMaterial?.trim().toLowerCase() ?? ''
      const ubicacion = item.localizacion?.trim().toLowerCase() ?? ''
      const descripcion = item.descripcionMaterial?.toLowerCase() ?? ''
      const codigoMaterial = item.codigoMaterial?.toLowerCase() ?? ''
      const matchesUbicacion = normalizedUbicacion === 'all' || ubicacion === normalizedUbicacion
      const matchesSearch = !normalizedSearch || [codigoMaterial, categoria, descripcion].some((value) => value.includes(normalizedSearch))
      return matchesUbicacion && matchesSearch
    })
  }, [items, normalizedSearch, normalizedUbicacion])

  useEffect(() => {
    setPage(1)
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page, pageSize])

  const hasItems = items.length > 0
  const showEmptyState = !loadingItems && !hasItems
  const showNoMatches = !loadingItems && hasItems && filteredItems.length === 0

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <section className="dashboard-section">
      <div className="table-header sticky">
        <div>
          <p className="eyebrow">Inventario</p>
          <h2>Control total de items y stock</h2>
          <p className="muted">{filteredItems.length} ítems visibles</p>
        </div>
        <div className="table-header-actions">
          {loadingItems && <span className="pill">Cargando…</span>}
          <ExportMenu onExportExcel={() => onExport('items-excel', filteredItems)} onExportPdf={() => onExport('items-pdf', filteredItems)} />
          <button className="btn primary" type="button" onClick={onRequestAdd} disabled={!canCreateItems}>
            + Agregar
          </button>
          {!canCreateItems && creationHint && (
            <p className="field-hint warning inline">{creationHint}</p>
          )}
        </div>
      </div>

      <article className="panel-card table-card">
        <div className="table-search-row">
          <label className="search-field">
            Búsqueda rápida
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Código material, categoría o nombre"
            />
          </label>
          <label>
            Ubicación
            <select value={filters.ubicacion} onChange={(e) => handleFilterChange('ubicacion', e.target.value)}>
              <option value="all">Cualquiera</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Código material</th>
                <th>Categoría</th>
                <th>Nombre del item</th>
                <th>Stock</th>
                <th>Unidad</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems && (
                <tr>
                  <td colSpan={8} className="empty">Cargando tabla…</td>
                </tr>
              )}
              {showEmptyState && (
                <tr>
                  <td colSpan={8} className="empty">No hay items registrados</td>
                </tr>
              )}
              {showNoMatches && (
                <tr>
                  <td colSpan={8} className="empty">Sin coincidencias para los filtros aplicados</td>
                </tr>
              )}
              {!loadingItems && !showEmptyState && !showNoMatches && paginatedItems.map((item, index) => {
                const absoluteIndex = filteredItems.findIndex((candidate) => candidate.id === item.id)
                const rowNumber = absoluteIndex >= 0 ? absoluteIndex + 1 : index + 1 + (page - 1) * pageSize
                return (
                  <tr key={item.id ?? `${item.codigoMaterial}-${index}`}>
                    <td>{rowNumber}</td>
                    <td>{item.codigoMaterial}</td>
                    <td>{item.nombreMaterial}</td>
                    <td className="text-wrap">{item.descripcionMaterial}</td>
                    <td>{formatDecimal(item.cantidadStock)}</td>
                    <td>{item.unidadMedida}</td>
                    <td>{item.localizacion}</td>
                    <td>
                      <RowActionsMenu
                        onEdit={() => onRequestEdit(item)}
                        onDelete={() => onRequestDelete(item)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </article>

    </section>
  )
}

function CategoriasPage({
  categorias,
  ubicaciones,
  items,
  loadingCategorias,
  loadingUbicaciones,
  onRequestAdd,
  onRequestEdit,
  onRequestDelete,
  onQuickAddItem,
  onRequestAddUbicacion,
  onRequestEditUbicacion,
  onRequestDeleteUbicacion,
  onQuickAddItemWithUbicacion
}) {
  const [search, setSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search])
  const normalizedLocationSearch = useMemo(() => locationSearch.trim().toLowerCase(), [locationSearch])

  const usageByCategoria = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!item?.categoriaId) return acc
      acc[item.categoriaId] = (acc[item.categoriaId] ?? 0) + 1
      return acc
    }, {})
  }, [items])

  const enrichedCategorias = useMemo(() => {
    return categorias.map((categoria) => ({
      ...categoria,
      totalItems: usageByCategoria[categoria.id] ?? 0
    }))
  }, [categorias, usageByCategoria])

  const filteredCategorias = useMemo(() => {
    if (!normalizedSearch) return enrichedCategorias
    return enrichedCategorias.filter((categoria) => (
      categoria.nombre?.toLowerCase().includes(normalizedSearch)
    ))
  }, [enrichedCategorias, normalizedSearch])

  const featuredCategorias = useMemo(() => {
    return [...enrichedCategorias]
      .sort((a, b) => b.totalItems - a.totalItems)
      .slice(0, 3)
  }, [enrichedCategorias])

  const getAccent = useCallback((nombre) => {
    const hash = Array.from(nombre ?? '')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    if (CATEGORY_PALETTE.length === 0) {
      return '#0f172a'
    }
    return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length]
  }, [])

  const totalItems = items.length
  const averageItems = categorias.length ? Math.round(totalItems / categorias.length) : 0

  const usageByUbicacion = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!item?.ubicacionId) return acc
      acc[item.ubicacionId] = (acc[item.ubicacionId] ?? 0) + 1
      return acc
    }, {})
  }, [items])

  const enrichedUbicaciones = useMemo(() => {
    return ubicaciones.map((ubicacion) => ({
      ...ubicacion,
      totalItems: usageByUbicacion[ubicacion.id] ?? 0
    }))
  }, [ubicaciones, usageByUbicacion])

  const filteredUbicaciones = useMemo(() => {
    if (!normalizedLocationSearch) return enrichedUbicaciones
    return enrichedUbicaciones.filter((ubicacion) => (
      ubicacion.nombre?.toLowerCase().includes(normalizedLocationSearch)
    ))
  }, [enrichedUbicaciones, normalizedLocationSearch])

  const topUbicaciones = useMemo(() => (
    [...enrichedUbicaciones]
      .sort((a, b) => b.totalItems - a.totalItems)
      .slice(0, 3)
  ), [enrichedUbicaciones])

  const unassignedUbicaciones = useMemo(() => (
    enrichedUbicaciones.filter((ubicacion) => ubicacion.totalItems === 0).length
  ), [enrichedUbicaciones])

  const usedUbicaciones = Math.max(enrichedUbicaciones.length - unassignedUbicaciones, 0)

  const locationEmptyState = !loadingUbicaciones && ubicaciones.length === 0
  const emptyState = !loadingCategorias && categorias.length === 0

  return (
    <section className="dashboard-section categories-section">
      <div className="category-hero">
        <article className="panel-card stat-card hero-summary">
          <div className="stat-card-head">
            <div>
              <p className="eyebrow">Categorías activas</p>
              <h2>{categorias.length}</h2>
              <p className="muted">Agrupa materiales para búsquedas rápidas.</p>
            </div>
            <span className="hero-badge">Inventario</span>
          </div>
          <div className="stat-metrics">
            <div className="metric-chip">
              <p className="metric-label">Items totales</p>
              <p className="metric-value">{totalItems}</p>
              <p className="metric-subtitle">Incluye recepciones y entregas recientes</p>
            </div>
            <div className="metric-chip">
              <p className="metric-label">Promedio por categoría</p>
              <p className="metric-value">{averageItems || 0}</p>
              <p className="metric-subtitle">Items/categoría</p>
            </div>
            <div className="metric-chip">
              <p className="metric-label">Ubicaciones en uso</p>
              <p className="metric-value">{usedUbicaciones}</p>
              <p className="metric-subtitle">{enrichedUbicaciones.length} registradas</p>
            </div>
          </div>
          <div className="stat-actions">
            <button type="button" className="btn primary compact" onClick={onRequestAdd}>
              + Nueva categoría
            </button>
            <button type="button" className="btn ghost compact" onClick={onRequestAddUbicacion}>
              + Nueva ubicación
            </button>
          </div>
        </article>
        <article className={`panel-card stat-card hero-insights ${featuredCategorias.length === 0 ? 'category-highlight-empty' : ''}`}>
          <div className="stat-card-head compact">
            <div>
              <p className="eyebrow">Más consultadas</p>
              <p className="muted small">Top 3 según movimientos recientes</p>
            </div>
            <Link to="/inventario" className="btn ghost compact hero-link">Ver inventario</Link>
          </div>
          {featuredCategorias.length === 0 ? (
            <div className="category-ranking-empty">
              <p className="muted">Registra categorías para ver tendencias.</p>
            </div>
          ) : (
            <ul className="hero-ranking">
              {featuredCategorias.map((categoria, index) => {
                const percent = totalItems > 0 ? Math.round((categoria.totalItems / totalItems) * 100) : 0
                return (
                  <li key={categoria.id}>
                    <div className="hero-ranking-label">
                      <span className="dot" style={{ backgroundColor: getAccent(categoria.nombre) }} />
                      <div>
                        <strong>{categoria.nombre}</strong>
                        <p className="muted">{categoria.totalItems} {categoria.totalItems === 1 ? 'item' : 'items'}</p>
                      </div>
                    </div>
                    <div className="hero-ranking-progress" aria-label={`Participación ${categoria.nombre}`}>
                      <span style={{ width: `${Math.min(percent, 100)}%` }} />
                    </div>
                    <span className="hero-ranking-percent">{percent}%</span>
                    <span className="hero-ranking-index">#{index + 1}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      </div>

      <article className="panel-card category-panel">
        <div className="category-panel-header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Gestiona tus categorías</h2>
            <p className="muted">Haz clic en cualquier tarjeta para editar, duplicar o añadir items.</p>
          </div>
          <div className="category-search-row">
            <label>
              Búsqueda
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca por nombre"
              />
            </label>
            <button type="button" className="btn outline" onClick={onRequestAdd}>
              + Registrar categoría
            </button>
          </div>
        </div>

        {emptyState ? (
          <div className="category-empty">
            <p className="eyebrow">Sin categorías</p>
            <h3>Organiza tu inventario por familias</h3>
            <p className="muted">Comienza creando una categoría y luego asigna tus items existentes.</p>
            <button type="button" className="btn primary" onClick={onRequestAdd}>
              Crear la primera categoría
            </button>
          </div>
        ) : (
          <div className="category-grid">
            {loadingCategorias && (
              <div className="category-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
            {!loadingCategorias && filteredCategorias.length === 0 && (
              <div className="category-empty muted">
                <p>No se encontraron categorías con ese criterio.</p>
              </div>
            )}
            {!loadingCategorias && filteredCategorias.map((categoria) => {
              const accent = getAccent(categoria.nombre)
              const itemsLabel = categoria.totalItems === 1 ? 'item' : 'items'
              const usagePercent = totalItems > 0 ? Math.round((categoria.totalItems / totalItems) * 100) : 0
              return (
                <article
                  className="category-card"
                  key={categoria.id}
                  style={{ borderColor: accent }}
                >
                  <header className="category-card-header">
                    <div className="category-badge" style={{ background: accent }}>
                      {categoria.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="category-title">
                      <p className="category-label">Categoría</p>
                      <h3>{categoria.nombre}</h3>
                      <p className="category-count">{categoria.totalItems} {itemsLabel}</p>
                    </div>
                    <div className="category-chip-actions" role="group" aria-label={`Acciones para ${categoria.nombre}`}>
                      <button
                        type="button"
                        className="chip-action danger"
                        onClick={() => onRequestDelete(categoria)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </header>
                  <div className="category-progress">
                    <div className="category-progress-bar">
                      <span
                        className="category-progress-value"
                        style={{ width: `${Math.min(usagePercent, 100)}%`, backgroundColor: accent }}
                      />
                    </div>
                    <div className="category-progress-labels">
                      <span>{usagePercent > 0 ? `${usagePercent}% del inventario` : 'Sin items asignados'}</span>
                      <span>{categoria.totalItems} {itemsLabel}</span>
                    </div>
                  </div>
                  <div className="category-card-footer">
                    <button type="button" className="btn ghost compact" onClick={() => onRequestEdit(categoria)}>
                      Editar categoría
                    </button>
                    <button type="button" className="btn primary compact" onClick={() => onQuickAddItem(categoria)}>
                      Crear item aquí
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </article>

      <article className="panel-card location-panel">
        <div className="category-panel-header">
          <div>
            <p className="eyebrow">Ubicaciones operativas</p>
            <h2>Define zonas y máquinas reutilizables</h2>
            <p className="muted">
              {enrichedUbicaciones.length} ubicaciones · {unassignedUbicaciones} sin items asignados
            </p>
          </div>
          <div className="category-search-row">
            <label>
              Búsqueda
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Busca por nombre"
              />
            </label>
            <button type="button" className="btn outline" onClick={onRequestAddUbicacion}>
              + Registrar ubicación
            </button>
          </div>
        </div>

        <div className="location-insights">
          <article className="insight-card">
            <div className="insight-head">
              <p className="eyebrow">Con más consumo</p>
              <span className="muted small">{totalItems} items monitoreados</span>
            </div>
            {topUbicaciones.length === 0 ? (
              <p className="muted">Registra ubicaciones para ver actividad.</p>
            ) : (
              <ul className="insight-list">
                {topUbicaciones.map((ubicacion) => {
                  const percent = totalItems > 0 ? Math.round((ubicacion.totalItems / totalItems) * 100) : 0
                  return (
                    <li key={ubicacion.id}>
                      <div className="insight-label">
                        <span className="dot" style={{ backgroundColor: getAccent(ubicacion.nombre ?? '') }} />
                        <div>
                          <strong>{ubicacion.nombre}</strong>
                          <p className="muted">{ubicacion.totalItems} {ubicacion.totalItems === 1 ? 'item' : 'items'}</p>
                        </div>
                      </div>
                      <div className="insight-progress" aria-label={`Participación ${ubicacion.nombre}`}>
                        <span style={{ width: `${Math.min(percent, 100)}%` }} />
                        <em>{percent}%</em>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
          <article className="insight-card highlight">
            <p className="eyebrow">Ubicaciones en uso</p>
            <div className="insight-value">{usedUbicaciones}</div>
            <p className="muted">Actualmente asignadas a items activos.</p>
            <button type="button" className="btn ghost compact" onClick={onRequestAddUbicacion}>
              + Registrar ubicación
            </button>
          </article>
        </div>

        {locationEmptyState ? (
          <div className="category-empty">
            <p className="eyebrow">Sin ubicaciones</p>
            <h3>Controla dónde vive cada recurso</h3>
            <p className="muted">Crea la primera ubicación para habilitar el selector del formulario de items.</p>
            <button type="button" className="btn primary" onClick={onRequestAddUbicacion}>
              Crear la primera ubicación
            </button>
          </div>
        ) : (
          <div className="category-grid location-grid">
            {loadingUbicaciones && (
              <div className="category-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
            {!loadingUbicaciones && filteredUbicaciones.length === 0 && (
              <div className="category-empty muted">
                <p>No se encontraron ubicaciones con ese criterio.</p>
              </div>
            )}
            {!loadingUbicaciones && filteredUbicaciones.map((ubicacion) => {
              const accent = getAccent(ubicacion.nombre ?? '')
              const itemsLabel = ubicacion.totalItems === 1 ? 'item' : 'items'
              const badgeLabel = (ubicacion.nombre?.slice(0, 2) ?? 'UB').toUpperCase()
              return (
                <article className="category-card location-card" key={ubicacion.id} style={{ borderColor: accent }}>
                  <header className="category-card-header">
                    <div className="category-badge" style={{ background: accent }}>
                      {badgeLabel}
                    </div>
                    <div className="category-title">
                      <p className="category-label">Ubicación</p>
                      <h3>{ubicacion.nombre}</h3>
                      <p className="category-count">{ubicacion.totalItems} {itemsLabel}</p>
                    </div>
                    <div className="category-chip-actions" role="group" aria-label={`Acciones para ${ubicacion.nombre ?? 'esta ubicación'}`}>
                      <button
                        type="button"
                        className="chip-action danger"
                        onClick={() => onRequestDeleteUbicacion(ubicacion)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </header>
                  <div className="location-meta enhanced">
                    <span className={`pill ${ubicacion.totalItems > 0 ? 'success' : 'warning'}`}>
                      {ubicacion.totalItems > 0 ? 'En uso' : 'Sin asignar'}
                    </span>
                    <p className="muted">
                      {ubicacion.totalItems > 0 ? 'Disponible para reasignar' : 'Ideal para nuevos items'}
                    </p>
                  </div>
                  <div className="category-card-footer location-footer">
                    <button type="button" className="btn ghost compact" onClick={() => onRequestEditUbicacion(ubicacion)}>
                      Editar ubicación
                    </button>
                    <button
                      type="button"
                      className="btn primary compact"
                      onClick={() => onQuickAddItemWithUbicacion(ubicacion)}
                      disabled={categorias.length === 0}
                      title={categorias.length === 0 ? 'Registra al menos una categoría para crear items' : 'Crear item en esta ubicación'}
                    >
                      Crear item aquí
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )
}

function RecepcionesPage({
  recepciones,
  loadingRecepciones,
  formatDate,
  formatDecimal,
  itemsByCodigo,
  onRequestAdd,
  onRequestEdit,
  onRequestDelete,
  onExport
}) {
  const [filters, setFilters] = useState({ codigo: '', nombre: '', recibido: '' })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const normalizedCodigo = useMemo(() => filters.codigo.trim().toLowerCase(), [filters.codigo])
  const normalizedNombre = useMemo(() => filters.nombre.trim().toLowerCase(), [filters.nombre])
  const normalizedRecibido = useMemo(() => filters.recibido.trim().toLowerCase(), [filters.recibido])

  const recepcionesWithDisplay = useMemo(() => {
    return recepciones.map((recepcion) => {
      const item = itemsByCodigo[recepcion.codigoMaterial] ?? {}
      const observationDisplay = getObservationDisplayValue(recepcion.observaciones, recepcion.esSinRegistro)
      return {
        ...recepcion,
        __display: {
          codigoMaterial: resolveMovementDetail(recepcion.codigoMaterial, item.codigoMaterial ?? ''),
          descripcionMaterial: resolveMovementDetail(recepcion.descripcionMaterial, item.descripcionMaterial ?? ''),
          unidadMedida: resolveMovementDetail(recepcion.unidadMedida, item.unidadMedida ?? ''),
          observaciones: observationDisplay
        },
        __categoria: item.nombreMaterial ?? '—'
      }
    })
  }, [itemsByCodigo, recepciones])

  const filteredRecepciones = useMemo(() => {
    return recepcionesWithDisplay.filter((recepcion) => {
      const categoria = recepcion.__categoria?.toLowerCase() ?? ''
      const descripcion = recepcion.__display?.descripcionMaterial?.toLowerCase() ?? ''
      const codigo = (recepcion.__display?.codigoMaterial || recepcion.codigoMaterial || '').toLowerCase()
      const matchesCodigo = !normalizedCodigo || codigo.includes(normalizedCodigo)
      const matchesNombre = !normalizedNombre || categoria.includes(normalizedNombre) || descripcion.includes(normalizedNombre)
      const matchesRecibido = !normalizedRecibido || recepcion.recibidoDe?.toLowerCase().includes(normalizedRecibido)
      return matchesCodigo && matchesNombre && matchesRecibido
    })
  }, [normalizedCodigo, normalizedNombre, normalizedRecibido, recepcionesWithDisplay])

  useEffect(() => {
    setPage(1)
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(filteredRecepciones.length / pageSize))
  const paginatedRecepciones = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRecepciones.slice(start, start + pageSize)
  }, [filteredRecepciones, page, pageSize])

  const hasRecepciones = recepciones.length > 0
  const showEmptyState = !loadingRecepciones && !hasRecepciones
  const showNoMatches = !loadingRecepciones && hasRecepciones && filteredRecepciones.length === 0

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <section className="dashboard-section">
      <div className="table-header sticky">
        <div>
          <p className="eyebrow">Recepciones</p>
          <h2>Entradas al almacén</h2>
          <p className="muted">{filteredRecepciones.length} registros</p>
        </div>
        <div className="table-header-actions">
          {loadingRecepciones && <span className="pill">Cargando…</span>}
          <ExportMenu onExportExcel={() => onExport('recepciones-excel', filteredRecepciones)} onExportPdf={() => onExport('recepciones-pdf', filteredRecepciones)} />
          <button className="btn primary" type="button" onClick={onRequestAdd}>
            + Agregar
          </button>
        </div>
      </div>

      <article className="panel-card table-card">
        <div className="table-search-row">
          <label>
            Código material
            <input
              type="text"
              value={filters.codigo}
              onChange={(e) => handleFilterChange('codigo', e.target.value)}
              placeholder="Buscar por código"
            />
          </label>
          <label>
            Material / categoría
            <input
              type="text"
              value={filters.nombre}
              onChange={(e) => handleFilterChange('nombre', e.target.value)}
              placeholder="Nombre o categoría"
            />
          </label>
          <label>
            Recibido de
            <input
              type="text"
              value={filters.recibido}
              onChange={(e) => handleFilterChange('recibido', e.target.value)}
              placeholder="Proveedor o persona"
            />
          </label>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Código material</th>
                <th>Categoría</th>
                <th>Nombre del item</th>
                <th>Recibido de</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecepciones && (
                <tr>
                  <td colSpan={10} className="empty">Cargando tabla…</td>
                </tr>
              )}
              {showEmptyState && (
                <tr>
                  <td colSpan={10} className="empty">Aún no hay recepciones</td>
                </tr>
              )}
              {showNoMatches && (
                <tr>
                  <td colSpan={10} className="empty">Sin coincidencias para los filtros aplicados</td>
                </tr>
              )}
              {!loadingRecepciones && !showEmptyState && !showNoMatches && paginatedRecepciones.map((recepcion, index) => {
                const display = recepcion.__display ?? {}
                const categoria = recepcion.__categoria ?? (itemsByCodigo[recepcion.codigoMaterial]?.nombreMaterial ?? '—')
                const codigoMaterial = display.codigoMaterial || recepcion.codigoMaterial || '—'
                const descripcion = display.descripcionMaterial || recepcion.descripcionMaterial || '—'
                const unidad = display.unidadMedida || recepcion.unidadMedida || '—'
                const observationDisplay = display.observaciones ?? getObservationDisplayValue(recepcion.observaciones, recepcion.esSinRegistro)
                const observaciones = observationDisplay || '—'
                const absoluteIndex = filteredRecepciones.findIndex((candidate) => candidate.id === recepcion.id)
                const rowNumber = absoluteIndex >= 0 ? absoluteIndex + 1 : index + 1 + (page - 1) * pageSize
                return (
                  <tr key={recepcion.id}>
                    <td>{rowNumber}</td>
                    <td>{formatDate(recepcion.fecha)}</td>
                    <td>{codigoMaterial}</td>
                    <td>{categoria}</td>
                    <td className="text-wrap">{descripcion}</td>
                    <td>{recepcion.recibidoDe}</td>
                    <td>{formatDecimal(recepcion.cantidadRecibida)}</td>
                    <td>{unidad}</td>
                    <td className="text-wrap">{observaciones || '—'}</td>
                    <td>
                      <RowActionsMenu
                        onEdit={() => onRequestEdit(recepcion)}
                        onDelete={() => onRequestDelete(recepcion)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </article>
    </section>
  )
}

function EntregasPage({
  entregas,
  loadingEntregas,
  formatDate,
  formatDecimal,
  itemsByCodigo,
  onRequestAdd,
  onRequestEdit,
  onRequestDelete,
  onExport
}) {
  const [filters, setFilters] = useState({ codigo: '', nombre: '', entregado: '' })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const normalizedCodigo = useMemo(() => filters.codigo.trim().toLowerCase(), [filters.codigo])
  const normalizedNombre = useMemo(() => filters.nombre.trim().toLowerCase(), [filters.nombre])
  const normalizedEntregado = useMemo(() => filters.entregado.trim().toLowerCase(), [filters.entregado])

  const entregasWithDisplay = useMemo(() => {
    return entregas.map((entrega) => {
      const item = itemsByCodigo[entrega.codigoMaterial] ?? {}
      const observationDisplay = getObservationDisplayValue(entrega.observaciones, entrega.esSinRegistro)
      return {
        ...entrega,
        __display: {
          codigoMaterial: resolveMovementDetail(entrega.codigoMaterial, item.codigoMaterial ?? ''),
          descripcionMaterial: resolveMovementDetail(entrega.descripcionMaterial, item.descripcionMaterial ?? ''),
          unidadMedida: resolveMovementDetail(entrega.unidadMedida, item.unidadMedida ?? ''),
          observaciones: observationDisplay
        },
        __categoria: item.nombreMaterial ?? '—'
      }
    })
  }, [entregas, itemsByCodigo])

  const filteredEntregas = useMemo(() => {
    return entregasWithDisplay.filter((entrega) => {
      const categoria = entrega.__categoria?.toLowerCase() ?? ''
      const descripcion = entrega.__display?.descripcionMaterial?.toLowerCase() ?? ''
      const codigo = (entrega.__display?.codigoMaterial || entrega.codigoMaterial || '').toLowerCase()
      const matchesCodigo = !normalizedCodigo || codigo.includes(normalizedCodigo)
      const matchesNombre = !normalizedNombre || categoria.includes(normalizedNombre) || descripcion.includes(normalizedNombre)
      const matchesEntregado = !normalizedEntregado || entrega.entregadoA?.toLowerCase().includes(normalizedEntregado)
      return matchesCodigo && matchesNombre && matchesEntregado
    })
  }, [entregasWithDisplay, normalizedCodigo, normalizedEntregado, normalizedNombre])

  useEffect(() => {
    setPage(1)
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(filteredEntregas.length / pageSize))
  const paginatedEntregas = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredEntregas.slice(start, start + pageSize)
  }, [filteredEntregas, page, pageSize])

  const hasEntregas = entregas.length > 0
  const showEmptyState = !loadingEntregas && !hasEntregas
  const showNoMatches = !loadingEntregas && hasEntregas && filteredEntregas.length === 0

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <section className="dashboard-section">
      <div className="table-header sticky">
        <div>
          <p className="eyebrow">Entregas</p>
          <h2>Despachos controlados</h2>
          <p className="muted">{filteredEntregas.length} registros</p>
        </div>
        <div className="table-header-actions">
          {loadingEntregas && <span className="pill">Cargando…</span>}
          <ExportMenu onExportExcel={() => onExport('entregas-excel', filteredEntregas)} onExportPdf={() => onExport('entregas-pdf', filteredEntregas)} />
          <button className="btn primary" type="button" onClick={onRequestAdd}>
            + Agregar
          </button>
        </div>
      </div>

      <article className="panel-card table-card">
        <div className="table-search-row">
          <label>
            Código material
            <input
              type="text"
              value={filters.codigo}
              onChange={(e) => handleFilterChange('codigo', e.target.value)}
              placeholder="Buscar por código"
            />
          </label>
          <label>
            Material / categoría
            <input
              type="text"
              value={filters.nombre}
              onChange={(e) => handleFilterChange('nombre', e.target.value)}
              placeholder="Nombre o categoría"
            />
          </label>
          <label>
            Entregado a
            <input
              type="text"
              value={filters.entregado}
              onChange={(e) => handleFilterChange('entregado', e.target.value)}
              placeholder="Área solicitante"
            />
          </label>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Código material</th>
                <th>Categoría</th>
                <th>Nombre del item</th>
                <th>Entregado a</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingEntregas && (
                <tr>
                  <td colSpan={10} className="empty">Cargando tabla…</td>
                </tr>
              )}
              {showEmptyState && (
                <tr>
                  <td colSpan={10} className="empty">Aún no hay entregas</td>
                </tr>
              )}
              {showNoMatches && (
                <tr>
                  <td colSpan={10} className="empty">Sin coincidencias para los filtros aplicados</td>
                </tr>
              )}
              {!loadingEntregas && !showEmptyState && !showNoMatches && paginatedEntregas.map((entrega, index) => {
                const display = entrega.__display ?? {}
                const categoria = entrega.__categoria ?? (itemsByCodigo[entrega.codigoMaterial]?.nombreMaterial ?? '—')
                const codigoMaterial = display.codigoMaterial || entrega.codigoMaterial || '—'
                const descripcion = display.descripcionMaterial || entrega.descripcionMaterial || '—'
                const unidad = display.unidadMedida || entrega.unidadMedida || '—'
                const observationDisplay = display.observaciones ?? getObservationDisplayValue(entrega.observaciones, entrega.esSinRegistro)
                const observaciones = observationDisplay || '—'
                const absoluteIndex = filteredEntregas.findIndex((candidate) => candidate.id === entrega.id)
                const rowNumber = absoluteIndex >= 0 ? absoluteIndex + 1 : index + 1 + (page - 1) * pageSize
                return (
                  <tr key={entrega.id}>
                    <td>{rowNumber}</td>
                    <td>{formatDate(entrega.fecha)}</td>
                    <td>{codigoMaterial}</td>
                    <td>{categoria}</td>
                    <td className="text-wrap">{descripcion}</td>
                    <td>{entrega.entregadoA}</td>
                    <td>{formatDecimal(entrega.cantidadEntregada)}</td>
                    <td>{unidad}</td>
                    <td className="text-wrap">{observaciones || '—'}</td>
                    <td>
                      <RowActionsMenu
                        onEdit={() => onRequestEdit(entrega)}
                        onDelete={() => onRequestDelete(entrega)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </article>
    </section>
  )
}

function ItemAutocompleteField({
  label = 'Item',
  items = [],
  value = '',
  selectedItem = null,
  onSelect,
  dirty = false,
  error = '',
  placeholder = 'Busca por código o nombre',
  helper,
  disabled = false,
  full = false
}) {
  const inputId = useId()
  const listboxId = `${inputId}-list`
  const optionIdPrefix = `${listboxId}-option-`
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [manualQuery, setManualQuery] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const normalizedQuery = query.trim().toLowerCase()

  const suggestions = useMemo(() => {
    if (!items.length) return []
    if (!normalizedQuery) {
      return items.slice(0, 8)
    }
    return items
      .filter((item) => {
        const haystack = `${item.codigoMaterial ?? ''} ${item.descripcionMaterial ?? ''} ${item.nombreMaterial ?? ''}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      .slice(0, 8)
  }, [items, normalizedQuery])

  useEffect(() => {
    if (!containerRef.current) return
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setDropdownOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!value) {
      if (!manualQuery) {
        setQuery('')
      }
      return
    }
    const match = selectedItem ?? items.find((item) => item.codigoMaterial === value)
    if (match) {
      setManualQuery(false)
      setQuery(`${match.codigoMaterial} · ${match.descripcionMaterial}`)
    }
  }, [items, manualQuery, selectedItem, value])

  useEffect(() => {
    if (activeIndex < 0) return
    const option = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    if (option) {
      option.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleInputChange = (event) => {
    setManualQuery(true)
    setQuery(event.target.value)
    setDropdownOpen(true)
    setActiveIndex(-1)
  }

  const handleSelectItem = (item) => {
    onSelect?.(item ?? null)
    if (item) {
      setManualQuery(false)
      setQuery(`${item.codigoMaterial} · ${item.descripcionMaterial}`)
    } else {
      setQuery('')
    }
    setDropdownOpen(false)
    setActiveIndex(-1)
  }

  const handleInputBlur = (event) => {
    if (!containerRef.current?.contains(event.relatedTarget)) {
      setDropdownOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setDropdownOpen(true)
      setActiveIndex((prev) => {
        const nextIndex = prev + 1
        return nextIndex >= suggestions.length ? suggestions.length - 1 : nextIndex
      })
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => {
        const nextIndex = prev - 1
        return nextIndex < 0 ? -1 : nextIndex
      })
      return
    }
    if (event.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault()
        handleSelectItem(suggestions[activeIndex])
        return
      }
      if (suggestions.length === 1) {
        event.preventDefault()
        handleSelectItem(suggestions[0])
        return
      }
      const exact = items.find((item) => (item.codigoMaterial ?? '').toLowerCase() === normalizedQuery)
      if (exact) {
        event.preventDefault()
        handleSelectItem(exact)
      }
      return
    }
    if (event.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleClear = () => {
    setQuery('')
    setManualQuery(false)
    setDropdownOpen(false)
    setActiveIndex(-1)
    onSelect?.(null)
  }

  const helperMessage = helper ?? (selectedItem
    ? `Stock actual: ${formatDecimal(Number(selectedItem.cantidadStock) || 0)} ${selectedItem.unidadMedida ?? ''}`
    : 'Escribe para ver sugerencias y confirma con Enter.')
  const showDropdown = dropdownOpen && !disabled
  const showError = dirty && Boolean(error)
  const rootClass = ['form-field', 'autocomplete-field', full ? 'full' : ''].filter(Boolean).join(' ')

  const emptyMessage = items.length === 0
    ? 'No hay ítems disponibles aún.'
    : 'Sin coincidencias para la búsqueda actual.'

  return (
    <div className={rootClass} ref={containerRef}>
      <label htmlFor={inputId}>
        {label}
        <div className="autocomplete-input-wrapper">
          <input
            id={inputId}
            type="text"
            value={query}
            placeholder={placeholder}
            onChange={handleInputChange}
            onFocus={() => !disabled && setDropdownOpen(true)}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${optionIdPrefix}${activeIndex}` : undefined}
            aria-invalid={showError ? 'true' : 'false'}
            disabled={disabled}
            ref={inputRef}
          />
          {(query || value) && !disabled && (
            <button
              type="button"
              className="autocomplete-clear"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClear}
              aria-label="Limpiar selección"
            >
              ×
            </button>
          )}
        </div>
      </label>
      {showError && <p className="field-error">{error}</p>}
      {!showError && helperMessage && (
        <p className="field-hint">{helperMessage}</p>
      )}
      {showDropdown && (
        <div className="autocomplete-panel">
          {suggestions.length === 0 ? (
            <p className="autocomplete-empty">{emptyMessage}</p>
          ) : (
            <ul role="listbox" id={listboxId} ref={listRef}>
              {suggestions.map((item, index) => (
                <li key={item.id ?? item.codigoMaterial ?? index}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    data-index={index}
                    id={`${optionIdPrefix}${index}`}
                    className={index === activeIndex ? 'active' : ''}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelectItem(item)}
                  >
                    <span className="suggestion-code">{item.codigoMaterial}</span>
                    <span className="suggestion-body">
                      {item.descripcionMaterial}
                      <small>{item.nombreMaterial}</small>
                    </span>
                    <span className="suggestion-meta">Stock: {formatDecimal(item.cantidadStock)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function KardexPage({
  items,
  selectedItem,
  kardex,
  loading,
  formatDate,
  formatDecimal,
  onSelectItem,
  onExport,
  recentItems = [],
  topItems = [],
  range,
  onRangeChange
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [machineFilter, setMachineFilter] = useState('all')
  const [onlyStock, setOnlyStock] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const suggestionListRef = useRef(null)

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const normalizedCategory = categoryFilter === 'all' ? 'all' : categoryFilter.trim().toLowerCase()
  const normalizedMachine = machineFilter === 'all' ? 'all' : machineFilter.trim().toLowerCase()

  const categories = useMemo(() => {
    const unique = items.map((item) => item.nombreMaterial).filter(Boolean)
    return Array.from(new Set(unique)).sort()
  }, [items])

  const machines = useMemo(() => {
    const unique = items.map((item) => item.localizacion).filter(Boolean)
    return Array.from(new Set(unique)).sort()
  }, [items])

  const filteredUniverse = useMemo(() => {
    return items.filter((item) => {
      const codigo = item.codigoMaterial?.toLowerCase() ?? ''
      const descripcion = item.descripcionMaterial?.toLowerCase() ?? ''
      const categoria = item.nombreMaterial?.toLowerCase() ?? ''
      const ubicacion = item.localizacion?.toLowerCase() ?? ''
      const haystack = `${codigo} ${descripcion} ${categoria}`
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesCategory = normalizedCategory === 'all' || categoria === normalizedCategory
      const matchesMachine = normalizedMachine === 'all' || ubicacion === normalizedMachine
      const matchesStock = !onlyStock || (Number(item.cantidadStock) || 0) > 0
      return matchesSearch && matchesCategory && matchesMachine && matchesStock
    })
  }, [items, normalizedCategory, normalizedMachine, normalizedSearch, onlyStock])

  const suggestions = useMemo(() => filteredUniverse.slice(0, 8), [filteredUniverse])

  useEffect(() => {
    setActiveIndex(-1)
  }, [searchTerm, categoryFilter, machineFilter, onlyStock])

  useEffect(() => {
    if (!suggestionListRef.current) return
    if (activeIndex < 0) return
    const element = suggestionListRef.current.querySelector(`[data-index="${activeIndex}"]`)
    if (element) {
      element.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleSuggestionSelect = (item) => {
    if (!item) return
    const labelParts = [item.codigoMaterial, item.descripcionMaterial].filter(Boolean)
    setSearchTerm(labelParts.join(' · ') || '')
    onSelectItem?.(item)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1 >= suggestions.length ? suggestions.length - 1 : prev + 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 < 0 ? -1 : prev - 1))
      return
    }
    if (event.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault()
        handleSuggestionSelect(suggestions[activeIndex])
      } else if (suggestions.length === 1) {
        event.preventDefault()
        handleSuggestionSelect(suggestions[0])
      }
    }
  }

  const rangeFrom = range?.from ?? ''
  const rangeTo = range?.to ?? ''

  const filteredMovements = useMemo(() => {
    if (!kardex?.movimientos) return []
    const fromDate = rangeFrom ? toLocalDate(rangeFrom) : null
    const toDate = rangeTo ? toLocalDate(rangeTo, true) : null
    return kardex.movimientos
      .filter((mov) => {
        if (!mov.fecha) return true
        const current = new Date(mov.fecha)
        if (Number.isNaN(current.getTime())) return true
        if (fromDate && current < fromDate) return false
        if (toDate && current > toDate) return false
        return true
      })
      .map((mov) => ({
        ...mov,
        __displayObservation: getObservationDisplayValue(mov.observaciones, mov.esSinRegistro)
      }))
  }, [kardex, rangeFrom, rangeTo])

  const handleRangeChangeInternal = (field, value) => {
    onRangeChange?.(field, value)
  }

  const recentList = recentItems.filter(Boolean).slice(0, 4)
  const popularList = topItems.filter(Boolean).slice(0, 4)
  const summaryItem = selectedItem ?? (kardex ? {
    descripcionMaterial: kardex.nombreMaterial,
    nombreMaterial: kardex.nombreMaterial,
    codigoMaterial: kardex.codigoMaterial ?? '',
    unidadMedida: kardex.movimientos?.[0]?.unidadMedida ?? '',
    localizacion: ''
  } : null)
  const hasSelection = Boolean(kardex && summaryItem)
  const exportTitle = summaryItem?.descripcionMaterial ?? kardex?.nombreMaterial ?? 'Kardex'
  const placeholderMessage = items.length === 0
    ? 'Carga algunos ítems en el inventario para comenzar.'
    : 'Selecciona un ítem para visualizar sus movimientos.'

  return (
    <section className="dashboard-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Kardex</p>
          <h2>Consulta inteligente de movimientos</h2>
          <p className="muted">Busca por nombre, código material o categoría y aplica filtros rápidos antes de cargar el kardex.</p>
        </div>
      </div>

      <article className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Buscador avanzado</h3>
            <p className="muted">Autocompletado limitado a resultados relevantes y listo para teclado.</p>
          </div>
        </div>
        <div className="kardex-search-grid">
          <label className="search-field full">
            Item
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Escribe código material, categoría o nombre"
            />
          </label>
          <label>
            Categoría
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Todas</option>
              {categories.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </label>
          <label>
            Localización
            <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}>
              <option value="all">Cualquiera</option>
              {machines.map((machine) => (
                <option key={machine} value={machine}>{machine}</option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={onlyStock}
              onChange={(e) => setOnlyStock(e.target.checked)}
            />
            Solo ítems con stock
          </label>
        </div>
        <div className="kardex-suggestions enhanced">
          {suggestions.length === 0 ? (
            <p className="kardex-suggestions-empty">
              {normalizedSearch ? 'Sin coincidencias para el criterio actual.' : 'Refina la búsqueda para ver sugerencias.'}
            </p>
          ) : (
            <ul ref={suggestionListRef}>
              {suggestions.map((item, index) => (
                <li key={item.id ?? item.codigoMaterial ?? index}>
                  <button
                    type="button"
                    data-index={index}
                    className={index === activeIndex ? 'active' : ''}
                    onClick={() => handleSuggestionSelect(item)}
                  >
                    <span className="suggestion-code">{item.codigoMaterial}</span>
                    <span className="suggestion-body">
                      {item.descripcionMaterial}
                      <small>{item.nombreMaterial}</small>
                    </span>
                    <span className="suggestion-meta">Stock: {formatDecimal(item.cantidadStock)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <div className="kardex-meta-panels">
        <article className="panel-card compact">
          <div className="panel-header">
            <h3>Últimos ítems consultados</h3>
          </div>
          {recentList.length === 0 ? (
            <p className="muted">Aún no hay historial.</p>
          ) : (
            <div className="chip-grid">
              {recentList.map((item) => (
                <button key={item.id ?? item.codigoMaterial} type="button" className="chip" onClick={() => onSelectItem?.(item)}>
                  <span className="chip-title">{item.descripcionMaterial}</span>
                  <small>{item.nombreMaterial}</small>
                </button>
              ))}
            </div>
          )}
        </article>
        <article className="panel-card compact">
          <div className="panel-header">
            <h3>Ítems más usados</h3>
          </div>
          {popularList.length === 0 ? (
            <p className="muted">Consulta algunos ítems para desbloquear recomendaciones.</p>
          ) : (
            <div className="chip-grid">
              {popularList.map((item) => (
                <button key={item.id ?? item.codigoMaterial} type="button" className="chip" onClick={() => onSelectItem?.(item)}>
                  <span className="chip-title">{item.descripcionMaterial}</span>
                  <small>{item.nombreMaterial}</small>
                </button>
              ))}
            </div>
          )}
        </article>
      </div>

      {hasSelection ? (
        <>
          <div className="kardex-summary-grid">
            <article className="panel-card highlight">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Resumen del ítem</p>
                  <h3>{summaryItem.descripcionMaterial}</h3>
                </div>
                {loading && <span className="pill">Cargando…</span>}
              </div>
              <div className="summary-grid">
                <div>
                  <p className="muted">Código material</p>
                  <p className="summary-value">{summaryItem.codigoMaterial || '—'}</p>
                </div>
                <div>
                  <p className="muted">Categoría</p>
                  <p className="summary-value">{summaryItem.nombreMaterial}</p>
                </div>
                <div>
                  <p className="muted">Stock actual</p>
                  <p className="summary-value">{formatDecimal(kardex.stockActual)} {summaryItem.unidadMedida}</p>
                </div>
                <div>
                  <p className="muted">Ubicación</p>
                  <p className="summary-value">{summaryItem.localizacion || '—'}</p>
                </div>
              </div>
            </article>
            <article className="panel-card compact">
              <div className="panel-header">
                <h3>Filtra por fechas</h3>
              </div>
              <div className="kardex-range">
                <label>
                  Desde
                  <input
                    type="date"
                    value={rangeFrom}
                    max={rangeTo || undefined}
                    onChange={(e) => handleRangeChangeInternal('from', e.target.value)}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="date"
                    value={rangeTo}
                    min={rangeFrom || undefined}
                    onChange={(e) => handleRangeChangeInternal('to', e.target.value)}
                  />
                </label>
              </div>
            </article>
          </div>

          <article className="panel-card table-card">
            <div className="panel-header">
              <div>
                <h3>Movimientos del kardex</h3>
                <p className="muted">Entradas y salidas filtradas por el rango seleccionado.</p>
              </div>
              <div className="panel-actions">
                <ExportMenu
                  onExportExcel={() => onExport?.('kardex-excel', filteredMovements.map((mov) => ({
                    ...mov,
                    observaciones: mov.__displayObservation ?? mov.observaciones ?? ''
                  })), { title: exportTitle })}
                  onExportPdf={() => onExport?.('kardex-pdf', filteredMovements.map((mov) => ({
                    ...mov,
                    observaciones: mov.__displayObservation ?? mov.observaciones ?? ''
                  })), { title: exportTitle })}
                />
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Referencia / Responsable</th>
                    <th>Descripción</th>
                    <th>Observaciones</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">Sin movimientos para el rango seleccionado.</td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov, index) => (
                      <tr key={`${mov.fecha}-${index}`}>
                        <td>{formatDate(mov.fecha)}</td>
                        <td>
                          <span className={`pill ${mov.tipo === 'ENTRADA' ? 'success' : 'warning'}`}>
                            {mov.tipo}
                          </span>
                        </td>
                        <td className="text-wrap">{mov.referencia || '—'}</td>
                        <td className="text-wrap">{mov.descripcion}</td>
                        <td className="text-wrap">{(mov.__displayObservation ?? '') || '—'}</td>
                        <td>{formatDecimal(mov.cantidad)}</td>
                        <td>{mov.unidadMedida}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : (
        <article className="panel-card empty-state">
          <div className="panel-header">
            <h3>Sin ítem seleccionado</h3>
          </div>
          <p className="muted">{placeholderMessage}</p>
        </article>
      )}
    </section>
  )
}

function ReportesPage({
  reporte,
  loading,
  formatDecimal,
  formatDate,
  filter,
  onFilterChange,
  onConsult,
  rangeLabel,
  now,
  itemsByCodigo,
  itemsById,
  hideZeroRows,
  onToggleHideZero,
  onExport,
  manualAdjustments = []
}) {
  const rows = Array.isArray(reporte) ? reporte : []
  const resolvedRows = useMemo(() => {
    const byCodigo = itemsByCodigo ?? {}
    const byId = itemsById ?? {}
    return rows.map((row) => {
      const itemFromId = row.itemId ? byId[row.itemId] ?? null : null
      const codeKey = row.codigoMaterial ?? ''
      const fallbackItem = !itemFromId && codeKey ? byCodigo[codeKey] ?? null : null
      const linkedItem = itemFromId ?? fallbackItem
      return {
        ...row,
        itemId: row.itemId ?? linkedItem?.id ?? '',
        codigoMaterial: row.codigoMaterial ?? linkedItem?.codigoMaterial ?? '—',
        nombreMaterial: row.nombreMaterial ?? linkedItem?.nombreMaterial ?? '—',
        descripcionMaterial: row.descripcionMaterial ?? linkedItem?.descripcionMaterial ?? '—',
        unidadMedida: row.unidadMedida ?? linkedItem?.unidadMedida ?? '—',
        stockDespuesBalance: Number(row.stockDespuesBalance ?? linkedItem?.cantidadStock ?? 0),
        totalEntradasSinRegistro: Number(row.totalEntradasSinRegistro) || 0,
        totalSalidasSinRegistro: Number(row.totalSalidasSinRegistro) || 0
      }
    })
  }, [itemsByCodigo, itemsById, rows])
  const formatAdjustmentDate = (value) => {
    if (!value) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '—'
    const datePart = formatDate ? formatDate(parsed) : new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(parsed)
    const timePart = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(parsed)
    return `${datePart} · ${timePart}`
  }

  const formatAdjustmentAmount = (type, amount) => {
    const numeric = Number(amount) || 0
    const formatted = formatDecimal ? formatDecimal(Math.abs(numeric)) : Math.abs(numeric).toFixed(2)
    return `${type === 'decrease' ? '-' : '+'}${formatted}`
  }

  const derivedManualAdjustments = useMemo(() => {
    if (!Array.isArray(resolvedRows) || resolvedRows.length === 0) return []
    const periodLabel = rangeLabel && rangeLabel !== 'Rango sin definir' ? rangeLabel : 'Rango consultado'
    return resolvedRows.flatMap((row) => {
      const base = {
        itemId: row.itemId ?? '',
        codigoMaterial: row.codigoMaterial ?? '—',
        descripcionMaterial: row.descripcionMaterial ?? '—',
        periodLabel,
        source: 'aggregated'
      }
      const records = []
      const entradasSr = Number(row.totalEntradasSinRegistro) || 0
      const salidasSr = Number(row.totalSalidasSinRegistro) || 0
      if (entradasSr > 0) {
        records.push({
          ...base,
          id: `sr-in-${row.itemId ?? row.codigoMaterial}`,
          amount: entradasSr,
          type: 'increase'
        })
      }
      if (salidasSr > 0) {
        records.push({
          ...base,
          id: `sr-out-${row.itemId ?? row.codigoMaterial}`,
          amount: salidasSr,
          type: 'decrease'
        })
      }
      return records
    })
  }, [rangeLabel, resolvedRows])

  const mergedManualAdjustments = useMemo(() => {
    const normalizedManuals = Array.isArray(manualAdjustments) ? manualAdjustments : []
    return [...derivedManualAdjustments, ...normalizedManuals]
  }, [derivedManualAdjustments, manualAdjustments])

  const filteredManualAdjustments = useMemo(() => {
    if (mergedManualAdjustments.length === 0) return []
    const fromDate = filter?.from ? toLocalDate(filter.from) : null
    const toDate = filter?.to ? toLocalDate(filter.to, true) : null
    return mergedManualAdjustments.filter((adjustment) => {
      if (!adjustment?.timestamp) {
        return true
      }
      const current = new Date(adjustment.timestamp)
      if (Number.isNaN(current.getTime())) return false
      if (fromDate && current < fromDate) return false
      if (toDate && current > toDate) return false
      return true
    })
  }, [filter?.from, filter?.to, mergedManualAdjustments])

  const renderAdjustmentDate = (adjustment) => {
    if (adjustment?.timestamp) {
      return formatAdjustmentDate(adjustment.timestamp)
    }
    return adjustment?.periodLabel || rangeLabel || 'Rango consultado'
  }

  return (
    <section className="dashboard-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Reportes</p>
          <h2>Resumen por rango</h2>
          <p className="muted">Define un intervalo personalizado para conocer los movimientos acumulados.</p>
        </div>
        <div className="report-filters">
          <label>
            Desde
            <input
              type="date"
              value={filter.from}
              max={filter.to || formatDateInput(now)}
              onChange={(e) => onFilterChange('from', e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filter.to}
              min={filter.from || ''}
              max={formatDateInput(now)}
              onChange={(e) => onFilterChange('to', e.target.value)}
            />
          </label>
          <button className="btn outline" type="button" onClick={onConsult}>
            Consultar
          </button>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={hideZeroRows}
              onChange={(e) => onToggleHideZero?.(e.target.checked)}
            />
            Ocultar filas sin movimiento
          </label>
        </div>
      </div>

      <article className="panel-card table-card">
        <div className="panel-header">
          <div>
            <h3>{rangeLabel}</h3>
            <p className="muted">Totales por unidad de medida</p>
          </div>
          <div className="panel-actions">
            {loading && <span className="pill">Cargando…</span>}
            <ExportMenu
              onExportExcel={() => onExport('reportes-excel', resolvedRows)}
              onExportPdf={() => onExport('reportes-pdf', resolvedRows)}
            />
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código material</th>
                <th>Nombre del item</th>
                <th>Categoría</th>
                <th>Entradas</th>
                <th>Salidas</th>
                <th>Balance</th>
                <th className="text-center">Stock después del balance</th>
                <th>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {resolvedRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="empty">Sin datos para el periodo seleccionado</td>
                </tr>
              )}
              {resolvedRows.map((row, index) => {
                const totalEntradas = Number(row.totalEntradas) || 0
                const totalSalidas = Number(row.totalSalidas) || 0
                const totalEntradasSr = Number(row.totalEntradasSinRegistro) || 0
                const totalSalidasSr = Number(row.totalSalidasSinRegistro) || 0
                const balance = totalEntradas - totalSalidas
                const stockDespues = Number(row.stockDespuesBalance) || 0
                const rowKey = row.itemId || `${row.codigoMaterial}-${index}`
                return (
                  <tr key={rowKey}>
                    <td className="cell-code">{row.codigoMaterial}</td>
                    <td className="text-wrap">{row.descripcionMaterial ?? '—'}</td>
                    <td>{row.nombreMaterial ?? '—'}</td>
                    <td>
                      <span>{formatDecimal(totalEntradas)}</span>
                      {totalEntradasSr > 0 && (
                        <span className="metric-note muted">+{formatDecimal(totalEntradasSr)} S/R</span>
                      )}
                    </td>
                    <td>
                      <span>{formatDecimal(totalSalidas)}</span>
                      {totalSalidasSr > 0 && (
                        <span className="metric-note muted">-{formatDecimal(totalSalidasSr)} S/R</span>
                      )}
                    </td>
                    <td>{formatDecimal(balance)}</td>
                    <td className="text-center">{formatDecimal(stockDespues)}</td>
                    <td>{row.unidadMedida}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel-card manual-adjustments-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Ajustes sin registro</p>
            <h3>Aumentos / retiros manuales</h3>
            <p className="muted">Se muestran los movimientos manuales confirmados dentro del mismo rango de fechas del reporte.</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código material</th>
                <th>Nombre del item</th>
                <th>Ajuste</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredManualAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">Sin ajustes manuales para el periodo consultado.</td>
                </tr>
              ) : (
                filteredManualAdjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>{renderAdjustmentDate(adjustment)}</td>
                    <td className="cell-code">{adjustment.codigoMaterial ?? '—'}</td>
                    <td className="text-wrap">{adjustment.descripcionMaterial || '—'}</td>
                    <td>{formatAdjustmentAmount(adjustment.type, adjustment.amount)}</td>
                    <td>
                      <span className={`adjustment-tag ${adjustment.type === 'decrease' ? 'warning' : 'success'}`}>
                        {adjustment.type === 'decrease' ? 'Retiro sin registro' : 'Aumento sin registro'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function RowActionsMenu({ onEdit, onDelete }) {
  return (
    <div className="row-actions-menu" role="group" aria-label="Acciones rápidas">
      <button type="button" className="action-btn edit" onClick={() => onEdit?.()}>
        <span className="action-icon icon-edit" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" />
            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15.12 5.13l3.75 3.75 1.84-1.84Z" />
          </svg>
        </span>
        Editar
      </button>
      <button type="button" className="action-btn delete" onClick={() => onDelete?.()}>
        <span className="action-icon icon-delete" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M5 7h14" />
            <path d="M9 7V5h6v2" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M7 7v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
          </svg>
        </span>
        Eliminar
      </button>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  const canGoBack = page > 1
  const canGoForward = page < totalPages
  const goTo = (next) => {
    if (next < 1 || next > totalPages) return
    onChange?.(next)
  }

  return (
    <div className="table-pagination">
      <button type="button" className="btn ghost" onClick={() => goTo(page - 1)} disabled={!canGoBack}>
        ← Anterior
      </button>
      <span>Página {page} de {totalPages}</span>
      <button type="button" className="btn ghost" onClick={() => goTo(page + 1)} disabled={!canGoForward}>
        Siguiente →
      </button>
    </div>
  )
}

function FormModal({ isOpen, title, description, children, onClose, onSubmit, submitLabel, loading, submitDisabled = false }) {
  if (!isOpen) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Acción rápida</p>
            <h3>{title}</h3>
            {description && <p className="muted">{description}</p>}
          </div>
          <button type="button" className="btn ghost" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {children}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={loading || submitDisabled}
              title={submitDisabled ? 'Completa todos los campos requeridos' : undefined}
            >
              {loading ? 'Guardando…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({
  isOpen,
  title,
  message,
  details,
  onCancel,
  onConfirm,
  loading,
  requireMatch = false,
  matchValue = '',
  matchLabel = '',
  hint = '',
  confirmLabel = 'Eliminar',
  confirmLoadingLabel = 'Eliminando…',
  confirmKind = 'danger'
}) {
  const [typedValue, setTypedValue] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setTypedValue('')
      return
    }
    setTypedValue('')
  }, [isOpen, matchValue])

  const normalizedMatch = (matchValue ?? '').trim()
  const requiresMatch = Boolean(requireMatch && normalizedMatch)
  const targetValue = normalizedMatch.toUpperCase()
  const candidateValue = typedValue.trim().toUpperCase()
  const hasMatch = !requiresMatch || candidateValue === targetValue
  const confirmDisabled = loading || !hasMatch

  if (!isOpen) return null
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true">
      <div className="modal-card confirm">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
          {details && <p className="muted">{details}</p>}
          {hint && <p className="confirm-warning">{hint}</p>}
          {requiresMatch && (
            <label className="confirm-input-field">
              <span>{matchLabel || `Escribe "${normalizedMatch}" para confirmar`}</span>
              <input
                value={typedValue}
                onChange={(event) => setTypedValue(event.target.value)}
                placeholder={normalizedMatch}
                autoComplete="off"
                data-valid={hasMatch ? 'true' : 'false'}
              />
              <p className={`confirm-hint ${hasMatch ? '' : 'error'}`}>
                {hasMatch ? 'Código confirmado.' : 'El texto no coincide con el código solicitado.'}
              </p>
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className={`btn ${confirmKind}`} onClick={onConfirm} disabled={confirmDisabled}>
            {loading ? confirmLoadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function StockAdjustmentPrompt({ prompt, onSubmitMovement, onSkip, onCancel, submitting, formatDecimal }) {
  const intent = prompt?.intent
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState({ cantidad: '', contraparte: '', observaciones: '' })

  useEffect(() => {
    if (!intent) return
    setShowForm(false)
    setFormState({
      cantidad: sanitizeDecimalInput(String(intent.amount ?? ''), QUANTITY_LIMITS.movement),
      contraparte: '',
      observaciones: ''
    })
  }, [intent])

  if (!prompt?.open || !intent) return null

  const { type, amount, snapshot } = intent
  const actionLabel = type === 'entrega' ? 'Registrar entrega' : 'Registrar recepción'
  const changeLabel = formatDecimal ? formatDecimal(amount) : amount
  const description = type === 'entrega'
    ? `Reduciste el stock en ${changeLabel}. ¿Quieres anotar una entrega para reflejarlo en el Kardex?`
    : `Aumentaste el stock en ${changeLabel}. ¿Quieres anotar una recepción para reflejarlo en el Kardex?`
  const counterpartLabel = type === 'entrega' ? 'Entregado a' : 'Recibido de'
  const quantityLabel = type === 'entrega' ? 'Cantidad entregada' : 'Cantidad recibida'

  const handleFieldChange = (field, value) => {
    if (field === 'cantidad') {
      setFormState((prev) => ({ ...prev, cantidad: sanitizeDecimalInput(value, QUANTITY_LIMITS.movement) }))
    } else if (field === 'observaciones') {
      setFormState((prev) => ({ ...prev, observaciones: sanitizeOptionalText(value, TEXT_LIMITS.observaciones, { preserveTrailingSpace: true }) }))
    } else {
      const limit = type === 'entrega' ? TEXT_LIMITS.entregadoA : TEXT_LIMITS.recibidoDe
      setFormState((prev) => ({ ...prev, contraparte: sanitizePlainText(value, limit, { titleCaseEnabled: true, preserveTrailingSpace: true }) }))
    }
  }

  const numericQuantity = parseDecimalInput(formState.cantidad)
  const isFormValid = showForm && Boolean(formState.contraparte.trim()) && numericQuantity !== null && numericQuantity > 0

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!showForm) {
      setShowForm(true)
      return
    }
    if (!isFormValid || submitting) return
    onSubmitMovement?.(formState)
  }

  return (
    <div className="modal-backdrop prompt" role="dialog" aria-modal="true">
      <form className="modal-card prompt-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>Ajuste de stock detectado</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{description}</p>
          {snapshot && (
            <p className="muted">
              Item: <strong>{snapshot.descripcionMaterial || snapshot.codigoMaterial}</strong>
            </p>
          )}
          <div className="stock-prompt-actions">
            <div className="stock-prompt-actions-group">
              <button type="button" className="btn ghost" onClick={onSkip} disabled={submitting}>
                Actualizar sin registros
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => setShowForm(true)}
                disabled={submitting || showForm}
              >
                {actionLabel}
              </button>
            </div>
            <button type="button" className="btn outline cancel-btn" onClick={onCancel} disabled={submitting}>
              Cancelar
            </button>
          </div>
          {showForm && (
            <div className="stock-prompt-form">
              <label>
                {quantityLabel}
                <input
                  type="number"
                  step="0.01"
                  min={QUANTITY_LIMITS.movement.min}
                  value={formState.cantidad}
                  onChange={(e) => handleFieldChange('cantidad', e.target.value)}
                  inputMode="decimal"
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label>
                {counterpartLabel}
                <input
                  type="text"
                  value={formState.contraparte}
                  onChange={(e) => handleFieldChange('contraparte', e.target.value)}
                  placeholder={type === 'entrega' ? 'Área solicitante' : 'Proveedor o responsable'}
                />
              </label>
              <label className="full">
                Observaciones
                <textarea
                  rows={3}
                  value={formState.observaciones}
                  onChange={(e) => handleFieldChange('observaciones', e.target.value)}
                  placeholder="Describe el motivo del ajuste"
                />
              </label>
              <div className="stock-prompt-form-footer full">
                <button type="submit" className="btn primary" disabled={!isFormValid || submitting}>
                  {submitting ? 'Registrando…' : actionLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

function ErrorOverlay({ dialog, onClose }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [dialog?.message])

  if (!dialog?.open) return null

  const handleCopy = async () => {
    if (!dialog?.message) return
    try {
      await navigator.clipboard?.writeText(dialog.message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="error-overlay" role="alertdialog" aria-modal="true">
      <div className="error-dialog">
        <p className="eyebrow">Algo salió mal</p>
        <h3>{dialog.title || 'Error inesperado'}</h3>
        {dialog.message && <p className="error-message">{dialog.message}</p>}
        {dialog.hint && <p className="error-hint">{dialog.hint}</p>}
        <div className="error-dialog-actions">
          {dialog.message && (
            <button type="button" className="btn outline" onClick={handleCopy}>
              {copied ? 'Copiado' : 'Copiar detalle'}
            </button>
          )}
          <button type="button" className="btn primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.intent ?? 'info'}`}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => onDismiss?.(toast.id)} aria-label="Cerrar">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}


