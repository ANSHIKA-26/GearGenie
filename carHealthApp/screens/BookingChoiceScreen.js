import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function BookingChoiceScreen({ route, navigation }) {
  const { centre, type, obdData } = route.params;

  return (
    <View style={{ flex:1, backgroundColor:"#06212c", padding:25 }}>
      
      <Text style={{ color:"white", fontSize:24, marginBottom:25 }}>
        Choose Booking Type
      </Text>

      <TouchableOpacity
        onPress={() => navigation.navigate("BookingVisit", { centre, type, obdData })}
        style={{ backgroundColor:"#2ecc71", padding:18, borderRadius:10, marginBottom:20 }}
      >
        <Text style={{ color:"#06212c", textAlign:"center", fontSize:18, fontWeight:"bold" }}>
          Book Workshop Visit
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("BookingPickup", { centre, type, obdData })}
        style={{ backgroundColor:"#3498db", padding:18, borderRadius:10 }}
      >
        <Text style={{ color:"white", textAlign:"center", fontSize:18, fontWeight:"bold" }}>
          Request Doorstep Pickup
        </Text>
      </TouchableOpacity>

    </View>
  );
}
