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

// Import new screens here ⬇️
import DoorstepPickupScreen from "./screens/DoorstepPickupScreen";
import OEMGaragesScreen from "./screens/OEMGaragesScreen";
import BookingChoiceScreen from "./screens/BookingChoiceScreen";
import BookingVisitScreen from "./screens/BookingVisitScreen";
import BookingPickupScreen from "./screens/BookingPickupScreen";


const Stack = createNativeStackNavigator();

const PREDICT_URL =
  "https://authentical-sandee-unsagely.ngrok-free.dev/predict";

export const SAMPLE = {
  engine: {
    engine_temp_c: 128,
    engine_rpm: 3600,
    oil_pressure_psi: 14,
    coolant_temp_c: 120,
    fuel_level_percent: 21,
    fuel_consumption_lph: 14.8,
    battery_voltage_v: 11.4,
    battery_current_a: 3.1,
    battery_temp_c: 47,
    alternator_output_v: 11.9,
    battery_charge_percent: 28,
    vehicle_speed_kph: 92,
    ambient_temp_c: 35,
    humidity_percent: 68,
    odometer_reading: 164200,
  },
  brake: {
    brake_fluid_level_psi: 18,
    brake_pad_wear_mm: 12,
    brake_temp_c: 182,
    abs_fault_indicator: 1,
    brake_pedal_pos_percent: 80,
    wheel_speed_fl_kph: 4,
    wheel_speed_fr_kph: 4,
    wheel_speed_rl_kph: 3,
    wheel_speed_rr_kph: 3,
  },
  battery: {
    battery_voltage_v: 11.1,
    battery_current_a: 2.1,
    battery_temp_c: 51,
    alternator_output_v: 12.2,
    battery_charge_percent: 20,
    battery_health_percent: 35,
  },
};

// Flatten function
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
  const overallAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (results[0]) {
      const total = calculateOverallHealth(results[0]);
      Animated.timing(overallAnim, {
        toValue: total,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [results]);

  async function syncSample1() {
    setLoading(true);
    try {
      const payload = flattenOBD(SAMPLE);
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
    setLoading(false);
  }

  function calculateOverallHealth(result) {
    if (!result) return 92;
    const e = result.engine?.health_percent ?? 0;
    const b = result.battery?.health_percent ?? 0;
    const br = result.brake?.health_percent ?? 0;
    return Math.round((e + b + br) / 3);
  }

  const overallHealth = calculateOverallHealth(results[0]);

  const size = 115;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  const animatedStrokeDashoffset = overallAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circ, 0],
  });

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>CURRENT VEHICLE</Text>
          <Text style={styles.subtitle}>Model S Dual Motor</Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={20}
            color="#9fb7c7"
          />
        </TouchableOpacity>
      </View>

      {/* top health section */}
      <View style={styles.topArea}>
        <View style={styles.leftSummary}>
          <Text style={styles.overallLabel}>Overall health</Text>
          <Text style={styles.overallLarge}>{overallHealth}%</Text>

          <TouchableOpacity style={styles.syncButton} onPress={syncSample1}>
            {loading ? (
              <ActivityIndicator color="#052026" />
            ) : (
              <Text style={styles.syncText}>Sync Sample 1</Text>
            )}
          </TouchableOpacity>
        </View>

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

      {/* Health Cards */}
      <FlatList
        data={results.length ? results : [{ dummy: true }]}
        renderItem={() => (
          <View>
            <HealthCard
              title="Engine"
              iconName="engine"
              health={results[0]?.engine?.health_percent ?? 92}
              probability={results[0]?.engine?.probability}
              failureImminent={results[0]?.engine?.failure_imminent}
              recommendation={
                results[0]?.engine?.recommendation ?? "Engine normal."
              }
              lastSync="2 mins ago"
              onHelpPress={() =>
                navigation.navigate("OEMGarages", { type: "engine" })
              }
            />
            <HealthCard
              title="Battery"
              iconName="battery"
              health={results[0]?.battery?.health_percent ?? 86}
              probability={results[0]?.battery?.probability}
              failureImminent={results[0]?.battery?.failure_imminent}
              recommendation={
                results[0]?.battery?.recommendation ?? "Battery normal."
              }
              lastSync="2 mins ago"
              onHelpPress={() =>
                navigation.navigate("OEMGarages", { type: "battery" })
              }
            />
            <HealthCard
              title="Brakes"
              iconName="car-brake-abs"
              health={results[0]?.brake?.health_percent ?? 78}
              probability={results[0]?.brake?.probability}
              failureImminent={results[0]?.brake?.failure_imminent}
              recommendation={
                results[0]?.brake?.recommendation ?? "Brakes normal."
              }
              lastSync="2 mins ago"
              onHelpPress={() =>
                navigation.navigate("OEMGarages", { type: "brake" })
              }
            />
          </View>
        )}
      />
    </View>
  );
}

export default function App() {
  return (
  <NavigationContainer>
  <Stack.Navigator>

    <Stack.Screen name="App" component={HomeScreen} options={{ headerShown:false }}/>

    {/* Only one entry for each screen */}
    <Stack.Screen name="OEMGarages" component={OEMGaragesScreen} />
    <Stack.Screen name="BookingChoice" component={BookingChoiceScreen} />
    <Stack.Screen name="BookingVisit" component={BookingVisitScreen} />
    <Stack.Screen name="BookingPickup" component={BookingPickupScreen} />

  </Stack.Navigator>
</NavigationContainer>

  );
}
