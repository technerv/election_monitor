import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { candidatesAPI, electionsAPI, positionsAPI } from '../services/api';

const Candidates = () => {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    election: searchParams.get('election') || '',
    position: searchParams.get('position') || '',
    party: '',
    constituency: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candidatesRes, electionsRes, positionsRes] = await Promise.all([
          candidatesAPI.getAll(filters),
          electionsAPI.getAll(),
          positionsAPI.getAll(),
        ]);

        setCandidates(candidatesRes.data.results || candidatesRes.data);
        setElections(electionsRes.data.results || electionsRes.data);
        setPositions(positionsRes.data.results || positionsRes.data);
      } catch (error) {
        console.error('Error fetching candidates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const uniqueParties = [...new Set(candidates.map(c => c.party))].sort();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Candidates</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Election</label>
            <select
              value={filters.election}
              onChange={(e) => handleFilterChange('election', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Elections</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={filters.position}
              onChange={(e) => handleFilterChange('position', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Positions</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name} ({position.level})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party</label>
            <select
              value={filters.party}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Parties</option>
              {uniqueParties.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search candidates..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              onChange={(e) => {
                // This would require backend search support
                // For now, just a placeholder
              }}
            />
          </div>
        </div>
      </div>

      {/* Candidates Grid */}
      {candidates.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No candidates found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              {candidate.photo_url && (
                <img
                  src={candidate.photo_url}
                  alt={candidate.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <h2 className="text-xl font-bold text-center mb-2">{candidate.name}</h2>
              <div className="text-center mb-4">
                <p className="text-gray-600 font-medium">{candidate.party}</p>
                {candidate.is_independent && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs mt-1 inline-block">
                    Independent
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Position:</strong> {candidate.position_name}
                </p>
                {candidate.constituency_name && (
                  <p>
                    <strong>Constituency:</strong> {candidate.constituency_name}
                  </p>
                )}
                <p>
                  <strong>Election:</strong>{' '}
                  <Link
                    to={`/elections/${candidate.election}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {candidate.election_name}
                  </Link>
                </p>
                {candidate.total_votes > 0 && (
                  <p className="text-blue-600 font-semibold mt-2">
                    {candidate.total_votes.toLocaleString()} votes
                  </p>
                )}
              </div>
              {candidate.biography && (
                <p className="text-gray-500 text-sm mt-4 line-clamp-3">{candidate.biography}</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between">
                <Link
                  to={`/candidates?candidate=${candidate.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Details →
                </Link>
                {candidate.manifesto_url && (
                  <a
                    href={candidate.manifesto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Manifesto
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Candidates;
