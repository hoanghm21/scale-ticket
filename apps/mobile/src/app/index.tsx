import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScaleTicket</Text>
      <Text style={styles.subtitle}>Your tickets, always at hand.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1b23",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#5c7cfa",
  },
  subtitle: {
    fontSize: 16,
    color: "#adb5bd",
    marginTop: 8,
  },
});
