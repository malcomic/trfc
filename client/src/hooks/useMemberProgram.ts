import { useMemberDashboard } from '../context/MemberDashboardContext'
import { usePrograms } from '../context/ProgramsContext'

export interface MemberProgramRef {
  slug: string
  name: string
  title: string
  tagline: string
  /** False when the program is no longer in the public catalog (archived), so there is no public page to link to. */
  listed: boolean
}

/**
 * The program named in a dashboard URL. Archived programs drop out of the public catalog but
 * members who joined keep access, so the name falls back to the dashboard payload.
 */
export function useMemberProgram(slug: string | undefined): MemberProgramRef | null {
  const { bySlug } = usePrograms()
  const { data } = useMemberDashboard()
  if (!slug) return null
  const listed = bySlug(slug)
  const enrolled = data?.program?.slug === slug ? data.program : null
  const name = listed?.name ?? enrolled?.name ?? ''
  return {
    slug,
    name,
    title: listed?.title ?? name,
    tagline: listed?.tagline ?? '',
    listed: !!listed,
  }
}
