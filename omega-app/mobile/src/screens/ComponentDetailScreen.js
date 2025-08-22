import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity
} from 'react-native';
import { 
  Card,
  Button, 
  WingBlank, 
  WhiteSpace,
  ActivityIndicator,
  Tag
} from '@ant-design/react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { statusAPI } from '../services/api';
import { BASE_STATUSES, getStatusLabel } from '../services/statusConfig';
import { CONFIG, canAutoTransition } from '../config/config';

export default function ComponentDetailScreen({ route, navigation }) {
  const { component: initialComponent, scannedBarcode } = route.params;
  const [component, setComponent] = useState(initialComponent);
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('unknown');

  useEffect(() => {
    getDeviceId();
  }, []);

  const getDeviceId = async () => {
    try {
      const id = await Application.getAndroidId() || 
                  await Application.getIosIdForVendorAsync() || 
                  'unknown-device';
      setDeviceId(id);
    } catch (error) {
      console.error('Error getting device ID:', error);
      setDeviceId('unknown-device');
    }
  };

  const canAutoTransitionTo3 = () => {
    return canAutoTransition(component.status);
  };

  const handleAutoStatusChange = async () => {
    if (!canAutoTransitionTo3()) {
      Alert.alert(
        'Stato non valido',
        `Il componente è nello stato "${getStatusLabel(component.status)}" che non permette la transizione automatica a "Costruito".`
      );
      return;
    }

    Alert.alert(
      'Conferma Cambio Stato',
      `Vuoi cambiare lo stato del componente da "${getStatusLabel(component.status)}" a "${CONFIG.BARCODE.TARGET_STATUS_LABEL}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          onPress: () => performStatusChange() 
        }
      ]
    );
  };

  const performStatusChange = async () => {
    setLoading(true);
    
    try {
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const note = `barcode scannato via mobile ${deviceId} - ${currentDate}`;
      
      const result = await statusAPI.changeStatus(
        component._id,
        CONFIG.BARCODE.TARGET_STATUS,
        note
      );

      if (result.success) {
        // Update local component state
        setComponent(prev => ({
          ...prev,
          status: CONFIG.BARCODE.TARGET_STATUS,
          history: [...(prev.history || []), {
            from: prev.status,
            to: CONFIG.BARCODE.TARGET_STATUS,
            date: new Date(),
            note: note,
            user: 'mobile'
          }]
        }));

        Alert.alert(
          'Successo',
          `Stato cambiato con successo a "${CONFIG.BARCODE.TARGET_STATUS_LABEL}"`,
          [
            { text: 'OK' }
          ]
        );
      } else {
        throw new Error('Cambio stato fallito');
      }
    } catch (error) {
      console.error('Error changing status:', error);
      Alert.alert(
        'Errore',
        error.userMessage || 'Errore durante il cambio di stato'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '1': return '#ff7875'; // red
      case '2':
      case '2-ext': return '#ffa940'; // orange
      case '3': return '#73d13d'; // green
      case '4': return '#40a9ff'; // blue
      case '5': return '#b37feb'; // purple
      case '6': return '#36cfc9'; // cyan
      default: return '#d9d9d9'; // gray
    }
  };

  return (
    <ScrollView style={styles.container}>
      <WingBlank>
        <WhiteSpace />
        
        {/* Component Info Card */}
        <Card>
          <Card.Header
            title="Informazioni Componente"
            thumbStyle={{ width: 30, height: 30 }}
            thumb={<Ionicons name="cube-outline" size={24} color="#1677ff" />}
          />
          <Card.Body>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Codice:</Text>
              <Text style={styles.value}>{component.name || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Descrizione:</Text>
              <Text style={styles.value}>{component.descrizioneComponente || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Commessa:</Text>
              <Text style={styles.value}>{component.commessaName || 'N/A'}</Text>
            </View>
            
            {component.barcode && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Barcode:</Text>
                <Text style={styles.value}>{component.barcode}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Stato Attuale:</Text>
              <Tag 
                style={[styles.statusTag, { backgroundColor: getStatusColor(component.status) }]}
              >
                {getStatusLabel(component.status)}
              </Tag>
            </View>

            {component.trattamenti && component.trattamenti.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Trattamenti:</Text>
                <View style={styles.treatmentContainer}>
                  {component.trattamenti.map((trattamento, index) => (
                    <Tag key={index} style={styles.treatmentTag}>
                      {trattamento}
                    </Tag>
                  ))}
                </View>
              </View>
            )}
          </Card.Body>
        </Card>

        <WhiteSpace />

        {/* Scanned Info Card */}
        <Card>
          <Card.Header
            title="Informazioni Scansione"
            thumbStyle={{ width: 30, height: 30 }}
            thumb={<Ionicons name="qr-code-outline" size={24} color="#52c41a" />}
          />
          <Card.Body>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Barcode scansionato:</Text>
              <Text style={styles.value}>{scannedBarcode}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Device ID:</Text>
              <Text style={styles.value}>{deviceId}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data scansione:</Text>
              <Text style={styles.value}>{new Date().toLocaleString('it-IT')}</Text>
            </View>
          </Card.Body>
        </Card>

        <WhiteSpace />

        {/* Action Card */}
        <Card>
          <Card.Header
            title="Azioni"
            thumbStyle={{ width: 30, height: 30 }}
            thumb={<Ionicons name="settings-outline" size={24} color="#722ed1" />}
          />
          <Card.Body>
            {canAutoTransitionTo3() ? (
              <>
                <Text style={styles.actionDescription}>
                  Il componente può essere automaticamente portato allo stato "{CONFIG.BARCODE.TARGET_STATUS_LABEL}".
                </Text>
                <WhiteSpace />
                <Button 
                  type="primary" 
                  onPress={handleAutoStatusChange}
                  disabled={loading}
                  style={styles.actionButton}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    `Cambia stato a "${CONFIG.BARCODE.TARGET_STATUS_LABEL}"`
                  )}
                </Button>
              </>
            ) : (
              <View style={styles.noActionContainer}>
                <Ionicons name="information-circle-outline" size={24} color="#fa8c16" />
                <Text style={styles.noActionText}>
                  Lo stato attuale "{getStatusLabel(component.status)}" non permette la transizione automatica.
                  {'\n\n'}Solo gli stati "1 - Nuovo", "2 - Produzione Interna" e "2 - Produzione Esterna" permettono il cambio automatico a "{CONFIG.BARCODE.TARGET_STATUS_LABEL}".
                </Text>
              </View>
            )}
          </Card.Body>
        </Card>

        <WhiteSpace />

        {/* Back Button */}
        <Button 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Torna al Scanner
        </Button>
        
        <WhiteSpace size="xl" />
      </WingBlank>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#8c8c8c',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  statusTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  treatmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 2,
  },
  treatmentTag: {
    margin: 2,
    fontSize: 12,
  },
  actionDescription: {
    fontSize: 14,
    color: '#262626',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: 8,
    height: 45,
  },
  noActionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    backgroundColor: '#fff7e6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd591',
  },
  noActionText: {
    fontSize: 14,
    color: '#d46b08',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  backButton: {
    borderRadius: 8,
    height: 45,
    backgroundColor: '#f5f5f5',
    borderColor: '#d9d9d9',
  },
});