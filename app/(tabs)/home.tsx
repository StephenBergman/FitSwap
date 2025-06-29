import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Fetch Error]', error.message);
    } else {
      console.log('[Fetched Items]', data);
      setItems(data || []);
    }

    setLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <Image
        source={{
          uri: item.image_url || 'https://via.placeholder.com/300x200.png?text=No+Image',
        }}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      numColumns={2}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No items found. Try uploading some!</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
    fontSize: 16,
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  image: {
    width: '100%',
    aspectRatio: 1, // Keeps image square
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  title: {
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  description: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#666',
  },
});
