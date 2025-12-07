// screens/SignupScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function assignRandomSample(uid) {
    // Get all OBD samples
    const snap = await getDocs(collection(db, "obd-samples"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (all.length === 0) {
      throw new Error("No OBD samples found in Firestore!");
    }

    // Pick random sample
    const random = all[Math.floor(Math.random() * all.length)];

    // Save inside Firestore user profile
    await setDoc(doc(db, "users", uid), {
      assigned_sample: random.id,
      email: email,
    });

    // Save locally for immediate use
    await AsyncStorage.setItem("assignedSampleId", random.id);

    return random.id;
  }

  async function handleSignup() {
    try {
      // 1️⃣ Create Firebase Auth user
      const c = await createUserWithEmailAndPassword(auth, email, password);

      // 2️⃣ Assign random sample to user
      await assignRandomSample(c.user.uid);

      // 3️⃣ Store token — triggers auto-navigation
      await AsyncStorage.setItem("authToken", c.user.uid);

      // DON'T navigate manually — App.js handles this automatically

    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>
        Create Account
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      <TouchableOpacity
        onPress={handleSignup}
        style={{
          backgroundColor: "#2ecc71",
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        style={{ marginTop: 20 }}
      >
        <Text style={{ textAlign: "center", color: "#3498db" }}>
          Already have an account? Log in
        </Text>
      </TouchableOpacity>
    </View>
  );
}
