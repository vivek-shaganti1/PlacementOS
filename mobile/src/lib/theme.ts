// The website's palette (tailwind.config.js), so the app reads as the same product.
export const colors = {
  bg: '#F4F2FB',
  card: '#FFFFFF',
  ink: '#14112A',
  inkSoft: '#45405E',
  inkMute: '#6B6784',
  line: '#E6E3F1',
  brand: '#6D4AFF',
  brandDark: '#4B2FD6',
  brandTint: '#F1EDFF',
  good: '#067647',
  warn: '#B54708',
  info: '#175CD3',
  bad: '#B42318',
} as const
export const bucketMeta = {
  eligible: { label: 'Eligible', color: colors.good, tint: '#ECFDF3' },
  nearly: { label: 'Nearly', color: colors.warn, tint: '#FFFAEB' },
  canBecome: { label: 'Can become', color: colors.info, tint: '#EFF8FF' },
  notEligible: { label: 'Stretch', color: colors.bad, tint: '#FEF3F2' },
} as const
