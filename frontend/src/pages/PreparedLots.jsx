import React, { useState, useEffect, useMemo } from 'react'
import api from '../api'
import { Layers, Search, FileText, MapPin, Plus } from 'lucide-react'

const emptyLot = {
  transformation_id: '', quality: 'Gourmet', weight: '', humidity: '', bio_status: '', status: 'En stock', location: '', observations: '',
}

const bioBadge = (v) => ({
  Bio: 'bg-green-100 text-green-700',
  Conversion: 'bg-amber-100 text-amber-700',
  Conventionnel: 'bg-gray-100 text-gray-700',
}[v] || 'bg-gray-100 text-gray-700')

const statusBadge = (v) => ({
  'En stock': 'bg-green-100 text-green-700',
  'Reserve': 'bg-blue-100 text-blue-700',
  'Vendu': 'bg-gray-100 text-gray-700',
  'Exporte': 'bg-purple-100 text-purple-700',
  'Bloque': 'bg-red-100 text-red-700',
  'Annule': 'bg-red-100 text-red-700',
}[v] || 'bg-gray-100 text-gray-700')

const qualityBadge = (q) => ({
  Gourmet: 'bg-purple-100 text-purple-700',
  Standard: 'bg-blue-100 text-blue-700',
  TK: 'bg-amber-100 text-amber-700',
  Fendue: 'bg-gray-100 text-gray-700',
}[q] || 'bg-gray-100 text-gray-700')

const PreparedLots = () => {
  const [lots, setLots] = useState([])
  const [transformations, setTransformations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newLot, setNewLot] = useState(emptyLot)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lotsRes, transRes] = await Promise.all([
        api.get('/prepared-lots/'),
        api.get('/transformations/'),
      ])
      setLots(lotsRes.data)
      setTransformations(transRes.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des lots préparés:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const transByLot = (id) => transformations.find(t => t.id === id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/prepared-lots/', {
        transformation_id: parseInt(newLot.transformation_id),
        quality: newLot.quality,
        weight: parseFloat(newLot.weight),
        humidity: newLot.humidity ? parseFloat(newLot.humidity) : null,
        bio_status: newLot.bio_status || null,
        status: newLot.status,
        location: newLot.location || null,
        observations: newLot.observations || null,
      })
      setShowModal(false)
      setNewLot(emptyLot)
      fetchData()
    } catch (error) {
      alert('Erreur lors de la création du lot préparé : ' + (error.response?.data?.detail || 'vérifiez les champs.'))
    }
  }

  const filteredLots = useMemo(() => {
    if (!search.trim()) return lots
    const q = search.toLowerCase()
    return lots.filter(l =>
      l.code.toLowerCase().includes(q) ||
      l.quality.toLowerCase().includes(q) ||
      (l.status || '').toLowerCase().includes(q) ||
      (transByLot(l.transformation_id)?.operation_number || '').toLowerCase().includes(q)
    )
  }, [lots, search, transformations])

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">7. Lots préparés</h2>
          <p className="text-gray-500">Lots issus des transformations terminées ; le poids affiché est la quantité disponible (module Stock actuel / Mouvements de stock hors scope)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Plus size={20} /><span>Créer un lot préparé</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2 text-gray-800">Nouveau lot préparé</h3>
            <p className="text-sm text-gray-500 mb-4">Création manuelle (correction, complément hors flux de finalisation automatique).</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transformation d'origine *</label>
                <select required className="w-full border rounded-lg p-2" value={newLot.transformation_id} onChange={e => setNewLot({ ...newLot, transformation_id: e.target.value })}>
                  <option value="">-- choisir --</option>
                  {transformations.map(t => <option key={t.id} value={t.id}>{t.operation_number} - {t.status}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualité *</label>
                  <select required className="w-full border rounded-lg p-2" value={newLot.quality} onChange={e => setNewLot({ ...newLot, quality: e.target.value })}>
                    <option value="Gourmet">Gourmet</option>
                    <option value="Standard">Standard</option>
                    <option value="TK">TK</option>
                    <option value="Fendue">Fendue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg) *</label>
                  <input type="number" step="0.1" min="0.1" required className="w-full border rounded-lg p-2" value={newLot.weight} onChange={e => setNewLot({ ...newLot, weight: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Humidité (%)</label>
                  <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={newLot.humidity} onChange={e => setNewLot({ ...newLot, humidity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut bio</label>
                  <select className="w-full border rounded-lg p-2" value={newLot.bio_status} onChange={e => setNewLot({ ...newLot, bio_status: e.target.value })}>
                    <option value="">-- non renseigné --</option>
                    <option value="Bio">Bio</option>
                    <option value="Conversion">Conversion</option>
                    <option value="Conventionnel">Conventionnel</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select className="w-full border rounded-lg p-2" value={newLot.status} onChange={e => setNewLot({ ...newLot, status: e.target.value })}>
                    <option value="En stock">En stock</option>
                    <option value="Reserve">Réservé</option>
                    <option value="Bloque">Bloqué</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={newLot.location} onChange={e => setNewLot({ ...newLot, location: e.target.value })} placeholder="Magasin principal..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={newLot.observations} onChange={e => setNewLot({ ...newLot, observations: e.target.value })} />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un code, une qualité, un statut, une transformation..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Code lot</th>
                <th className="px-6 py-3">Transformation</th>
                <th className="px-6 py-3">Qualité</th>
                <th className="px-6 py-3 text-right">Poids disponible</th>
                <th className="px-6 py-3">Humidité</th>
                <th className="px-6 py-3">Statut bio</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Emplacement</th>
                <th className="px-6 py-3">Fiche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
              ) : filteredLots.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400">Aucun lot préparé. Les lots sont créés automatiquement à la clôture d'une transformation (module 6).</td></tr>
              ) : (
                filteredLots.map(lot => {
                  const trans = transByLot(lot.transformation_id)
                  return (
                    <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm font-bold text-primary-700">{lot.code}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">{trans?.operation_number || `#${lot.transformation_id}`}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${qualityBadge(lot.quality)}`}>{lot.quality}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">{lot.weight} kg</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lot.humidity != null ? `${lot.humidity}%` : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${bioBadge(lot.bio_status)}`}>{lot.bio_status || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadge(lot.status)}`}>{lot.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 text-gray-400" />
                          {lot.location || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`/api/documents/prepared-lot/${lot.id}/pdf`} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-bold">
                          <FileText size={14} /><span>PDF</span>
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PreparedLots
