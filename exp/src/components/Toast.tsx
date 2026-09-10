import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2800),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={20} color={Colors.success} />;
      case 'error':
        return <Ionicons name="alert-circle" size={20} color={Colors.danger} />;
      default:
        return <Ionicons name="information-circle" size={20} color={Colors.primary} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            toast.type === 'success' && styles.toastSuccess,
            toast.type === 'error' && styles.toastError,
            toast.type === 'info' && styles.toastInfo,
            { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
          ]}
        >
          {getIcon(toast.type)}
          <Text style={styles.toastMessage}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  toastSuccess: {
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successLight,
  },
  toastError: {
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
  },
  toastInfo: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textNavy,
  },
});

export default ToastProvider;
