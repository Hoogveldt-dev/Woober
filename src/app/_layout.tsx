import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BewerkBalk } from '../components/Bewerkbaar';
import { MeldingBanner } from '../components/merk';
import { AppProvider, useApp } from '../state/AppContext';
import { TekstenProvider } from '../state/Teksten';
import { kleuren } from '../theme';

/**
 * Op het web kan iemand een pagina direct openen, via een link of door te verversen. Er is dan geen vorige pagina,
 * dus zonder deze knop zou de terugknop ontbreken en zit je vast op bijvoorbeeld de privacyverklaring.
 */
function NaarStart() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Terug" style={{ padding: 8, marginLeft: 4 }}>
      <Ionicons name="chevron-back" size={24} color={kleuren.tekst} />
    </Pressable>
  );
}

/** Adres waarmee de web-app werd geopend, vastgelegd voordat de router iemand naar de start stuurt */
const BEGIN_ADRES =
  Platform.OS === 'web' && typeof window !== 'undefined' && !['/', '/welkom'].includes(window.location.pathname)
    ? window.location.pathname + window.location.search
    : null;

function Navigatie() {
  const { gebruiker, rol, honden, mijnProfiel, laden, beheerder, modus } = useApp();
  const aangemeld = gebruiker !== null;
  const router = useRouter();

  // Wie op het web een pagina ververst of een link opent, komt eerst op de start terecht: het account is dan
  // nog niet geladen. Ga naar het oorspronkelijke adres zodra het account er is.
  const beginAdres = useRef(BEGIN_ADRES);
  useEffect(() => {
    if (laden || !beginAdres.current) return;
    const adres = beginAdres.current;
    beginAdres.current = null;
    // Even wachten: de router stuurt na het laden zelf eerst naar de start
    if (aangemeld) setTimeout(() => router.replace(adres as Href), 50);
  }, [laden, aangemeld, router]);
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
    <>
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: false,
        headerTintColor: kleuren.tekst,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: kleuren.achtergrond },
        headerLeft: Platform.OS === 'web' && !navigation.canGoBack() ? () => <NaarStart /> : undefined,
      })}
    >
      {/* Altijd bereikbaar: de privacyverklaring moet ook zonder account te lezen zijn (woober.nl/privacy) */}
      <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy' }} />
      <Stack.Screen name="voorwaarden" options={{ headerShown: true, title: 'Voorwaarden' }} />

      <Stack.Protected guard={!aangemeld} redirectTo={startpunt}>
        <Stack.Screen name="welkom" />
        <Stack.Screen name="aanmelden" options={{ headerShown: true, title: 'Inloggen' }} />
      </Stack.Protected>

      <Stack.Protected guard={aangemeld && rol === 'eigenaar' && honden.length === 0} redirectTo={startpunt}>
        <Stack.Screen name="hond-aanmaken" options={{ headerShown: true, title: 'Profiel van je hond' }} />
      </Stack.Protected>

      <Stack.Protected guard={aangemeld && rol === 'uitlater' && mijnProfiel === null} redirectTo={startpunt}>
        <Stack.Screen name="uitlater-aanmaken" options={{ headerShown: true, title: 'Jouw profiel' }} />
      </Stack.Protected>

      <Stack.Protected guard={eigenaarKlaar} redirectTo={startpunt}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="betaald" options={{ headerShown: true, title: 'Betalen' }} />
      </Stack.Protected>

      {/* Boeken en alles wat erbij hoort is nog nagespeeld; echte accounts kunnen hier nog niet komen (stap 3 in PLAN.md) */}
      <Stack.Protected guard={eigenaarKlaar && modus === 'demo'} redirectTo={startpunt}>
        <Stack.Screen name="boeken" options={{ headerShown: true, title: 'Kies een uitlater' }} />
        <Stack.Screen name="bevestigen" options={{ headerShown: true, title: 'Boeking bevestigen' }} />
        <Stack.Screen name="kennismaking" options={{ headerShown: true, title: 'Kennismaken' }} />
        <Stack.Screen name="uitlater/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="wandeling/[id]" />
        <Stack.Screen name="rapport/[id]" options={{ headerShown: true, title: 'Rapport' }} />
      </Stack.Protected>

      <Stack.Protected guard={uitlaterKlaar} redirectTo={startpunt}>
        <Stack.Screen name="werk" />
        <Stack.Screen name="verificatie" options={{ headerShown: true, title: 'Verificatie' }} />
        <Stack.Screen name="saldo" options={{ headerShown: true, title: 'Saldo' }} />
      </Stack.Protected>

      <Stack.Protected guard={uitlaterKlaar && modus === 'demo'} redirectTo={startpunt}>
        <Stack.Screen name="opdracht/[id]" />
      </Stack.Protected>

      <Stack.Protected guard={(eigenaarKlaar || uitlaterKlaar) && modus === 'demo'} redirectTo={startpunt}>
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: '' }} />
      </Stack.Protected>

      <Stack.Protected guard={eigenaarKlaar || uitlaterKlaar} redirectTo={startpunt}>
        <Stack.Screen name="hond/[id]" options={{ headerShown: true, title: 'Hond' }} />
        <Stack.Screen name="profiel-uitlater" options={{ headerShown: true, title: 'Jouw profiel' }} />
        <Stack.Screen name="veiligheid" options={{ headerShown: true, title: 'Veiligheid en hulp' }} />
        <Stack.Screen name="plek/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="plek-toevoegen" options={{ headerShown: true, title: 'Plek toevoegen' }} />
      </Stack.Protected>

      {/* Alleen voor het team (tabel beheerders); demo-gebruikers en gewone accounts zien dit nooit */}
      <Stack.Protected guard={(eigenaarKlaar || uitlaterKlaar) && beheerder} redirectTo={startpunt}>
        <Stack.Screen name="beheer" options={{ headerShown: true, title: 'Beheer' }} />
        <Stack.Screen name="beheer-teksten" options={{ headerShown: true, title: 'Teksten' }} />
        <Stack.Screen name="beheer-voorbeeld" options={{ headerShown: true, title: 'Voorbeeld' }} />
        <Stack.Screen name="beheer-plekken" options={{ headerShown: true, title: 'Plekken en meldingen' }} />
        <Stack.Screen name="beheer-plek" options={{ headerShown: true, title: 'Plek' }} />
        <Stack.Screen name="beheer-uitlaters" options={{ headerShown: true, title: 'Uitlaters verifiëren' }} />
        <Stack.Screen name="beheer-wachtlijst" options={{ headerShown: true, title: 'Wachtlijst' }} />
        <Stack.Screen name="beheer-terugboekingen" options={{ headerShown: true, title: 'Terugboekingen' }} />
        <Stack.Screen name="verdienmodel" options={{ headerShown: true, title: 'Verdienmodel' }} />
      </Stack.Protected>
    </Stack>
    {/* Bij het starten even wachten tot bekend is of er al iemand is ingelogd */}
    {laden ? (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: kleuren.achtergrond, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={kleuren.primair} />
      </View>
    ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TekstenProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Navigatie />
          <MeldingBanner />
          <BewerkBalk />
        </AppProvider>
      </TekstenProvider>
    </SafeAreaProvider>
  );
}
