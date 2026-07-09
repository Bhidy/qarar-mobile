import { View, StyleSheet, Pressable, Animated, Image } from "react-native";
import { formatDate } from "@/lib/format-date";
import { Text } from "@/components/shared/AppText";
import { useRef } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { displayAuthors } from "@/lib/byline";
import { Radius, Typography, Spacing } from "@/constants/theme";
import { SignalBadge } from "./SignalBadge";
import { Ionicons } from "@expo/vector-icons";
import { ArticleCover } from "./ArticleCover";


interface ContentCardProps {
  card: {
    id: string;
    readTime: number;
    type: "article" | "video" | "live";
    title: string;
    titleAr?: string;
    subtitle?: string;
    subtitleAr?: string;
    author: string[];
    date: string;
    tag?: string;
    ticker?: string;
    coverImage?: string;
  };
  compact?: boolean;
}

export function ContentCard({ card, compact = false }: ContentCardProps) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const displayTitle    = (isAr && card.titleAr)    ? card.titleAr    : card.title;
  const displaySubtitle = (isAr && card.subtitleAr) ? card.subtitleAr : card.subtitle;
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.955,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  }

  function onPress() {
    router.push({ pathname: "/article/[id]", params: { id: card.id } });
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[
          styles.card,
          compact && styles.cardCompact,
          { backgroundColor: C.bg.surface, borderColor: C.border.subtle },
        ]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
      >
        {/* Thumbnail — real cover image when available, else editorial art */}
        <View style={[styles.thumb, compact && styles.thumbCompact, { backgroundColor: C.bg.elevated }]}>
          {card.coverImage
            ? <Image source={{ uri: card.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <ArticleCover ticker={card.ticker} signal={card.tag} />
          }

          {/* Type badge — LIVE/VIDEO indicator only (reading-time removed). */}
          {card.type === "live" || card.type === "video" ? (
            <View style={isRTL ? { position: "absolute", top: 8, right: 8 } : styles.typeBadge}>
              {card.type === "live" ? (
                <View style={[styles.chip, { backgroundColor: "rgba(228,97,90,0.92)" }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.chipText}>LIVE</Text>
                </View>
              ) : (
                <View style={[styles.chip, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                  <Ionicons name="play" size={9} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.chipText}>{isAr ? "فيديو" : "Video"}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Signal badge — top-right LTR / top-left RTL */}
          {card.tag && (
            <View style={isRTL ? { position: "absolute", top: 8, left: 8 } : styles.signalTag}>
              <SignalBadge signal={card.tag} size="sm" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: C.text.primary }, isRTL && styles.textRight]} numberOfLines={2}>
            {displayTitle}
          </Text>
          {!compact && displaySubtitle && (
            <Text style={[styles.subtitle, { color: C.text.muted }, isRTL && styles.textRight]} numberOfLines={2}>
              {displaySubtitle}
            </Text>
          )}
          <View style={[styles.meta, isRTL && styles.metaRTL]}>
            <Text style={[styles.author, { color: C.text.muted }]}>{displayAuthors(card.author, isAr)}</Text>
            <Text style={[styles.date, { color: C.text.muted }]}>{formatDate(card.date)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { width: 210, borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  cardCompact: { width: 168 },

  thumb: { height: 118, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  thumbCompact: { height: 90 },

  typeBadge: { position: "absolute", top: 8, left: 8 },
  signalTag: { position: "absolute", top: 8, right: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  chipText: { color: "#fff", fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },

  content: { padding: Spacing[3], gap: 4 },
  title: { fontSize: Typography.sm, fontWeight: "700", lineHeight: 18 },
  subtitle: { fontSize: 11, lineHeight: 15 },
  textRight: { textAlign: "right" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  metaRTL: { flexDirection: "row-reverse" },
  author: { fontSize: 10, fontWeight: "600" },
  date: { fontSize: 10 },
});
