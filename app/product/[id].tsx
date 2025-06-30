import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../../lib/supabase'

type Item = {
  id: string
  title: string
  description: string
  image_url: string
  trade_for: string
  user_id: string
}

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const navigation = useNavigation()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchItem()
  }, [id])

  const fetchItem = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching item:', error.message)
      Alert.alert('Error', error.message)
    } else {
      setItem(data)
      // Set header title to item title
      navigation.setOptions({ title: data.title })
    }

    setLoading(false)
  }

  const handleAddToWishlist = async () => {
    if (typeof id !== 'string') return

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      Alert.alert('Authentication error', 'Could not get user ID.')
      return
    }

    const { error } = await supabase.from('wishlist').insert({
      user_id: user.id,
      item_id: id
    })

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Added to wishlist!')
    }
  }

  const handleSwapNow = () => {
    if (!item) return

    router.push({
      pathname: '/offer/offerscreen',
      params: { id: item.id }
    })
  }

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.tradeLabel}>Looking to trade for:</Text>
      <Text style={styles.tradeText}>{item.trade_for || 'Not specified'}</Text>

      <TouchableOpacity style={styles.button} onPress={handleSwapNow}>
        <Text style={styles.buttonText}>Request Swap</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#555', marginTop: 10 }]}
        onPress={handleAddToWishlist}
      >
        <Text style={styles.buttonText}>❤️ Add to Wishlist</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    padding: 20,
    backgroundColor: '#fff'
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    resizeMode: 'cover'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333'
  },
  tradeLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  tradeText: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 30
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
})
