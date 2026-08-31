import React, { useState, useEffect } from 'react'
import api from '../api'
import { Package, Plus, FileText } from 'lucide-react'

const bioBadge = (v) => ({
  Bio: 'bg-green-100 text-green-700',
  Conversion: 'bg-amber-100 text-amber-700',
  Conventionnel: 'bg-gray-100 text-gray-700',
}[v] || 'bg-gray-100 text-gray-700')

const statutBadge = (v) => ({
  Disponible: 'bg-green-100 text-green-700',
  'Partiellement utilise': 'bg-blue-100 text-blue-700',
  Transforme: 'bg-gray-100 text-gray-700',
  Bloque: 'bg-red-100 text-red-700',
  Annule: 'bg-red-100 text-red-700',
}[v] || 'bg-gray-100 text-gray-700')

const LotsVerts = () => {
  const [lots, setLots] = useState([])
  const [available, setAvailable] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [observations, setObservations] = useState('')
  const [lastWarning, setLastWarning] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lotsRes, availRes] = await Promise.all([
        api.get('/green-lots/'), api.get('/collections/available/'),
      ])
      setLots(lotsRes.data)
      setAvailable(availRes.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des lots verts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const updateStatus = async (lot, status) => {
    try {
      await api.put(`/green-lots/${lot.id}/status`, { status })
      fetchData()
    } catch (error) {
      alert('Erreur lors du changement de statut : ' + (error.response?.data?.detail || ''))
    }
  }

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectedBioStatuses = new Set(available.filter(c => selectedIds.includes(c.id)).map(c => c.bio_status))
  const wouldBeMixed = selectedBioStatuses.size > 1

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedIds.length === 0) {
      alert('Sélectionnez au moins une collecte.')
      return
    }
    try {
      const res = await api.post('/green-lots/', {
        collection_ids: selectedIds, status: 'Disponible', observations,
      })
      setShowModal(false)
      setSelectedIds([])
      setObservations('')
      if (res.data.status === 'Bloque') {
        setLastWarning(`Le lot ${res.data.code} a été bloqué automatiquement : mélange Bio / Conventionnel détecté parmi les collectes sélectionnées.`)
      } else {
        setLastWarning(null)
      }
      fetchData()
    } catch (error) {
      alert('Erreur lors de la création du lot vert : ' + (error.response?.data?.detail || 'verifiez les champs.'))
    }
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">5. Lots verts</h2>
          <p className="text-gray-500">Regroupement de collectes ; un mélange Bio/Conventionnel bloque le lot automatiquement</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Package size={20} /><span>Créer un lot vert</span>
        </button>
      </header>

      {lastWarning && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
          {lastWarning}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2 text-gray-800">Nouveau Lot Vert</h3>
            <p className="text-sm text-gray-500 mb-4">Sélectionnez les collectes validées et non encore affectées à regrouper.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {available.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">Aucune collecte disponible (validée et non affectée).</div>
                ) : (
                  available.map(c => (
                    <label key={c.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggle(c.id)} />
                      <span className="flex-1 text-sm">{c.code} - {c.net_weight}kg - {new Date(c.date).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${bioBadge(c.bio_status)}`}>{c.bio_status}</span>
                    </label>
                  ))
                )}
              </div>
              {wouldBeMixed && (
                <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm rounded">
                  Attention : la sélection actuelle mélange plusieurs statuts bio. Le lot sera automatiquement bloqué.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={observations} onChange={e => setObservations(e.target.value)} />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Créer le lot ({selectedIds.length})</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Code Lot</th>
              <th className="px-6 py-3">Poids total</th>
              <th className="px-6 py-3">Poids restant</th>
              <th className="px-6 py-3">Statut bio</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Fiche</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : lots.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Aucun lot vert créé.</td></tr>
            ) : (
              lots.map(lot => (
                <tr key={lot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-bold text-amber-700">{lot.code}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{lot.total_weight} kg</td>
                  <td className="px-6 py-4 text-gray-600">{lot.remaining_weight} kg</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${bioBadge(lot.bio_status)}`}>{lot.bio_status}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${statutBadge(lot.status)}`}>{lot.status}</span></td>
                  <td className="px-6 py-4 space-x-2">
                    {lot.status === 'Bloque' && (
                      <button onClick={() => updateStatus(lot, 'Disponible')} className="text-green-600 hover:text-green-700 text-xs font-bold">Débloquer</button>
                    )}
                    {(lot.status === 'Disponible' || lot.status === 'Bloque' || lot.status === 'Partiellement utilise') && (
                      <button onClick={() => { if (confirm(`Annuler le lot ${lot.code} ?`)) updateStatus(lot, 'Annule') }} className="text-red-600 hover:text-red-700 text-xs font-bold">Annuler</button>
                    )}
                    {lot.status === 'Transforme' && <span className="text-xs text-gray-400">Consommé</span>}
                    {lot.status === 'Annule' && <span className="text-xs text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4">
                    <a href={`/api/documents/green-lot/${lot.id}/pdf`} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-bold">
                      <FileText size={14} /><span>PDF</span>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LotsVerts
