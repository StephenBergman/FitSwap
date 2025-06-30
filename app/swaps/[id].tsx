import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SwapDetailScreen() {
  const { id } = useLocalSearchParams();
  const [swap, setSwap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSwap = async () => {
      const { data, error } = await supabase
        .from('swaps')
        .select(
          `
          id,
          message,
          status,
          item_id,
          offered_item_id,
          items: item_id ( title, image_url, trade_for ),
          offered_item: offered_item_id ( title, image_url )
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load swap details');
      } else {
        setSwap(data);
      }

      setLoading(false);
    };

    if (id) fetchSwap();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!swap) {
    return (
      <View style={styles.centered}>
        <Text>No swap details found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swap Request</Text>
      <Text>Status: {swap.status}</Text>
      <Text>Message: {swap.message}</Text>

      <Text style={styles.section}>Requested Item:</Text>
      <Text>Title: {swap.items?.title}</Text>
      <Text>Looking for: {swap.items?.trade_for}</Text>

      <Text style={styles.section}>Offered Item:</Text>
      <Text>Title: {swap.offered_item?.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    marginTop: 20,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
