import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPRING, usePressScale } from './motion';

import { VeiledMark } from './components/VeiledMark';
import { M } from './theme';
import { MuzzProvider, useMuzz } from './store';
import * as H from './haptics';

import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import ButterflyScreen from './screens/ButterflyScreen';
import StandoutsScreen from './screens/StandoutsScreen';
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
import VerifyScreen from './screens/VerifyScreen';
import EventsScreen from './screens/EventsScreen';
import DhikrScreen from './screens/DhikrScreen';
import VoiceMatchScreen from './screens/VoiceMatchScreen';

const Stack = createNativeStackNavigator();

// The mark in the tab bar. It's artwork, not a line icon, so the
// active/inactive state is carried by opacity rather than tint.
function ButterflyGlyph({ color = '#fff', size = 26 }) {
  return <VeiledMark size={size} opacity={color === M.primary ? 1 : 0.45} />;
}

// Muzz-style flat tab bar: 5 even tabs, pink active state, no center FAB.
const TABS = [
  { key: 'Discover', icon: 'glyph', label: 'Discover' },
  { key: 'LikesYou', icon: 'heart', label: 'Likes You' },
  { key: 'Social', icon: 'people', label: 'Social' },
  { key: 'Messages', icon: 'chatbubble-ellipses', label: 'Chats' },
  { key: 'Profile', icon: 'person', label: 'Profile' },
];

// A tab that lifts and settles when it becomes the active one, so the
// switch is something you see happen rather than a repaint.
function Tab({ tab, isActive, onPress, badge }) {
  const on = useSharedValue(isActive ? 1 : 0);
  const press = usePressScale(0.9);
  React.useEffect(() => {
    on.value = withSpring(isActive ? 1 : 0, SPRING);
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + on.value * 0.12 }, { translateY: -on.value * 2 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: 0.55 + on.value * 0.45 }));
  const color = isActive ? M.primary : M.textMuted;

  return (
    <Pressable
      onPress={() => { H.tap(); onPress(); }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={styles.tab}
    >
      <Animated.View style={press.style}>
        <Animated.View style={iconStyle}>
          {tab.icon === 'glyph' ? (
            <ButterflyGlyph color={color} size={25} />
          ) : (
            <Ionicons name={isActive ? tab.icon : `${tab.icon}-outline`} size={25} color={color} />
          )}
          {badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
        </Animated.View>
        <Animated.Text style={[styles.tabLabel, { color }, labelStyle]}>{tab.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function TabBar({ active, onChange, badges }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((t) => (
        <Tab
          key={t.key}
          tab={t}
          isActive={active === t.key}
          badge={badges[t.key] || 0}
          onPress={() => onChange(t.key)}
        />
      ))}
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
  const { hydrated, onboarded, authed } = useMuzz();
  // `authed` is null while the stored session is being read — hold here
  // rather than flashing the sign-in screen at someone already signed
  // in. Show the mark while holding: a plain empty screen is
  // indistinguishable from an app that failed to start.
  if (!hydrated || authed === null) {
    return (
      <View style={{ flex: 1, backgroundColor: M.bg, alignItems: 'center', justifyContent: 'center' }}>
        <VeiledMark size={84} />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: M.bg } }}>
        {!authed ? (
          <Stack.Screen name="MuzzAuth" component={AuthScreen} />
        ) : !onboarded ? (
          <Stack.Screen name="MuzzOnboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MuzzTabs" component={MuzzTabs} />
            <Stack.Screen name="MuzzButterflyPicks" component={ButterflyScreen} />
            <Stack.Screen name="MuzzStandouts" component={StandoutsScreen} />
            <Stack.Screen name="MuzzExplore" component={ExploreScreen} />
            <Stack.Screen name="MuzzFilters" component={FiltersScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="MuzzChat" component={ChatScreen} />
            <Stack.Screen name="MuzzCall" component={CallScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="MuzzProfileDetail" component={ProfileDetailScreen} />
            <Stack.Screen name="MuzzPost" component={PostScreen} />
            <Stack.Screen name="MuzzSettings" component={SettingsScreen} />
            <Stack.Screen name="MuzzVerify" component={VerifyScreen} />
            <Stack.Screen name="MuzzEvents" component={EventsScreen} />
            <Stack.Screen name="MuzzDhikr" component={DhikrScreen} />
            <Stack.Screen name="MuzzVoice" component={VoiceMatchScreen} />
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
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 10.5, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  badge: { position: 'absolute', top: -5, right: -9, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: M.bg },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 9.5 },
});
