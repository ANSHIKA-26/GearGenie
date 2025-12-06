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
  probability,
  failureImminent,
  recommendation, 
  lastSync, 
  onHelpPress, 
  subtitle 
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

  // Use ML probability for critical detection (this is the real AI prediction!)
  const isCritical = failureImminent === true || (probability && probability > 0.5);
  
  // Color based on health (intuitive - more filled = better)
  const barColor = health >= 70 ? "#2ecc71" : health >= 40 ? "#f1c40f" : "#e74c3c";
  
  // Display health as percentage (user-friendly)
  const displayPercent = health;

  return (
    <LinearGradient colors={["#0f1724", "#09101a"]} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={iconName} size={22} color={barColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={[styles.healthNumber, { color: barColor }]}>{displayPercent}%</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={styles.smallLabel}>Health Status</Text>
        <View style={styles.healthBarBackground}>
          <Animated.View
            style={[
              styles.healthBarFill,
              {
                width: widthInterpolate,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        {probability !== undefined && health < 30.8 && (
          <View style={{ 
            marginTop: 8, 
            padding: 8, 
            backgroundColor: 'rgba(231, 76, 60, 0.1)', 
            borderRadius: 4,
            borderLeftWidth: 3,
            borderLeftColor: '#e74c3c'
          }}>
            <Text style={[styles.recoText, { color: '#e74c3c', fontWeight: '600' }]}>
              ⚠️ {Math.round(probability * 100)}% failure risk detected by AI
            </Text>
          </View>
        )}
        <Text style={styles.recoText}>{recommendation}</Text>
        <Text style={styles.lastSync}>Last sync: {lastSync}</Text>

        {isCritical && (
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
              Contact Help
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}