import React, { useState, useEffect } from 'react'
import api from '../api'
import { Users, Map, Sprout, ClipboardList, Boxes, FlaskConical, AlertTriangle, Package } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="text-white" size={24} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
)

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats')
        setStats(res.data)
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Tableau de bord</h2>
        <p className="text-gray-500">Chaîne de traçabilité : Producteur → Parcelle → Récolte → Collecte → Lot vert → Transformation</p>
      </header>

      {stats?.blocked_green_lots > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded flex items-center space-x-2">
          <AlertTriangle size={18} />
          <span><strong>{stats.blocked_green_lots}</strong> lot(s) vert(s) bloqué(s) suite à un mélange Bio / Conventionnel détecté.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} label="1. Producteurs" value={loading ? '...' : stats?.producers ?? 0} color="bg-blue-500" />
        <StatCard icon={Map} label="2. Parcelles" value={loading ? '...' : stats?.parcels ?? 0} color="bg-green-500" />
        <StatCard icon={Sprout} label="3. Récoltes" value={loading ? '...' : stats?.harvests ?? 0} color="bg-lime-600" />
        <StatCard icon={ClipboardList} label="4. Collectes" value={loading ? '...' : stats?.collections ?? 0} color="bg-teal-600" />
        <StatCard icon={Boxes} label="5. Lots verts" value={loading ? '...' : stats?.green_lots ?? 0} color="bg-amber-500" />
        <StatCard icon={FlaskConical} label="6. Transformations" value={loading ? '...' : stats?.transformations ?? 0} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Poids total récolté</p>
          <h3 className="text-2xl font-bold text-gray-800">{loading ? '...' : stats?.total_harvest_weight ?? 0} kg</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Poids total transformé (sortant)</p>
          <h3 className="text-2xl font-bold text-gray-800">{loading ? '...' : stats?.total_output_weight ?? 0} kg</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Rendement moyen des transformations</p>
          <h3 className="text-2xl font-bold text-gray-800">{loading ? '...' : stats?.average_yield ?? 0}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center space-x-2"><Package size={18} /><span>Stock préparé par qualité (hors périmètre V1)</span></h3>
          {loading ? (
            <div className="text-gray-400 text-center py-6">Chargement...</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats?.stock_by_quality || {}).map(([quality, weight]) => (
                <div key={quality} className="flex justify-between text-sm border-b pb-2">
                  <span className="text-gray-600">{quality}</span>
                  <span className="font-bold text-gray-800">{weight} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Alertes SCI</h3>
          <div className="space-y-4">
            {stats?.blocked_green_lots > 0 ? (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                {stats.blocked_green_lots} lot(s) vert(s) bloqué(s) pour mélange Bio/Conventionnel.
              </div>
            ) : (
              <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">
                Aucun lot vert bloqué actuellement.
              </div>
            )}
            {stats?.non_conformities_open > 0 && (
              <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm">
                {stats.non_conformities_open} non-conformité(s) ouverte(s).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
