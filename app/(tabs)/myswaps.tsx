import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../lib/supabase'

type Swap = {
  id: string
  item_id: string
  sender_id: string
  receiver_id: string
  message: string
  status: string
  created_at: string
}

export default function MySwapsScreen() {
  const [swaps, setSwaps] = useState<Swap[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchSwaps = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (!error && data) setSwaps(data as Swap[])
    }

    fetchSwaps()
  }, [])

  const renderItem = ({ item }: { item: Swap }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Swap Request</Text>

      <Text style={styles.label}>Item ID:</Text>
      <Text style={styles.value}>{item.item_id}</Text>

      <Text style={styles.label}>Status:</Text>
      <Text style={styles.value}>{item.status}</Text>

      <Text style={styles.label}>Message:</Text>
      <Text style={styles.value}>{item.message}</Text>

      <TouchableOpacity onPress={() => router.push(`/swaps/[id]`)}>
        <Text style={styles.link}>View Details</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Swaps</Text>
      <FlatList
        data={swaps}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No swaps yet!</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
  },
  label: {
    fontWeight: '600',
    marginTop: 4,
  },
  value: {
    marginBottom: 4,
  },
  link: {
    color: '#007AFF',
    marginTop: 10,
    fontWeight: '500',
  },
})
