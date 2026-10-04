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

  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  if (!src || failed)
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className ?? ''}`}
        style={{ width: size, height: size, background: `hsl(${hue} 52% 52%)`, fontSize: size * 0.38 }}
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
