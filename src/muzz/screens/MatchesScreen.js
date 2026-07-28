import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz, getPerson } from '../store';
import { scoreMatch } from '../butterfly';
import { PhotoTile, Verified, GButton } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');
const COL_W = (width - SPACE.xl * 2 - 24) / 3;

export default function MatchesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const muzz = useMuzz();
  const { me, matches, likedYou, feedback, likePerson } = muzz;
  const [tab, setTab] = useState('likes');

  const matchPeople = useMemo(() => matches.map(getPerson).filter(Boolean), [matches]);
  const likedYouPeople = useMemo(
    () => likedYou.filter((id) => !matches.includes(id)).map(getPerson).filter(Boolean),
    [likedYou, matches]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Likes You</Text>
        <Pressable onPress={() => navigation.navigate('MuzzGold')} style={styles.goldBtn}>
          <Ionicons name="flame" size={15} color={M.primary} />
          <Text style={styles.goldText}>Boost</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Tab label={`Likes you`} count={likedYouPeople.length} active={tab === 'likes'} onPress={() => setTab('likes')} />
        <Tab label={`Matches`} count={matchPeople.length} active={tab === 'matches'} onPress={() => setTab('matches')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {tab === 'matches' && (
          matchPeople.length === 0 ? (
            <Empty
              icon="heart"
              title="No matches yet"
              sub="Let your matchmaker work — it's already found people for you."
              cta="See matchmaker picks" onPress={() => navigation.navigate('MuzzButterflyPicks')}
            />
          ) : (
            <View style={styles.list}>
              {matchPeople.map((p, i) => {
                const last = (muzz.chats[p.id] || []).slice(-1)[0];
                return (
                  <Animated.View key={p.id} entering={FadeInDown.delay(i * 50)}>
                    <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzChat', { personId: p.id }); }} style={styles.matchRow}>
                      <PhotoTile seed={p.id} name={p.name} rounded={30} style={{ width: 60, height: 60 }} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.rowName}>{p.name}, {p.age}</Text>
                          {p.verified && <View style={{ marginLeft: 6 }}><Verified size={13} /></View>}
                        </View>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {last ? (last.sender === 'me' ? `You: ${last.text}` : last.text) : `You matched! Say salaam 👋`}
                        </Text>
                      </View>
                      {!last && <View style={styles.newDot} />}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          )
        )}

        {tab === 'likes' && (
          likedYouPeople.length === 0 ? (
            <Empty
              icon="heart"
              title="No likes yet"
              sub="Keep your profile shining — likes will land here as people discover you."
              cta="Get a Boost" onPress={() => navigation.navigate('MuzzGold')}
            />
          ) : (
          <View>
            <View style={styles.likesBanner}>
              <Ionicons name={me.gold ? 'flame' : 'lock-closed'} size={16} color={M.text} />
              <Text style={styles.likesBannerText}>
                {me.gold
                  ? `${likedYouPeople.length} people like you — tap to match instantly.`
                  : `${likedYouPeople.length} people like you. Unlock Gold to see & match instantly.`}
              </Text>
            </View>
            {!me.gold && (
              <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzGold'); }} style={styles.seeAllBtn}>
                <LinearGradient colors={GRAD.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.seeAllGrad}>
                  <Ionicons name="diamond" size={16} color="#fff" />
                  <Text style={styles.seeAllText}>See who likes you</Text>
                </LinearGradient>
              </Pressable>
            )}
            <View style={styles.grid}>
              {likedYouPeople.map((p, i) => {
                const locked = !me.gold;
                return (
                  <Animated.View key={p.id} entering={FadeInDown.delay(i * 40)}>
                    <Pressable onPress={() => {
                      H.press();
                      if (locked) { navigation.navigate('MuzzGold'); return; }
                      likePerson(p.id, { mutual: true });
                      navigation.navigate('MuzzMatchReveal', { personId: p.id, score: scoreMatch(me, p).score });
                    }}>
                      <View style={styles.likeTile}>
                        <PhotoTile seed={p.id} name={p.name} style={StyleSheet.absoluteFill} />
                        {locked && <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />}
                        <LinearGradient colors={['transparent', 'rgba(20,16,26,0.7)']} style={StyleSheet.absoluteFill} />
                        <View style={styles.likeTileInfo}>
                          {locked ? (
                            <View style={styles.lockPill}><Ionicons name="lock-closed" size={14} color="#fff" /></View>
                          ) : (
                            <>
                              <Text style={styles.likeName}>{p.name}</Text>
                              <View style={styles.tapToMatch}><Ionicons name="heart" size={11} color="#fff" /><Text style={styles.tapText}>Match</Text></View>
                            </>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

function Tab({ label, count, active, onPress }) {
  return (
    <Pressable onPress={() => { H.select(); onPress(); }} style={styles.tabBtn}>
      <Text style={[styles.tabLabel, active && { color: M.text }]}>{label}{count ? ` (${count})` : ''}</Text>
      {active && <View style={styles.tabUnderline} />}
    </Pressable>
  );
}

function Empty({ icon, title, sub, cta, onPress }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={34} color={M.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      {cta && <GButton label={cta} icon="sparkles" gradient={GRAD.butterfly} onPress={onPress} style={{ marginTop: 22 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: SPACE.xl, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: M.text, letterSpacing: -0.6 },
  goldBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: M.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill },
  goldText: { color: M.primary, fontWeight: '800', fontSize: 13 },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACE.xl, borderBottomWidth: 1, borderBottomColor: M.border },
  tabBtn: { marginRight: 24, paddingVertical: 12 },
  tabLabel: { fontSize: 16, fontWeight: '800', color: M.textMuted },
  tabUnderline: { height: 3, borderRadius: 2, backgroundColor: M.primary, marginTop: 8 },
  list: { paddingTop: 6 },
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.xl, paddingVertical: 12 },
  rowName: { ...TYPE.h3, fontSize: 17 },
  rowSub: { ...TYPE.soft, marginTop: 3 },
  newDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: M.primary },
  likesBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: SPACE.xl, marginBottom: 8, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: M.border },
  likesBannerText: { flex: 1, fontWeight: '700', color: M.text, fontSize: 13 },
  seeAllBtn: { marginHorizontal: SPACE.xl, marginBottom: 8 },
  seeAllGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: RADIUS.pill },
  seeAllText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lockPill: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACE.xl, gap: 12 },
  likeTile: { width: COL_W, height: COL_W * 1.35, borderRadius: RADIUS.md, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: M.bgSoft },
  likeTileInfo: { padding: 8, alignItems: 'center' },
  likeName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tapToMatch: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, backgroundColor: M.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  tapText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: SPACE.xxl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: M.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...TYPE.h1, marginTop: 20 },
  emptySub: { ...TYPE.soft, textAlign: 'center', marginTop: 8, fontSize: 15, lineHeight: 21 },
});
