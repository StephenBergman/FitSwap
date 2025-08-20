import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false, drawerType: 'front' }}>
      {/* Tabs bundle */}
      <Drawer.Screen name="(tabs)" options={{ title: 'Home', headerShown: false }} />
      {/* Extra destination(s) in the hamburger */}
      <Drawer.Screen name="myitems" options={{ title: 'My Listed Items', headerShown: true }} />
    </Drawer>
  );
}
