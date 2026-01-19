import { useState, useRef, useCallback } from 'react';
import { mediaAPI } from '../services/api';

const MediaUpload = ({ 
  onUploadComplete, 
  associationType = null, // 'polling_station_update' or 'incident_report'
  associationId = null,
  allowedTypes = ['photo', 'video', 'audio'],
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  multiple = true,
}) => {
  const [uploads, setUploads] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const ACCEPTED_MIMES = {
    photo: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
  };

  const getAcceptedMimes = () => {
    return allowedTypes.map(type => ACCEPTED_MIMES[type]).join(',');
  };

  const getMediaType = (file) => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return null;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file) => {
    const mediaType = getMediaType(file);
    if (!mediaType) {
      return 'Unsupported file type';
    }
    if (!allowedTypes.includes(mediaType)) {
      return `${mediaType} files are not allowed`;
    }
    if (file.size > maxFileSize) {
      return `File too large (max ${formatFileSize(maxFileSize)})`;
    }
    return null;
  };

  const uploadFile = async (file) => {
    const mediaType = getMediaType(file);
    const uploadId = Date.now() + Math.random();
    
    // Add to uploads list
    setUploads(prev => [...prev, {
      id: uploadId,
      file,
      mediaType,
      progress: 0,
      status: 'uploading',
      error: null,
      result: null,
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('media_type', mediaType);
      formData.append('file_name', file.name);
      
      if (associationType && associationId) {
        formData.append(associationType, associationId);
      }

      // Get location if available
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          formData.append('latitude', position.coords.latitude);
          formData.append('longitude', position.coords.longitude);
        } catch (e) {
          // Location not available, continue without it
        }
      }

      const response = await mediaAPI.upload(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress } : u
        ));
      });

      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'complete', progress: 100, result: response.data }
          : u
      ));

      if (onUploadComplete) {
        onUploadComplete(response.data);
      }

      return response.data;
    } catch (err) {
      console.error('Upload error:', err);
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: err.response?.data?.detail || 'Upload failed' }
          : u
      ));
      throw err;
    }
  };

  const handleFiles = useCallback(async (files) => {
    setError(null);
    
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      
      try {
        await uploadFile(file);
      } catch (err) {
        // Error already handled in uploadFile
      }
    }
  }, [associationType, associationId]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const getStatusIcon = (upload) => {
    switch (upload.status) {
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        );
      case 'complete':
        return <span className="text-green-600">✓</span>;
      case 'error':
        return <span className="text-red-600">✗</span>;
      default:
        return null;
    }
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'photo': return '📷';
      case 'video': return '🎥';
      case 'audio': return '🎤';
      default: return '📁';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-2">
          {allowedTypes.map(t => getMediaIcon(t)).join(' ')}
        </div>
        <p className="text-gray-600 mb-2">
          Drag and drop files here, or click to select
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports: {allowedTypes.join(', ')} (max {formatFileSize(maxFileSize)})
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedMimes()}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Select Files
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Uploads</h4>
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                upload.status === 'error' 
                  ? 'bg-red-50 border-red-200'
                  : upload.status === 'complete'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <span className="text-xl">{getMediaIcon(upload.mediaType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(upload.file.size)}
                  {upload.error && <span className="text-red-600 ml-2">{upload.error}</span>}
                </p>
                {upload.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${upload.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(upload)}
                <button
                  type="button"
                  onClick={() => removeUpload(upload.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
