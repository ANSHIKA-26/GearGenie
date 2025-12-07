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
    const snap = await getDocs(collection(db, "obd-samples"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const random = all[Math.floor(Math.random() * all.length)];

    // Save to Firestore under users collection
    await setDoc(doc(db, "users", uid), {
      assignedSampleId: random.id,
      email: email,
    });

    // Save locally
    await AsyncStorage.setItem("assignedSampleId", random.id);

    return random.id;
  }

  async function handleSignup() {
    try {
      const c = await createUserWithEmailAndPassword(auth, email, password);

      // Assign random sample
      await assignRandomSample(c.user.uid);

      // Mark user authenticated
      await AsyncStorage.setItem("authToken", c.user.uid);

    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>
        Sign Up
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12,
        }}
      />

      <TouchableOpacity
        onPress={handleSignup}
        style={{
          backgroundColor: "#3498db",
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.replace("Login")}
        style={{ marginTop: 20 }}
      >
        <Text style={{ textAlign: "center", color: "#555" }}>
          Already have an account? Log in
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
  onPress={() => navigation.replace("Signup")}
  style={{ marginTop: 20 }}
>
  <Text style={{ textAlign: "center", color: "#555" }}>
    Don't have an account? Sign Up
  </Text>
</TouchableOpacity>

    </View>
  );
}
