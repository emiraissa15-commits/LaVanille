import React, { useState, useEffect } from 'react'
import api from '../api'
import { Scale, TrendingUp, Download, AlertTriangle } from 'lucide-react'

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between py-2 border-b border-gray-100 text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
    <span>{label}</span>
    <span>{value} kg</span>
  </div>
)

const BilanMatiere = () => {
  const [balance, setBalance] = useState(null)
  const [topProducers, setTopProducers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, topRes] = await Promise.all([
          api.get('/dashboard/mass-balance'),
          api.get('/dashboard/top-producers'),
        ])
        setBalance(balanceRes.data)
        setTopProducers(topRes.data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading || !balance) {
    return <div className="text-center py-20 text-gray-400">Chargement du bilan matière...</div>
  }

  const gapAlert = Math.abs(balance.transformation_balance_gap_kg) > 0.5

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2"><Scale size={24} /><span>Tableau de bord avancé - Bilan matière</span></h2>
        <p className="text-gray-500">Réconciliation des poids sur toute la chaîne de traçabilité (V2)</p>
      </header>

      {gapAlert && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded flex items-center space-x-2">
          <AlertTriangle size={18} />
          <span>Écart de {balance.transformation_balance_gap_kg} kg détecté entre le poids entrant et (pertes + poids sortant) des transformations. À vérifier.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Chaîne de traçabilité (poids cumulés)</h3>
          <Row label="Total récolté" value={balance.total_harvested_kg} />
          <Row label="Total collecté (net)" value={balance.total_collected_kg} />
          <Row label="Total en lots verts" value={balance.total_green_lots_kg} />
          <Row label="dont lots verts bloqués" value={balance.blocked_green_lots_kg} />
          <Row label="Entrant en transformation" value={balance.total_transformation_input_kg} />
          <Row label="Sortant de transformation" value={balance.total_transformation_output_kg} />
          <Row label="Pertes de transformation" value={balance.total_transformation_loss_kg} />
          <Row label="Écart théorique (devrait être ~0)" value={balance.transformation_balance_gap_kg} bold />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Stock et ventes</h3>
          <Row label="Total lots préparés créés" value={balance.total_prepared_kg} />
          <Row label="Actuellement en stock" value={balance.total_in_stock_kg} />
          <Row label="Total vendu / exporté" value={balance.total_sold_kg} />

          <h4 className="font-bold text-gray-700 mt-6 mb-2 text-sm uppercase tracking-wide">Répartition par qualité</h4>
          {Object.entries(balance.yield_per_quality_kg).map(([q, w]) => (
            <Row key={q} label={q} value={w} />
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center space-x-2"><TrendingUp size={18} /><span>Top producteurs par volume récolté</span></h3>
        <div className="space-y-2">
          {topProducers.map((p, idx) => (
            <div key={p.producer_code} className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">#{idx + 1} - {p.producer_name} ({p.producer_code})</span>
              <span className="font-bold text-gray-900">{p.total_harvested_kg} kg</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center space-x-2"><Download size={18} /><span>Exports (module documents avancés)</span></h3>
        <div className="flex flex-wrap gap-3">
          {['producers', 'transformations', 'sales', 'stock'].map(entity => (
            <a key={entity} href={`/api/exports/${entity}.csv`} target="_blank" rel="noreferrer"
               className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center space-x-2">
              <Download size={14} /><span>{entity}.csv</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BilanMatiere
