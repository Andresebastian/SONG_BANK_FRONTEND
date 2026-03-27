import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginUser } from '../services/api';
import { saveToken } from '../services/storage';
import { colors } from '../theme/colors';

type LoginScreenProps = {
  onLoggedIn: (token: string) => void;
};

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length > 3,
    [email, password]
  );

  const onLogin = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const result = await loginUser(email.trim(), password.trim());
      if (!result.access_token) {
        Alert.alert('Acceso denegado', result.message || 'No se recibió token de acceso');
        return;
      }
      await saveToken(result.access_token);
      onLoggedIn(result.access_token);
      setPassword('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible conectar con el servidor';
      Alert.alert('Error de conexión', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / marca */}
        <View style={styles.brandArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎵</Text>
          </View>
          <Text style={styles.title}>Ministerio de Alabanza</Text>
          <Text style={styles.titleAccent}>Quitumbe</Text>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
        </View>

        {/* Formulario */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={onLogin}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Text style={styles.eyeButtonText}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
            disabled={!canSubmit || loading}
            onPress={onLogin}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // sombra
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  logoEmoji: { fontSize: 32 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleAccent: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    // sombra suave
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fieldGroup: { gap: 6 },
  label: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: { paddingRight: 90 },
  eyeButton: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  eyeButtonText: {
    color: colors.primarySoft,
    fontWeight: '600',
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // sombra terracota
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
