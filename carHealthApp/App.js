// ================= IMPORTS =================
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HealthCard from "./components/HealthCard";
import styles from "./styles";
import SignupScreen from "./screens/SignupScreen";

// FIREBASE
import {
  collection,
  getDocs,
  query,
  orderBy,
  getDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import MLLoading from "./components/MLLoading";

// Screens
import DoorstepPickupScreen from "./screens/DoorstepPickupScreen";
import OEMGaragesScreen from "./screens/OEMGaragesScreen";
import BookingChoiceScreen from "./screens/BookingChoiceScreen";
import BookingVisitScreen from "./screens/BookingVisitScreen";
import BookingPickupScreen from "./screens/BookingPickupScreen";
import LoginScreen from "./screens/LoginScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";


const Stack = createNativeStackNavigator();

// 🔥 Your ML Backend URL
const PREDICT_URL = "https://authentical-sandee-unsagely.ngrok-free.dev/predict";

// ================= LOGGING UTILITY =================
const log = {
  info: (message, data = null) => {
    console.log(`ℹ️ [INFO] ${message}`, data || "");
  },
  success: (message, data = null) => {
    console.log(`✅ [SUCCESS] ${message}`, data || "");
  },
  error: (message, error = null) => {
    console.error(`❌ [ERROR] ${message}`, error || "");
  },
  debug: (message, data = null) => {
    console.log(`🔍 [DEBUG] ${message}`, data || "");
  },
  api: (message, data = null) => {
    console.log(`🌐 [API] ${message}`, data || "");
  },
};

function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [mlLoading, setMlLoading] = useState(false);

  const overallAnim = useRef(new Animated.Value(0)).current;

  // ================= LOAD SAMPLES FROM FIREBASE =================
  useEffect(() => {
    log.info("🚀 HomeScreen mounted, loading samples...");
    
    async function loadSamples() {
      try {
        log.debug("Checking for assigned sample ID in AsyncStorage...");
        let assignedID = await AsyncStorage.getItem("assignedSampleId");
        log.debug("Assigned ID from storage:", assignedID);

        if (!assignedID && auth.currentUser) {
          log.info("No cached ID, fetching from Firestore user doc...");
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          
          if (userDoc.exists()) {
            assignedID = userDoc.data().assigned_sample;
            log.success("Found assigned sample from Firestore:", assignedID);
            await AsyncStorage.setItem("assignedSampleId", assignedID);
          } else {
            log.error("User document does not exist in Firestore");
          }
        }

        if (!assignedID) {
          log.error("No assigned sample ID found");
          return;
        }

        log.info("Fetching assigned sample document...");
        const assignedSnap = await getDoc(doc(db, "obd-samples", assignedID));
        const assignedSample = assignedSnap.exists()
          ? { id: assignedSnap.id, ...assignedSnap.data() }
          : null;

        if (assignedSample) {
          log.success("Assigned sample loaded:", assignedSample.label);
        }

        log.info("Fetching all OBD samples...");
        const q = query(collection(db, "obd-samples"), orderBy("label"));
        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        log.success(`Loaded ${all.length} total samples from Firestore`);

        // assigned sample always first
        const ordered = assignedSample
          ? [assignedSample, ...all.filter((s) => s.id !== assignedSample.id)]
          : all;

        setSamples(ordered);
        log.success(`Sample array ready with ${ordered.length} items`);
        log.debug("First sample:", ordered[0]?.label);
        
      } catch (err) {
        log.error("Sample load error:", err);
      }
    }
    
    loadSamples();
  }, []);

 async function handleLogout() {
  try {
    log.info("User logging out...");

    // Clear async storage
    await AsyncStorage.clear();
    log.info("AsyncStorage cleared");

    // Firebase logout
    await auth.signOut();
    log.success("User signed out");
  } 
  catch (error) {
    log.error("Error logging out:", error);
  }
}

  // ================= SEND SAMPLE TO BACKEND =================
  async function syncSelectedSample() {
    log.info("=== SYNC STARTED ===");
    
    if (!samples.length) {
      log.error("No samples available");
      return alert("No samples found");
    }

    setMlLoading(true);
    setLoading(true);

    const selected = samples[selectedSampleIndex];
    log.info(`Selected sample: "${selected.label}" (index ${selectedSampleIndex})`);
    
    // Remove 'id' field from Firebase data before sending to backend
    const { id, label, ...dataWithoutId } = selected;
    
    log.debug("Sample data fields:", Object.keys(dataWithoutId));
    log.api("📤 Sending POST request to:", PREDICT_URL);
    log.debug("Payload (without id/label):", dataWithoutId);

    try {
      const res = await fetch(PREDICT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataWithoutId })
      });

      log.api(`Response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      log.api("📥 Received response:", json);
      
      // Validate response structure
      if (!json.engine || !json.battery || !json.brake) {
        log.error("Invalid response structure:", json);
        throw new Error("Invalid response structure from backend");
      }
      
      log.success("Response validation passed");
      log.debug("Engine health:", json.engine.health_percent);
      log.debug("Battery health:", json.battery.health_percent);
      log.debug("Brake health:", json.brake.health_percent);
      
      setResults(json);
      log.success("✅ Results state updated successfully");
      log.info("=== SYNC COMPLETED ===");

    } catch (err) {
      log.error("Prediction error:", err);
      alert("Prediction error: " + err.message);
    } finally {
      setTimeout(() => {
        setMlLoading(false);
        setLoading(false);
        log.debug("Loading states reset");
      }, 2000);
    }
  }

  // ================= MONITOR RESULTS STATE =================
  useEffect(() => {
    if (results) {
      log.debug("🔍 Results state changed:", {
        engine: results.engine?.health_percent,
        battery: results.battery?.health_percent,
        brake: results.brake?.health_percent,
      });
    } else {
      log.debug("🔍 Results state is NULL");
    }
  }, [results]);

  // ================= OVERALL HEALTH UI ANIMATION =================
  useEffect(() => {
    if (results) {
      const e = results.engine?.health_percent ?? 0;
      const b = results.battery?.health_percent ?? 0;
      const br = results.brake?.health_percent ?? 0;
      const avg = Math.round((e + b + br) / 3);

      log.debug(`Animating overall health to ${avg}%`);

      Animated.timing(overallAnim, {
        toValue: avg,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [results]);

  const size = 115;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  const animatedRing = overallAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circ, 0],
  });

  const currentSample = samples[selectedSampleIndex];

  // Calculate overall health for display
  const overallHealth = results
    ? Math.round(
        (results.engine.health_percent +
          results.battery.health_percent +
          results.brake.health_percent) / 3
      )
    : 92;

  return (
    <ScrollView style={styles.container}>
      {mlLoading && <MLLoading />}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>CURRENT VEHICLE</Text>
          <Text style={styles.subtitle}>Model S Dual Motor</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#9fb7c7" />
        </TouchableOpacity>
      </View>

      {/* ================= TOP CARD ================= */}
      <View style={styles.topArea}>
        <View style={styles.leftSummary}>
          <Text style={styles.overallLabel}>Overall health</Text>
          <Text style={styles.overallLarge}>{overallHealth}%</Text>

          <Text style={{ marginTop: 10, color: "#87a4b6" }}>
            Sample: {currentSample?.label ?? "Loading..."}
          </Text>

          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => {
              const nextIndex = (selectedSampleIndex + 1) % samples.length;
              log.info(`Switching to sample index ${nextIndex}`);
              setSelectedSampleIndex(nextIndex);
            }}
          >
            <Text style={styles.syncText}>Next Sample</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.syncButton, { marginTop: 10 }]}
            onPress={syncSelectedSample}
          >
            {loading ? (
              <ActivityIndicator color="#052026" />
            ) : (
              <Text style={styles.syncText}>Sync Selected Sample</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* RING GRAPH */}
        <View style={styles.ringBox}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#27323f"
              strokeWidth={stroke}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#2ecc71"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={animatedRing}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </View>
      </View>

      {/* ================= HEALTH CARDS ================= */}
      <View style={{ paddingTop: 20, paddingBottom: 40 }}>
        {results ? (
          <>
            <HealthCard
              title="Engine"
              iconName="engine"
              health={results.engine.health_percent}
              recommendation={results.engine.status}
              rul={results.engine.rul_km}
              onHelpPress={() =>
                navigation.navigate("OEMGarages", {
                  type: "engine",
                  obdData: currentSample,
                })
              }
            />

            <HealthCard
              title="Battery"
              iconName="battery"
              health={results.battery.health_percent}
              recommendation={results.battery.status}
              rul={results.battery.rul_km}
              onHelpPress={() =>
                navigation.navigate("OEMGarages", {
                  type: "battery",
                  obdData: currentSample,
                })
              }
            />

            <HealthCard
              title="Brakes"
              iconName="car-brake-abs"
              health={results.brake.health_percent}
              recommendation={results.brake.status}
              rul={results.brake.rul_km}
              onHelpPress={() =>
                navigation.navigate("OEMGarages", {
                  type: "brakes",
                  obdData: currentSample,
                })
              }
            />
          </>
        ) : (
          <View style={{ padding: 20, alignItems: "center" }}>
            <MaterialCommunityIcons
              name="information-outline"
              size={48}
              color="#4a5f73"
              style={{ marginBottom: 10 }}
            />
            <Text style={{ color: "#87a4b6", fontSize: 16, textAlign: "center" }}>
              Press "Sync Selected Sample" to load vehicle diagnostics
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ================= AUTH ROUTING =================
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    log.info("App mounted, setting up auth listener...");
    
    return auth.onAuthStateChanged(async (user) => {
      if (user) {
        log.success("User authenticated:", user.uid);
        await AsyncStorage.setItem("authToken", user.uid);
        setAuthenticated(true);
      } else {
        log.info("No authenticated user");
        await AsyncStorage.removeItem("authToken");
        setAuthenticated(false);
      }

      setCheckingAuth(false);
    });
  }, []);

  if (checkingAuth) {
    log.debug("Checking authentication...");
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!authenticated ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ title: "Create Account" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="App"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OEMGarages"
              component={OEMGaragesScreen}
              options={{ title: "Service Centres" }}
            />
            <Stack.Screen
              name="BookingChoice"
              component={BookingChoiceScreen}
              options={{ title: "Choose Booking Type" }}
            />
            <Stack.Screen
              name="BookingVisit"
              component={BookingVisitScreen}
              options={{ title: "Visit Booking" }}
            />
            <Stack.Screen
              name="BookingPickup"
              component={BookingPickupScreen}
              options={{ title: "Pickup Booking" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}