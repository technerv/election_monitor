import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { electionsAPI } from '../services/api';

const Elections = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, past
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const params = {};
        if (filter === 'active') params.is_active = 'true';
        if (typeFilter !== 'all') params.type = typeFilter;

        const response = await electionsAPI.getAll();
        let data = response.data.results || response.data;

        // Apply client-side filters
        const now = new Date();
        if (filter === 'upcoming') {
          data = data.filter(e => new Date(e.date) > now);
        } else if (filter === 'past') {
          data = data.filter(e => new Date(e.date) < now);
        }

        setElections(data);
      } catch (error) {
        console.error('Error fetching elections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, [filter, typeFilter]);

  const getStatusBadge = (election) => {
    const now = new Date();
    const electionDate = new Date(election.date);
    
    if (!election.is_active) {
      return <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">Archived</span>;
    }
    if (electionDate > now) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Upcoming</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Completed</span>;
  };

  const getTypeBadge = (type) => {
    const colors = {
      general: 'bg-purple-100 text-purple-700',
      by_election: 'bg-orange-100 text-orange-700',
      referendum: 'bg-pink-100 text-pink-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Elections</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Elections</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="by_election">By-Election</option>
              <option value="referendum">Referendum</option>
            </select>
          </div>
        </div>
      </div>

      {/* Elections List */}
      {elections.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No elections found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.map((election) => {
            const daysUntil = Math.ceil(
              (new Date(election.date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Link
                key={election.id}
                to={`/elections/${election.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  {getStatusBadge(election)}
                  {getTypeBadge(election.type)}
                </div>
                <h2 className="text-xl font-bold mb-2">{election.name}</h2>
                <p className="text-gray-600 mb-3">
                  <strong>Date:</strong>{' '}
                  {new Date(election.date).toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {new Date(election.date) > new Date() && (
                  <p className="text-blue-600 font-medium mb-3">
                    {daysUntil} {daysUntil === 1 ? 'day' : 'days'} until election
                  </p>
                )}
                {election.description && (
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {election.description}
                  </p>
                )}
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-600">
                    {election.candidate_count || 0} candidates
                  </span>
                  <span className="text-blue-600 font-medium">View Details →</span>
                </div>
                {election.source_url && (
                  <a
                    href={election.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-gray-400 hover:text-gray-600 mt-2 block"
                  >
                    Source: Official Publication
                  </a>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Elections;
