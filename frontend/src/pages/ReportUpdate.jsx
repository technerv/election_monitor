import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { stationUpdatesAPI, electionsAPI, pollingStationsAPI } from '../services/api';
import MediaUpload from '../components/MediaUpload';
import LiveStreamRecorder from '../components/LiveStreamRecorder';

const ReportUpdate = () => {
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
    update_type: '',
    opening_time: '',
    closing_time: '',
    estimated_turnout: '',
    queue_wait_time: '',
    queue_length: '',
    status_notes: '',
    photo_url: '',
    is_anonymous: false,
  });
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState('upload'); // upload, live, url

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
        estimated_turnout: formData.estimated_turnout ? parseInt(formData.estimated_turnout) : null,
        queue_wait_time: formData.queue_wait_time ? parseInt(formData.queue_wait_time) : null,
        queue_length: formData.queue_length ? parseInt(formData.queue_length) : null,
      };

      // Remove empty fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null) {
          delete submitData[key];
        }
      });

      await stationUpdatesAPI.create(submitData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/live-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error submitting update:', error);
      setError(error.response?.data?.detail || 'Failed to submit update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Update Submitted!</h2>
          <p className="text-green-600 mb-4">
            Your polling station update has been submitted successfully.
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
        <h1 className="text-2xl font-bold mb-2">Report Polling Station Update</h1>
        <p className="text-gray-600 mb-6">
          Submit a real-time update from a polling station. Your report helps maintain election transparency.
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

          {/* Polling Station */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Polling Station *
            </label>
            <select
              name="polling_station"
              value={formData.polling_station}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Polling Station</option>
              {pollingStations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </select>
          </div>

          {/* Update Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Update Type *
            </label>
            <select
              name="update_type"
              value={formData.update_type}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Update Type</option>
              <option value="opening">Station Opening</option>
              <option value="closing">Station Closing</option>
              <option value="turnout">Voter Turnout</option>
              <option value="queue">Queue Status</option>
              <option value="general">General Update</option>
            </select>
          </div>

          {/* Conditional Fields based on update type */}
          {formData.update_type === 'opening' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opening Time
              </label>
              <input
                type="time"
                name="opening_time"
                value={formData.opening_time}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          )}

          {formData.update_type === 'closing' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Closing Time
              </label>
              <input
                type="time"
                name="closing_time"
                value={formData.closing_time}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          )}

          {formData.update_type === 'turnout' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Turnout (number of voters)
              </label>
              <input
                type="number"
                name="estimated_turnout"
                value={formData.estimated_turnout}
                onChange={handleChange}
                min="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          )}

          {formData.update_type === 'queue' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wait Time (minutes)
                </label>
                <input
                  type="number"
                  name="queue_wait_time"
                  value={formData.queue_wait_time}
                  onChange={handleChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Queue Length (people)
                </label>
                <input
                  type="number"
                  name="queue_length"
                  value={formData.queue_length}
                  onChange={handleChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          )}

          {/* Status Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="status_notes"
              value={formData.status_notes}
              onChange={handleChange}
              rows={4}
              placeholder="Describe what you observed..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Media Upload Section */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Media (Photos, Videos, Audio)
            </label>
            
            {/* Media Tabs */}
            <div className="flex border-b mb-4">
              <button
                type="button"
                onClick={() => setActiveMediaTab('upload')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeMediaTab === 'upload'
                    ? 'text-blue-600 border-b-2 border-blue-600'
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
                🔴 Go Live
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('url')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeMediaTab === 'url'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔗 URL
              </button>
            </div>

            {/* Upload Files Tab */}
            {activeMediaTab === 'upload' && (
              <MediaUpload
                onUploadComplete={(media) => setUploadedMedia(prev => [...prev, media])}
                allowedTypes={['photo', 'video', 'audio']}
                maxFileSize={100 * 1024 * 1024}
              />
            )}

            {/* Live Stream Tab */}
            {activeMediaTab === 'live' && (
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
            )}

            {/* URL Tab */}
            {activeMediaTab === 'url' && (
              <div className="space-y-3">
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
                <p className="text-xs text-gray-500">
                  Upload to Imgur, YouTube, or any hosting service and paste the link
                </p>
              </div>
            )}

            {/* Uploaded Media List */}
            {uploadedMedia.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Attached Media ({uploadedMedia.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadedMedia.map((media, idx) => (
                    <div
                      key={media.id || idx}
                      className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      <span>
                        {media.media_type === 'photo' && '📷'}
                        {media.media_type === 'video' && '🎥'}
                        {media.media_type === 'audio' && '🎤'}
                        {media.media_type === 'live_video' && '🔴'}
                      </span>
                      <span className="truncate max-w-[100px]">
                        {media.file_name || media.title || 'Media'}
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
              Submit anonymously (your identity will be hidden)
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : 'Submit Update'}
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

export default ReportUpdate;
