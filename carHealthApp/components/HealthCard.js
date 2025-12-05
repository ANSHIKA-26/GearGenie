// components/HealthCard.js
import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "../styles";

// helper color chooser
const getHealthColor = (h) => {
  if (h >= 80) return "#2ecc71"; // green
  if (h >= 40) return "#f1c40f"; // yellow
  return "#e74c3c"; // red
};

export default function HealthCard({
  title,
  iconName = "engine",
  health = 100,
  lastSync = "now",
  recommendation = "",
  subtitle = "",
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: health,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [health]);

  const widthInterpolate = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const color = getHealthColor(health);

  return (
    <LinearGradient
      colors={["#0f1724", "#09101a"]}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={iconName} size={22} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={[styles.healthNumber, { color }]}>{health}%</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={styles.smallLabel}>Health</Text>
        <View style={styles.healthBarBackground}>
          <Animated.View
            style={[
              styles.healthBarFill,
              {
                width: widthInterpolate,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles.recoText}>{recommendation}</Text>
        <Text style={styles.lastSync}>Last sync: {lastSync}</Text>
      </View>
    </LinearGradient>
  );
}
