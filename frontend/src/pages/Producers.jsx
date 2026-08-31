import React, { useState, useEffect } from 'react'
import api from '../api'
import { Plus, Search } from 'lucide-react'

const emptyProducer = {
  first_name: '', last_name: '', gender: 'Homme', birth_date: '', phone: '',
  minor_children_count: 0, island: 'Ngazidja', region: '', village: '',
  status: 'Actif', bio_status: 'Conversion', contract_signed: false, contract_date: '',
  observations: '',
}

const bioBadge = (v) => ({
  Bio: 'bg-green-100 text-green-700',
  Conversion: 'bg-amber-100 text-amber-700',
  Conventionnel: 'bg-gray-100 text-gray-700',
}[v] || 'bg-gray-100 text-gray-700')

const statutBadge = (v) => ({
  Actif: 'bg-green-100 text-green-700',
  Suspendu: 'bg-amber-100 text-amber-700',
  Exclu: 'bg-red-100 text-red-700',
  Archive: 'bg-gray-100 text-gray-700',
}[v] || 'bg-gray-100 text-gray-700')

const Producers = () => {
  const [producers, setProducers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [newProducer, setNewProducer] = useState(emptyProducer)

  const fetchProducers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/producers/')
      setProducers(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des producteurs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducers() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...newProducer,
        birth_date: newProducer.birth_date || null,
        contract_date: newProducer.contract_signed ? (newProducer.contract_date || null) : null,
      }
      await api.post('/producers/', payload)
      setShowModal(false)
      setNewProducer(emptyProducer)
      fetchProducers()
    } catch (error) {
      alert("Erreur lors de l'ajout du producteur : " + (error.response?.data?.detail || 'verifiez les champs obligatoires.'))
    }
  }

  const filtered = producers.filter(p =>
    !search ||
    `${p.first_name} ${p.last_name} ${p.code} ${p.village}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">1. Producteurs</h2>
          <p className="text-gray-500">Liste et suivi des membres du groupement</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100"
        >
          <Plus size={20} />
          <span>Ajouter un producteur</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Nouveau Producteur</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input type="text" required className="w-full border rounded-lg p-2"
                    value={newProducer.first_name} onChange={e => setNewProducer({ ...newProducer, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" required className="w-full border rounded-lg p-2"
                    value={newProducer.last_name} onChange={e => setNewProducer({ ...newProducer, last_name: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                  <select className="w-full border rounded-lg p-2" value={newProducer.gender} onChange={e => setNewProducer({ ...newProducer, gender: e.target.value })}>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" className="w-full border rounded-lg p-2" value={newProducer.birth_date} onChange={e => setNewProducer({ ...newProducer, birth_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={newProducer.phone} onChange={e => setNewProducer({ ...newProducer, phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ile (Commune)</label>
                  <select className="w-full border rounded-lg p-2" value={newProducer.island} onChange={e => setNewProducer({ ...newProducer, island: e.target.value })}>
                    <option value="Ngazidja">Ngazidja</option>
                    <option value="Moheli">Moheli</option>
                    <option value="Anjouan">Anjouan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={newProducer.region} onChange={e => setNewProducer({ ...newProducer, region: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Village *</label>
                  <input type="text" required className="w-full border rounded-lg p-2" value={newProducer.village} onChange={e => setNewProducer({ ...newProducer, village: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enfants mineurs</label>
                  <input type="number" min="0" className="w-full border rounded-lg p-2" value={newProducer.minor_children_count} onChange={e => setNewProducer({ ...newProducer, minor_children_count: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut producteur</label>
                  <select className="w-full border rounded-lg p-2" value={newProducer.status} onChange={e => setNewProducer({ ...newProducer, status: e.target.value })}>
                    <option value="Actif">Actif</option>
                    <option value="Suspendu">Suspendu</option>
                    <option value="Exclu">Exclu</option>
                    <option value="Archive">Archive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut bio</label>
                  <select className="w-full border rounded-lg p-2" value={newProducer.bio_status} onChange={e => setNewProducer({ ...newProducer, bio_status: e.target.value })}>
                    <option value="Bio">Bio</option>
                    <option value="Conversion">Conversion</option>
                    <option value="Conventionnel">Conventionnel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="flex items-center space-x-2 pt-6">
                  <input id="contract_signed" type="checkbox" checked={newProducer.contract_signed} onChange={e => setNewProducer({ ...newProducer, contract_signed: e.target.checked })} />
                  <label htmlFor="contract_signed" className="text-sm text-gray-700">Contrat signé</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date du contrat</label>
                  <input type="date" disabled={!newProducer.contract_signed} className="w-full border rounded-lg p-2 disabled:bg-gray-100" value={newProducer.contract_date} onChange={e => setNewProducer({ ...newProducer, contract_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={newProducer.observations} onChange={e => setNewProducer({ ...newProducer, observations: e.target.value })} />
              </div>

              <div className="flex space-x-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold shadow-lg shadow-primary-100">Créer le producteur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un producteur (nom, code, village)..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
            <tr>
              <th className="px-6 py-3 font-semibold">Code</th>
              <th className="px-6 py-3 font-semibold">Nom</th>
              <th className="px-6 py-3 font-semibold">Ile / Village</th>
              <th className="px-6 py-3 font-semibold">Statut Bio</th>
              <th className="px-6 py-3 font-semibold">Statut</th>
              <th className="px-6 py-3 font-semibold">Parcelles</th>
              <th className="px-6 py-3 font-semibold">Surface totale (ha)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Aucun producteur trouvé.</td></tr>
            ) : (
              filtered.map((producer) => (
                <tr key={producer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-primary-600 font-bold">{producer.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{producer.first_name} {producer.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{producer.island} / {producer.village}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${bioBadge(producer.bio_status)}`}>{producer.bio_status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statutBadge(producer.status)}`}>{producer.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{producer.parcel_count}</td>
                  <td className="px-6 py-4 text-gray-600">{producer.total_surface}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Producers
