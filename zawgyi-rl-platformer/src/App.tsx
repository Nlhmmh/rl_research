import { useState } from 'react';
import './App.css';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Modes, type Mode } from './navigation';
import { HumanPlay } from './screens/HumanPlay';
import { MainMenu } from './screens/MainMenu';
import { TrainAI } from './screens/TrainAI';
import { WatchAI } from './screens/WatchAI';

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
