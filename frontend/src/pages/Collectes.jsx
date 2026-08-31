import React, { useState, useEffect } from 'react'
import api from '../api'
import { Plus, FileText } from 'lucide-react'

const emptyCollection = {
  harvest_id: '', date: '', gross_weight: '', net_weight: '', collector_id: '', status: 'Brouillon', observations: '',
}

const statutBadge = (v) => ({
  Validee: 'bg-green-100 text-green-700',
  Brouillon: 'bg-gray-100 text-gray-700',
  'Affectee a un lot vert': 'bg-blue-100 text-blue-700',
  Bloquee: 'bg-red-100 text-red-700',
  Annulee: 'bg-red-100 text-red-700',
}[v] || 'bg-gray-100 text-gray-700')

const Collectes = () => {
  const [collections, setCollections] = useState([])
  const [harvests, setHarvests] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newCollection, setNewCollection] = useState(emptyCollection)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [collRes, harvestRes, usersRes] = await Promise.all([
        api.get('/collections/'), api.get('/harvests/'), api.get('/users/'),
      ])
      setCollections(collRes.data)
      setHarvests(harvestRes.data)
      setUsers(usersRes.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des collectes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const harvestLabel = (id) => {
    const h = harvests.find(h => h.id === id)
    return h ? `${h.code} - ${h.weight}kg (${h.bio_status})` : '-'
  }
  const selectedHarvest = harvests.find(h => String(h.id) === String(newCollection.harvest_id))
  const selectedRemaining = selectedHarvest ? (selectedHarvest.remaining_weight != null ? selectedHarvest.remaining_weight : selectedHarvest.weight) : null
  const userLabel = (id) => {
    const u = users.find(u => u.id === id)
    return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username : '-'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/collections/', {
        harvest_id: parseInt(newCollection.harvest_id),
        date: newCollection.date || undefined,
        gross_weight: newCollection.gross_weight ? parseFloat(newCollection.gross_weight) : null,
        net_weight: parseFloat(newCollection.net_weight),
        collector_id: parseInt(newCollection.collector_id),
        status: newCollection.status,
        observations: newCollection.observations,
      })
      setShowModal(false)
      setNewCollection(emptyCollection)
      fetchData()
    } catch (error) {
      alert("Erreur lors de l'enregistrement de la collecte : " + (error.response?.data?.detail || 'verifiez les champs.'))
    }
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">4. Collectes</h2>
          <p className="text-gray-500">Producteur et parcelle sont hérités automatiquement de la récolte</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Plus size={20} /><span>Nouvelle collecte</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Nouvelle Collecte</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Récolte liée *</label>
                <select required className="w-full border rounded-lg p-2" value={newCollection.harvest_id} onChange={e => setNewCollection({ ...newCollection, harvest_id: e.target.value })}>
                  <option value="">-- choisir --</option>
                  {harvests.map(h => {
                    const rem = h.remaining_weight != null ? h.remaining_weight : h.weight
                    return <option key={h.id} value={h.id} disabled={rem <= 0}>{h.code} - {rem}kg restants sur {h.weight}kg ({h.bio_status}){rem <= 0 ? ' - épuisé' : ''}</option>
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de collecte</label>
                  <input type="date" className="w-full border rounded-lg p-2" value={newCollection.date} onChange={e => setNewCollection({ ...newCollection, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids net (kg) *</label>
                  <input type="number" step="0.1" required max={selectedRemaining ?? undefined} className="w-full border rounded-lg p-2" value={newCollection.net_weight} onChange={e => setNewCollection({ ...newCollection, net_weight: e.target.value })} />
                  {selectedRemaining != null && <p className="text-xs text-gray-400 mt-1">Maximum : {selectedRemaining} kg (poids restant sur la récolte)</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poids brut (kg)</label>
                <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={newCollection.gross_weight} onChange={e => setNewCollection({ ...newCollection, gross_weight: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collecteur *</label>
                <select required className="w-full border rounded-lg p-2" value={newCollection.collector_id} onChange={e => setNewCollection({ ...newCollection, collector_id: e.target.value })}>
                  <option value="">-- choisir --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.code || u.username})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut de la collecte</label>
                <select className="w-full border rounded-lg p-2" value={newCollection.status} onChange={e => setNewCollection({ ...newCollection, status: e.target.value })}>
                  <option value="Brouillon">Brouillon</option>
                  <option value="Validee">Validee</option>
                  <option value="Annulee">Annulee</option>
                  <option value="Bloquee">Bloquee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={newCollection.observations} onChange={e => setNewCollection({ ...newCollection, observations: e.target.value })} />
              </div>
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
              <th className="px-6 py-3">Récolte</th>
              <th className="px-6 py-3">Poids net (kg)</th>
              <th className="px-6 py-3">Collecteur</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3">Dans un lot vert</th>
              <th className="px-6 py-3">Bordereau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : collections.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400">Aucune collecte enregistrée.</td></tr>
            ) : (
              collections.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-primary-600 font-bold">{c.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(c.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{harvestLabel(c.harvest_id)}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{c.net_weight} kg</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{userLabel(c.collector_id)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${statutBadge(c.status)}`}>{c.status}</span></td>
                  <td className="px-6 py-4">{c.green_lot_id ? <span className="text-green-600 font-bold text-sm">Oui</span> : <span className="text-gray-400 text-sm">Non</span>}</td>
                  <td className="px-6 py-4">
                    <a href={`/api/documents/collection/${c.id}/pdf`} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-bold">
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

export default Collectes
