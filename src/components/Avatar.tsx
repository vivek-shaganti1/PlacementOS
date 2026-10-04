import { useEffect, useState } from 'react'

export default function Avatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string
  name: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()


  if (!src || failed)
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-rule-strong bg-surface-2 font-semibold text-ink-soft ${className ?? ''}`}
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials}
      </span>
    )

  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${className ?? ''}`}
      style={{ width: size, height: size }}
    />
  )
}
