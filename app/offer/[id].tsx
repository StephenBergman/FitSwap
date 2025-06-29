import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function OfferScreen() {
  const { id } = useLocalSearchParams(); // 
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null); // 
  const [message, setMessage] = useState<string>(''); // 

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Image Picker ERROR]', error);
      Alert.alert('Image Picker Error', 'Could not open image picker.');
    }
  };

  const submitOffer = () => {
    Alert.alert('Offer Submitted', 'Your offer has been sent.');
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Make an Offer</Text>

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>Tap to select an image</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Add a message (optional)"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <TouchableOpacity
        style={styles.button}
        onPress={submitOffer}
      >
        <Text style={styles.buttonText}>Submit Offer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  imagePicker: {
    height: 200,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    color: '#999',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
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
