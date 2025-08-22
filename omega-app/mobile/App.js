import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { Provider } from '@ant-design/react-native';

import LoginScreen from './src/screens/LoginScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ComponentDetailScreen from './src/screens/ComponentDetailScreen';
import { tokenStorage } from './src/services/api';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await tokenStorage.getToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await tokenStorage.removeToken();
    await tokenStorage.removeUser();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  return (
    <Provider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator 
          initialRouteName={isAuthenticated ? "Scanner" : "Login"}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1677ff',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen 
              name="Login" 
              options={{ title: 'Omega Mobile - Login', headerShown: false }}
            >
              {props => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen 
                name="Scanner" 
                options={{ title: 'Omega Mobile - Scanner' }}
              >
                {props => <ScannerScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen 
                name="ComponentDetail" 
                component={ComponentDetailScreen}
                options={{ title: 'Dettaglio Componente' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}