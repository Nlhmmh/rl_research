import { useState } from 'react';
import './styles/App.css';
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher';
import { Modes, type Mode } from './navigation';
import { HumanPlay } from '../features/human-play/HumanPlay';
import { MainMenu } from '../features/main-menu/MainMenu';
import { TrainAI } from '../features/train-ai/TrainAI';
import { WatchAI } from '../features/watch-ai/WatchAI';

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
