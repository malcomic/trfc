import Papa from 'papaparse'

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}
