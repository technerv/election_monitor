import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const mainNavLinks = [
    { path: '/', label: 'Home' },
    { path: '/live-dashboard', label: '📡 Live', highlight: true },
    { path: '/elections', label: 'Elections' },
    { path: '/results', label: 'Results' },
    { path: '/map', label: 'Map' },
  ];

  const reportLinks = [
    { path: '/report-update', label: '📍 Report Update', color: 'blue' },
    { path: '/report-incident', label: '🚨 Report Incident', color: 'red' },
  ];

  const secondaryLinks = [
    { path: '/candidates', label: 'Candidates' },
    { path: '/voter-education', label: 'Voter Ed' },
    { path: '/verification', label: 'Verify' },
    { path: '/profile', label: '👤' },
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🗳️</span>
            <div>
              <span className="text-xl font-bold text-blue-700">Election Monitor</span>
              <span className="hidden md:inline text-xs text-gray-500 ml-2">Kenya</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Main Nav */}
            {mainNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-blue-100 text-blue-700'
                    : link.highlight
                    ? 'text-green-600 hover:bg-green-50 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            {/* Report Buttons */}
            {reportLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? link.color === 'red' 
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                    : link.color === 'red'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            {/* Secondary Nav */}
            {secondaryLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t">
            {/* Live Dashboard - Prominent */}
            <Link
              to="/live-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 mt-2 bg-green-50 text-green-700 font-semibold rounded-md"
            >
              📡 Live Dashboard
            </Link>

            {/* Report Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link
                to="/report-update"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-blue-50 text-blue-700 rounded-md text-center font-medium"
              >
                📍 Report Update
              </Link>
              <Link
                to="/report-incident"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-red-50 text-red-700 rounded-md text-center font-medium"
              >
                🚨 Report Incident
              </Link>
            </div>

            {/* Other Links */}
            <div className="mt-3 space-y-1">
              {[...mainNavLinks.filter(l => l.path !== '/live-dashboard'), ...secondaryLinks].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-md ${
                    isActive(link.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live indicator bar */}
      {location.pathname === '/live-dashboard' && (
        <div className="bg-green-500 text-white text-center py-1 text-xs font-medium">
          <span className="animate-pulse">●</span> LIVE - Real-time updates active
        </div>
      )}
    </nav>
  );
};

export default Navbar;
