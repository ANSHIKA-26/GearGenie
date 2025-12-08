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
import styles, { headerTheme } from "./styles";      // header theme imported
import SignupScreen from "./screens/SignupScreen";
import { LinearGradient } from "expo-linear-gradient";

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

// 🔥 Your ML Backend
const PREDICT_URL = "https://authentical-sandee-unsagely.ngrok-free.dev/predict";

// ================= LOGGING =================
const log = {
  info: (m, d=null)=>console.log(`ℹ️`,m,d||""),
  success:(m,d=null)=>console.log(`✅`,m,d||""),
  error:(m,e=null)=>console.log(`❌`,m,e||""),
  debug:(m,d=null)=>console.log(`🔍`,m,d||""),
  api:(m,d=null)=>console.log(`🌐`,m,d||""),
};

// ================= HOME SCREEN =================
function HomeScreen({ navigation }) {
  const [loading, setLoading]           = useState(false);
  const [results, setResults]           = useState(null);
  const [samples, setSamples]           = useState([]);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [mlLoading, setMlLoading]       = useState(false);

  const overallAnim = useRef(new Animated.Value(0)).current;

  // ========== Load samples ==========
  useEffect(() => {
    async function loadSamples(){
      try{
        let assignedID = await AsyncStorage.getItem("assignedSampleId");

        if(!assignedID && auth.currentUser){
          const userDoc = await getDoc(doc(db,"users",auth.currentUser.uid));
          if(userDoc.exists()){
            assignedID=userDoc.data().assigned_sample;
            await AsyncStorage.setItem("assignedSampleId",assignedID);
          }
        }
        if(!assignedID) return;

        const assignedSnap = await getDoc(doc(db,"obd-samples",assignedID));
        const assignedSample = assignedSnap.exists()?{id:assignedSnap.id,...assignedSnap.data()}:null;

        const q=query(collection(db,"obd-samples"),orderBy("label"));
        const snap=await getDocs(q);
        const all=snap.docs.map(d=>({id:d.id,...d.data()}));

        const ordered = assignedSample?[assignedSample,...all.filter(s=>s.id!==assignedSample.id)]:all;
        setSamples(ordered);

      }catch(e){ log.error("load error",e); }
    }
    loadSamples();
  },[]);

  // ========== Logout ==========
  async function handleLogout(){
    try{
      await AsyncStorage.clear();
      await auth.signOut();
    }catch(err){ alert(err.message); }
  }

  // ========== SYNC sample ==========
  async function syncSelectedSample(){
    if(!samples.length) return alert("No samples found");

    setMlLoading(true); setLoading(true);
    const selected=samples[selectedSampleIndex];
    const {id,label,...dataWithoutId}=selected;

    try{
      const r=await fetch(PREDICT_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({data:dataWithoutId})
      });
      if(!r.ok) throw new Error("Network Error");
      const j=await r.json();
      setResults(j);

    }catch(e){ alert(e.message); }
    finally{
      setTimeout(()=>{ setMlLoading(false); setLoading(false); },1800);
    }
  }

  // Animate ring
  useEffect(()=>{
    if(results){
      const avg=Math.round((results.engine.health_percent+results.battery.health_percent+results.brake.health_percent)/3);
      Animated.timing(overallAnim,{toValue:avg,duration:700,useNativeDriver:false}).start();
    }
  },[results]);

  const size=115, stroke=10;
  const radius=(size-stroke)/2;
  const circ=2*Math.PI*radius;

  const animatedRing = overallAnim.interpolate({
    inputRange:[0,100],
    outputRange:[circ,0],
  });

  const currentSample=samples[selectedSampleIndex];
  const overallHealth=results?
    Math.round((results.engine.health_percent+results.battery.health_percent+results.brake.health_percent)/3)
    :92;


  // ================= UI RETURN =================
  return (
    <View style={{ flex: 1 }}>   {/* <-- REQUIRED FIX */}

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {mlLoading && <MLLoading/>}

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>CURRENT VEHICLE</Text>
            <Text style={styles.subtitle}>Model S Dual Motor</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={22} color="#9fb7c7" />
          </TouchableOpacity>
        </View>

        {/* Top Stats */}
        <View style={styles.topArea}>
          <View style={styles.leftSummary}>
            <Text style={styles.overallLabel}>Overall Health</Text>
            <Text style={styles.overallLarge}>{overallHealth}%</Text>

            <Text style={{marginTop:10,color:"#87a4b6"}}>
              Sample: {currentSample?.label ?? "Loading..."}
            </Text>

            {/* Next Sample */}
            <TouchableOpacity activeOpacity={0.85} onPress={()=>{
              const next=(selectedSampleIndex+1)%samples.length;
              setSelectedSampleIndex(next);
            }}>
              <LinearGradient colors={["#00e5ff","#00aaff"]} style={styles.syncButton}>
                <Text style={styles.syncText}>Next Sample</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Sync Sample */}
            <TouchableOpacity activeOpacity={0.85} onPress={syncSelectedSample}>
              <LinearGradient colors={["#00e5ff","#008cff"]} style={[styles.syncButton,{marginTop:10}]}>
                {loading?(
                  <ActivityIndicator color="#001a22"/>
                ):(<Text style={styles.syncText}>Sync OBD Data</Text>)}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Ring */}
          <View style={styles.ringBox}>
            <Svg width={size} height={size}>
              <Circle cx={size/2} cy={size/2} r={radius} stroke="#27323f" strokeWidth={stroke} fill="transparent"/>
              <Circle cx={size/2} cy={size/2} r={radius} stroke="#00e5ff" strokeWidth={stroke}
                strokeDasharray={`${circ} ${circ}`} strokeDashoffset={animatedRing}
                strokeLinecap="round" fill="transparent"
                transform={`rotate(-90 ${size/2} ${size/2})`}
              />
            </Svg>
          </View>
        </View>

        {/* Health Cards */}
        <View style={{paddingTop:20,paddingBottom:120}}>
          {results?(
            <>
              <HealthCard title="Engine" iconName="engine"
                health={results.engine.health_percent}
                recommendation={results.engine.status}
                rul={results.engine.rul_km}
                onHelpPress={()=>navigation.navigate("OEMGarages",{type:"engine",obdData:currentSample})}
              />

              <HealthCard title="Battery" iconName="battery"
                health={results.battery.health_percent}
                recommendation={results.battery.status}
                rul={results.battery.rul_km}
                onHelpPress={()=>navigation.navigate("OEMGarages",{type:"battery",obdData:currentSample})}
              />

              <HealthCard title="Brakes" iconName="car-brake-abs"
                health={results.brake.health_percent}
                recommendation={results.brake.status}
                rul={results.brake.rul_km}
                onHelpPress={()=>navigation.navigate("OEMGarages",{type:"brakes",obdData:currentSample})}
              />
            </>
          ):(
            <Text style={{color:"#87a4b6",textAlign:"center"}}>Press Sync to load data</Text>
          )}
        </View>

      </ScrollView>

      <View style={styles.bottomServiceWrapper}>
      <TouchableOpacity
        style={styles.bottomServiceButton}
        onPress={() => navigation.navigate("OEMGarages", { type: "general", obdData: currentSample })}
      >
        <Text style={styles.bottomServiceText}>⚙ Contact Service</Text>
      </TouchableOpacity>
    </View>

    </View>
  );
}

// ================= AUTH ROUTING =================
export default function App(){
  const [authenticated,setAuthenticated]=useState(false);
  const [checkingAuth,setCheckingAuth]=useState(true);

  useEffect(()=>{
    return auth.onAuthStateChanged(async(user)=>{
      if(user){
        await AsyncStorage.setItem("authToken",user.uid);
        setAuthenticated(true);
      }else{
        await AsyncStorage.removeItem("authToken");
        setAuthenticated(false);
      }
      setCheckingAuth(false);
    });
  },[]);

  if(checkingAuth) return null;

  return(
    <NavigationContainer>
      <Stack.Navigator screenOptions={headerTheme}>
        
        {!authenticated?(
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{headerShown:false}}/>
            <Stack.Screen name="Signup" component={SignupScreen} options={{title:"Create Account"}}/>
          </>
        ):(<>
            <Stack.Screen name="App" component={HomeScreen} options={{headerShown:false}}/>
            <Stack.Screen name="OEMGarages" component={OEMGaragesScreen} options={{title:"Service Centres"}}/>
            <Stack.Screen name="BookingChoice" component={BookingChoiceScreen} options={{title:"Choose Booking Type"}}/>
            <Stack.Screen name="BookingVisit" component={BookingVisitScreen} options={{title:"Visit Booking"}}/>
            <Stack.Screen name="BookingPickup" component={BookingPickupScreen} options={{title:"Pickup Booking"}}/>
        </>)}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
