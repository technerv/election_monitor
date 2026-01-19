import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { resultsAPI, electionsAPI, candidatesAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82CA9D'];

const Results = () => {
  const [results, setResults] = useState([]);
  const [aggregateResults, setAggregateResults] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    election: '',
    position: '',
    constituency: '',
    verified: 'all',
  });
  const [viewMode, setViewMode] = useState('aggregate'); // aggregate or detailed

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [electionsRes] = await Promise.all([
          electionsAPI.getAll(),
        ]);

        setElections(electionsRes.data.results || electionsRes.data);

        // Fetch aggregate results
        const params = {};
        if (filters.election) params.election = filters.election;
        if (filters.position) params.position = filters.position;
        if (filters.constituency) params.constituency = filters.constituency;

        if (viewMode === 'aggregate') {
          const aggregateRes = await resultsAPI.getAggregate(params);
          setAggregateResults(aggregateRes.data);
        } else {
          const resultsRes = await resultsAPI.getAll({
            ...params,
            verified: filters.verified === 'all' ? undefined : filters.verified === 'true',
          });
          setResults(resultsRes.data.results || resultsRes.data);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, viewMode]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const chartData = aggregateResults
    .map((result) => ({
      name: result.candidate__name,
      votes: result.total_votes,
      party: result.candidate__party,
      position: result.candidate__position__name,
    }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 20);

  const totalVotes = chartData.reduce((sum, item) => sum + item.votes, 0);

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
        <h1 className="text-3xl font-bold">Election Results</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('aggregate')}
            className={`px-4 py-2 rounded ${
              viewMode === 'aggregate'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Aggregate View
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded ${
              viewMode === 'detailed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Detailed View
          </button>
        </div>
      </div>

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
          {viewMode === 'detailed' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verified</label>
                <select
                  value={filters.verified}
                  onChange={(e) => handleFilterChange('verified', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">All Results</option>
                  <option value="true">Verified Only</option>
                  <option value="false">Unverified Only</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aggregate View */}
      {viewMode === 'aggregate' && (
        <>
          {chartData.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <p className="text-gray-500">No results found matching your filters.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <p className="text-gray-500 text-sm mb-1">Total Candidates</p>
                  <p className="text-3xl font-bold">{chartData.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <p className="text-gray-500 text-sm mb-1">Total Votes</p>
                  <p className="text-3xl font-bold">{totalVotes.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <p className="text-gray-500 text-sm mb-1">Top Candidate</p>
                  <p className="text-xl font-bold">{chartData[0]?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">
                    {chartData[0]?.votes.toLocaleString() || 0} votes
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-4">Top Candidates by Votes</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="votes" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-4">Vote Distribution (Top 10)</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={chartData.slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name.substring(0, 15)}: ${(percent * 100).toFixed(1)}%`
                        }
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="votes"
                      >
                        {chartData.slice(0, 10).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Results Summary</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Party
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Votes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chartData.map((result, index) => {
                        const percentage = totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0;
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              #{index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {result.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.party}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.position}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                              {result.votes.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {percentage.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Detailed Results</h2>
          {results.length === 0 ? (
            <p className="text-gray-500">No detailed results found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Party
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Polling Station
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {result.candidate_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.candidate_party}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.polling_station_name || 'Aggregate'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {result.votes.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.verified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Unverified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;
