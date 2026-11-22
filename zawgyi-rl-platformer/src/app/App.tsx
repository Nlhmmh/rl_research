import { useState } from 'react';
import { HumanPlay } from '../features/human-play/HumanPlay';
import { MainMenu } from '../features/main-menu/MainMenu';
import { TrainAI } from '../features/train-ai/TrainAI';
import { WatchAI } from '../features/watch-ai/WatchAI';
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher';
import { Modes, type Mode } from './navigation';
import './styles/App.css';

function App() {
  const [mode, setMode] = useState<Mode>(Modes.Menu);
  return (
    <div>
      <LanguageSwitcher />
      {mode === 'menu' && <MainMenu onNavigate={setMode} />}
      {mode === 'human' && <HumanPlay onBack={() => setMode(Modes.Menu)} />}
      {mode === 'watch' && <WatchAI onBack={() => setMode(Modes.Menu)} />}
      {mode === 'train' && (
        <TrainAI onBack={() => setMode(Modes.Menu)} onWatch={() => setMode(Modes.Watch)} />
      )}
    </div>
  );
}

export default App;
