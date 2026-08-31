import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserCog, Map, Sprout, ClipboardList, ShoppingCart, History, LogOut, ClipboardCheck, Boxes, FlaskConical, ShieldAlert, Scale, Layers } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Producers from './pages/Producers'
import Parcelles from './pages/Parcelles'
import Recoltes from './pages/Recoltes'
import Collectes from './pages/Collectes'
import LotsVerts from './pages/LotsVerts'
import Transformations from './pages/Transformations'
import PreparedLots from './pages/PreparedLots'
import Sales from './pages/Sales'
import Traceability from './pages/Traceability'
import Inspections from './pages/Inspections'
import NonConformites from './pages/NonConformites'
import BilanMatiere from './pages/BilanMatiere'
import UsersPage from './pages/Users'
import Login from './pages/Login'

const SidebarItem = ({ icon: Icon, label, to }) => (
  <Link to={to} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary-100 text-gray-700 hover:text-primary-600 transition-colors">
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
)

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Chargement...</div>;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg p-4 flex flex-col">
          <div className="flex items-center space-x-2 mb-8 px-2">
            <Sprout className="text-primary-600" size={32} />
            <h1 className="text-xl font-bold text-gray-800">SCI Vanille Bio</h1>
          </div>
          
          <nav className="flex-1 space-y-1">
            <SidebarItem icon={LayoutDashboard} label="Tableau de bord" to="/" />
            <SidebarItem icon={Users} label="1. Producteurs" to="/producers" />
            <SidebarItem icon={Map} label="2. Parcelles" to="/parcels" />
            <SidebarItem icon={Sprout} label="3. Recoltes" to="/harvests" />
            <SidebarItem icon={ClipboardList} label="4. Collectes" to="/collections" />
            <SidebarItem icon={Boxes} label="5. Lots verts" to="/green-lots" />
            <SidebarItem icon={FlaskConical} label="6. Transformations" to="/transformations" />
            <SidebarItem icon={Layers} label="7. Lots préparés" to="/prepared-lots" />
            <SidebarItem icon={ShoppingCart} label="10. Ventes & Exports" to="/sales" />
            <div className="pt-2 mt-2 border-t border-gray-100 text-[10px] uppercase text-gray-400 px-3">V2</div>
            <SidebarItem icon={ClipboardCheck} label="12. Inspections" to="/inspections" />
            <SidebarItem icon={ShieldAlert} label="13. Non-conformites" to="/non-conformities" />
            <SidebarItem icon={Scale} label="Bilan matiere" to="/bilan-matiere" />
            {user.role === 'ADMIN' && (
              <SidebarItem icon={UserCog} label="17. Utilisateurs" to="/users" />
            )}
          </nav>

          <div className="mt-auto border-t pt-4 px-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs uppercase">
                {user.username.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{user.username}</p>
                <p className="text-xs text-gray-500 uppercase">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
            <div className="text-xs text-gray-400">Version 1.0.0</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/producers" element={<Producers />} />
            <Route path="/parcels" element={<Parcelles />} />
            <Route path="/harvests" element={<Recoltes />} />
            <Route path="/collections" element={<Collectes />} />
            <Route path="/green-lots" element={<LotsVerts />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/non-conformities" element={<NonConformites />} />
            <Route path="/bilan-matiere" element={<BilanMatiere />} />
            <Route path="/transformations" element={<Transformations />} />
            <Route path="/prepared-lots" element={<PreparedLots />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/users" element={user.role === 'ADMIN' ? <UsersPage /> : <Navigate to="/" />} />
            <Route path="/traceability/:invoiceNumber" element={<Traceability />} />
            <Route path="*" element={<div className="text-center py-20 text-gray-500">Module en cours de développement...</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
