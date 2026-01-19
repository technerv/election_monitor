import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionsAPI, candidatesAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ElectionDetail = () => {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [electionRes, statsRes, timelineRes] = await Promise.all([
          electionsAPI.getById(id),
          electionsAPI.getStatistics(id),
          electionsAPI.getTimeline(id),
        ]);

        setElection(electionRes.data);
        setStatistics(statsRes.data);
        setTimeline(timelineRes.data);

        // Fetch candidates for this election
        const candidatesRes = await candidatesAPI.getAll({ election: id });
        setCandidates(candidatesRes.data.results || candidatesRes.data);
      } catch (error) {
        console.error('Error fetching election details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Election not found</p>
        <Link to="/elections" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Elections
        </Link>
      </div>
    );
  }

  const candidateVotesData = candidates
    .filter(c => c.total_votes > 0)
    .map(c => ({
      name: c.name,
      votes: c.total_votes,
      party: c.party,
    }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <Link to="/elections" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Elections
      </Link>

      {/* Election Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-8 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">{election.name}</h1>
            <p className="text-xl mb-4">
              {new Date(election.date).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {election.type.replace('_', ' ').toUpperCase()}
              </span>
              {election.is_active && (
                <span className="px-3 py-1 bg-green-500 rounded-full text-sm">Active</span>
              )}
            </div>
          </div>
        </div>
        {election.description && (
          <p className="mt-4 text-blue-100">{election.description}</p>
        )}
      </div>

      {/* Timeline Info */}
      {timeline && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Election Date</p>
              <p className="text-lg font-semibold">
                {new Date(timeline.election_date).toLocaleDateString('en-KE')}
              </p>
            </div>
            {timeline.days_until !== undefined && (
              <div>
                <p className="text-gray-500 text-sm">Days Until</p>
                <p className="text-lg font-semibold text-blue-600">
                  {timeline.days_until} {timeline.days_until === 1 ? 'day' : 'days'}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-sm">Status</p>
              <p className="text-lg font-semibold">
                {timeline.is_upcoming ? 'Upcoming' : timeline.is_past ? 'Past' : 'Today'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <p className="text-gray-500 text-sm mb-1">Candidates</p>
            <p className="text-2xl font-bold">{statistics.total_candidates}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <p className="text-gray-500 text-sm mb-1">Positions</p>
            <p className="text-2xl font-bold">{statistics.total_positions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <p className="text-gray-500 text-sm mb-1">Constituencies</p>
            <p className="text-2xl font-bold">{statistics.total_constituencies}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <p className="text-gray-500 text-sm mb-1">Total Votes</p>
            <p className="text-2xl font-bold">
              {statistics.total_votes?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
      )}

      {/* Results Chart */}
      {candidateVotesData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Top Candidates by Votes</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={candidateVotesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="votes" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Candidates List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Candidates</h2>
        {candidates.length === 0 ? (
          <p className="text-gray-500">No candidates registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate) => (
              <Link
                key={candidate.id}
                to={`/candidates?candidate=${candidate.id}`}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg">{candidate.name}</h3>
                  {candidate.is_independent && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      Independent
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-2">{candidate.party}</p>
                <p className="text-sm text-gray-500 mb-2">
                  {candidate.position_name} - {candidate.constituency_name || 'N/A'}
                </p>
                {candidate.total_votes > 0 && (
                  <p className="text-blue-600 font-semibold">
                    {candidate.total_votes.toLocaleString()} votes
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Source Information */}
      {election.source_url && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Source:</strong>{' '}
            <a
              href={election.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Official Publication
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default ElectionDetail;
