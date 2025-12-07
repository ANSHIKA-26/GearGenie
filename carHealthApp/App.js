// App.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HealthCard from "./components/HealthCard";
import styles from "./styles";
import SignupScreen from "./screens/SignupScreen";

// FIREBASE IMPORTS
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

const PREDICT_URL =
  "https://authentical-sandee-unsagely.ngrok-free.dev/predict";

// Flatten Function
function flattenOBD(sample) {
  return {
    ...sample.engine,
    ...sample.brake,
    ...sample.battery,
    brand: "toyota",
    engine_failure_imminent: 0,
    battery_issue_imminent: 0,
    throttle_pos_percent: sample.engine.throttle_pos_percent ?? 20,
    engine_load_percent: sample.engine.engine_load_percent ?? 50,
    engine_hours: sample.engine.engine_hours ?? 1000,
    exhaust_gas_temp_c: sample.engine.exhaust_gas_temp_c ?? 400,
    air_flow_rate_gps: sample.engine.air_flow_rate_gps ?? 18,
    gps_latitude: sample.engine.gps_latitude ?? 37.7749,
    gps_longitude: sample.engine.gps_longitude ?? -122.4194,
    vibration_level: sample.engine.vibration_level ?? 1.5,
  };
}

function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [samples, setSamples] = useState([]);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [mlLoading, setMlLoading] = useState(false);

  const overallAnim = useRef(new Animated.Value(0)).current;

  // LOAD SAMPLES (including fallback to Firestore)
  useEffect(() => {
    async function loadSamples() {
      try {
        let assignedSampleId = await AsyncStorage.getItem("assignedSampleId");

        if (!assignedSampleId) {
          console.log("No local assigned sample — checking Firestore");

          const user = auth.currentUser;
          if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              assignedSampleId = userDoc.data().assigned_sample;
              await AsyncStorage.setItem("assignedSampleId", assignedSampleId);
            }
          }
        }

        if (!assignedSampleId) return;

        const assignedSnap = await getDoc(
          doc(db, "obd-samples", assignedSampleId)
        );

        let assignedSample = null;
        if (assignedSnap.exists()) {
          assignedSample = { id: assignedSnap.id, ...assignedSnap.data() };
        }

        const q = query(collection(db, "obd-samples"), orderBy("label"));
        const allSnap = await getDocs(q);
        const allSamples = allSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const ordered = assignedSample
          ? [
              assignedSample,
              ...allSamples.filter((s) => s.id !== assignedSample.id),
            ]
          : allSamples;

        setSamples(ordered);
        setSelectedSampleIndex(0);
      } catch (err) {
        console.log("Error loading samples:", err);
      }
    }

    loadSamples();
  }, []);

  async function handleLogout() {
    await auth.signOut();
  }

  // Sync selected sample to backend (unchanged)
  async function syncSelectedSample() {
    if (!samples.length) return alert("No samples found!");

    setMlLoading(true);
    setLoading(true);
    const startTime = Date.now();

    try {
      const selected = samples[selectedSampleIndex];
      const payload = flattenOBD(selected);

      const res = await fetch(PREDICT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      const json = await res.json();
      setResults([json]);
    } catch (err) {
      alert("Error: " + err.message);
    }

    const elapsed = Date.now() - startTime;
    const remaining = 6000 - elapsed;

    setTimeout(
      () => {
        setMlLoading(false);
        setLoading(false);
      },
      remaining > 0 ? remaining : 0
    );
  }

  // Overall health animation
  useEffect(() => {
    if (results[0]) {
      const e = results[0].engine?.health_percent ?? 0;
      const b = results[0].battery?.health_percent ?? 0;
      const br = results[0].brake?.health_percent ?? 0;

      const total = Math.round((e + b + br) / 3);
      Animated.timing(overallAnim, {
        toValue: total,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [results]);

  const size = 115;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  const animatedStrokeDashoffset = overallAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circ, 0],
  });

  const currentSample = samples[selectedSampleIndex];

  return (
    <View style={styles.container}>
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

      {/* TOP AREA */}
      <View style={styles.topArea}>
        <View style={styles.leftSummary}>
          <Text style={styles.overallLabel}>Overall health</Text>
          <Text style={styles.overallLarge}>
            {results[0]
              ? Math.round(
                  (results[0].engine.health_percent +
                    results[0].battery.health_percent +
                    results[0].brake.health_percent) /
                    3
                )
              : 92}
            %
          </Text>

          <Text style={{ marginTop: 10, color: "#87a4b6" }}>
            Sample: {currentSample?.label ?? "Loading..."}
          </Text>

          <TouchableOpacity
            style={[styles.syncButton, { marginTop: 10 }]}
            onPress={() =>
              setSelectedSampleIndex((selectedSampleIndex + 1) % samples.length)
            }
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

        {/* RING */}
        <View style={styles.ringBox}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#d3d3d3"
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
              strokeDashoffset={animatedStrokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </View>
      </View>

      {/* HEALTH CARDS */}
      <FlatList
        data={results.length ? results : [{ dummy: true }]}
        renderItem={() => (
          <View>
            {/* ENGINE */}
            <HealthCard
              title="Engine"
              iconName="engine"
              health={results[0]?.engine?.health_percent ?? 92}
              probability={results[0]?.engine?.probability}
              failureImminent={results[0]?.engine?.failure_imminent}
              recommendation={results[0]?.engine?.recommendation}
              onHelpPress={() =>
                navigation.navigate("OEMGarages", {
                  type: "engine",
                  obdData: currentSample,
                })
              }
            />

            {/* BATTERY */}
            <HealthCard
              title="Battery"
              iconName="battery"
              health={results[0]?.battery?.health_percent ?? 86}
              probability={results[0]?.battery?.probability}
              failureImminent={results[0]?.battery?.failure_imminent}
              recommendation={results[0]?.battery?.recommendation}
              onHelpPress={() =>
                navigation.navigate("OEMGarages", {
                  type: "battery",
                  obdData: currentSample,
                })
              }
            />

            {/* BRAKES */}
            <HealthCard
              title="Brakes"
              iconName="car-brake-abs"
              health={results[0]?.brake?.health_percent ?? 78}
              probability={results[0]?.brake?.probability}
              failureImminent={results[0]?.brake?.failure_imminent}
              recommendation={results[0]?.brake?.recommendation}
              onHelpPress={() =>
                navigation.navigate("OEMGarages", {
                  type: "brake",
                  obdData: currentSample,
                })
              }
            />
          </View>
        )}
      />
    </View>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // THIS FIXES LOGIN + LOGOUT STATE ALWAYS
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await AsyncStorage.setItem("authToken", user.uid);
        setAuthenticated(true);
      } else {
        await AsyncStorage.removeItem("authToken");
        setAuthenticated(false);
      }
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  if (checkingAuth) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="App" component={HomeScreen} />
            <Stack.Screen name="OEMGarages" component={OEMGaragesScreen} />
            <Stack.Screen name="BookingChoice" component={BookingChoiceScreen} />
            <Stack.Screen name="BookingVisit" component={BookingVisitScreen} />
            <Stack.Screen name="BookingPickup" component={BookingPickupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
