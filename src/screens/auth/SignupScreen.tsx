import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { signup, loading, error, clearError } = useAuthStore();

  const handleSignup = async () => {
    clearError();
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'Please fill in all fields.'); return;
    }
    if (password !== confirm) {
      Alert.alert('Validation', 'Passwords do not match.'); return;
    }
    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.'); return;
    }
    try {
      await signup(name.trim(), email.trim(), password);
      Alert.alert('Success!', 'Account created. You can now sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {}
  };

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E', '#050E1F']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🏏</Text>
            </View>
            <Text style={styles.appName}>CrickScore</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSubtitle}>Join your cricket world</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            {[
              { label: 'Full Name', value: name, set: setName, placeholder: 'Your name', type: 'default' as const },
              { label: 'Email', value: email, set: setEmail, placeholder: 'you@example.com', type: 'email-address' as const },
              { label: 'Password', value: password, set: setPassword, placeholder: '••••••••', type: 'default' as const, secure: true },
              { label: 'Confirm Password', value: confirm, set: setConfirm, placeholder: '••••••••', type: 'default' as const, secure: true },
            ].map((field) => (
              <View style={styles.inputGroup} key={field.label}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.set}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType={field.type}
                  autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                  secureTextEntry={field.secure}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#00D26A', '#00A855']} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.xl },
  header: { paddingTop: SPACING.xl, marginBottom: SPACING.md },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: COLORS.green, fontSize: FONTS.sizes.md, fontWeight: '600' },
  logoSection: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.green, marginBottom: SPACING.sm,
  },
  logoIcon: { fontSize: 30 },
  appName: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    padding: SPACING.xxl, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  errorBox: {
    backgroundColor: 'rgba(255,75,75,0.12)', borderRadius: RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.red,
  },
  errorText: { color: COLORS.red, fontSize: FONTS.sizes.sm },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btn: { marginTop: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden' },
  btnGrad: { paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textOnGreen },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  loginText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  loginLink: { color: COLORS.green, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
