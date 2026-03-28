import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  ShieldCheck, 
  DoorOpen, 
  Trash2, 
  Search, 
  Activity, 
  Database,
  CheckCircle2,
  XCircle,
  Menu,
  Settings,
  Bell,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from './api/client';

// Types
interface DeviceInfo {
  DeviceInfo?: {
    deviceName: string;
    model: string;
    serialNumber: string;
    firmwareVersion: string;
  };
}

interface User {
  employeeNo: string;
  name: string;
  userType: string;
  doorRight: string;
  RightPlan: string;
}

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserNo, setNewUserNo] = useState('');

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    checkConnection();
    fetchUsers();
  }, []);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const { data } = await api.get('/hik/test');
      // Simple parse for XML if device doesn't support JSON on deviceInfo
      if (typeof data === 'string' && data.includes('<model>')) {
        const modelMatch = data.match(/<model>(.*?)<\/model>/);
        const firmwareMatch = data.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/);
        setDeviceInfo({
          DeviceInfo: {
            deviceName: 'Hikvision Terminal',
            model: modelMatch ? modelMatch[1] : 'Unknown Model',
            serialNumber: '',
            firmwareVersion: firmwareMatch ? firmwareMatch[1] : ''
          }
        });
      } else {
        setDeviceInfo(data);
      }
      setStatus('online');
    } catch (err) {
      console.error(err);
      setStatus('offline');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/hik/users');
      const userList = data?.UserInfoSearch?.UserInfo || [];
      setUsers(userList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        employeeNo: newUserNo,
        name: newUserName,
      };
      await api.post('/hik/users', userData);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserNo('');
      fetchUsers();
      alert(`User Profile Created Successfully!\n\nIMPORTANT: Remote facial/fingerprint enrollment is disabled natively on the DS-K1T320.\nPlease physically go to the Hikvision Terminal and enroll the fingerprint and face for Employee ID: ${userData.employeeNo}.`);
    } catch (err) {
      alert('Failed to add user. Ensure the ID does not already exist.');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put('/hik/users', editingUser);
      setShowEditUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/hik/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleOpenDoor = async () => {
    try {
      await api.post('/hik/open-door');
      alert('Door opened successfully');
    } catch (err) {
      alert('Failed to open door');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.employeeNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'blue' },
    { label: 'Device Status', value: status === 'online' ? 'Online' : 'Offline', icon: Activity, color: status === 'online' ? 'green' : 'red' },
    { label: 'Model', value: deviceInfo?.DeviceInfo?.model || 'Detecting...', icon: ShieldCheck, color: 'purple' },
    { label: 'Auth Logs', value: '-', icon: Database, color: 'orange' },
  ];

  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden text-gray-100">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#090e1a]/80 backdrop-blur-xl border-r border-gray-800 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-blue-glow">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold font-['Outfit'] tracking-tight">HIK Portal</h1>
          </div>
          
          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'users', icon: Users, label: 'User Management' },
              { id: 'logs', icon: Activity, label: 'Activity Logs' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'online' ? 'bg-green-500 shadow-green-glow' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-medium text-gray-300">{status === 'online' ? 'Device Online' : 'Device Offline'}</span>
            </div>
            <button 
              onClick={handleOpenDoor}
              disabled={status !== 'online'}
              className="w-full btn btn-primary py-2.5 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <DoorOpen size={18} />
              Open Door
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 flex flex-col h-screen relative">
        {/* Header */}
        <header className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-[#030712]/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
              <Menu size={24} />
            </button>
          </div>
          
          <div className="relative w-96 flex-1 max-w-md hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search users or records..."
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#030712]"></span>
            </button>
            <div className="h-8 w-[1px] bg-gray-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-gray-700 to-gray-600 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white border border-gray-500">
                AD
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold">Admin User</p>
                <p className="text-xs text-gray-500">Super Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="card bg-gray-900/40 border-gray-800/50 hover:border-gray-700/50 transition-all shadow-xl p-6 group">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                          <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl bg-${stat.color}-600/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                          <stat.icon size={22} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 card bg-gray-900/30 border-gray-800/50 p-0 overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                      <h3 className="text-lg font-bold">Device Statistics</h3>
                      <div className="flex gap-2">
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-600/20">Live View</button>
                        <button className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:bg-gray-800">History</button>
                      </div>
                    </div>
                    <div className="h-64 flex items-center justify-center text-gray-500 italic">
                      [ Interactive Graph Illustration ]
                    </div>
                  </div>
                  
                  <div className="card bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/20 p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldCheck size={200} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Device Security</h3>
                      <p className="text-gray-400 text-sm">Your DS-K1T320MFWX-B facial recognition terminal is currently under optimal security configuration.</p>
                    </div>
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span>ISAPI Interface Enabled</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span>Firmware {deviceInfo?.DeviceInfo?.firmwareVersion}</span>
                      </div>
                      <button className="mt-6 w-full py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm tracking-wide">
                        Check for Updates
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                    <p className="text-gray-500">Manage individuals with access permissions on your device.</p>
                  </div>
                  <button onClick={() => setShowAddUserModal(true)} className="btn btn-primary ml-auto shadow-xl shadow-blue-600/20 rounded-xl px-6 py-3">
                    <UserPlus size={20} />
                    Add New User
                  </button>
                </div>

                <div className="card bg-gray-900/30 border-gray-800/50 p-0 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-800/30 text-gray-400 text-xs font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Employee No</th>
                          <th className="px-6 py-4">Full Name</th>
                          <th className="px-6 py-4">User Type</th>
                          <th className="px-6 py-4">Access Level</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                              <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                Loading users...
                              </div>
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                               No users found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4">
                                <span className="font-mono text-blue-400">{user.employeeNo}</span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-200">{user.name}</td>
                              <td className="px-6 py-4">
                                <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">{user.userType}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="badge badge-success">Terminal Door 1</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingUser(user); setShowEditUserModal(true); }} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"><Settings size={16} /></button>
                                  <button onClick={() => handleDeleteUser(user.employeeNo)} className="p-2 hover:bg-red-900/20 text-red-500/70 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddUserModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card w-full max-w-md bg-[#0f172a] border-gray-800 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Enroll New User</h3>
                <button onClick={() => setShowAddUserModal(false)} className="text-gray-500 hover:text-white"><XCircle size={22} /></button>
              </div>
              
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Employee Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 001"
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-2.5 px-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={newUserNo}
                    onChange={(e) => setNewUserNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. John Doe"
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-2.5 px-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowAddUserModal(false)} className="flex-1 btn btn-secondary py-3">Cancel</button>
                  <button type="submit" className="flex-1 btn btn-primary py-3">Enroll User</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUserModal && editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card w-full max-w-md bg-[#0f172a] border-gray-800 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Edit User</h3>
                <button onClick={() => { setShowEditUserModal(false); setEditingUser(null); }} className="text-gray-500 hover:text-white"><XCircle size={22} /></button>
              </div>
              
              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Employee Number (Read-only)</label>
                  <input 
                    type="text" 
                    readOnly 
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl py-2.5 px-4 text-gray-500"
                    value={editingUser.employeeNo}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. John Doe"
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-2.5 px-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setShowEditUserModal(false); setEditingUser(null); }} className="flex-1 btn btn-secondary py-3">Cancel</button>
                  <button type="submit" className="flex-1 btn btn-primary py-3">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
