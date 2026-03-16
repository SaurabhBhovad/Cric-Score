import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please fill in all fields.'); return;
    }
    try {
      await login(email.trim(), password);
    } catch (e) {
      shake();
    }
  };

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E', '#050E1F']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🏏</Text>
            </View>
            <Text style={styles.appName}>CrickScore</Text>
            <Text style={styles.tagline}>Your personal cricket universe</Text>
          </View>

          {/* Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#00D26A', '#00A855']} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.btnText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>New here? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  logoSection: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.green,
    marginBottom: SPACING.md,
    shadowColor: COLORS.green, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  logoIcon: { fontSize: 38 },
  appName: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1 },
  tagline: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  errorBox: {
    backgroundColor: 'rgba(255,75,75,0.12)',
    borderRadius: RADIUS.sm, padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.red,
  },
  errorText: { color: COLORS.red, fontSize: FONTS.sizes.sm },
  inputGroup: { marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btn: { marginTop: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden' },
  btnGrad: { paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textOnGreen },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  signupText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  signupLink: { color: COLORS.green, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
