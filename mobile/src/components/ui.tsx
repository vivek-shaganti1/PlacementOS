import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native'
import { colors } from '@/lib/theme'

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Button({ title, onPress, busy, kind = 'primary', disabled }: { title: string; onPress: () => void; busy?: boolean; kind?: 'primary' | 'quiet' | 'danger'; disabled?: boolean }) {
  const off = busy || disabled
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.button, kind === 'quiet' && styles.quiet, kind === 'danger' && styles.danger, (pressed || off) && { opacity: 0.6 }]}
    >
      {busy ? <ActivityIndicator color={kind === 'primary' ? '#fff' : colors.brand} /> : <Text style={[styles.buttonText, kind !== 'primary' && { color: kind === 'danger' ? colors.bad : colors.brandDark }]}>{title}</Text>}
    </Pressable>
  )
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.inkMute} style={styles.input} {...input} />
    </View>
  )
}

export const text = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.6 },
  h2: { fontSize: 17, fontWeight: '600', color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  mute: { fontSize: 13, lineHeight: 19, color: colors.inkMute },
})

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 8 },
  button: { minHeight: 48, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  quiet: { backgroundColor: colors.brandTint },
  danger: { backgroundColor: '#FEF3F2' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', paddingHorizontal: 14, fontSize: 16, color: colors.ink },
})
