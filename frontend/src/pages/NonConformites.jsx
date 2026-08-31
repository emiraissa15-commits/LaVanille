import React, { useState, useEffect, useMemo } from 'react'
import api from '../api'
import { ShieldAlert, Plus, Search } from 'lucide-react'

const statusBadge = (s) => ({
  Ouverte: 'bg-red-100 text-red-700',
  'En cours': 'bg-amber-100 text-amber-700',
  Cloturee: 'bg-green-100 text-green-700',
}[s] || 'bg-gray-100 text-gray-700')

const typeBadge = (t) => (t === 'Majeure' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')

// Objet concerne (polymorphe, optionnel) : type -> { champ FK, cle de la liste, libelle }
const OBJECT_TYPES = [
  { value: 'Producteur', field: 'producer_id', listKey: 'producers', label: (o) => `${o.code} - ${o.first_name} ${o.last_name}` },
  { value: 'Parcelle', field: 'parcel_id', listKey: 'parcels', label: (o) => `${o.code} - ${o.name || 'Sans nom'}` },
  { value: 'Recolte', field: 'harvest_id', listKey: 'harvests', label: (o) => `${o.code || '#' + o.id}` },
  { value: 'Collecte', field: 'collection_id', listKey: 'collections', label: (o) => `${o.code || o.slip_number}` },
  { value: 'Lot vert', field: 'green_lot_id', listKey: 'greenLots', label: (o) => `${o.code}` },
  { value: 'Transformation', field: 'transformation_id', listKey: 'transformations', label: (o) => `${o.operation_number}` },
  { value: 'Lot prepare', field: 'prepared_lot_id', listKey: 'preparedLots', label: (o) => `${o.code}` },
  { value: 'Vente', field: 'sale_id', listKey: 'sales', label: (o) => `${o.invoice_number}` },
]
const FK_FIELDS = OBJECT_TYPES.map(t => t.field)

const emptyForm = {
  inspection_id: '', object_type: '',
  producer_id: '', parcel_id: '', harvest_id: '', collection_id: '', green_lot_id: '',
  transformation_id: '', prepared_lot_id: '', sale_id: '',
  type: 'Mineure', description: '',
  decision: '', corrective_action: '', responsible_id: '', deadline: '', status: 'Ouverte', sanction: '',
}

const NonConformites = () => {
  const [items, setItems] = useState([])
  const [inspections, setInspections] = useState([])
  const [users, setUsers] = useState([])
  const [lists, setLists] = useState({ producers: [], parcels: [], harvests: [], collections: [], greenLots: [], transformations: [], preparedLots: [], sales: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ncRes, inspRes, usersRes, prodRes, parRes, harvRes, colRes, glRes, trRes, plRes, saleRes] = await Promise.all([
        api.get('/non-conformities/'),
        api.get('/inspections/'),
        api.get('/users/'),
        api.get('/producers/'),
        api.get('/parcels/'),
        api.get('/harvests/'),
        api.get('/collections/'),
        api.get('/green-lots/'),
        api.get('/transformations/'),
        api.get('/prepared-lots/'),
        api.get('/sales/'),
      ])
      setItems(ncRes.data)
      setInspections(inspRes.data)
      setUsers(usersRes.data)
      setLists({
        producers: prodRes.data, parcels: parRes.data, harvests: harvRes.data, collections: colRes.data,
        greenLots: glRes.data, transformations: trRes.data, preparedLots: plRes.data, sales: saleRes.data,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const producerByCode = useMemo(() => Object.fromEntries(lists.producers.map(p => [p.id, `${p.first_name} ${p.last_name}`])), [lists.producers])

  const objectLabel = (nc) => {
    const def = OBJECT_TYPES.find(t => t.value === nc.object_type)
    if (!def) return nc.producer_id ? (producerByCode[nc.producer_id] || `#${nc.producer_id}`) : '-'
    const item = (lists[def.listKey] || []).find(o => o.id === nc[def.field])
    return item ? def.label(item) : (nc[def.field] ? `#${nc[def.field]}` : '-')
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(nc => (nc.code || '').toLowerCase().includes(q) || nc.description.toLowerCase().includes(q))
  }, [items, search])

  const currentTypeDef = OBJECT_TYPES.find(t => t.value === form.object_type)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        inspection_id: form.inspection_id ? parseInt(form.inspection_id) : null,
        object_type: form.object_type || null,
        type: form.type, description: form.description, decision: form.decision,
        corrective_action: form.corrective_action,
        responsible_id: form.responsible_id ? parseInt(form.responsible_id) : null,
        deadline: form.deadline || null,
        status: form.status, sanction: form.sanction,
      }
      // Seul le champ FK correspondant au type d'objet selectionne (s'il y en a un) est envoye.
      FK_FIELDS.forEach(f => { payload[f] = null })
      if (currentTypeDef) {
        payload[currentTypeDef.field] = form[currentTypeDef.field] ? parseInt(form[currentTypeDef.field]) : null
      }
      await api.post('/non-conformities/', payload)
      setShowModal(false)
      setForm(emptyForm)
      fetchData()
    } catch (error) {
      alert("Erreur : " + (error.response?.data?.detail || ''))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">13. Non-conformités</h2>
          <p className="text-gray-500">Suivi des écarts détectés sur toute la chaîne de traçabilité</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Plus size={20} /><span>Nouvelle non-conformité</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Enregistrer une non-conformité</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inspection liée (optionnel)</label>
                <select className="w-full border rounded-lg p-2" value={form.inspection_id} onChange={e => setForm({ ...form, inspection_id: e.target.value })}>
                  <option value="">Aucune</option>
                  {inspections.map(i => <option key={i.id} value={i.id}>{i.code} - {i.result}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objet concerné (optionnel)</label>
                  <select className="w-full border rounded-lg p-2" value={form.object_type} onChange={e => setForm({ ...form, object_type: e.target.value })}>
                    <option value="">Non renseigné</option>
                    {OBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                  <select disabled={!currentTypeDef} className="w-full border rounded-lg p-2 disabled:bg-gray-100" value={currentTypeDef ? form[currentTypeDef.field] : ''} onChange={e => currentTypeDef && setForm({ ...form, [currentTypeDef.field]: e.target.value })}>
                    <option value="">Sélectionner...</option>
                    {currentTypeDef && (lists[currentTypeDef.listKey] || []).map(o => <option key={o.id} value={o.id}>{currentTypeDef.label(o)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full border rounded-lg p-2" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="Mineure">Mineure</option>
                    <option value="Majeure">Majeure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select className="w-full border rounded-lg p-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Ouverte">Ouverte</option>
                    <option value="En cours">En cours</option>
                    <option value="Cloturee">Clôturée</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required className="w-full border rounded-lg p-2" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action corrective</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                  <select className="w-full border rounded-lg p-2" value={form.responsible_id} onChange={e => setForm({ ...form, responsible_id: e.target.value })}>
                    <option value="">Non assigné</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                  <input type="date" className="w-full border rounded-lg p-2" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sanction éventuelle</label>
                <input type="text" className="w-full border rounded-lg p-2" value={form.sanction} onChange={e => setForm({ ...form, sanction: e.target.value })} />
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
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Rechercher par code ou description..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Objet</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Echeance</th>
              <th className="px-6 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Aucune non-conformité.</td></tr>
            ) : (
              filtered.map(nc => (
                <tr key={nc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-bold text-primary-600">{nc.code}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${typeBadge(nc.type)}`}>{nc.type}</span></td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-xs text-gray-400">{nc.object_type || (nc.producer_id ? 'Producteur' : '-')}</div>
                    <div className="font-medium text-gray-700">{objectLabel(nc)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{nc.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{nc.deadline ? new Date(nc.deadline).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadge(nc.status)}`}>{nc.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex items-start space-x-4">
        <ShieldAlert className="text-amber-600 mt-1" size={24} />
        <div>
          <h4 className="font-bold text-amber-900">Rappel</h4>
          <p className="text-amber-800 text-sm mt-1">
            Une non-conformité peut être créée indépendamment ou liée à une inspection, et rattachée à n'importe quel maillon de la chaîne (producteur, parcelle, récolte, collecte, lot vert, transformation, lot préparé, vente).
          </p>
        </div>
      </div>
    </div>
  )
}

export default NonConformites
