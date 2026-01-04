import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const ThemeOption = ({ mode, label }: { mode: 'light' | 'dark' | 'device'; label: string }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        { 
          backgroundColor: theme.card,
          borderColor: themeMode === mode ? theme.primary : theme.border,
          borderWidth: 2,
        }
      ]}
      onPress={() => setThemeMode(mode)}
    >
      <Text style={[styles.themeLabel, { color: theme.text }]}>{label}</Text>
      {themeMode === mode && (
        <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
          
          <ThemeOption mode="light" label="☀️ Light Mode" />
          <ThemeOption mode="dark" label="🌙 Dark Mode" />
          <ThemeOption mode="device" label="📱 Device Default" />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
              Project Anony - Anonymous Chat
            </Text>
            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
              Version 1.0.0
            </Text>
            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
              End-to-end encrypted messaging
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  aboutText: {
    fontSize: 14,
    marginBottom: 8,
  },
});

export default SettingsScreen;
