import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getProgramCatalog } from '../api/programCatalog'
import { programFromCatalog, type CatalogProgram, type Program } from '../content/programs'

const CATALOG_CACHE_KEY = 'trfc-program-catalog'

interface ProgramsContextType {
  programs: Program[]
  /** True only until the first catalog (cached or fresh) is available. */
  loading: boolean
  error: string
  reload: () => Promise<void>
  byId: (id: string | null | undefined) => Program | undefined
  bySlug: (slug: string | null | undefined) => Program | undefined
}

const ProgramsContext = createContext<ProgramsContextType | undefined>(undefined)

function readCache(): CatalogProgram[] | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch {
    localStorage.removeItem(CATALOG_CACHE_KEY)
    return null
  }
}

function toPrograms(entries: CatalogProgram[]): Program[] {
  return entries.flatMap((entry) => {
    try {
      return [programFromCatalog(entry)]
    } catch {
      return []
    }
  })
}

export function ProgramsProvider({ children }: { children: React.ReactNode }) {
  const [cached] = useState(readCache)
  const [programs, setPrograms] = useState<Program[]>(() => (cached ? toPrograms(cached) : []))
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      const entries = await getProgramCatalog()
      setPrograms(toPrograms(entries))
      setError('')
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(entries))
    } catch (err) {
      console.error('Failed to load programs:', err)
      setError('We could not load the programs. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo<ProgramsContextType>(() => {
    const ids = new Map(programs.map((p) => [p.id, p]))
    const slugs = new Map(programs.map((p) => [p.slug, p]))
    return {
      programs,
      loading,
      error,
      reload,
      byId: (id) => (id ? ids.get(id) : undefined),
      bySlug: (slug) => (slug ? slugs.get(slug) : undefined),
    }
  }, [programs, loading, error, reload])

  return <ProgramsContext.Provider value={value}>{children}</ProgramsContext.Provider>
}

export function usePrograms() {
  const context = useContext(ProgramsContext)
  if (!context) {
    throw new Error('usePrograms must be used within ProgramsProvider')
  }
  return context
}
