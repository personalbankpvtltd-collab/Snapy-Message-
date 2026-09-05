import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, User as UserIcon, Users, Settings, LogOut, Search, Bell, Plus, Send, Check, X, ArrowLeft, Mail, Lock, Phone, UserCircle, Ban, AlertTriangle } from 'lucide-react';
import { cn, safeStorage } from './lib/utils';
import { apiService, SCRIPT_URL } from './services/api';
import { notificationService } from './services/notificationService';

// Context for Auth
const AuthContext = createContext<{
  user: { uid: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  onlineUserCount: number;
  refreshProfile: () => Promise<void>;
  unreadMessages: any[];
  fetchUnreadMessages: () => Promise<void>;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const fetchUnreadMessages = async () => {
    if (!user) return;
    try {
      const res = await apiService.getUnreadMessages(user.uid);
      if (res && res.success && Array.isArray(res.data)) {
        setUnreadMessages(res.data);
        
        // Show notification if new messages arrived
        if (res.data.length > lastMessageCount) {
          const newMessages = res.data.slice(lastMessageCount);
          newMessages.forEach((msg: any) => {
            notificationService.showNotification(`New message from ${msg.senderName || 'Friend'}`, {
              body: msg.text,
              tag: msg.chatId, // Group by chat
            });
          });
        }
        setLastMessageCount(res.data.length);
      }
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  };

  useEffect(() => {
    if (user) {
      notificationService.requestPermission();
    }

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('App was installed');
      notificationService.requestPermission();
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // If running in standalone mode (installed), proactively ask for permission
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App running in standalone mode');
      notificationService.requestPermission();
    }

    // Check if running as a Trusted Web Activity (APK)
    const isTWA = document.referrer.includes('android-app://');
    if (isTWA) {
      console.log('App running as TWA (APK)');
      notificationService.requestPermission();
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 5000); // Every 5s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await apiService.getOnlineUserCount();
        if (res && res.success) {
          setOnlineUserCount(res.data);
        }
      } catch (err) {
        console.error('Error fetching online count:', err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 1000 * 30); // Every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedUser = safeStorage.getItem('snapy_user');
    if (savedUser && savedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Don't block loading on profile fetch if we have user credentials
        setLoading(false);
        fetchProfile(parsedUser.uid);
      } catch (e) {
        console.error('Error parsing saved user:', e);
        safeStorage.removeItem('snapy_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Set online on mount
    apiService.updateStatus(user.uid, 'online');

    // Heartbeat every 1 minute
    const interval = setInterval(() => {
      apiService.updateStatus(user.uid, 'online');
      apiService.updateProfile(user.uid, { lastSeen: new Date().toISOString() });
    }, 1000 * 60 * 1);

    // Set offline on unmount/close
    const handleUnload = () => {
      // Use sendBeacon for more reliability on close if possible, 
      // but Apps Script needs POST with body, so we'll try a regular fetch
      const data = JSON.stringify({ action: 'updateStatus', uid: user.uid, status: 'offline' });
      navigator.sendBeacon(SCRIPT_URL, data);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      apiService.updateStatus(user.uid, 'offline');
    };
  }, [user]);

  const fetchProfile = async (uid: string) => {
    try {
      const res = await apiService.getProfile(uid);
      if (res && res.success) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const isBanned = () => {
    if (!profile) return false;
    if (profile.isPermanentlyBanned) return true;
    if (profile.reportCount && profile.reportCount >= 20) return true;
    if (profile.banUntil && new Date(profile.banUntil) > new Date()) return true;
    return false;
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await apiService.login({ email, pass });
      if (res && res.success) {
        const userData = { uid: res.data.uid, email: res.data.email };
        setUser(userData);
        setProfile(res.data);
        safeStorage.setItem('snapy_user', JSON.stringify(userData));
      } else {
        throw new Error(res?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: any) => {
    setLoading(true);
    try {
      const res = await apiService.signup(data);
      if (res && res.success && res.data) {
        const userData = { uid: res.data.uid, email: res.data.email };
        setUser(userData);
        setProfile(res.data);
        safeStorage.setItem('snapy_user', JSON.stringify(userData));
      } else {
        throw new Error((res as any)?.message || 'Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      apiService.updateStatus(user.uid, 'offline');
    }
    setUser(null);
    setProfile(null);
    safeStorage.removeItem('snapy_user');
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout, onlineUserCount, refreshProfile, unreadMessages, fetchUnreadMessages }}>
      {isBanned() ? (
        <div className="fixed inset-0 z-[9999] bg-gray-900 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ban className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Account Suspended</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {profile?.isPermanentlyBanned || (profile?.reportCount && profile.reportCount >= 20)
                ? `Your account has been permanently banned due to reaching ${profile?.reportCount || 20} reports for community violations.`
                : `Your account has been temporarily suspended until ${new Date(profile?.banUntil!).toLocaleString()}. You have ${profile?.reportCount} reports. Please follow our guidelines to avoid permanent suspension.`}
            </p>
            <button 
              onClick={logout}
              className="w-full py-4 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </motion.div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

// Login Component
const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/app');
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full relative"
      >
        <Link to="/" className="absolute top-4 left-4 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all" title="Back to Home">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xl">
              <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-sm sm:text-base text-gray-600">Log in to Snapy Message: The world’s most secure messaging platform.</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account? <Link to="/signup" className="text-indigo-600 font-bold">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Signup Component
const Signup = () => {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickName: '',
    username: '',
    phoneNumber: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/app');
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Ensure username starts with @
    let finalUsername = formData.username.trim();
    if (finalUsername && !finalUsername.startsWith('@')) {
      finalUsername = '@' + finalUsername;
    }

    if (!finalUsername || finalUsername === '@') {
      setError('Username is required');
      setLoading(false);
      return;
    }

    try {
      await signup({ ...formData, username: finalUsername });
      navigate('/app');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full relative"
      >
        <Link to="/" className="absolute top-4 left-4 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all" title="Back to Home">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xl">
              <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-sm sm:text-base text-gray-600">Join Snapy Message (Sheets DB)</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>
          
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="@username"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              name="nickName"
              value={formData.nickName}
              onChange={handleChange}
              placeholder="Nick Name"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Phone Number"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account? <Link to="/login" className="text-indigo-600 font-bold">Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { logout, profile, unreadMessages } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row overflow-hidden transition-colors">
      {/* Sidebar for Desktop */}
      <nav className="hidden md:flex flex-col w-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 py-8 items-center gap-8 transition-colors">
        <Link to="/app" className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-indigo-200">
          <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </Link>
        <div className="flex flex-col gap-4 flex-1">
          <Link to="/friends" className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
            <Users className="w-6 h-6" />
          </Link>
          <Link to="/search" className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
            <Search className="w-6 h-6" />
          </Link>
          <Link to="/notifications" className="relative p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
            <Bell className="w-6 h-6" />
            {unreadMessages.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            )}
          </Link>
          <Link to="/settings" className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
        <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500 transition-all">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <UserIcon className="w-5 h-5" />
            </div>
          )}
        </Link>
        <button 
          onClick={handleLogout}
          className="p-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-3 z-50 transition-colors">
        <Link to="/app" className="p-2">
          <div className="w-6 h-6 rounded-md overflow-hidden">
            <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </Link>
        <Link to="/friends" className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"><Users className="w-6 h-6" /></Link>
        <Link to="/search" className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"><Search className="w-6 h-6" /></Link>
        <Link to="/notifications" className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
          <Bell className="w-6 h-6" />
          {unreadMessages.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
          )}
        </Link>
        <Link to="/settings" className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"><Settings className="w-6 h-6" /></Link>
      </nav>

      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};

// Real Components
import Dashboard from './components/Dashboard';
import Friends from './components/Friends';
import SearchPage from './components/SearchPage';
import Profile from './components/Profile';
import SettingsPage from './components/Settings';
import Notifications from './components/Notifications';
import AdminDashboard from './components/AdminDashboard';
import Home from './components/Home';
import Features from './components/Features';
import Security from './components/Security';
import Download from './components/Download';
import About from './components/About';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/security" element={<Security />} />
            <Route path="/download" element={<Download />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/app" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Layout><Friends /></Layout></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
