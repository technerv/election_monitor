import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stationUpdatesAPI, incidentsAPI, verificationsAPI } from '../services/api';

const VerificationPanel = () => {
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [pendingIncidents, setPendingIncidents] = useState([]);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('updates');
  const [verifying, setVerifying] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [updatesRes, incidentsRes, verificationsRes] = await Promise.all([
        stationUpdatesAPI.getAll({ verification_status: 'pending' }),
        incidentsAPI.getAll({ verification_status: 'pending' }),
        verificationsAPI.getAll(),
      ]);

      setPendingUpdates(updatesRes.data?.results || updatesRes.data || []);
      setPendingIncidents(incidentsRes.data?.results || incidentsRes.data || []);
      setRecentVerifications(verificationsRes.data?.results || verificationsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. You may not have permission to access this page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerify = async (type, id, status) => {
    setVerifying(`${type}-${id}`);
    try {
      const notes = prompt('Enter verification notes (optional):') || '';
      
      if (type === 'update') {
        await stationUpdatesAPI.verify(id, { status, notes });
      } else {
        await incidentsAPI.verify(id, { status, notes });
      }
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error verifying:', error);
      alert('Failed to verify. Please try again.');
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            to="/live-dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Verification Panel</h1>
          <p className="text-gray-600">Review and verify citizen reports</p>
        </div>
        <Link
          to="/live-dashboard"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-700 text-sm">Pending Updates</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingUpdates.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-700 text-sm">Pending Incidents</p>
          <p className="text-3xl font-bold text-red-600">{pendingIncidents.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-green-700 text-sm">Total Verifications</p>
          <p className="text-3xl font-bold text-green-600">{recentVerifications.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm">Total Pending</p>
          <p className="text-3xl font-bold text-blue-600">{pendingUpdates.length + pendingIncidents.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-6 py-4 font-medium ${
              activeTab === 'updates'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Station Updates ({pendingUpdates.length})
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-6 py-4 font-medium ${
              activeTab === 'incidents'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Incidents ({pendingIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-4 font-medium ${
              activeTab === 'history'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent Verifications
          </button>
        </div>

        <div className="p-6">
          {/* Updates Tab */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              {pendingUpdates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending updates to verify</p>
              ) : (
                pendingUpdates.map((update) => (
                  <div key={update.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{update.polling_station_name}</h3>
                        <p className="text-gray-600">{update.election_name}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                        {update.update_type?.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {update.opening_time && (
                        <div>
                          <span className="text-gray-500">Opening:</span>
                          <span className="ml-2 font-medium">{update.opening_time}</span>
                        </div>
                      )}
                      {update.estimated_turnout && (
                        <div>
                          <span className="text-gray-500">Turnout:</span>
                          <span className="ml-2 font-medium">{update.estimated_turnout}</span>
                        </div>
                      )}
                      {update.queue_wait_time && (
                        <div>
                          <span className="text-gray-500">Wait Time:</span>
                          <span className="ml-2 font-medium">{update.queue_wait_time} mins</span>
                        </div>
                      )}
                      {update.queue_length && (
                        <div>
                          <span className="text-gray-500">Queue:</span>
                          <span className="ml-2 font-medium">{update.queue_length} people</span>
                        </div>
                      )}
                    </div>

                    {update.status_notes && (
                      <p className="mt-3 text-gray-700 bg-gray-50 p-3 rounded">
                        {update.status_notes}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <span>Submitted: {new Date(update.created_at).toLocaleString()}</span>
                        {!update.is_anonymous && update.submitted_by_username && (
                          <span className="ml-4">By: {update.submitted_by_username}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify('update', update.id, 'verified')}
                          disabled={verifying === `update-${update.id}`}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                        >
                          ✓ Verify
                        </button>
                        <button
                          onClick={() => handleVerify('update', update.id, 'disputed')}
                          disabled={verifying === `update-${update.id}`}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                        >
                          ✗ Dispute
                        </button>
                        <button
                          onClick={() => handleVerify('update', update.id, 'unverified')}
                          disabled={verifying === `update-${update.id}`}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
                        >
                          ? Unable to Verify
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              {pendingIncidents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending incidents to verify</p>
              ) : (
                pendingIncidents.map((incident) => (
                  <div key={incident.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-red-700">
                          {incident.incident_type?.replace('_', ' ').toUpperCase()}
                        </h3>
                        <p className="text-gray-600">{incident.election_name}</p>
                        {incident.polling_station_name && (
                          <p className="text-gray-600">📍 {incident.polling_station_name}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        incident.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : incident.severity === 'high'
                          ? 'bg-orange-500 text-white'
                          : incident.severity === 'medium'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-green-500 text-white'
                      }`}>
                        {incident.severity}
                      </span>
                    </div>

                    <p className="mt-4 text-gray-700">{incident.description}</p>

                    {incident.location_description && (
                      <p className="mt-2 text-sm text-gray-600">
                        📌 {incident.location_description}
                      </p>
                    )}

                    {(incident.photo_url || incident.video_url) && (
                      <div className="mt-3 flex gap-4">
                        {incident.photo_url && (
                          <a
                            href={incident.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            📷 View Photo
                          </a>
                        )}
                        {incident.video_url && (
                          <a
                            href={incident.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            🎥 View Video
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <span>Reported: {new Date(incident.created_at).toLocaleString()}</span>
                        {incident.is_anonymous && <span className="ml-2">(Anonymous)</span>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify('incident', incident.id, 'verified')}
                          disabled={verifying === `incident-${incident.id}`}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                        >
                          ✓ Verify
                        </button>
                        <button
                          onClick={() => handleVerify('incident', incident.id, 'disputed')}
                          disabled={verifying === `incident-${incident.id}`}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                        >
                          ✗ Dispute
                        </button>
                        <button
                          onClick={() => handleVerify('incident', incident.id, 'resolved')}
                          disabled={verifying === `incident-${incident.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          ✓ Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {recentVerifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent verifications</p>
              ) : (
                recentVerifications.slice(0, 20).map((verification) => (
                  <div key={verification.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{verification.verification_type}</span>
                        <span className="ml-2 text-gray-500">by {verification.verified_by_username}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        verification.status === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : verification.status === 'disputed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {verification.status}
                      </span>
                    </div>
                    {verification.notes && (
                      <p className="mt-2 text-sm text-gray-600">{verification.notes}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(verification.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPanel;
