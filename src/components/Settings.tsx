import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import { User as UserIcon, Shield, Moon, Sun, Lock, Edit3, LogOut, Trash2, AlertTriangle, Download, Bell, Database, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiService, SCRIPT_URL } from '../services/api';
import { notificationService } from '../services/notificationService';
import { sheetsBackupService, BackupStatus } from '../services/sheetsBackup';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { profile, user, refreshProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Storage & Backup state
  const [backupInfo, setBackupInfo] = useState<BackupStatus>(sheetsBackupService.getStatus());
  const [testingBackup, setTestingBackup] = useState(false);
  const [backupTestResult, setBackupTestResult] = useState<string | null>(null);

  useEffect(() => {
    return sheetsBackupService.subscribeStatus((newStatus) => {
      setBackupInfo(newStatus);
    });
  }, []);

  const handleTestBackup = async () => {
    setTestingBackup(true);
    setBackupTestResult(null);
    try {
      if (user) {
        sheetsBackupService.queueBackup('updateStatus', { uid: user.uid, status: 'online' });
      }
      setBackupTestResult('Backup sync ping sent to Google Sheets');
      setTimeout(() => setBackupTestResult(null), 4000);
    } catch (e: any) {
      setBackupTestResult('Error sending backup ping: ' + e.message);
    } finally {
      setTestingBackup(false);
    }
  };

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  const [unblockMessage, setUnblockMessage] = useState<{type: 'success' | 'error', text: string}>({ type: 'success', text: '' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{text: string, type: 'success' | 'error' | ''}>({ text: '', type: '' });

  // Username change state
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [changingUsername, setChangingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState({ text: '', type: '' });

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [repairing, setRepairing] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [notifPermission, setNotifPermission] = useState(notificationService.getPermissionState());

  React.useEffect(() => {
    const checkPermission = () => {
      setNotifPermission(notificationService.getPermissionState());
    };
    
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleTestNotification = async () => {
    const granted = await notificationService.requestPermission();
    setNotifPermission(notificationService.getPermissionState());
    if (granted) {
      notificationService.showNotification('Snapy Message', {
        body: 'This is a test notification! It works like a real app.',
      });
    }
  };

  const handleRepairNotifications = async () => {
    setRepairing(true);
    try {
      await notificationService.repairNotifications();
      // Wait a bit for the system to react
      setTimeout(() => {
        setNotifPermission(notificationService.getPermissionState());
        setRepairing(false);
      }, 2000);
    } catch (e) {
      setRepairing(false);
    }
  };

  React.useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({ text: `Testing connection to:\n${SCRIPT_URL}`, type: '' });
    try {
      const res = await apiService.testConnection();
      if (res && res.success) {
        setConnectionStatus({ text: 'Connection Successful! Backend is online.', type: 'success' });
      } else {
        setConnectionStatus({ text: res?.message || 'Connection Failed: Backend returned an error.', type: 'error' });
      }
    } catch (err: any) {
      setConnectionStatus({ text: err.message || 'Connection Failed: Network error.', type: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSetupDatabase = async () => {
    setSettingUp(true);
    setConnectionStatus({ text: 'Setting up database sheets...', type: '' });
    try {
      // Setup is a special action that we call via GET for simplicity
      const response = await fetch(`${SCRIPT_URL}?action=setup`, { method: 'GET', mode: 'cors' });
      const res = await response.json();
      if (res && res.success) {
        setConnectionStatus({ text: 'Database Setup Successful! All sheets and headers are ready.', type: 'success' });
      } else {
        setConnectionStatus({ text: res?.message || 'Setup Failed: Backend returned an error.', type: 'error' });
      }
    } catch (err: any) {
      setConnectionStatus({ text: err.message || 'Setup Failed: Network error.', type: 'error' });
    } finally {
      setSettingUp(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newUsername) {
      setUsernameMessage({ text: 'Please enter a username.', type: 'error' });
      return;
    }
    setChangingUsername(true);
    setUsernameMessage({ text: '', type: '' });
    try {
      const res = await apiService.changeUsername(user.uid, newUsername);
      if (res && res.success) {
        setUsernameMessage({ text: 'Username updated successfully.', type: 'success' });
        await refreshProfile();
      } else {
        setUsernameMessage({ text: res?.message || 'Failed to update username. It might be taken.', type: 'error' });
      }
    } catch (error: any) {
      setUsernameMessage({ text: error.message || 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setChangingUsername(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!oldPassword || !newPassword) {
      setPasswordMessage({ text: 'Please fill in both password fields.', type: 'error' });
      return;
    }
    setChangingPassword(true);
    setPasswordMessage({ text: '', type: '' });
    try {
      const res = await apiService.changePassword(user.uid, oldPassword, newPassword);
      if (res && res.success) {
        setPasswordMessage({ text: 'Password changed successfully.', type: 'success' });
        setOldPassword('');
        setNewPassword('');
      } else {
        setPasswordMessage({ text: (res as any)?.error || (res as any)?.message || 'Failed to change password. Please check your old password.', type: 'error' });
      }
    } catch (error) {
      setPasswordMessage({ text: 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await apiService.deleteAccount(user.uid, deletePassword);
      if (res && res.success) {
        logout();
      } else {
        setDeleteError(res?.message || 'Failed to delete account. Please check your password.');
      }
    } catch (error: any) {
      setDeleteError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto p-4 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10"
        >
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account preferences and security</p>
          </div>
          
          <button
            onClick={toggleTheme}
            className="self-start md:self-center p-1.5 pr-4 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:shadow-md transition-all flex items-center gap-3 active:scale-95"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </div>
            <span className="text-sm font-bold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </motion.div>

        <div className="space-y-6">
          {/* App Installation Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2">App Experience</h2>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Install Snapy App</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add to home screen for a full-screen experience</p>
                  </div>
                </div>
                <button
                  onClick={handleInstallApp}
                  disabled={!isInstallable}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 flex items-center gap-2",
                    isInstallable 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Download className="w-4 h-4" />
                  {isInstallable ? 'Install Now' : 'Already Installed'}
                </button>
              </div>

              <div className="h-px bg-gray-50 dark:bg-gray-800" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Push Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when you receive a new message</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={handleTestNotification}
                    className={cn(
                      "px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 flex items-center gap-2",
                      notifPermission === 'granted' 
                        ? "bg-green-50 text-green-600 hover:bg-green-100" 
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    )}
                  >
                    <Bell className="w-4 h-4" />
                    {notifPermission === 'granted' ? 'Test Notification' : 'Enable Notifications'}
                  </button>
                  {notifPermission === 'denied' && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Permission Denied</span>
                  )}
                </div>
              </div>

              {notifPermission === 'denied' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30"
                >
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-red-800 dark:text-red-300">How to fix "Notification Denied":</p>
                      <ol className="text-xs text-red-700 dark:text-red-400 list-decimal ml-4 space-y-1">
                        <li>Click the <strong>Lock icon</strong> 🔒 or <strong>Settings icon</strong> ⚙️ in your browser's address bar (top left).</li>
                        <li>Find <strong>Notifications</strong> in the menu.</li>
                        <li>Change the setting from "Block" to <strong>"Allow"</strong>.</li>
                        <li>Refresh this page to apply the changes.</li>
                      </ol>
                      <button
                        onClick={handleRepairNotifications}
                        disabled={repairing}
                        className="mt-2 text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        {repairing ? 'Repairing...' : 'Repair System Channel'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* Storage & Cloud Architecture Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2">Data & Storage Architecture</h2>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden p-6 space-y-6">
              {/* Primary: Firebase Firestore */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">1st Primary: Firebase Firestore</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Real-time message routing, instant authentication, and live presence.
                    </p>
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl self-start sm:self-center">
                  Zero-Lag Operations
                </div>
              </div>

              <div className="h-px bg-gray-50 dark:bg-gray-800" />

              {/* Secondary: Google Sheets Backup */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">2nd Secondary: Google Sheets Backup</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        Backup Sync
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Background mirror storing users, chats, and audit logs.
                      {backupInfo.lastBackupTime && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          Last sync: {new Date(backupInfo.lastBackupTime).toLocaleTimeString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTestBackup}
                  disabled={testingBackup}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all flex items-center gap-2 self-start sm:self-center active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", testingBackup && "animate-spin")} />
                  {testingBackup ? 'Pinging Backup...' : 'Ping Backup'}
                </button>
              </div>

              {backupTestResult && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  {backupTestResult}
                </div>
              )}
            </div>
          </section>

          {/* Account Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2">Account</h2>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Profile Link */}
              <Link 
                to="/profile" 
                className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group border-b border-gray-50 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Profile Information</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name, bio, and profile picture</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all">
                  <Edit3 className="w-5 h-5" />
                </div>
              </Link>

              {/* Username Form */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Username</h3>
                </div>
                
                <form onSubmit={handleChangeUsername} className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      placeholder="username"
                      required
                    />
                  </div>
                  
                  {usernameMessage.text && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-2xl text-sm font-bold",
                        usernameMessage.type === 'success' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      )}
                    >
                      {usernameMessage.text}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={changingUsername}
                    className="w-full py-3.5 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                  >
                    {changingUsername ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Save Username'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2">Security</h2>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Update Password</h3>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="Current Password"
                  required
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="New Password"
                  required
                />
                
                {passwordMessage.text && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl text-sm font-bold",
                      passwordMessage.type === 'success' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    )}
                  >
                    {passwordMessage.text}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-3.5 rounded-2xl font-bold text-white bg-gray-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {changingPassword ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Change Password'
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Privacy Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2">Privacy</h2>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Blocked Users</h3>
              </div>
              
              {profile?.blockedUsers && profile.blockedUsers.length > 0 ? (
                <div className="space-y-3">
                  {unblockMessage.text && (
                    <div className="p-3 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 mb-4">
                      {unblockMessage.text}
                    </div>
                  )}
                  {profile.blockedUsers.map((uid) => (
                    <div key={uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-400">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">ID: {uid.substring(0, 8)}...</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!user) return;
                          try {
                            await apiService.unblockUser(user.uid, uid);
                            setUnblockMessage({ type: 'success', text: 'User unblocked' });
                            await refreshProfile();
                            setTimeout(() => setUnblockMessage({ type: 'success', text: '' }), 3000);
                          } catch (error) {
                            setUnblockMessage({ type: 'error', text: 'Failed to unblock' });
                          }
                        }}
                        className="px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No blocked users</p>
                </div>
              )}
            </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-red-400 dark:text-red-500 uppercase tracking-[0.2em] px-2">Danger Zone</h2>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-red-50 dark:border-red-900/20 shadow-sm p-6">
              {!showDeleteConfirm ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Delete Account</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Permanently remove your account and all data</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 rounded-2xl font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 leading-tight">
                      This action is irreversible. All messages and data will be lost forever.
                    </p>
                  </div>
                  
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-red-200 dark:border-red-900/30 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium"
                    placeholder="Confirm with your password"
                    required
                  />

                  {deleteError && (
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{deleteError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                        setDeleteError('');
                      }}
                      className="flex-1 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeleting}
                      className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Delete Permanently'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* Logout */}
          <div className="pt-4">
            <button
              onClick={logout}
              className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              Logout Session
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 dark:text-gray-700">
            Snapy Secure Protocol v2.4.0
          </p>
        </div>
      </div>
    </div>
  );
}
