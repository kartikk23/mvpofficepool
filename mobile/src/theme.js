// Shared design tokens so every screen looks like one cohesive app.
export const colors = {
  primary: '#0B5FFF',
  primaryDark: '#0A4FD9',
  primaryTint: '#F0F5FF',
  success: '#12A150',
  successTint: '#EAFBF1',
  warning: '#B7791F',
  warningTint: '#FFF7E6',
  danger: '#D32F2F',
  dangerTint: '#FDECEC',
  linkedin: '#0A66C2',
  star: '#F5A623',

  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E4E7EC',
  textPrimary: '#111111',
  textSecondary: '#344054',
  textMuted: '#667085',
  textFaint: '#98A2B3',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#0B1324',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

export const type = {
  h1: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: 14, color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textMuted },
};

// Shared building-block styles most screens can spread into their own StyleSheet.
export const common = {
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadow.button,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#FCFCFD',
    color: colors.textPrimary,
  },
  pill: (bg) => ({ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }),
};
