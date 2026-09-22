import { Car, Hammer, Stethoscope, Building2, Factory, Home, Boxes } from 'lucide-react'
import type { ComponentType } from 'react'

const ICON_BY_SLUG: Record<string, ComponentType<{ className?: string }>> = {
  'automotivo': Car,
  'casa-construcao': Hammer,
  'hospitalar': Stethoscope,
  'corporativo': Building2,
  'industrial-alimenticia-agro': Factory,
  'domestico': Home
}

export function CategoryIcon({ slug, className = 'w-4 h-4' }: { slug?: string; className?: string }) {
  const Comp = (slug && ICON_BY_SLUG[slug]) || Boxes
  return <Comp className={className} />
}
