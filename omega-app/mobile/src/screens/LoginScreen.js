import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image
} from 'react-native';
import { 
  InputItem, 
  Button, 
  WingBlank, 
  WhiteSpace,
  ActivityIndicator
} from '@ant-design/react-native';
import { authAPI } from '../services/api';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Errore', 'Inserisci username e password');
      return;
    }

    setLoading(true);
    try {
      await authAPI.login(username.trim(), password);
      onLogin();
    } catch (error) {
      Alert.alert(
        'Errore di Login', 
        error.userMessage || 'Credenziali non valide'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>Ω</Text>
          </View>
          <Text style={styles.title}>Omega Mobile</Text>
          <Text style={styles.subtitle}>Components Tracker</Text>
        </View>

        <View style={styles.formContainer}>
          <WingBlank>
            <InputItem
              clear
              value={username}
              onChange={setUsername}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <WhiteSpace />
            
            <InputItem
              clear
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Password"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <WhiteSpace size="lg" />

            <Button 
              type="primary" 
              onPress={handleLogin}
              disabled={loading}
              style={styles.loginButton}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Accedi'
              )}
            </Button>
          </WingBlank>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Scansiona barcode e gestisci componenti
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1677ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8c8c8c',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButton: {
    borderRadius: 8,
    height: 45,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
  },
});