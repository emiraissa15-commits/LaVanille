import React, { useState, useEffect, useMemo } from 'react'
import api from '../api'
import { Plus, FileText } from 'lucide-react'

const emptyHarvest = {
  producer_id: '', parcel_id: '', date: '', weight: '', status: 'Brouillon', observations: '',
}

const bioBadge = (v) => ({
  Bio: 'bg-green-100 text-green-700',
  Conversion: 'bg-amber-100 text-amber-700',
  Conventionnel: 'bg-gray-100 text-gray-700',
}[v] || 'bg-gray-100 text-gray-700')

const statutBadge = (v) => ({
  Validee: 'bg-green-100 text-green-700',
  Brouillon: 'bg-gray-100 text-gray-700',
  Bloquee: 'bg-red-100 text-red-700',
  Annulee: 'bg-red-100 text-red-700',
}[v] || 'bg-gray-100 text-gray-700')

const Recoltes = () => {
  const [harvests, setHarvests] = useState([])
  const [producers, setProducers] = useState([])
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newHarvest, setNewHarvest] = useState(emptyHarvest)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [harvestsRes, producersRes, parcelsRes] = await Promise.all([
        api.get('/harvests/'), api.get('/producers/'), api.get('/parcels/'),
      ])
      setHarvests(harvestsRes.data)
      setProducers(producersRes.data)
      setParcels(parcelsRes.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des récoltes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filteredParcels = useMemo(
    () => parcels.filter(p => String(p.producer_id) === String(newHarvest.producer_id)),
    [parcels, newHarvest.producer_id]
  )

  const producerLabel = (id) => {
    const p = producers.find(p => p.id === id)
    return p ? `${p.first_name} ${p.last_name}` : '-'
  }
  const parcelLabel = (id) => {
    const p = parcels.find(p => p.id === id)
    return p ? (p.name || p.code) : '-'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      await api.post('/harvests/', {
        parcel_id: parseInt(newHarvest.parcel_id),
        date: newHarvest.date || undefined,
        weight: parseFloat(newHarvest.weight),
        status: newHarvest.status,
        observations: newHarvest.observations,
        recorded_by_id: user.id,
      })
      setShowModal(false)
      setNewHarvest(emptyHarvest)
      fetchData()
    } catch (error) {
      alert("Erreur lors de l'enregistrement de la récolte : " + (error.response?.data?.detail || 'verifiez les champs.'))
    }
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">3. Récoltes</h2>
          <p className="text-gray-500">Le statut bio est hérité automatiquement de la parcelle</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Plus size={20} /><span>Nouvelle récolte</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Nouvelle Récolte</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producteur *</label>
                <select required className="w-full border rounded-lg p-2" value={newHarvest.producer_id}
                  onChange={e => setNewHarvest({ ...newHarvest, producer_id: e.target.value, parcel_id: '' })}>
                  <option value="">-- choisir --</option>
                  {producers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parcelle *</label>
                <select required disabled={!newHarvest.producer_id} className="w-full border rounded-lg p-2 disabled:bg-gray-100"
                  value={newHarvest.parcel_id} onChange={e => setNewHarvest({ ...newHarvest, parcel_id: e.target.value })}>
                  <option value="">{newHarvest.producer_id ? '-- choisir --' : 'Choisir un producteur d\'abord'}</option>
                  {filteredParcels.map(p => <option key={p.id} value={p.id}>{p.name || p.code} ({p.bio_status})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de récolte</label>
                  <input type="date" className="w-full border rounded-lg p-2" value={newHarvest.date} onChange={e => setNewHarvest({ ...newHarvest, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg) *</label>
                  <input type="number" step="0.1" required className="w-full border rounded-lg p-2" value={newHarvest.weight} onChange={e => setNewHarvest({ ...newHarvest, weight: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut de la récolte</label>
                <select className="w-full border rounded-lg p-2" value={newHarvest.status} onChange={e => setNewHarvest({ ...newHarvest, status: e.target.value })}>
                  <option value="Brouillon">Brouillon</option>
                  <option value="Validee">Validee</option>
                  <option value="Annulee">Annulee</option>
                  <option value="Bloquee">Bloquee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={newHarvest.observations} onChange={e => setNewHarvest({ ...newHarvest, observations: e.target.value })} />
              </div>
              <p className="text-xs text-gray-400">Le statut bio de la récolte sera automatiquement hérité de la parcelle sélectionnée.</p>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Producteur</th>
              <th className="px-6 py-3">Parcelle</th>
              <th className="px-6 py-3">Poids (kg)</th>
              <th className="px-6 py-3">Poids restant</th>
              <th className="px-6 py-3">Statut bio</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : harvests.length === 0 ? (
              <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400">Aucune récolte enregistrée.</td></tr>
            ) : (
              harvests.map(h => {
                const remaining = h.remaining_weight != null ? h.remaining_weight : h.weight
                return (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-primary-600 font-bold">{h.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(h.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{producerLabel(h.producer_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{parcelLabel(h.parcel_id)}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{h.weight} kg</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${remaining <= 0 ? 'text-gray-400' : 'text-primary-700'}`}>{remaining} kg</span>
                    {remaining <= 0 && <span className="ml-2 text-[10px] uppercase text-gray-400">Épuisé</span>}
                  </td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${bioBadge(h.bio_status)}`}>{h.bio_status}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${statutBadge(h.status)}`}>{h.status}</span></td>
                  <td className="px-6 py-4">
                    <a href={`/api/documents/harvest/${h.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700" title="Télécharger Bordereau">
                      <FileText size={16} />
                    </a>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Recoltes
