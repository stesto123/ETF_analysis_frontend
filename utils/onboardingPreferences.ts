import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = '@app:onboarding:seen';
const FORCE_KEY = '@app:onboarding:force';

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, 'true');
  } catch (error) {
    console.warn('Failed to persist onboarding seen flag', error);
  }
}

export async function clearOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_KEY);
  } catch (error) {
    console.warn('Failed to clear onboarding seen flag', error);
  }
}

export async function setForceOnboarding(value: boolean): Promise<void> {
  try {
    if (value) {
      await AsyncStorage.setItem(FORCE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(FORCE_KEY);
    }
  } catch (error) {
    console.warn('Failed to update onboarding force flag', error);
  }
}

export async function getForceOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FORCE_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Failed to read onboarding force flag', error);
    return false;
  }
}

export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const [forceValue, seenValue] = await Promise.all([
      AsyncStorage.getItem(FORCE_KEY),
      AsyncStorage.getItem(SEEN_KEY),
    ]);
    if (forceValue === 'true') {
      return true;
    }
    return seenValue !== 'true';
  } catch (error) {
    console.warn('Failed to evaluate onboarding display flags', error);
    return false;
  }
}
