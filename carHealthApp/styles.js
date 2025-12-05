// styles.js
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  // --- app container ---
  container: {
    flex: 1,
    backgroundColor: "#07101a", // dark teal/blue
    paddingTop: 44,
    paddingHorizontal: 18,
  },

  // --- header ---
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#e6f7ff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#9fb7c7", fontSize: 12 },

  // --- overall ring area ---
  topArea: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leftSummary: { flex: 1, paddingRight: 12 },
  overallLabel: { color: "#9fb7c7", fontSize: 12, marginBottom: 6 },
  overallLarge: { color: "#e6f7ff", fontSize: 36, fontWeight: "700" },

  // --- ring / small vehicle diagram container ---
  ringBox: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },

  // --- card styles ---
  card: {
    backgroundColor: "#0b1720",
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#e6f7ff", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#9fb7c7", fontSize: 12 },

  // health number on right
  healthNumber: { fontWeight: "700", fontSize: 16 },

  // health bar
  smallLabel: { color: "#9fb7c7", fontSize: 12 },
  healthBarBackground: {
    height: 10,
    backgroundColor: "#0f2430",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 6,
  },
  healthBarFill: {
    height: 10,
    borderRadius: 6,
  },

  // recommendation + last sync
  recoText: { color: "#b6d7e1", marginTop: 8 },
  lastSync: { color: "#7fa2ad", fontSize: 12, marginTop: 8 },

  // sync button
  syncButton: {
    backgroundColor: "#00a6ff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  syncText: { color: "#052026", fontWeight: "700" },

  // list
  list: { marginTop: 8 },
});
