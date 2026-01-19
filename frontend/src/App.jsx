import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Elections from './pages/Elections';
import ElectionDetail from './pages/ElectionDetail';
import Candidates from './pages/Candidates';
import Results from './pages/Results';
import VoterEducation from './pages/VoterEducation';
import Profile from './pages/Profile';

// Lazy load heavy components to reduce initial bundle size
const MapView = lazy(() => import('./pages/MapView'));
const LiveDashboard = lazy(() => import('./pages/LiveDashboard'));
const ReportUpdate = lazy(() => import('./pages/ReportUpdate'));
const ReportIncident = lazy(() => import('./pages/ReportIncident'));
const VerificationPanel = lazy(() => import('./pages/VerificationPanel'));

const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/elections" element={<Elections />} />
            <Route path="/elections/:id" element={<ElectionDetail />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/results" element={<Results />} />
            <Route path="/voter-education" element={<VoterEducation />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/map"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MapView />
                </Suspense>
              }
            />
            <Route
              path="/live-dashboard"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <LiveDashboard />
                </Suspense>
              }
            />
            <Route
              path="/report-update"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ReportUpdate />
                </Suspense>
              }
            />
            <Route
              path="/report-incident"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ReportIncident />
                </Suspense>
              }
            />
            <Route
              path="/verification"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <VerificationPanel />
                </Suspense>
              }
            />
          </Routes>
        </main>
        <footer className="bg-gray-800 text-white py-8 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-400">
              Election Monitor - Citizen-First Live Election App
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Real-time transparency powered by citizens
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
