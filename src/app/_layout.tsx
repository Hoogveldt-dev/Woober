import { Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MeldingBanner } from '../components/merk';
import { AppProvider, useApp } from '../state/AppContext';
import { kleuren } from '../theme';

function Navigatie() {
  const { gebruiker, rol, honden, mijnProfiel } = useApp();
  const aangemeld = gebruiker !== null;
  const eigenaarKlaar = aangemeld && rol === 'eigenaar' && honden.length > 0;
  const uitlaterKlaar = aangemeld && rol === 'uitlater' && mijnProfiel !== null;

  const startpunt: Href = !aangemeld
    ? '/welkom'
    : rol === 'eigenaar'
      ? honden.length > 0
        ? '/'
        : '/hond-aanmaken'
      : mijnProfiel
        ? '/werk'
        : '/uitlater-aanmaken';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: kleuren.tekst,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: kleuren.achtergrond },
      }}
    >
      <Stack.Protected guard={!aangemeld} redirectTo={startpunt}>
        <Stack.Screen name="welkom" />
        <Stack.Screen name="aanmelden" options={{ headerShown: true, title: 'Account aanmaken' }} />
      </Stack.Protected>

      <Stack.Protected guard={aangemeld && rol === 'eigenaar' && honden.length === 0} redirectTo={startpunt}>
        <Stack.Screen name="hond-aanmaken" options={{ headerShown: true, title: 'Profiel van je hond' }} />
      </Stack.Protected>

      <Stack.Protected guard={aangemeld && rol === 'uitlater' && mijnProfiel === null} redirectTo={startpunt}>
        <Stack.Screen name="uitlater-aanmaken" options={{ headerShown: true, title: 'Jouw profiel' }} />
      </Stack.Protected>

      <Stack.Protected guard={eigenaarKlaar} redirectTo={startpunt}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="boeken" options={{ headerShown: true, title: 'Kies een uitlater' }} />
        <Stack.Screen name="bevestigen" options={{ headerShown: true, title: 'Boeking bevestigen' }} />
        <Stack.Screen name="kennismaking" options={{ headerShown: true, title: 'Kennismaken' }} />
        <Stack.Screen name="uitlater/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="wandeling/[id]" />
        <Stack.Screen name="rapport/[id]" options={{ headerShown: true, title: 'Rapport' }} />
      </Stack.Protected>

      <Stack.Protected guard={uitlaterKlaar} redirectTo={startpunt}>
        <Stack.Screen name="werk" />
        <Stack.Screen name="opdracht/[id]" />
        <Stack.Screen name="verificatie" options={{ headerShown: true, title: 'Verificatie' }} />
      </Stack.Protected>

      <Stack.Protected guard={eigenaarKlaar || uitlaterKlaar} redirectTo={startpunt}>
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="hond/[id]" options={{ headerShown: true, title: 'Hond' }} />
        <Stack.Screen name="profiel-uitlater" options={{ headerShown: true, title: 'Jouw profiel' }} />
        <Stack.Screen name="veiligheid" options={{ headerShown: true, title: 'Veiligheid en hulp' }} />
        <Stack.Screen name="verdienmodel" options={{ headerShown: true, title: 'Verdienmodel' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Navigatie />
        <MeldingBanner />
      </AppProvider>
    </SafeAreaProvider>
  );
}
