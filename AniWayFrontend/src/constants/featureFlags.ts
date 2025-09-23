export const FEATURE_FLAGS = {
  STRUCTURED_ADMIN_REASON: false,
  TEMP_BAN_REMAINING_BADGE: true
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return !!FEATURE_FLAGS[flag];
}
