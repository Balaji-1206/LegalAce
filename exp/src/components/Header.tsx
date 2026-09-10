import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';

interface HeaderProps {
  onPressProfile: () => void;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onPressBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onPressProfile,
  title = 'LegalAce',
  subtitle = 'Indian Law Companion',
  showBack = false,
  onPressBack,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBack && onPressBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onPressBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={Colors.textNavy} />
          </TouchableOpacity>
        ) : null}
        <View>
          <View style={styles.badge}>
            <View style={styles.liveDot} />
            <Text style={styles.badgeText}>{subtitle}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.profileBtn}
        onPress={onPressProfile}
        activeOpacity={0.7}
      >
        <Ionicons name="person-outline" size={18} color={Colors.textNavy} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 3,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textNavy,
    letterSpacing: -0.4,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default Header;
