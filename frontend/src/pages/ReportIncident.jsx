import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { incidentsAPI, electionsAPI, pollingStationsAPI } from '../services/api';
import MediaUpload from '../components/MediaUpload';
import LiveStreamRecorder from '../components/LiveStreamRecorder';

const ReportIncident = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [elections, setElections] = useState([]);
  const [pollingStations, setPollingStations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState(null);

  const [formData, setFormData] = useState({
    election: '',
    polling_station: '',
    incident_type: '',
    severity: 'medium',
    description: '',
    location_description: '',
    photo_url: '',
    video_url: '',
    is_anonymous: true,
  });
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [activeMediaTab, setActiveMediaTab] = useState('upload');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [electionsRes, stationsRes] = await Promise.all([
          electionsAPI.getAll(),
          pollingStationsAPI.getAll(),
        ]);
        setElections(electionsRes.data?.results || electionsRes.data || []);
        setPollingStations(stationsRes.data?.results || stationsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location not available:', error);
        }
      );
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      // Remove empty fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null) {
          delete submitData[key];
        }
      });

      await incidentsAPI.create(submitData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/live-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error submitting incident:', error);
      setError(error.response?.data?.detail || 'Failed to submit incident. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Incident Reported!</h2>
          <p className="text-green-600 mb-4">
            Your incident report has been submitted successfully.
            It will be reviewed by our verification team.
          </p>
          <Link
            to="/live-dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Live Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/live-dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🚨</span>
          <h1 className="text-2xl font-bold text-red-700">Report Incident</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Report any incidents, irregularities, or issues you've witnessed. 
          Your report helps ensure election integrity and safety.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {location && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
            📍 Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Election */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Election *
            </label>
            <select
              name="election"
              value={formData.election}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Election</option>
              {elections.filter(e => e.is_active).map((election) => (
                <option key={election.id} value={election.id}>
                  {election.name}
                </option>
              ))}
            </select>
          </div>

          {/* Polling Station (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Polling Station (if applicable)
            </label>
            <select
              name="polling_station"
              value={formData.polling_station}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Polling Station (optional)</option>
              {pollingStations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </select>
          </div>

          {/* Incident Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incident Type *
            </label>
            <select
              name="incident_type"
              value={formData.incident_type}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Incident Type</option>
              <option value="violence">Violence or Intimidation</option>
              <option value="irregularity">Electoral Irregularity</option>
              <option value="disruption">Disruption or Interference</option>
              <option value="technical">Technical Issue (Power/Communication)</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity Level *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['low', 'medium', 'high', 'critical'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                    formData.severity === level
                      ? level === 'critical'
                        ? 'bg-red-600 text-white'
                        : level === 'high'
                        ? 'bg-orange-500 text-white'
                        : level === 'medium'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Describe the incident in detail. Include what happened, when, and who was involved..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Location Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Description
            </label>
            <input
              type="text"
              name="location_description"
              value={formData.location_description}
              onChange={handleChange}
              placeholder="e.g., Near the main entrance, inside the voting room..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Media Evidence Section */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <label className="block text-sm font-medium text-red-700 mb-3">
              📹 Evidence (Photos, Videos, Audio)
            </label>
            <p className="text-xs text-red-600 mb-3">
              Visual evidence helps verify incident reports. You can upload files, stream live, or provide URLs.
            </p>
            
            {/* Media Tabs */}
            <div className="flex border-b border-red-200 mb-4">
              <button
                type="button"
                onClick={() => setActiveMediaTab('upload')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeMediaTab === 'upload'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📤 Upload Files
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('live')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeMediaTab === 'live'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔴 Live Stream
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('url')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeMediaTab === 'url'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔗 External URL
              </button>
            </div>

            {/* Upload Files Tab */}
            {activeMediaTab === 'upload' && (
              <div className="bg-white rounded-lg p-4">
                <MediaUpload
                  onUploadComplete={(media) => setUploadedMedia(prev => [...prev, media])}
                  allowedTypes={['photo', 'video', 'audio']}
                  maxFileSize={100 * 1024 * 1024}
                />
              </div>
            )}

            {/* Live Stream Tab */}
            {activeMediaTab === 'live' && (
              <div className="bg-white rounded-lg p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <p className="text-sm text-yellow-700">
                    ⚠️ Live streaming may reveal your location. Only stream if safe to do so.
                  </p>
                </div>
                <LiveStreamRecorder
                  election={formData.election}
                  pollingStation={formData.polling_station}
                  onStreamCreated={(stream) => {
                    setUploadedMedia(prev => [...prev, {
                      id: stream.id,
                      media_type: 'live_video',
                      stream_url: stream.hls_url,
                      title: stream.title,
                    }]);
                  }}
                />
              </div>
            )}

            {/* URL Tab */}
            {activeMediaTab === 'url' && (
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Photo URL</label>
                  <input
                    type="url"
                    name="photo_url"
                    value={formData.photo_url}
                    onChange={handleChange}
                    placeholder="https://imgur.com/..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Video URL</label>
                  <input
                    type="url"
                    name="video_url"
                    value={formData.video_url}
                    onChange={handleChange}
                    placeholder="https://youtube.com/..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Upload to Imgur, YouTube, or any hosting service and paste the link
                </p>
              </div>
            )}

            {/* Uploaded Media List */}
            {uploadedMedia.length > 0 && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="text-sm font-medium text-red-700 mb-2">
                  Attached Evidence ({uploadedMedia.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadedMedia.map((media, idx) => (
                    <div
                      key={media.id || idx}
                      className="bg-white px-3 py-1 rounded-full text-sm flex items-center gap-2 border"
                    >
                      <span>
                        {media.media_type === 'photo' && '📷'}
                        {media.media_type === 'video' && '🎥'}
                        {media.media_type === 'audio' && '🎤'}
                        {media.media_type === 'live_video' && '🔴'}
                      </span>
                      <span className="truncate max-w-[100px]">
                        {media.file_name || media.title || 'Evidence'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUploadedMedia(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Anonymous */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_anonymous"
                name="is_anonymous"
                checked={formData.is_anonymous}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="is_anonymous" className="ml-2 text-sm text-gray-700">
                Submit anonymously (recommended for safety)
              </label>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Your identity will be protected. Only verified moderators will see your contact info if not anonymous.
            </p>
          </div>

          {/* Safety Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-700 mb-2">⚠️ Safety First</h4>
            <p className="text-sm text-red-600">
              If you are in immediate danger, please contact emergency services first.
              Do not put yourself at risk to document incidents.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : 'Report Incident'}
            </button>
            <Link
              to="/live-dashboard"
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIncident;
