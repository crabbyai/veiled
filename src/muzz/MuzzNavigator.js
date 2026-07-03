import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';

import { M } from './theme';
import { MuzzProvider, useMuzz } from './store';
import * as H from './haptics';

import OnboardingScreen from './screens/OnboardingScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import ButterflyScreen from './screens/ButterflyScreen';
import ExploreScreen from './screens/ExploreScreen';
import MatchesScreen from './screens/MatchesScreen';
import SocialScreen from './screens/SocialScreen';
import MessagesScreen from './screens/MessagesScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileDetailScreen from './screens/ProfileDetailScreen';
import FiltersScreen from './screens/FiltersScreen';
import CallScreen from './screens/CallScreen';
import ProfileScreen from './screens/ProfileScreen';
import MatchRevealScreen from './screens/MatchRevealScreen';
import GoldScreen from './screens/GoldScreen';
import SettingsScreen from './screens/SettingsScreen';
import PostScreen from './screens/PostScreen';

const Stack = createNativeStackNavigator();

// ── Mini static butterfly glyph for the tab bar ──────────────────────
function ButterflyGlyph({ color = '#fff', size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 24 C 14 6, 2 10, 4 22 C 5 32, 18 30, 24 24 Z" fill={color} />
      <Path d="M24 24 C 34 6, 46 10, 44 22 C 43 32, 30 30, 24 24 Z" fill={color} />
      <Path d="M24 25 C 16 28, 8 40, 16 44 C 22 46, 25 34, 24 25 Z" fill={color} opacity={0.92} />
      <Path d="M24 25 C 32 28, 40 40, 32 44 C 26 46, 23 34, 24 25 Z" fill={color} opacity={0.92} />
      <Circle cx="24" cy="24" r="3" fill={color} />
    </Svg>
  );
}

// Muzz-style flat tab bar: 5 even tabs, pink active state, no center FAB.
const TABS = [
  { key: 'Discover', icon: 'glyph', label: 'Discover' },
  { key: 'LikesYou', icon: 'heart', label: 'Likes You' },
  { key: 'Social', icon: 'people', label: 'Social' },
  { key: 'Messages', icon: 'chatbubble-ellipses', label: 'Chats' },
  { key: 'Profile', icon: 'person', label: 'Profile' },
];

function TabBar({ active, onChange, badges }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((t) => {
        const isActive = active === t.key;
        const color = isActive ? M.primary : M.textMuted;
        return (
          <Pressable key={t.key} onPress={() => { H.tap(); onChange(t.key); }} style={styles.tab}>
            <View>
              {t.icon === 'glyph' ? (
                <ButterflyGlyph color={color} size={25} />
              ) : (
                <Ionicons name={isActive ? t.icon : `${t.icon}-outline`} size={25} color={color} />
              )}
              {badges[t.key] > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badges[t.key] > 9 ? '9+' : badges[t.key]}</Text></View>}
            </View>
            <Text style={[styles.tabLabel, { color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MuzzTabs({ navigation, route }) {
  const [active, setActive] = useState(route?.params?.screen || 'Discover');
  const { matches, chats, likedYou } = useMuzz();

  const unreadChats = matches.filter((id) => (chats[id] || []).some((m) => m.sender !== 'me' && !m.read)).length;
  const newMatchCount = matches.filter((id) => !(chats[id] || []).length).length;
  const badges = {
    LikesYou: likedYou.filter((id) => !matches.includes(id)).length,
    Messages: unreadChats + newMatchCount,
  };

  const screenProps = { navigation };
  return (
    <View style={{ flex: 1, backgroundColor: M.bg }}>
      <Animated.View key={active} entering={FadeIn.duration(160)} style={{ flex: 1 }}>
        {active === 'Discover' && <DiscoverScreen {...screenProps} />}
        {active === 'LikesYou' && <MatchesScreen {...screenProps} />}
        {active === 'Social' && <SocialScreen {...screenProps} />}
        {active === 'Messages' && <MessagesScreen {...screenProps} />}
        {active === 'Profile' && <ProfileScreen {...screenProps} />}
      </Animated.View>
      <TabBar active={active} onChange={setActive} badges={badges} />
    </View>
  );
}

function Root() {
  const { hydrated, onboarded } = useMuzz();
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: M.bg }} />;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: M.bg } }}>
        {!onboarded ? (
          <Stack.Screen name="MuzzOnboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MuzzTabs" component={MuzzTabs} />
            <Stack.Screen name="MuzzButterflyPicks" component={ButterflyScreen} />
            <Stack.Screen name="MuzzExplore" component={ExploreScreen} />
            <Stack.Screen name="MuzzFilters" component={FiltersScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="MuzzChat" component={ChatScreen} />
            <Stack.Screen name="MuzzCall" component={CallScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="MuzzProfileDetail" component={ProfileDetailScreen} />
            <Stack.Screen name="MuzzPost" component={PostScreen} />
            <Stack.Screen name="MuzzSettings" component={SettingsScreen} />
            <Stack.Screen name="MuzzMatchReveal" component={MatchRevealScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="MuzzGold" component={GoldScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function MuzzNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MuzzProvider>
          <Root />
        </MuzzProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', backgroundColor: M.bg, borderTopWidth: 1, borderTopColor: M.border,
    paddingTop: 8, alignItems: 'flex-start',
    ...Platform.select({ web: { boxShadow: '0 -2px 16px rgba(0,0,0,0.05)' } }),
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10.5, fontWeight: '700' },
  badge: { position: 'absolute', top: -5, right: -9, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: M.bg },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 9.5 },
});
