import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Loading } from '../components/Feedback';
import { DatasetProvider } from '../features/map/DatasetContext';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { PrivacyPage } from '../pages/PrivacyPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Layout } from './Layout';

// Las pantallas con mapa o Supabase se cargan bajo demanda para aligerar la carga inicial.
const MapPage = lazy(() => import('../pages/MapPage'));
const RoutePage = lazy(() => import('../pages/RoutePage'));
const ReportPage = lazy(() => import('../pages/ReportPage'));
const TrackPage = lazy(() => import('../pages/TrackPage'));
const StatsPage = lazy(() => import('../pages/StatsPage'));
const AdminPage = lazy(() => import('../pages/AdminPage'));

export function App() {
  return (
    <BrowserRouter>
      <DatasetProvider>
        <Suspense fallback={<Loading label="Cargando pantalla…" />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="mapa" element={<MapPage />} />
              <Route path="trayecto" element={<RoutePage />} />
              <Route path="reportar" element={<ReportPage />} />
              <Route path="seguimiento" element={<TrackPage />} />
              <Route path="estadisticas" element={<StatsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="acerca" element={<AboutPage />} />
              <Route path="privacidad" element={<PrivacyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </DatasetProvider>
    </BrowserRouter>
  );
}
