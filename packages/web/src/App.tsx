import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CrisisList from './pages/CrisisList';
import CrisisDetail from './pages/CrisisDetail';
import MapView from './pages/MapView';
import Alerts from './pages/Alerts';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="crises" element={<CrisisList />} />
        <Route path="crises/:id" element={<CrisisDetail />} />
        <Route path="map" element={<MapView />} />
        <Route path="alerts" element={<Alerts />} />
      </Route>
    </Routes>
  );
}

export default App;
