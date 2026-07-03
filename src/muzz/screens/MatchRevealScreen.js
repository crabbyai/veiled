import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn, FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz, getPerson } from '../store';
import { PhotoTile, Avatar, GButton } from '../components/ui';
import Butterfly from '../components/Butterfly';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

export default function MatchRevealScreen({ route, navigation }) {
  const { personId, score } = route.params;
  const { me, sendMessage } = useMuzz();
  const person = getPerson(personId);
  const [text, setText] = React.useState('');

  React.useEffect(() => { H.success(); }, []);

  if (!person) return null;

  const openChat = () => {
    if (text.trim()) sendMessage(personId, text.trim(), 'me');
    navigation.replace('MuzzChat', { personId });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F5325B', '#A855F7', '#7C3AED']} style={StyleSheet.absoluteFill} />
      <Hearts />
      <Pressable style={styles.close} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      <View style={styles.center}>
        <Animated.View entering={FadeInDown}><Butterfly size={90} colorA="#fff" colorB="#FFD1DD" /></Animated.View>
        <Animated.Text entering={ZoomIn.springify()} style={styles.title}>It's a Match!</Animated.Text>
        <Animated.Text entering={FadeIn.delay(200)} style={styles.sub}>
          The butterfly was right — you and {person.name} are a {score}% match
        </Animated.Text>

        <Animated.View entering={ZoomIn.delay(300).springify()} style={styles.photos}>
          <PhotoTile seed={me.id} name={me.name || 'You'} rounded={RADIUS.lg} style={[styles.photo, { transform: [{ rotate: '-6deg' }] }]} />
          <View style={styles.heartBubble}><Ionicons name="heart" size={26} color={M.primary} /></View>
          <PhotoTile seed={person.id} name={person.name} rounded={RADIUS.lg} style={[styles.photo, { transform: [{ rotate: '6deg' }], marginLeft: -24 }]} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450)} style={styles.composer}>
          <TextInput
            value={text} onChangeText={setText}
            placeholder={`Say salaam to ${person.name}…`} placeholderTextColor="rgba(255,255,255,0.7)"
            style={styles.input}
          />
          <Pressable onPress={openChat} style={styles.send}>
            <Ionicons name="send" size={20} color={M.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600)} style={{ alignSelf: 'stretch', marginTop: 14 }}>
          <GButton label="Start chatting" gradient={['#FFFFFF', '#FFFFFF']} textStyle={{ color: M.primary }} onPress={openChat} />
          <Pressable onPress={() => navigation.goBack()} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={styles.keepText}>Keep meeting people</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function Hearts() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(10)].map((_, i) => (
        <Animated.View key={i} entering={FadeIn.delay(i * 90)} style={{ position: 'absolute', top: 80 + (i * 53) % 500, left: (i * 71) % width, opacity: 0.25 }}>
          <Ionicons name="heart" size={14 + (i % 4) * 8} color="#fff" />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  close: { position: 'absolute', top: 56, right: 20, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
  title: { fontSize: 44, fontWeight: '900', color: '#fff', marginTop: 6, letterSpacing: -1 },
  sub: { ...TYPE.body, color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginTop: 8, fontSize: 16, fontWeight: '600' },
  photos: { flexDirection: 'row', alignItems: 'center', marginTop: 34 },
  photo: { width: width * 0.34, height: width * 0.42, borderWidth: 4, borderColor: '#fff', ...SHADOW.card },
  heartBubble: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 5, marginHorizontal: -20, ...SHADOW.card },
  composer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.pill, padding: 6, marginTop: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  input: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  keepText: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', fontSize: 15 },
});
