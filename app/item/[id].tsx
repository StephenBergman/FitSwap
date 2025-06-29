// app/item/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ItemDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error) {
      console.error('Error fetching item:', error.message);
    } else {
      setItem(data);
    }
    setLoading(false);
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.tradeLabel}>Looking to trade for:</Text>
      <Text style={styles.tradeText}>{item.trade_for || 'Not specified'}</Text>

     <TouchableOpacity
  style={styles.button}
  onPress={() =>
    router.push({ pathname: '/offer/[id]', params: { id: item.id } })
  }
>
  <Text style={styles.buttonText}>Request Swap</Text>
</TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  tradeLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  tradeText: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
