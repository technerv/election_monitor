import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { profileAPI, authAPI } from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // OTP states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [message, setMessage] = useState(null);

  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    organization: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsLoggedIn(true);
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.me();
      setProfile(response.data);
      setPhoneNumber(response.data.phone_number || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        setIsLoggedIn(false);
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await authAPI.login(loginData.username, loginData.password);
      localStorage.setItem('auth_token', response.data.token);
      setIsLoggedIn(true);
      setProfile(response.data.user);
      setPhoneNumber(response.data.user.phone_number || '');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await authAPI.register(registerData);
      localStorage.setItem('auth_token', response.data.token);
      setIsLoggedIn(true);
      setProfile(response.data.user);
      setMessage({ type: 'success', text: 'Registration successful! Welcome to Election Monitor.' });
    } catch (error) {
      console.error('Registration error:', error);
      // Handle validation errors
      if (error.response?.data) {
        const errors = error.response.data;
        const errorMessages = [];
        for (const [field, messages] of Object.entries(errors)) {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          } else {
            errorMessages.push(`${field}: ${messages}`);
          }
        }
        setError(errorMessages.join('\n'));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('auth_token');
    setIsLoggedIn(false);
    setProfile(null);
  };

  const handleRequestOTP = async () => {
    if (!phoneNumber) {
      setMessage({ type: 'error', text: 'Please enter a phone number' });
      return;
    }

    setSendingOTP(true);
    setMessage(null);

    try {
      const response = await profileAPI.requestOTP(phoneNumber);
      setOtpSent(true);
      setMessage({ 
        type: 'success', 
        text: `OTP sent to ${phoneNumber}. ${response.data.otp ? `(Test OTP: ${response.data.otp})` : ''}` 
      });
    } catch (error) {
      console.error('OTP request error:', error);
      setMessage({ type: 'error', text: 'Failed to send OTP. Please try again.' });
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      setMessage({ type: 'error', text: 'Please enter the OTP code' });
      return;
    }

    setVerifyingOTP(true);
    setMessage(null);

    try {
      await profileAPI.verifyOTP(otpCode);
      setMessage({ type: 'success', text: 'Phone number verified successfully!' });
      fetchProfile();
      setOtpSent(false);
      setOtpCode('');
    } catch (error) {
      console.error('OTP verification error:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Invalid OTP code' });
    } finally {
      setVerifyingOTP(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Auth Forms (Login/Register)
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Tab Switcher */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-3 font-medium ${
                authMode === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-3 font-medium ${
                authMode === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                  placeholder="Enter username or email"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  placeholder="Enter password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={registerData.first_name}
                    onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                    placeholder="John"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={registerData.last_name}
                    onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                    placeholder="Doe"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  required
                  placeholder="Choose a username"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={registerData.phone_number}
                  onChange={(e) => setRegisterData({ ...registerData, phone_number: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization (optional)
                </label>
                <input
                  type="text"
                  value={registerData.organization}
                  onChange={(e) => setRegisterData({ ...registerData, organization: e.target.value })}
                  placeholder="e.g., Independent Observer, Media House"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  placeholder="Create a strong password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters, include letters and numbers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={registerData.password_confirm}
                  onChange={(e) => setRegisterData({ ...registerData, password_confirm: e.target.value })}
                  required
                  placeholder="Confirm your password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By creating an account, you agree to help maintain election transparency and accuracy.
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/live-dashboard" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/live-dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      {/* Success Message */}
      {message && message.type === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {message.text}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile?.username}
              </h1>
              <p className="text-gray-600">@{profile?.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Account Information</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b">
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="font-medium">{profile?.username}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{profile?.email || 'Not set'}</p>
            </div>
          </div>

          <div className="flex justify-between items-center py-3 border-b">
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-medium">
                {profile?.date_joined 
                  ? new Date(profile.date_joined).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center py-3 border-b">
            <div>
              <p className="text-sm text-gray-500">Observer Status</p>
              <p className="font-medium">
                {profile?.is_verified_observer ? (
                  <span className="text-green-600">✓ Verified Observer</span>
                ) : (
                  <span className="text-gray-500">Regular User</span>
                )}
              </p>
            </div>
          </div>

          {profile?.organization && (
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="text-sm text-gray-500">Organization</p>
                <p className="font-medium">{profile.organization}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phone Verification */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Phone Verification</h2>
        
        {message && (
          <div className={`px-4 py-3 rounded mb-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {profile?.phone_verified ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <p className="font-medium text-green-700">Phone Verified</p>
                <p className="text-green-600">{profile.phone_number}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Verify your phone number to enhance the credibility of your reports.
            </p>

            {!otpSent ? (
              <div className="flex gap-4">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={handleRequestOTP}
                  disabled={sendingOTP}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {sendingOTP ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to {phoneNumber}
                </p>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter OTP"
                    maxLength={6}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-center text-xl tracking-widest"
                  />
                  <button
                    onClick={handleVerifyOTP}
                    disabled={verifyingOTP}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {verifyingOTP ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Change phone number
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">My Activity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-600">Updates Submitted</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-red-600">0</p>
            <p className="text-sm text-gray-600">Incidents Reported</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Activity tracking will be available in future updates
        </p>
      </div>
    </div>
  );
};

export default Profile;
