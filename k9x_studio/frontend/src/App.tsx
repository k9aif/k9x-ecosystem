import { useStore } from './store';
import { Studio } from './components/Studio';
import { SetupScreen } from './components/SetupScreen';

function App() {
  const screen = useStore((s) => s.screen);
  return screen === 'studio' ? <Studio /> : <SetupScreen />;
}

export default App;
