import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { stationUpdatesAPI, incidentsAPI, electionsAPI, pollingStationsAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker colors based on status
const getMarkerColor = (status) => {
  switch (status) {
    case 'verified': return '#22c55e'; // green
    case 'pending': return '#f59e0b'; // yellow
    case 'disputed': return '#ef4444'; // red
    default: return '#3b82f6'; // blue
  }
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};

const LiveDashboard = () => {
  const [updates, setUpdates] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [elections, setElections] = useState([]);
  const [pollingStations, setPollingStations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [incidentStats, setIncidentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedElection, setSelectedElection] = useState('');
  const [activeTab, setActiveTab] = useState('updates'); // updates, incidents

  // Kenya center coordinates
  const kenyaCenter = [-0.0236, 37.9062];

  // WebSocket for live updates
  const handleNewMessage = useCallback((data) => {
    if (data.type === 'station_update') {
      setUpdates((prev) => [data.update, ...prev.slice(0, 49)]);
    } else if (data.type === 'incident_report') {
      setIncidents((prev) => [data.incident, ...prev.slice(0, 49)]);
    }
  }, []);

  const { isConnected, lastMessage } = useWebSocket('live-updates/', {
    onMessage: handleNewMessage,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [updatesRes, incidentsRes, electionsRes, stationsRes, statsRes, incidentStatsRes] = await Promise.all([
          stationUpdatesAPI.getLive(),
          incidentsAPI.getCritical(),
          electionsAPI.getAll(),
          pollingStationsAPI.getAll(),
          stationUpdatesAPI.getStatistics(),
          incidentsAPI.getStatistics(),
        ]);

        setUpdates(updatesRes.data || []);
        setIncidents(incidentsRes.data || []);
        setElections(electionsRes.data?.results || electionsRes.data || []);
        setPollingStations(stationsRes.data?.results || stationsRes.data || []);
        setStatistics(statsRes.data);
        setIncidentStats(incidentStatsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedElection]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live Dashboard</h1>
          <p className="text-gray-600">Real-time election monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? 'Live' : 'Disconnected'}
          </div>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-500 text-sm">Total Updates</p>
          <p className="text-2xl font-bold text-blue-600">{statistics?.total_updates || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-500 text-sm">Verified</p>
          <p className="text-2xl font-bold text-green-600">{statistics?.verified_updates || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{statistics?.pending_verification || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-500 text-sm">Total Incidents</p>
          <p className="text-2xl font-bold text-red-600">{incidentStats?.total_incidents || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-500 text-sm">Critical</p>
          <p className="text-2xl font-bold text-red-700">{incidentStats?.critical_incidents || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-500 text-sm">Stations Active</p>
          <p className="text-2xl font-bold text-purple-600">{pollingStations.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link
          to="/report-update"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          📍 Report Station Update
        </Link>
        <Link
          to="/report-incident"
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          🚨 Report Incident
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '500px' }}>
          <MapContainer
            center={kenyaCenter}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Polling Station Markers */}
            {pollingStations.filter(s => s.latitude && s.longitude).map((station) => (
              <Marker
                key={station.id}
                position={[parseFloat(station.latitude), parseFloat(station.longitude)]}
              >
                <Popup>
                  <div>
                    <h3 className="font-bold">{station.name}</h3>
                    <p className="text-sm text-gray-600">{station.code}</p>
                    <p className="text-sm">Registered: {station.registered_voters}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Incident Markers */}
            {incidents.filter(i => i.latitude && i.longitude).map((incident) => (
              <CircleMarker
                key={`incident-${incident.id}`}
                center={[parseFloat(incident.latitude), parseFloat(incident.longitude)]}
                radius={10}
                fillColor={getSeverityColor(incident.severity)}
                color={getSeverityColor(incident.severity)}
                fillOpacity={0.7}
              >
                <Popup>
                  <div>
                    <h3 className="font-bold text-red-600">
                      {incident.incident_type?.replace('_', ' ').toUpperCase()}
                    </h3>
                    <p className="text-sm">Severity: {incident.severity}</p>
                    <p className="text-sm">Status: {incident.verification_status}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Live Feed */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex border-b mb-4">
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'updates'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              Updates ({updates.length})
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'incidents'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-500'
              }`}
            >
              Incidents ({incidents.length})
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activeTab === 'updates' && updates.map((update, index) => (
              <div
                key={update.id || index}
                className="p-3 bg-gray-50 rounded-lg border-l-4"
                style={{ borderLeftColor: getMarkerColor(update.verification_status) }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{update.polling_station || update.polling_station_name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    update.verification_status === 'verified'
                      ? 'bg-green-100 text-green-700'
                      : update.verification_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {update.verification_status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {update.update_type?.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(update.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}

            {activeTab === 'incidents' && incidents.map((incident, index) => (
              <div
                key={incident.id || index}
                className="p-3 bg-red-50 rounded-lg border-l-4"
                style={{ borderLeftColor: getSeverityColor(incident.severity) }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm text-red-700">
                    {incident.incident_type?.replace('_', ' ').toUpperCase()}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    incident.severity === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : incident.severity === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {incident.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {incident.verification_status}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(incident.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}

            {activeTab === 'updates' && updates.length === 0 && (
              <p className="text-gray-500 text-center py-8">No live updates yet</p>
            )}
            {activeTab === 'incidents' && incidents.length === 0 && (
              <p className="text-gray-500 text-center py-8">No incidents reported</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDashboard;
