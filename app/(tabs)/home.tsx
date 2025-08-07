import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
    onPress={() => router.push(`/product/${item.id}`)}
    activeOpacity={0.85}
  >
    <Image
      source={{
        uri: item.image_url || 'https://via.placeholder.com/300x300.png?text=No+Image',
      }}
      style={styles.image}
      resizeMode="contain"
    />
    <View style={styles.cardContent}>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
    </View>
  </TouchableOpacity>
);


  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      numColumns={6}
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
    padding: 8,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
    fontSize: 16,
  },
  card: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
    maxWidth: '20%',
    maxHeight: '100%',
  },
  image: {
    width: '100%',
    height: 220, // Taller image to show product better
    backgroundColor: '#f0f0f0',
    aspectRatio: 3/4,
    alignSelf: 'stretch',
  },
  cardContent: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

