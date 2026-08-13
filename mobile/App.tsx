import React, { useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Set local LAN IP for Expo Go mobile access
  const DEV_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://10.53.18.1:5173';

  const handleReload = () => {
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090e1a" />
      
      <WebView
        ref={webViewRef}
        source={{ uri: DEV_WEB_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Opening LegalAce Expo App...</Text>
          </View>
        )}
      />

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Connecting to LegalAce Web Server...</Text>
          <Text style={styles.errorUrl}>{DEV_WEB_URL}</Text>
          <Text style={styles.errorSub}>
            Make sure your PC (running Vite dev server) and mobile device are connected to the same Wi-Fi network.
          </Text>
          <TouchableOpacity style={styles.reloadBtn} onPress={handleReload}>
            <Text style={styles.reloadBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090e1a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#090e1a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090e1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '600',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorUrl: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.3)',
  },
  errorSub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  reloadBtn: {
    marginTop: 12,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  reloadBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
