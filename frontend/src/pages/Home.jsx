import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { electionsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Home = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await electionsAPI.getAll();
        const data = response.data.results || response.data;
        setElections(data);
        
        // Calculate stats
        const activeElections = data.filter(e => e.is_active);
        const upcomingElections = data.filter(e => new Date(e.date) > new Date());
        const pastElections = data.filter(e => new Date(e.date) < new Date());
        
        const typeCounts = data.reduce((acc, election) => {
          acc[election.type] = (acc[election.type] || 0) + 1;
          return acc;
        }, {});

        setStats({
          total: data.length,
          active: activeElections.length,
          upcoming: upcomingElections.length,
          past: pastElections.length,
          typeCounts: Object.entries(typeCounts).map(([name, value]) => ({ name, value }))
        });
      } catch (error) {
        console.error('Error fetching elections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingElections = elections
    .filter(e => e.is_active && new Date(e.date) > new Date())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white rounded-lg p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-5xl">🗳️</span>
          <div>
            <h1 className="text-4xl font-bold">Election Monitor</h1>
            <p className="text-blue-200">Citizen-First Live Election App</p>
          </div>
        </div>
        <p className="text-xl mb-6">
          Real-time election monitoring powered by citizens. Report, verify, and track election updates across Kenya.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/live-dashboard"
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-400 transition-colors flex items-center gap-2"
          >
            <span className="animate-pulse">●</span> Live Dashboard
          </Link>
          <Link
            to="/report-update"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            📍 Report Update
          </Link>
          <Link
            to="/report-incident"
            className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-400 transition-colors"
          >
            🚨 Report Incident
          </Link>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
          <div className="text-3xl mb-3">📡</div>
          <h3 className="font-bold text-lg mb-2">Live Monitoring</h3>
          <p className="text-gray-600 text-sm">
            Real-time updates from polling stations across Kenya. See opening times, turnout, and queue lengths.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500">
          <div className="text-3xl mb-3">🚨</div>
          <h3 className="font-bold text-lg mb-2">Incident Reporting</h3>
          <p className="text-gray-600 text-sm">
            Report irregularities, violence, or disruptions. Anonymous reporting available for your safety.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
          <div className="text-3xl mb-3">✅</div>
          <h3 className="font-bold text-lg mb-2">Verified Data</h3>
          <p className="text-gray-600 text-sm">
            All reports go through verification by trusted observers and CSOs. See what's confirmed.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Total Elections</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Active Elections</h3>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Upcoming</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Past Elections</h3>
            <p className="text-3xl font-bold text-gray-600">{stats.past}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && stats.typeCounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Election Types</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.typeCounts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.typeCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Election Types (Bar)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.typeCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Upcoming Elections */}
      {upcomingElections.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Upcoming Elections</h2>
            <Link to="/elections" className="text-blue-600 hover:text-blue-800 font-medium">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingElections.map((election) => {
              const daysUntil = Math.ceil(
                (new Date(election.date) - new Date()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Link
                  key={election.id}
                  to={`/elections/${election.id}`}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-bold text-lg mb-2">{election.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {new Date(election.date).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-blue-600 font-medium">
                    {daysUntil} {daysUntil === 1 ? 'day' : 'days'} until election
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {election.candidate_count} {election.candidate_count === 1 ? 'candidate' : 'candidates'}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">About This Platform</h2>
        <p className="text-gray-700 mb-4">
          Kenya Elections Tracker is a civic-tech platform designed to provide transparent,
          verifiable election information. We focus on:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Public, factual election data from official sources</li>
          <li>Candidate information and positions</li>
          <li>Polling stations and constituency mapping</li>
          <li>Official results tracking</li>
          <li>Voter education resources</li>
        </ul>
        <p className="text-gray-600 text-sm mt-4">
          All data is sourced from official electoral body publications and verified sources.
          This platform is for information purposes only and does not endorse any candidate or party.
        </p>
      </div>
    </div>
  );
};

export default Home;
