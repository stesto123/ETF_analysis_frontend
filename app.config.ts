import type { ConfigContext, ExpoConfig } from '@expo/config';

const API_TARGETS: Record<string, string> = {
  local: 'http://127.0.0.1:8000',
  cloud: 'https://etf-analysis-wa-befhb2gng3ejhchz.italynorth-01.azurewebsites.net',
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const targetKey = process.env.EXPO_PUBLIC_API_TARGET || process.env.API_TARGET || 'cloud';
  const targetBaseUrl = API_TARGETS[targetKey] || API_TARGETS.cloud;
  const apiBaseUrl = explicitBaseUrl || targetBaseUrl;

  const finalConfig: ExpoConfig = {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl,
      apiTarget: targetKey,
    },
  } as ExpoConfig;

  return finalConfig;
};
