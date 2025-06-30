import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import { supabase } from '../lib/supabase'

type WishlistItem = {
  id: string
  item_id: string
  item: {
    title: string
    image_url: string
  }[]
}

export default function WishlistScreen() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchWishlist = async () => {
      setLoading(true)
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        Alert.alert('Error', 'User not logged in')
        return
      }

      const { data, error } = await supabase
        .from('wishlist')
        .select('id, item_id, item (title, image_url)')
        .eq('user_id', user.id)

      if (error) {
        console.error(error)
        Alert.alert('Error fetching wishlist', error.message)
      } else {
        setWishlist(data as WishlistItem[])
      }

      setLoading(false)
    }

    fetchWishlist()
  }, [])

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const product = item.item[0] // item is returned as an array

    if (!product) return null

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/product/[id]',
            params: { id: item.item_id }
          })
        }
      >
        <Text style={styles.title}>{product.title}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Wishlist</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : wishlist.length === 0 ? (
        <Text>No items in your wishlist yet.</Text>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '500'
  }
})
