/** Logo Ustulimp — imagem oficial (public/logo.png, fundo transparente). */
type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, string> = {
  sm: 'h-10',
  md: 'h-14',
  lg: 'h-24',
}

export default function Logo({ size = 'sm', className = '' }: { size?: Size; className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Ustulimp — Produtos de limpeza em geral e químico" className={`${SIZES[size]} w-auto object-contain`} />
    </div>
  )
}
