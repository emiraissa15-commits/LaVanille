import React, { useState, useEffect } from 'react'
import api from '../api'
import { Package, AlertCircle, MapPin, ArrowDownCircle, ArrowUpCircle, Repeat, Wrench, Lock, Unlock } from 'lucide-react'

const typeIcon = {
  Entree: <ArrowDownCircle size={16} className="text-green-600" />,
  Sortie: <ArrowUpCircle size={16} className="text-red-600" />,
  Transfert: <Repeat size={16} className="text-blue-600" />,
  Correction: <Wrench size={16} className="text-amber-600" />,
  Blocage: <Lock size={16} className="text-red-600" />,
  Deblocage: <Unlock size={16} className="text-green-600" />,
}

const Stocks = () => {
  const [lots, setLots] = useState([])
  const [inventory, setInventory] = useState({ by_quality: {}, by_location: {}, total_stock: 0 })
  const [movements, setMovements] = useState([])
  const [emplacements, setEmplacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [form, setForm] = useState({ prepared_lot_id: '', type: 'Entree', quantity: '', emplacement_source_id: '', emplacement_destination_id: '', justification: '', observations: '' })
  const [empForm, setEmpForm] = useState({ name: '', type: 'Magasin' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lotsRes, invRes, mvtRes, empRes] = await Promise.all([
        api.get('/prepared-lots/'),
        api.get('/stock/inventory'),
        api.get('/stock-movements/'),
        api.get('/emplacements/'),
      ])
      setLots(lotsRes.data)
      setInventory(invRes.data)
      setMovements(mvtRes.data)
      setEmplacements(empRes.data)
    } catch (error) {
      console.error("Erreur lors de la récupération du stock:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const lotByPrepId = (id) => lots.find(l => l.id === id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/stock-movements/', {
        ...form,
        prepared_lot_id: parseInt(form.prepared_lot_id),
        quantity: parseFloat(form.quantity),
        emplacement_source_id: form.emplacement_source_id ? parseInt(form.emplacement_source_id) : null,
        emplacement_destination_id: form.emplacement_destination_id ? parseInt(form.emplacement_destination_id) : null,
      })
      setShowModal(false)
      setForm({ prepared_lot_id: '', type: 'Entree', quantity: '', emplacement_source_id: '', emplacement_destination_id: '', justification: '', observations: '' })
      fetchData()
    } catch (error) {
      alert("Erreur : " + (error.response?.data?.detail || 'mouvement refusé.'))
    }
  }

  const handleEmpSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/emplacements/', empForm)
      setShowEmpModal(false)
      setEmpForm({ name: '', type: 'Magasin' })
      fetchData()
    } catch (error) {
      alert("Erreur : " + (error.response?.data?.detail || ''))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">9. Mouvements de stock</h2>
          <p className="text-gray-500">Historique des mouvements sur les lots préparés (module 7) ; le détail par lot se consulte dans l'onglet Lots préparés</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowEmpModal(true)} className="border px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium hover:bg-gray-50">
            <MapPin size={18} /><span>Nouvel emplacement</span>
          </button>
          <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
            <Package size={20} /><span>Nouveau mouvement</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(inventory.by_quality || {}).map(([quality, weight]) => (
          <div key={quality} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                quality === 'Gourmet' ? 'bg-purple-100 text-purple-700' :
                quality === 'Standard' ? 'bg-blue-100 text-blue-700' :
                quality === 'TK' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
              }`}>{quality}</span>
              <Package className="text-gray-300" size={20} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{weight.toFixed(1)} kg</h3>
            <p className="text-sm text-gray-500 mt-1">Poids disponible (lots non vendus/exportés)</p>
          </div>
        ))}
      </div>

      {showEmpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Nouvel emplacement</h3>
            <form onSubmit={handleEmpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input type="text" required className="w-full border rounded-lg p-2" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="w-full border rounded-lg p-2" value={empForm.type} onChange={e => setEmpForm({ ...empForm, type: e.target.value })}>
                  <option value="Magasin">Magasin</option>
                  <option value="Etagere">Étagère</option>
                  <option value="Caisse">Caisse</option>
                  <option value="Zone">Zone</option>
                  <option value="Chambre">Chambre</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowEmpModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Nouveau mouvement de stock</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lot préparé</label>
                <select required className="w-full border rounded-lg p-2" value={form.prepared_lot_id} onChange={e => setForm({ ...form, prepared_lot_id: e.target.value })}>
                  <option value="">Sélectionner un lot</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.code} - {l.quality} ({l.weight} kg)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de mouvement</label>
                  <select className="w-full border rounded-lg p-2" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="Entree">Entrée</option>
                    <option value="Sortie">Sortie</option>
                    <option value="Transfert">Transfert</option>
                    <option value="Correction">Correction</option>
                    <option value="Blocage">Blocage</option>
                    <option value="Deblocage">Déblocage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.type === 'Correction' ? 'Nouveau poids (kg)' : 'Quantité (kg)'}
                  </label>
                  <input type="number" step="0.1" required className="w-full border rounded-lg p-2" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
              </div>
              {(form.type === 'Transfert' || form.type === 'Entree') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement destination</label>
                  <select required={form.type === 'Transfert'} className="w-full border rounded-lg p-2" value={form.emplacement_destination_id} onChange={e => setForm({ ...form, emplacement_destination_id: e.target.value })}>
                    <option value="">-- choisir --</option>
                    {emplacements.map(e => <option key={e.id} value={e.id}>{e.code} - {e.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif du mouvement (obligatoire)</label>
                <input type="text" required className="w-full border rounded-lg p-2" value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">9. Historique des mouvements de stock</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Lot préparé</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Quantité</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Aucun mouvement.</td></tr>
              ) : (
                movements.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{m.code}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{lotByPrepId(m.prepared_lot_id)?.code || `#${m.prepared_lot_id}`}</td>
                    <td className="px-6 py-4 flex items-center space-x-2 text-sm">{typeIcon[m.type]}<span>{m.type}</span></td>
                    <td className="px-6 py-4 font-bold">{m.quantity} kg</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(m.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 italic">{m.justification || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex items-start space-x-4">
        <AlertCircle className="text-amber-600 mt-1" size={24} />
        <div>
          <h4 className="font-bold text-amber-900">Information Audit</h4>
          <p className="text-amber-800 text-sm mt-1">
            Chaque mouvement (entrée/sortie/transfert/correction/blocage/déblocage) est historisé avec un motif obligatoire et l'utilisateur responsable, et met à jour directement le poids et le statut du lot préparé concerné.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Stocks
