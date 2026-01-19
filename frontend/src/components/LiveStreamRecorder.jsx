import { useState, useRef, useEffect, useCallback } from 'react';
import { livestreamAPI } from '../services/api';

const LiveStreamRecorder = ({
  onStreamCreated,
  onStreamEnded,
  election = null,
  pollingStation = null,
}) => {
  const [status, setStatus] = useState('idle'); // idle, preparing, live, paused, ended
  const [stream, setStream] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stream_type: 'video',
    is_anonymous: false,
  });

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopStream();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const constraints = {
        video: formData.stream_type === 'video' ? {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
        audio: true,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current && formData.stream_type === 'video') {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStatus('preparing');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera/microphone. Please check permissions.');
    }
  };

  const createStream = async () => {
    if (!formData.title) {
      setError('Please enter a title for your stream');
      return;
    }

    try {
      // Get location
      let location = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (e) {
          // Location not available
        }
      }

      const response = await livestreamAPI.create({
        ...formData,
        election,
        polling_station: pollingStation,
        ...location,
      });

      setStreamData(response.data);
      
      if (onStreamCreated) {
        onStreamCreated(response.data);
      }

      // Start the stream
      await startLiveStream(response.data);
    } catch (err) {
      console.error('Error creating stream:', err);
      setError(err.response?.data?.detail || 'Failed to create stream');
    }
  };

  const startLiveStream = async (streamInfo) => {
    try {
      // Start the stream on the server
      await livestreamAPI.start(streamInfo.id);
      
      setStatus('live');
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start recording chunks (for potential upload/save)
      if (stream) {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus',
        });
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.start(1000); // Collect data every second
        mediaRecorderRef.current = mediaRecorder;
      }

      // Send heartbeat every 10 seconds
      const heartbeatInterval = setInterval(() => {
        if (status === 'live') {
          livestreamAPI.heartbeat(streamInfo.id, { viewer_count: viewerCount })
            .catch(console.error);
        }
      }, 10000);

      // Store interval for cleanup
      streamInfo.heartbeatInterval = heartbeatInterval;
    } catch (err) {
      console.error('Error starting stream:', err);
      setError('Failed to start stream');
    }
  };

  const stopStream = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (streamData) {
      try {
        await livestreamAPI.end(streamData.id);
        if (streamData.heartbeatInterval) {
          clearInterval(streamData.heartbeatInterval);
        }
      } catch (err) {
        console.error('Error ending stream:', err);
      }
    }

    setStatus('ended');
    
    if (onStreamEnded) {
      onStreamEnded(streamData, chunksRef.current);
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (status === 'live') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
    } else if (status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('live');
    }
  };

  const switchCamera = async () => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints = videoTrack.getConstraints();
    const currentFacing = constraints.facingMode || 'environment';
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: true,
      });

      // Replace video track
      stream.getVideoTracks().forEach(track => track.stop());
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setStream(newStream);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      {status === 'live' && (
        <div className="flex items-center gap-2 text-red-600 font-bold">
          <span className="animate-pulse">●</span> LIVE
          <span className="text-gray-600 font-normal ml-4">{formatDuration(duration)}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Video Preview */}
      {formData.stream_type === 'video' && (
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {status === 'live' && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              ● LIVE
            </div>
          )}

          {status === 'live' && (
            <button
              onClick={switchCamera}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              🔄
            </button>
          )}
        </div>
      )}

      {/* Audio Only Indicator */}
      {formData.stream_type === 'audio' && status !== 'idle' && (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🎤</div>
          <p className="text-white">
            {status === 'live' ? 'Audio streaming...' : 'Audio ready'}
          </p>
          {status === 'live' && (
            <div className="flex justify-center gap-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-green-500 rounded animate-pulse"
                  style={{
                    height: `${Math.random() * 30 + 10}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setup Form */}
      {status === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stream Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Live from Polling Station X"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you're streaming..."
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stream Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="video"
                  checked={formData.stream_type === 'video'}
                  onChange={(e) => setFormData({ ...formData, stream_type: e.target.value })}
                  className="mr-2"
                />
                🎥 Video
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="audio"
                  checked={formData.stream_type === 'audio'}
                  onChange={(e) => setFormData({ ...formData, stream_type: e.target.value })}
                  className="mr-2"
                />
                🎤 Audio Only
              </label>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.is_anonymous}
              onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-700">
              Stream anonymously
            </label>
          </div>

          <button
            onClick={startCamera}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            📹 Start Camera/Microphone
          </button>
        </div>
      )}

      {/* Preparing Controls */}
      {status === 'preparing' && (
        <div className="flex gap-4">
          <button
            onClick={createStream}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            🔴 Go Live
          </button>
          <button
            onClick={stopStream}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Live Controls */}
      {(status === 'live' || status === 'paused') && (
        <div className="flex gap-4">
          <button
            onClick={togglePause}
            className="flex-1 bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
          >
            {status === 'live' ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button
            onClick={stopStream}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            ⏹ End Stream
          </button>
        </div>
      )}

      {/* Stream Ended */}
      {status === 'ended' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="font-bold text-green-700 mb-1">Stream Ended</h3>
          <p className="text-green-600 text-sm">
            Duration: {formatDuration(duration)}
          </p>
          <button
            onClick={() => {
              setStatus('idle');
              setDuration(0);
              setStreamData(null);
              chunksRef.current = [];
            }}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Start New Stream
          </button>
        </div>
      )}

      {/* Stream Info */}
      {streamData && status === 'live' && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2">Stream Info</h4>
          <p className="text-gray-600">RTMP: {streamData.rtmp_url}</p>
          <p className="text-gray-600">HLS: {streamData.hls_url}</p>
        </div>
      )}
    </div>
  );
};

export default LiveStreamRecorder;
