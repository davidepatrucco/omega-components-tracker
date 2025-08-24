import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { 
  Button, 
  WingBlank, 
  WhiteSpace,
  ActivityIndicator,
  Card
} from '@ant-design/react-native';
import { Ionicons } from '@expo/vector-icons';
import { componentsAPI, authAPI, tokenStorage } from '../services/api';

const { width } = Dimensions.get('window');

export default function ScannerScreen({ navigation, onLogout }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [user, setUser] = useState(null);
  const [debugMsg, setDebugMsg] = useState('ScannerScreen mounted');

  useEffect(() => {
  setDebugMsg('ScannerScreen: useEffect');
  getCameraPermissions();
  loadUser();
  }, []);

  const getCameraPermissions = async () => {
  setDebugMsg('ScannerScreen: requesting camera permissions...');
  const { status } = await BarCodeScanner.requestPermissionsAsync();
  setDebugMsg('ScannerScreen: camera status=' + status);
  setHasPermission(status === 'granted');
  };

  const loadUser = async () => {
    try {
      setDebugMsg('ScannerScreen: loading user...');
      const userData = await tokenStorage.getUser();
      setUser(userData);
      setDebugMsg('ScannerScreen: user loaded: ' + JSON.stringify(userData));
    } catch (error) {
      setDebugMsg('ScannerScreen: error loading user: ' + error);
      console.error('Error loading user:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setDebugMsg('ScannerScreen: barcode scanned: ' + data);
    setScanned(true);
    setScanning(true);

    try {
      console.log(`Barcode scanned: ${data}`);
      setDebugMsg('ScannerScreen: searching component for barcode...');
      // Search for component by barcode
      const result = await componentsAPI.searchByBarcode(data);
      setDebugMsg('ScannerScreen: search result: ' + JSON.stringify(result));
      if (result.items && result.items.length > 0) {
        const component = result.items[0];
        setDebugMsg('ScannerScreen: component found, navigating...');
        // Navigate to component detail
        navigation.navigate('ComponentDetail', { 
          component,
          scannedBarcode: data 
        });
      } else {
        setDebugMsg('ScannerScreen: componente non trovato');
        Alert.alert(
          'Componente non trovato',
          `Nessun componente trovato per il barcode: ${data}`,
          [
            { text: 'OK', onPress: () => setScanned(false) }
          ]
        );
      }
    } catch (error) {
      setDebugMsg('ScannerScreen: errore ricerca componente: ' + error);
      console.error('Error searching component:', error);
      Alert.alert(
        'Errore',
        error.userMessage || 'Errore durante la ricerca del componente',
        [
          { text: 'OK', onPress: () => setScanned(false) }
        ]
      );
    } finally {
      setScanning(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.logout();
              onLogout();
            } catch (error) {
              console.error('Logout error:', error);
              onLogout(); // Logout anyway
            }
          }
        }
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Richiesta permessi camera...</Text>
        <Text style={{ color: 'red', marginTop: 20 }}>DEBUG: {debugMsg}</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centeredContainer}>
        <Card>
          <Card.Header
            title="Permessi Camera"
            thumbStyle={{ width: 50, height: 50 }}
            thumb={<Ionicons name="camera-outline" size={30} color="#f5222d" />}
          />
          <Card.Body>
            <Text style={styles.errorText}>
              L'app ha bisogno dei permessi per accedere alla camera per scansionare i barcode.
            </Text>
            <WhiteSpace />
            <Button type="primary" onPress={getCameraPermissions}>
              Concedi Permessi
            </Button>
          </Card.Body>
        </Card>
        <Text style={{ color: 'red', marginTop: 20 }}>DEBUG: {debugMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>
            Ciao, {user?.username || 'Utente'}
          </Text>
          <Text style={styles.roleText}>
            {user?.profilo || 'N/A'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#f5222d" />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>DEBUG: {debugMsg}</Text>
      </View>

      {/* Scanner */}
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.scanner}
          barCodeTypes={[BarCodeScanner.Constants.BarCodeType.code128]}
        />
        
        {/* Scanner overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>
            Posiziona il barcode CODE128 nel riquadro
          </Text>
        </View>

        {scanning && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.scanningText}>Elaborazione...</Text>
          </View>
        )}
      </View>

      {/* Reset button */}
      {scanned && (
        <View style={styles.footer}>
          <WingBlank>
            <Button type="primary" onPress={() => setScanned(false)}>
              Scansiona di nuovo
            </Button>
          </WingBlank>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f6f8fb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#262626',
  },
  roleText: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  logoutButton: {
    padding: 5,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.8,
    height: 150,
    borderWidth: 2,
    borderColor: '#1677ff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
  },
  footer: {
    backgroundColor: 'white',
    paddingVertical: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#8c8c8c',
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#262626',
    textAlign: 'center',
    lineHeight: 20,
  },
});