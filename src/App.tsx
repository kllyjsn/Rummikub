import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SinglePlayer from './pages/SinglePlayer';
import Multiplayer from './pages/Multiplayer';
import HowToPlay from './pages/HowToPlay';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play/single" element={<SinglePlayer />} />
        <Route path="/play/multi" element={<Multiplayer />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
      </Routes>
    </BrowserRouter>
  );
}
