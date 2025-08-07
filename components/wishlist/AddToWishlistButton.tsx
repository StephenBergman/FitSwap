// components/AddToWishlistButton.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAddToWishlist } from '../../hooks/useAddToWishlist';

type Props = {
  itemId: string;
};

const AddToWishlistButton = ({ itemId }: Props) => {
  const { addToWishlist } = useAddToWishlist();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => addToWishlist(itemId)}
    >
      <Text style={styles.buttonText}>❤️ Add to Wishlist</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#555',
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

export default AddToWishlistButton;
