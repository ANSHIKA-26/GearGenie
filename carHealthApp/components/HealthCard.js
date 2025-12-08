// components/HealthCard.js
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "../styles";

export default function HealthCard({
  title,
  iconName,
  health,
  recommendation,
  onHelpPress,
  rul,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: health ?? 0,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [health]);

  const widthInterpolate = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // ---- Status Color Logic (Based Only on RUL) ----
  function getLevel() {
    if ((rul ?? 999) <= 7) return "red";
    if ((rul ?? 999) <= 20) return "yellow";
    return "green";
  }

  const level = getLevel();
  const barColor =
    level === "green" ? "#2ecc71" : level === "yellow" ? "#f1c40f" : "#e74c3c";

  return (
    <LinearGradient colors={["#0f1724", "#09101a"]} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={iconName} size={22} color={barColor} />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>

        <Text style={[styles.healthNumber, { color: barColor }]}>
          {health}%
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <View style={styles.healthBarBackground}>
          <Animated.View
            style={[
              styles.healthBarFill,
              { width: widthInterpolate, backgroundColor: barColor },
            ]}
          />
        </View>

        {/* ⭐ NEW – Show RUL Straightforward */}
        <Text style={[styles.recoText, { marginTop: 6 }]}>
          RUL: {rul ?? "--"} km remaining
        </Text>

        {/* Recommendation from API */}
        <Text style={[styles.recoText, { marginTop: 4, opacity: 0.8 }]}>
          {recommendation}
        </Text>

        {level === "red" && (
          <TouchableOpacity
            style={{
              marginTop: 10,
              padding: 10,
              backgroundColor: "#ff4d4d",
              borderRadius: 6,
            }}
            onPress={onHelpPress}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Contact Service
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}
