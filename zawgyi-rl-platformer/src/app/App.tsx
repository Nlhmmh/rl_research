import { useRef, useState } from 'react';
import { HumanPlay } from '../features/human-play/HumanPlay';
import { MainMenu } from '../features/main-menu/MainMenu';
import { TrainAI } from '../features/train-ai/TrainAI';
import { WatchAI } from '../features/watch-ai/WatchAI';
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher';
import { Modes, type Mode } from './navigation';
import './styles/App.css';

function App() {
  const [mode, setMode] = useState<Mode>(Modes.Menu);
  const musicRef = useRef<HTMLAudioElement>(null);

  function navigate(nextMode: Mode) {
    setMode(nextMode);
    const music = musicRef.current;
    if (!music) return;

    if (nextMode === Modes.Human || nextMode === Modes.Watch) {
      // Start from the navigation gesture so browser autoplay rules allow sound.
      void music.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Could not play the background music', error);
      });
    } else {
      music.pause();
      music.currentTime = 0;
    }
  }

  return (
    <div>
      <audio
        ref={musicRef}
        src={`${import.meta.env.BASE_URL}assets/audio/zawgyi_himavanta_background_loop.mp3`}
        loop
        preload="none"
      />
      <LanguageSwitcher />
      {mode === Modes.Menu && <MainMenu onNavigate={navigate} />}
      {mode === Modes.Human && <HumanPlay onBack={() => navigate(Modes.Menu)} />}
      {mode === Modes.Watch && <WatchAI onBack={() => navigate(Modes.Menu)} />}
      {mode === Modes.Train && (
        <TrainAI onBack={() => navigate(Modes.Menu)} onWatch={() => navigate(Modes.Watch)} />
      )}
    </div>
  );
}

export default App;
