import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ImpactAPI } from '../api/client';
import { colors, radius, shadow, gradients } from '../theme';

export default function MyImpactScreen() {
  const [report, setReport] = useState(null);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([ImpactAPI.report(), ImpactAPI.streak(), ImpactAPI.leaderboard(), ImpactAPI.badges()])
      .then(([r, s, l, b]) => {
        setReport(r.data);
        setStreak(s.data.streakDays);
        setLeaderboard(l.data);
        setBadges(b.data.badges);
      })
      .catch((err) => console.log('Impact load error', err?.response?.data || err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = () => {
    if (!report) return;
    Share.share({
      message: `🌱 My OfficePool commute this month: ${report.ridesTaken + report.ridesOffered} shared rides, ${report.co2SavedKg}kg CO2 saved, and a ${streak}-day carpool streak. Carpooling with verified colleagues!`,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={gradients.eco} style={styles.hero}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>day carpool streak</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard icon="🚗" value={(report?.ridesTaken || 0) + (report?.ridesOffered || 0)} label="Rides this month" />
        <StatCard icon="🌍" value={`${report?.co2SavedKg || 0}kg`} label="CO2 saved" />
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="💸" value={`₹${Math.round(report?.amountSpent || 0)}`} label="Spent as rider" />
        <StatCard icon="💰" value={`₹${Math.round(report?.amountEarned || 0)}`} label="Earned as driver" />
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>📤 Share my impact</Text>
      </TouchableOpacity>

      {badges.length > 0 && (
        <View style={styles.badgesCard}>
          <Text style={styles.badgesTitle}>🏅 Milestones</Text>
          <View style={styles.badgesWrap}>
            {badges.map((b) => (
              <View key={b.id} style={[styles.badgeChip, b.earned ? styles.badgeChipEarned : styles.badgeChipLocked]}>
                <Text style={styles.badgeEmoji}>{b.earned ? b.emoji : '🔒'}</Text>
                <Text style={[styles.badgeLabel, b.earned ? styles.badgeLabelEarned : styles.badgeLabelLocked]}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {leaderboard?.company && (
        <View style={styles.leaderboardCard}>
          <Text style={styles.leaderboardTitle}>🏆 {leaderboard.company} leaderboard</Text>
          <Text style={styles.leaderboardSubtitle}>Top carpoolers this month</Text>
          {leaderboard.leaderboard.length === 0 && (
            <Text style={styles.emptyText}>No completed rides at your company yet this month — be the first!</Text>
          )}
          {leaderboard.leaderboard.map((m, i) => (
            <View key={m.userId} style={[styles.leaderRow, m.isMe && styles.leaderRowMe]}>
              <Text style={styles.leaderRank}>{i + 1}</Text>
              <Image
                source={m.photoUrl ? { uri: m.photoUrl } : require('../../assets/default-avatar.png')}
                style={styles.leaderAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName} numberOfLines={1}>{m.name}{m.isMe ? ' (You)' : ''}</Text>
                <Text style={styles.leaderMeta}>{m.rides} rides · {m.co2SavedKg}kg CO2 saved</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  hero: {
    paddingVertical: 36, alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 16,
  },
  streakIcon: { fontSize: 34 },
  streakNumber: { fontSize: 44, fontWeight: '900', color: '#fff', marginTop: 4 },
  streakLabel: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, alignItems: 'center', ...shadow.card },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3, textAlign: 'center' },
  shareButton: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: colors.primaryTint,
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  shareButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  badgesCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 18, margin: 16, ...shadow.card },
  badgesTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill,
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1,
  },
  badgeChipEarned: { backgroundColor: colors.successTint, borderColor: colors.success },
  badgeChipLocked: { backgroundColor: colors.bg, borderColor: colors.border },
  badgeEmoji: { fontSize: 14 },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  badgeLabelEarned: { color: colors.successDeep },
  badgeLabelLocked: { color: colors.textFaint },
  leaderboardCard: {
    backgroundColor: colors.card, borderRadius: radius.xl, padding: 18, margin: 16, ...shadow.card,
  },
  leaderboardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  leaderboardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 14 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  leaderRowMe: { backgroundColor: colors.primaryTint, borderRadius: radius.md, paddingHorizontal: 8 },
  leaderRank: { width: 20, textAlign: 'center', fontWeight: '800', color: colors.textMuted, fontSize: 13 },
  leaderAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg },
  leaderName: { fontWeight: '700', fontSize: 13.5, color: colors.textPrimary },
  leaderMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
});
