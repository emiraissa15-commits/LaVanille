import React, { useState, useEffect } from 'react'
import api from '../api'
import { Plus } from 'lucide-react'

const emptyParcel = {
  producer_id: '', name: '', gps_lat: '', gps_long: '', surface: '', surface_unit: 'ha',
  altitude: '', crop_type: 'Vanille', status: 'Conforme', bio_status: 'Conversion',
  contamination_risk: 'Faible', buffer_zone_present: false, observations: '',
}

const bioBadge = (v) => ({
  Bio: 'bg-green-100 text-green-700',
  Conversion: 'bg-amber-100 text-amber-700',
  Conventionnel: 'bg-gray-100 text-gray-700',
}[v] || 'bg-gray-100 text-gray-700')

const riskBadge = (v) => ({
  Faible: 'bg-green-100 text-green-700',
  Moyen: 'bg-amber-100 text-amber-700',
  Eleve: 'bg-red-100 text-red-700',
}[v] || 'bg-gray-100 text-gray-700')

const Parcelles = () => {
  const [parcels, setParcels] = useState([])
  const [producers, setProducers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newParcel, setNewParcel] = useState(emptyParcel)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [parcelsRes, producersRes] = await Promise.all([
        api.get('/parcels/'), api.get('/producers/'),
      ])
      setParcels(parcelsRes.data)
      setProducers(producersRes.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des parcelles:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const producerLabel = (id) => {
    const p = producers.find(p => p.id === id)
    return p ? `${p.first_name} ${p.last_name} (${p.code})` : '-'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/parcels/', {
        ...newParcel,
        producer_id: parseInt(newParcel.producer_id),
        surface: parseFloat(newParcel.surface),
        gps_lat: newParcel.gps_lat ? parseFloat(newParcel.gps_lat) : null,
        gps_long: newParcel.gps_long ? parseFloat(newParcel.gps_long) : null,
        altitude: newParcel.altitude ? parseFloat(newParcel.altitude) : null,
      })
      setShowModal(false)
      setNewParcel(emptyParcel)
      fetchData()
    } catch (error) {
      alert("Erreur lors de l'ajout de la parcelle : " + (error.response?.data?.detail || 'verifiez les champs.'))
    }
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">2. Parcelles</h2>
          <p className="text-gray-500">Localisation, statut bio et risque de contamination</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Plus size={20} /><span>Nouvelle parcelle</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Nouvelle Parcelle</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producteur *</label>
                <select required className="w-full border rounded-lg p-2" value={newParcel.producer_id} onChange={e => setNewParcel({ ...newParcel, producer_id: e.target.value })}>
                  <option value="">-- choisir --</option>
                  {producers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la parcelle</label>
                <input type="text" className="w-full border rounded-lg p-2" value={newParcel.name} onChange={e => setNewParcel({ ...newParcel, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude GPS</label>
                  <input type="number" step="0.000001" className="w-full border rounded-lg p-2" value={newParcel.gps_lat} onChange={e => setNewParcel({ ...newParcel, gps_lat: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude GPS</label>
                  <input type="number" step="0.000001" className="w-full border rounded-lg p-2" value={newParcel.gps_long} onChange={e => setNewParcel({ ...newParcel, gps_long: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Superficie *</label>
                  <input type="number" step="0.01" required className="w-full border rounded-lg p-2" value={newParcel.surface} onChange={e => setNewParcel({ ...newParcel, surface: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                  <select className="w-full border rounded-lg p-2" value={newParcel.surface_unit} onChange={e => setNewParcel({ ...newParcel, surface_unit: e.target.value })}>
                    <option value="ha">ha</option>
                    <option value="m2">m2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label>
                  <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={newParcel.altitude} onChange={e => setNewParcel({ ...newParcel, altitude: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de culture</label>
                  <select className="w-full border rounded-lg p-2" value={newParcel.crop_type} onChange={e => setNewParcel({ ...newParcel, crop_type: e.target.value })}>
                    <option value="Vanille">Vanille</option>
                    <option value="Mixte">Mixte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut de la parcelle</label>
                  <select className="w-full border rounded-lg p-2" value={newParcel.status} onChange={e => setNewParcel({ ...newParcel, status: e.target.value })}>
                    <option value="Conforme">Conforme</option>
                    <option value="Suspendue">Suspendue</option>
                    <option value="Bloquee">Bloquee</option>
                    <option value="Archivee">Archivee</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut bio de la parcelle</label>
                  <select className="w-full border rounded-lg p-2" value={newParcel.bio_status} onChange={e => setNewParcel({ ...newParcel, bio_status: e.target.value })}>
                    <option value="Bio">Bio</option>
                    <option value="Conversion">Conversion</option>
                    <option value="Conventionnel">Conventionnel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risque de contamination</label>
                  <select className="w-full border rounded-lg p-2" value={newParcel.contamination_risk} onChange={e => setNewParcel({ ...newParcel, contamination_risk: e.target.value })}>
                    <option value="Faible">Faible</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Eleve">Eleve</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input id="buffer_zone" type="checkbox" checked={newParcel.buffer_zone_present} onChange={e => setNewParcel({ ...newParcel, buffer_zone_present: e.target.checked })} />
                <label htmlFor="buffer_zone" className="text-sm text-gray-700">Zone tampon présente</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={newParcel.observations} onChange={e => setNewParcel({ ...newParcel, observations: e.target.value })} />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Créer la parcelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
            <tr>
              <th className="px-6 py-3 font-semibold">Code</th>
              <th className="px-6 py-3 font-semibold">Nom</th>
              <th className="px-6 py-3 font-semibold">Producteur</th>
              <th className="px-6 py-3 font-semibold">Superficie</th>
              <th className="px-6 py-3 font-semibold">Statut Bio</th>
              <th className="px-6 py-3 font-semibold">Statut</th>
              <th className="px-6 py-3 font-semibold">Risque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : parcels.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Aucune parcelle trouvée.</td></tr>
            ) : (
              parcels.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-primary-600 font-bold">{p.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{p.name || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{producerLabel(p.producer_id)}</td>
                  <td className="px-6 py-4 text-gray-600">{p.surface} {p.surface_unit}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${bioBadge(p.bio_status)}`}>{p.bio_status}</span></td>
                  <td className="px-6 py-4 text-gray-600">{p.status}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${riskBadge(p.contamination_risk)}`}>{p.contamination_risk}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Parcelles
