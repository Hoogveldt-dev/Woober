import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { HondFormulier } from '../../components/HondFormulier';
import { Knop } from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { ruimte } from '../../theme';

export default function HondBewerken() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { honden, bewaarHond, verwijderHond } = useApp();
  const [bevestig, setBevestig] = useState(false);
  const hond = honden.find((h) => h.id === id) ?? null;
  const nieuw = id === 'nieuw';

  return (
    <>
      <Stack.Screen options={{ title: nieuw ? 'Hond toevoegen' : (hond?.naam ?? 'Hond') }} />
      <HondFormulier
        key={id}
        begin={hond}
        knopTitel={nieuw ? 'Hond toevoegen' : 'Opslaan'}
        onBewaar={(h) => {
          bewaarHond(h);
          router.back();
        }}
        extra={
          !nieuw && hond && honden.length > 1 ? (
            <View style={{ marginTop: ruimte(4) }}>
              <Knop
                titel={bevestig ? `Ja, ${hond.naam} verwijderen` : `${hond.naam} verwijderen`}
                variant="gevaar"
                icoon="trash"
                onPress={() => {
                  if (!bevestig) return setBevestig(true);
                  verwijderHond(hond.id);
                  router.back();
                }}
              />
            </View>
          ) : null
        }
      />
    </>
  );
}
