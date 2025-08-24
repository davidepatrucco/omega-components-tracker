import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  AppRegistry, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';

function LoginScreen({ onLogin }) {
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
      // Chiamata API reale al backend staging
      const response = await fetch('https://staging.omega.intellitude.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Credenziali non valide');
      }

      const data = await response.json();
      
      if (data.accessToken) {
        // Salva sia access che refresh token per 60 giorni
        await SecureStore.setItemAsync('userToken', data.accessToken);
        await SecureStore.setItemAsync('userTokenExpiry', (Date.now() + 60 * 24 * 60 * 60 * 1000).toString());
        
        // Salva refresh token se presente
        if (data.refreshToken) {
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);
          console.log('✅ Refresh token salvato');
        }
        
        onLogin(data.accessToken, data.user);
      } else {
        throw new Error('Token non ricevuto');
      }
    } catch (error) {
      console.error('Errore login:', error);
      Alert.alert('Errore', error.message || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Ω</Text>
            <Text style={styles.title}>Omega Mobile</Text>
            <Text style={styles.subtitle}>Components Tracker</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity 
              onPress={handleLogin}
              disabled={loading}
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Caricamento...' : 'Accedi'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Scansiona barcode e gestisci componenti
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function ScannerScreen({ onLogout, userToken }) {
  const [manualCode, setManualCode] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [scannerBlocked, setScannerBlocked] = useState(false);
  const [processingBarcode, setProcessingBarcode] = useState(null); // Nuovo stato per evitare duplicati
  
  // REF per blocco sincrono - LA SOLUZIONE
  const scannerBlockedRef = React.useRef(false);
  const processingBarcodeRef = React.useRef(null);

  // Funzione per tentare il refresh del token
  const tryRefreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        console.log('❌ Nessun refresh token disponibile');
        return null;
      }

      console.log('🔄 Tentativo refresh token...');
      const response = await fetch('https://staging.omega.intellitude.com/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        }),
      });

      if (!response.ok) {
        console.log('❌ Refresh token scaduto');
        return null;
      }

      const data = await response.json();
      if (data.accessToken) {
        // Salva il nuovo access token
        await SecureStore.setItemAsync('userToken', data.accessToken);
        console.log('✅ Token refreshato con successo');
        return data.accessToken;
      }

      return null;
    } catch (error) {
      console.error('❌ Errore refresh token:', error);
      return null;
    }
  };

  // Richiedi permesso fotocamera all'apertura della schermata
  React.useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const searchComponent = async (barcode) => {
    // BLOCCO RIGIDO SINCRONO: se già sto processando questo barcode, ESCI IMMEDIATAMENTE
    if (scannerBlockedRef.current || processingBarcodeRef.current === barcode || loading) {
      console.log('🚫 BLOCCATO: già sto processando', barcode);
      return;
    }
    
    // BLOCCA SUBITO A LIVELLO SINCRONO - QUESTA È LA CHIAVE!
    scannerBlockedRef.current = true;
    processingBarcodeRef.current = barcode;
    
    // IMPOSTA ANCHE GLI STATI REACT
    console.log('🔒 BLOCCO SCANNER per barcode:', barcode);
    setProcessingBarcode(barcode);
    setScannerBlocked(true);
    setLoading(true);
    setSearchResult(null);
    
    try {
      console.log('Cercando componente:', barcode);
      
      // Chiamata all'API backend staging
      const response = await fetch(`https://staging.omega.intellitude.com/api/components?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      // GESTIONE 401 - TENTA REFRESH PRIMA DI LOGOUT
      if (response.status === 401) {
        console.log('⚠️ Token scaduto, tentativo refresh...');
        const newToken = await tryRefreshToken();
        
        if (newToken) {
          // Refresh riuscito, riprova la chiamata con il nuovo token
          console.log('🔄 Refresh riuscito, riprovo la chiamata...');
          const retryResponse = await fetch(`https://staging.omega.intellitude.com/api/components?barcode=${encodeURIComponent(barcode)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (retryResponse.ok) {
            // Aggiorna il token nella variabile per le prossime chiamate
            // Nota: dovremmo propagare questo nel componente padre, per ora continua
            const retryData = await retryResponse.json();
            // Processa la risposta normalmente...
            if (retryData.items && retryData.items.length > 0) {
              const component = retryData.items[0];
              setSearchResult(component);
              // ... resto della logica come sotto
            } else {
              // Componente non trovato
              Alert.alert(
                '❌ Componente Non Trovato',
                `Nessun componente trovato con barcode: ${barcode}`,
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    console.log('❌ Alert Non Trovato OK premuto');
                    setManualCode('');
                    setLoading(true); // Mantieni spinner per 2 secondi
                    
                    // SBLOCCO DOPO 2 SECONDI
                    setTimeout(() => {
                      console.log('🔓 Scanner riattivato dopo non trovato');
                      // SBLOCCO REF SINCRONO
                      scannerBlockedRef.current = false;
                      processingBarcodeRef.current = null;
                      // SBLOCCO STATI REACT
                      setLoading(false);
                      setScannerBlocked(false);
                      setProcessingBarcode(null);
                      setScanned(false);
                    }, 2000);
                  }
                }],
                { cancelable: false }
              );
              return;
            }
          } else {
            throw new Error(`Errore dopo refresh: ${retryResponse.status}`);
          }
        } else {
          // Refresh fallito, fai logout
          Alert.alert(
            '🔑 Sessione Scaduta',
            'Il tuo accesso è scaduto. Effettua nuovamente il login.',
            [{ 
              text: 'OK', 
              onPress: async () => {
                // Rimuovi tutti i token e fai logout
                await SecureStore.deleteItemAsync('userToken');
                await SecureStore.deleteItemAsync('userTokenExpiry');
                await SecureStore.deleteItemAsync('refreshToken');
                onLogout(); // Torna alla schermata di login
              }
            }],
            { cancelable: false }
          );
          return; // Esci senza sbloccare lo scanner
        }
      }

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const component = data.items[0];
        setSearchResult(component);
        
        // Controlla se il componente è in stato 1 o 2 e deve passare a stato 3
        const currentStatus = component.status;
        let titleMessage = '✅ Componente Trovato!';
        let statusMessage = '';
        
        if (currentStatus === '1' || currentStatus === '2') {
          try {
            await changeComponentStatus(component._id, '3', 'Scansione automatica da mobile');
            titleMessage = '✅ Componente Trovato ed Aggiornato!';
            statusMessage = '\n🔄 Stato aggiornato a "Costruito"';
          } catch (statusError) {
            console.error('Errore cambio stato:', statusError);
            // Continua comunque a mostrare il componente anche se il cambio stato fallisce
          }
        } else if (currentStatus === '3') {
          titleMessage = '✅ Componente già Costruito';
        }
        
        // UN SOLO ALERT - GARANTITO
        Alert.alert(
          titleMessage,
          `Commessa: ${component.commessaCode} - ${component.commessaName}
Descrizione: ${component.descrizioneComponente || 'N/A'}
Barcode: ${component.barcode || 'N/A'}
Stato: ${getStatusLabel(component.status)}
Verificato: ${component.verificato ? 'Sì' : 'No'}${statusMessage}`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('✅ Alert OK premuto - iniziando sblocco...');
                setManualCode(''); // Pulisce il campo
                setLoading(true); // Mantieni spinner per 2 secondi
                
                // SBLOCCO DOPO 2 SECONDI CON SPINNER
                setTimeout(() => {
                  console.log('🔓 Scanner riattivato dopo 2 secondi');
                  // SBLOCCO REF SINCRONO
                  scannerBlockedRef.current = false;
                  processingBarcodeRef.current = null;
                  // SBLOCCO STATI REACT
                  setLoading(false);
                  setScannerBlocked(false);
                  setProcessingBarcode(null);
                  setScanned(false);
                }, 2000);
              }
            }
          ],
          { cancelable: false } // Impedisce la chiusura accidentale
        );
      } else {
        Alert.alert(
          '❌ Componente Non Trovato',
          `Nessun componente trovato con barcode: ${barcode}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              console.log('❌ Alert Non Trovato OK premuto');
              setManualCode('');
              setLoading(true); // Mantieni spinner per 2 secondi
              
              // SBLOCCO DOPO 2 SECONDI
              setTimeout(() => {
                console.log('🔓 Scanner riattivato dopo non trovato');
                // SBLOCCO REF SINCRONO
                scannerBlockedRef.current = false;
                processingBarcodeRef.current = null;
                // SBLOCCO STATI REACT
                setLoading(false);
                setScannerBlocked(false);
                setProcessingBarcode(null);
                setScanned(false);
              }, 2000);
            }
          }],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error('❌ Errore ricerca componente:', error);
      Alert.alert(
        '❌ Errore di Connessione',
        `Impossibile cercare il componente.\nErrore: ${error.message}`,
        [{ 
          text: 'OK', 
          onPress: () => {
            console.log('❌ Alert Errore OK premuto');
            setManualCode('');
            setLoading(true); // Mantieni spinner per 2 secondi
            
            // SBLOCCO DOPO 2 SECONDI
            setTimeout(() => {
              console.log('🔓 Scanner riattivato dopo errore');
              // SBLOCCO REF SINCRONO
              scannerBlockedRef.current = false;
              processingBarcodeRef.current = null;
              // SBLOCCO STATI REACT
              setLoading(false);
              setScannerBlocked(false);
              setProcessingBarcode(null);
              setScanned(false);
            }, 2000);
          }
        }],
        { cancelable: false }
      );
    }
    // Non mettere setLoading(false) qui perché viene gestito nell'alert callback
  };

  const changeComponentStatus = async (componentId, newStatus, note = '') => {
    try {
      const response = await fetch('https://staging.omega.intellitude.com/api/changestatus', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentId,
          to: newStatus,
          note
        }),
      });

      // GESTIONE 401 ANCHE PER CAMBIO STATO
      if (response.status === 401) {
        throw new Error('Token scaduto');
      }

      if (!response.ok) {
        throw new Error(`Errore cambio stato: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Errore cambio stato:', error);
      throw error;
    }
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      '1': 'Da Lavorare',
      '2': 'In Preparazione', 
      '3': 'Costruito',
      '4': 'Lavorato',
      '5': 'Verificato',
      '6': 'Spedito'
    };
    return statusLabels[status] || `Stato ${status}`;
  };

  const handleBarCodeScanned = ({ type, data }) => {
    // CONTROLLO SINCRONO CON REF - BLOCCO IMMEDIATO
    if (scannerBlockedRef.current || processingBarcodeRef.current === data) {
      console.log('🚫 SCANNER BLOCCATO - scansione ignorata:', data);
      return;
    }
    
    console.log('📷 Barcode scansionato:', data);
    setScanned(true);
    setManualCode(data);
    searchComponent(data); // Questo imposterà tutti i blocchi necessari
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Errore', 'Inserisci un codice barcode');
      return;
    }
    
    // CONTROLLO SINCRONO CON REF
    if (scannerBlockedRef.current || processingBarcodeRef.current === manualCode.trim() || loading) {
      console.log('🚫 INPUT MANUALE BLOCCATO - già in elaborazione:', manualCode.trim());
      return;
    }
    
    console.log('⌨️ Input manuale:', manualCode.trim());
    searchComponent(manualCode.trim());
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.titleCentered}>Scanner Componenti</Text>
          
          {/* Scanner Camera - sempre visibile se permessi concessi */}
          {hasPermission ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scannerBlocked ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "pdf417", "ean13", "ean8", "code128", "code39"],
                }}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerText}>
                  {scanned ? 'Scansionato!' : 'Punta verso un barcode'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>
                📷 Permesso fotocamera necessario
              </Text>
              <TouchableOpacity 
                onPress={requestCameraPermission}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>Abilita Fotocamera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input Manuale */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.inputWithIcon}
                    value={manualCode}
                    onChangeText={setManualCode}
                    placeholder="Inserisci manualmente codice (es: ABC123)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleManualSubmit}
                    editable={!loading} // Disabilita durante il loading
                  />
                  <TouchableOpacity 
                    onPress={handleManualSubmit}
                    disabled={loading}
                    style={styles.inputIcon}
                  >
                    <Text style={styles.inputIconText}>
                      {loading ? '⏳' : '▶'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Indicatore di stato */}
                {loading && (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      🔍 Elaborazione in corso...
                    </Text>
                  </View>
                )}
                
                {scannerBlocked && !loading && (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      ⏱️ Attendi prima di scansionare di nuovo...
                    </Text>
                  </View>
                )}
              </View>

          {/* Logout Button con info sessione */}
          <TouchableOpacity 
            onPress={onLogout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>
            💡 Se vedi errori 401, la sessione è scaduta - fai logout e riaccedi
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function App() {
  const [screen, setScreen] = useState('login');
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [debugMsg, setDebugMsg] = useState('App start - staging server');
  const [autoLoginChecked, setAutoLoginChecked] = useState(false);

  // Controlla auto-login all'avvio
  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      setDebugMsg('Checking auto-login...');
      
      const token = await SecureStore.getItemAsync('userToken');
      const expiryStr = await SecureStore.getItemAsync('userTokenExpiry');
      
      if (token && expiryStr) {
        const expiry = parseInt(expiryStr);
        const now = Date.now();
        
        if (now < expiry) {
          // Token valido, auto-login
          setDebugMsg('Auto-login success');
          setUserToken(token);
          setScreen('scanner');
        } else {
          // Token scaduto, rimuovi tutti i token
          setDebugMsg('Token expired, manual login required');
          await SecureStore.deleteItemAsync('userToken');
          await SecureStore.deleteItemAsync('userTokenExpiry');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      } else {
        setDebugMsg('No saved token, manual login required');
      }
    } catch (error) {
      console.error('Auto-login check error:', error);
      setDebugMsg('Auto-login failed, manual login required');
    } finally {
      setAutoLoginChecked(true);
    }
  };

  // Non mostrare nulla finché non abbiamo controllato l'auto-login
  if (!autoLoginChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#8c8c8c', textAlign: 'center' }}>Caricamento...</Text>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>DEBUG: {debugMsg}</Text>
      </View>
    );
  }

  if (screen === 'login') {
    return (
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>DEBUG: {debugMsg}</Text>
        <LoginScreen onLogin={(token, userData) => {
          setDebugMsg('Login success - token received');
          setUserToken(token);
          setUser(userData);
          setScreen('scanner');
        }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>DEBUG: {debugMsg}</Text>
      <ScannerScreen 
        userToken={userToken}
        onLogout={async () => {
          setDebugMsg('Logout success');
          // Rimuovi tutti i token salvati
          await SecureStore.deleteItemAsync('userToken');
          await SecureStore.deleteItemAsync('userTokenExpiry');
          await SecureStore.deleteItemAsync('refreshToken');
          setUserToken(null);
          setUser(null);
          setScreen('login');
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40, // Spazio extra per la tastiera
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1677ff',
    backgroundColor: '#1677ff',
    color: 'white',
    width: 80,
    height: 80,
    borderRadius: 40,
    textAlign: 'center',
    lineHeight: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#262626',
    marginTop: 20,
  },
  titleCentered: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#262626',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8c8c8c',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    marginVertical: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  inputWithIcon: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
  },
  inputIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    bottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },
  inputIconText: {
    fontSize: 18,
    color: '#1677ff',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#1677ff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#8c8c8c',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f5222d',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
  },
  scannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginVertical: 20,
    borderRadius: 12,
    padding: 20,
  },
  cameraContainer: {
    height: 400,
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#1677ff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  scannerControls: {
    marginVertical: 20,
  },
  permissionText: {
    fontSize: 14,
    color: '#f5222d',
    textAlign: 'center',
    marginTop: 10,
  },
  permissionContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
  },
  resultContainer: {
    backgroundColor: '#f6ffed',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    borderLeft: 4,
    borderLeftColor: '#52c41a',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#389e0d',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: '#262626',
    marginBottom: 5,
  },
  loadingContainer: {
    backgroundColor: '#fff7e6',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    borderLeft: 4,
    borderLeftColor: '#faad14',
  },
  loadingText: {
    fontSize: 14,
    color: '#d48806',
    textAlign: 'center',
    fontWeight: '500',
  },
});

// Registrazione esplicita dell'app
AppRegistry.registerComponent('main', () => App);

export default App;
