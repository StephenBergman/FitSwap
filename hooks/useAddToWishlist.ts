// hooks/useAddToWishlist.ts
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';

export const useAddToWishlist = () => {
  const addToWishlist = async (itemId: string) => {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      Toast.show({
        type: 'error',
        text1: 'Authentication error',
        text2: 'Could not get user ID.'
      });
      return;
    }

    const { error } = await supabase.from('wishlist').insert({
      user_id: user.id,
      item_id: itemId
    });

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Added to wishlist!'
      });
    }
  };

  return { addToWishlist };
};
