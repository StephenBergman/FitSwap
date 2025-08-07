import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';


console.log('RequestSwapButton loaded');
export default function RequestSwapButton({ itemId }: { itemId: string }) {
  const router = useRouter();
 console.log('Rendering RequestSwapButton with itemId:', itemId);
  const handlePress = () => {
    router.push({
      pathname: '/offer/offerscreen',
      params: { id: itemId }
    });
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>Request Swap</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
