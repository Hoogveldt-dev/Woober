import { useRouter } from 'expo-router';
import { UitlaterFormulier } from '../components/UitlaterFormulier';
import { useApp } from '../state/AppContext';

export default function ProfielUitlater() {
  const router = useRouter();
  const { mijnProfiel, bewaarProfiel } = useApp();
  if (!mijnProfiel) return null;
  return (
    <UitlaterFormulier
      begin={mijnProfiel}
      knopTitel="Opslaan"
      onBewaar={(p) => {
        bewaarProfiel(p);
        router.back();
      }}
    />
  );
}
