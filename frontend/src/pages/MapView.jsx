import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { constituenciesAPI, electionsAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapView = () => {
  const [constituencies, setConstituencies] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState(null);

  // Kenya center coordinates
  const kenyaCenter = [-0.0236, 37.9062];
  const kenyaZoom = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [constituenciesRes, electionsRes] = await Promise.all([
          constituenciesAPI.getAll(),
          electionsAPI.getAll(),
        ]);

        const constituenciesData = constituenciesRes.data.results || constituenciesRes.data;
        // Filter constituencies with coordinates
        setConstituencies(
          constituenciesData.filter((c) => c.latitude && c.longitude)
        );
        setElections(electionsRes.data.results || electionsRes.data);
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleConstituencyClick = async (constituencyId) => {
    try {
      const response = await constituenciesAPI.getResults(constituencyId);
      setSelectedConstituency({
        id: constituencyId,
        data: response.data,
      });
    } catch (error) {
      console.error('Error fetching constituency results:', error);
    }
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
        <h1 className="text-3xl font-bold">Election Map</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Election</label>
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
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

      {/* Map Container */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '600px' }}>
        <MapContainer
          center={kenyaCenter}
          zoom={kenyaZoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {constituencies.map((constituency) => {
            // Only show if it matches selected election filter (if any)
            // For now, show all constituencies
            return (
              <Marker
                key={constituency.id}
                position={[parseFloat(constituency.latitude), parseFloat(constituency.longitude)]}
                eventHandlers={{
                  click: () => handleConstituencyClick(constituency.id),
                }}
              >
                <Popup>
                  <div>
                    <h3 className="font-bold text-lg">{constituency.name}</h3>
                    <p className="text-sm text-gray-600">{constituency.county}</p>
                    {constituency.code && (
                      <p className="text-xs text-gray-500">Code: {constituency.code}</p>
                    )}
                    <button
                      onClick={() => handleConstituencyClick(constituency.id)}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Results →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Constituency Results Panel */}
      {selectedConstituency && selectedConstituency.data && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {selectedConstituency.data.constituency?.name || 'Constituency'} Results
            </h2>
            <button
              onClick={() => setSelectedConstituency(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {selectedConstituency.data.candidates && selectedConstituency.data.candidates.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total Votes</p>
                  <p className="text-2xl font-bold">
                    {selectedConstituency.data.total_votes?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Turnout</p>
                  <p className="text-2xl font-bold">
                    {selectedConstituency.data.turnout_percentage
                      ? `${selectedConstituency.data.turnout_percentage}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Candidate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Party
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Votes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedConstituency.data.candidates
                      .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
                      .map((candidate, index) => {
                        const percentage =
                          selectedConstituency.data.total_votes > 0
                            ? ((candidate.total_votes || 0) /
                                selectedConstituency.data.total_votes) *
                              100
                            : 0;
                        return (
                          <tr key={candidate.id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              {candidate.name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {candidate.party}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                              {(candidate.total_votes || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {percentage.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No results available for this constituency.</p>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Map Legend</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>📍 Markers indicate constituencies with available location data</li>
          <li>Click on a marker to view constituency details and results</li>
          <li>Use the election filter to focus on specific elections</li>
        </ul>
      </div>
    </div>
  );
};

export default MapView;
