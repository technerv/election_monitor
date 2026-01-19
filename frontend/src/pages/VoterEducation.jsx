import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { voterEducationAPI, electionsAPI } from '../services/api';

const VoterEducation = () => {
  const [content, setContent] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    election: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contentRes, electionsRes] = await Promise.all([
          voterEducationAPI.getAll(filters),
          electionsAPI.getAll(),
        ]);

        setContent(contentRes.data.results || contentRes.data);
        setElections(electionsRes.data.results || electionsRes.data);
      } catch (error) {
        console.error('Error fetching voter education:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const categoryLabels = {
    voting_process: 'Voting Process',
    candidates: 'Candidates',
    positions: 'Positions',
    timeline: 'Timeline',
    general: 'General Information',
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Voter Education</h1>
        <p className="text-gray-600">
          Learn about the voting process, candidates, positions, and important election information.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
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
        </div>
      </div>

      {/* Content List */}
      {content.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No voter education content found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {content.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                  <div className="flex gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {categoryLabels[item.category] || item.category}
                    </span>
                    {item.election_name && (
                      <Link
                        to={`/elections/${item.election}`}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                      >
                        {item.election_name}
                      </Link>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString('en-KE')}
                </span>
              </div>
              <div
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-3">Important Voting Information</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Bring a valid ID when going to vote</li>
          <li>Verify your polling station location before election day</li>
          <li>Review candidate information and positions before voting</li>
          <li>Follow official electoral body guidelines and timelines</li>
          <li>Report any irregularities to election officials</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600">
          For official information, always refer to the electoral body's official publications
          and verified sources.
        </p>
      </div>
    </div>
  );
};

export default VoterEducation;
