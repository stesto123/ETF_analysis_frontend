import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/components/common/ThemeProvider';
import { router } from 'expo-router';

type Props = {
  confirm?: boolean;
  label?: string;
  style?: any;
};

export default function SignOutButton({ confirm = true, label = 'Sign out', style }: Props) {
  const { colors } = useTheme();
  const { signOut, isSignedIn } = useAuth();

  const doSignOut = async () => {
    try {
  await signOut();
  // After sign-out, route to existing auth route
  router.replace('/(auth)/sign-in');
    } catch (e) {
      console.error('Sign out failed', e);
    }
  };

  const onPress = () => {
    if (!isSignedIn) return;
    if (confirm) {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doSignOut },
      ]);
    } else {
      void doSignOut();
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.card,
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          borderRadius: 6,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ marginLeft: 0, flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{label}</Text>
          <Text style={{ color: colors.secondaryText, fontSize: 14 }}>End your current session</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
