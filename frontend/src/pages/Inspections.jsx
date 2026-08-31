import React, { useState, useEffect, useMemo } from 'react'
import api from '../api'
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Plus, FileText, ListChecks, X } from 'lucide-react'

const resultBadge = (r) => ({
  Conforme: 'bg-green-100 text-green-700',
  'Conforme avec reserve': 'bg-amber-100 text-amber-700',
  'Non conforme': 'bg-red-100 text-red-700',
}[r] || 'bg-gray-100 text-gray-700')

const controlResultBadge = (r) => ({
  Oui: 'bg-green-100 text-green-700',
  Non: 'bg-red-100 text-red-700',
  'Non applicable': 'bg-gray-100 text-gray-700',
}[r] || 'bg-gray-100 text-gray-700')

const emptyControlForm = {
  category: 'Documentaire', control_point: '', result: 'Non applicable',
  risk_level: '', comment: '', triggers_non_conformity: false,
}

// Objet concerne (polymorphe) : type -> { champ FK, label, cle de la liste, fonction de libelle }
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

const emptyForm = {
  object_type: 'Parcelle',
  producer_id: '', parcel_id: '', harvest_id: '', collection_id: '', green_lot_id: '',
  transformation_id: '', prepared_lot_id: '', sale_id: '',
  checklist: '',
  compliance_borders: true,
  no_chemicals: true,
  traceability_maintained: true,
  proper_harvest_practices: true,
  result: 'Conforme',
  auditor_signature: false,
  producer_signature: false,
  observations: '',
}

const Inspections = () => {
  const [inspections, setInspections] = useState([])
  const [lists, setLists] = useState({ producers: [], parcels: [], harvests: [], collections: [], greenLots: [], transformations: [], preparedLots: [], sales: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [controlsInsp, setControlsInsp] = useState(null)
  const [controls, setControls] = useState([])
  const [controlForm, setControlForm] = useState(emptyControlForm)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [inspRes, prodRes, parRes, harvRes, colRes, glRes, trRes, plRes, saleRes] = await Promise.all([
        api.get('/inspections/'),
        api.get('/producers/'),
        api.get('/parcels/'),
        api.get('/harvests/'),
        api.get('/collections/'),
        api.get('/green-lots/'),
        api.get('/transformations/'),
        api.get('/prepared-lots/'),
        api.get('/sales/'),
      ])
      setInspections(inspRes.data)
      setLists({
        producers: prodRes.data, parcels: parRes.data, harvests: harvRes.data, collections: colRes.data,
        greenLots: glRes.data, transformations: trRes.data, preparedLots: plRes.data, sales: saleRes.data,
      })
    } catch (error) {
      console.error("Erreur détaillée Axios:", error.response || error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const parcelByCode = useMemo(() => Object.fromEntries(lists.parcels.map(p => [p.id, p.code])), [lists.parcels])

  // Libelle de l'objet concerne pour une inspection donnee (colonne "Objet" du tableau)
  const objectLabel = (insp) => {
    const def = OBJECT_TYPES.find(t => t.value === insp.object_type) || OBJECT_TYPES[1]
    const refId = insp[def.field]
    const item = (lists[def.listKey] || []).find(o => o.id === refId)
    return item ? def.label(item) : (refId ? `#${refId}` : '-')
  }

  const currentTypeDef = OBJECT_TYPES.find(t => t.value === form.object_type) || OBJECT_TYPES[1]

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      const payload = {
        object_type: form.object_type,
        checklist: form.checklist,
        compliance_borders: form.compliance_borders,
        no_chemicals: form.no_chemicals,
        traceability_maintained: form.traceability_maintained,
        proper_harvest_practices: form.proper_harvest_practices,
        result: form.result,
        auditor_signature: form.auditor_signature,
        producer_signature: form.producer_signature,
        observations: form.observations,
        auditor_id: user.id,
      }
      // Seul le champ FK correspondant au type d'objet selectionne est envoye.
      payload[currentTypeDef.field] = form[currentTypeDef.field] ? parseInt(form[currentTypeDef.field]) : null
      await api.post('/inspections/', payload)
      setShowModal(false)
      setForm(emptyForm)
      fetchData()
    } catch (error) {
      alert("Erreur lors de la création de l'inspection : " + (error.response?.data?.detail || ''))
    }
  }

  const openControls = async (insp) => {
    setControlsInsp(insp)
    setControlForm(emptyControlForm)
    try {
      const res = await api.get(`/inspections/${insp.id}/controls`)
      setControls(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  const submitControl = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...controlForm, risk_level: controlForm.risk_level || null }
      await api.post(`/inspections/${controlsInsp.id}/controls`, payload)
      setControlForm(emptyControlForm)
      const res = await api.get(`/inspections/${controlsInsp.id}/controls`)
      setControls(res.data)
      if (payload.triggers_non_conformity) {
        alert("Point de contrôle enregistré — une non-conformité a été créée automatiquement.")
      }
    } catch (error) {
      alert("Erreur lors de l'ajout du contrôle : " + (error.response?.data?.detail || ''))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">12. Inspections Internes</h2>
          <p className="text-gray-500">Contrôles sur toute la chaîne de traçabilité — une non-conformité "Non conforme" sur une parcelle la suspend automatiquement</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100"
        >
          <Plus size={20} />
          <span>Nouvelle Inspection</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Enregistrer une Inspection</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objet concerné</label>
                  <select className="w-full border rounded-lg p-2" value={form.object_type} onChange={e => setForm({ ...form, object_type: e.target.value })}>
                    {OBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                  <select required className="w-full border rounded-lg p-2" value={form[currentTypeDef.field]} onChange={e => setForm({ ...form, [currentTypeDef.field]: e.target.value })}>
                    <option value="">Sélectionner...</option>
                    {(lists[currentTypeDef.listKey] || []).map(o => <option key={o.id} value={o.id}>{currentTypeDef.label(o)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Checklist (notes libres)</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={form.checklist} onChange={e => setForm({ ...form, checklist: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" checked={form.compliance_borders} onChange={e => setForm({ ...form, compliance_borders: e.target.checked })} />
                  <span>Respect des bordures</span>
                </label>
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" checked={form.no_chemicals} onChange={e => setForm({ ...form, no_chemicals: e.target.checked })} />
                  <span>Absence de produits chimiques</span>
                </label>
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" checked={form.traceability_maintained} onChange={e => setForm({ ...form, traceability_maintained: e.target.checked })} />
                  <span>Traçabilité maintenue</span>
                </label>
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" checked={form.proper_harvest_practices} onChange={e => setForm({ ...form, proper_harvest_practices: e.target.checked })} />
                  <span>Bonnes pratiques de récolte</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Résultat</label>
                <select className="w-full border rounded-lg p-2" value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}>
                  <option value="Conforme">Conforme</option>
                  <option value="Conforme avec reserve">Conforme avec réserve</option>
                  <option value="Non conforme">Non conforme</option>
                </select>
              </div>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={form.auditor_signature} onChange={e => setForm({ ...form, auditor_signature: e.target.checked })} />
                  <span>Signature auditeur</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={form.producer_signature} onChange={e => setForm({ ...form, producer_signature: e.target.checked })} />
                  <span>Signature producteur</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2 h-20" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center space-x-4">
          <CheckCircle className="text-green-600" size={32} />
          <div>
            <p className="text-sm text-green-700 font-medium">Conformes</p>
            <h3 className="text-2xl font-bold text-green-800">{inspections.filter(i => i.result === 'Conforme').length}</h3>
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center space-x-4">
          <XCircle className="text-red-600" size={32} />
          <div>
            <p className="text-sm text-red-700 font-medium">Non-conformes</p>
            <h3 className="text-2xl font-bold text-red-800">{inspections.filter(i => i.result === 'Non conforme').length}</h3>
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center space-x-4">
          <ClipboardCheck className="text-blue-600" size={32} />
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Inspections</p>
            <h3 className="text-2xl font-bold text-blue-800">{inspections.length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Objet</th>
              <th className="px-6 py-3">Référence</th>
              <th className="px-6 py-3">Checklist</th>
              <th className="px-6 py-3">Résultat</th>
              <th className="px-6 py-3">Contrôles</th>
              <th className="px-6 py-3">Rapport</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : inspections.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400">Aucune inspection réalisée.</td></tr>
            ) : (
              inspections.map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-bold text-primary-600">{i.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(i.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{i.object_type || 'Parcelle'}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{objectLabel(i)}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <div title="Bordures" className={`w-3 h-3 rounded-full ${i.compliance_borders ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div title="Chimiques" className={`w-3 h-3 rounded-full ${i.no_chemicals ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div title="Registre" className={`w-3 h-3 rounded-full ${i.traceability_maintained ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div title="Récolte" className={`w-3 h-3 rounded-full ${i.proper_harvest_practices ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${resultBadge(i.result)}`}>{i.result}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => openControls(i)} className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-bold">
                      <ListChecks size={14} /><span>Voir / Ajouter</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`/api/documents/inspection/${i.id}/pdf`} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-bold">
                      <FileText size={14} /><span>PDF</span>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {controlsInsp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Contrôles détaillés — {controlsInsp.code}</h3>
                <p className="text-sm text-gray-500">{objectLabel(controlsInsp)} ({controlsInsp.object_type || 'Parcelle'})</p>
              </div>
              <button onClick={() => setControlsInsp(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-2 mb-6 max-h-56 overflow-y-auto">
              {controls.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun point de contrôle enregistré pour cette inspection.</p>
              ) : controls.map(c => (
                <div key={c.id} className="border rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-400 uppercase">{c.category}</div>
                    <div className="font-medium text-gray-800">{c.control_point}</div>
                    {c.comment && <div className="text-sm text-gray-500 mt-1">{c.comment}</div>}
                    {c.risk_level && <div className="text-xs text-amber-600 mt-1">Risque : {c.risk_level}</div>}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${controlResultBadge(c.result)}`}>{c.result}</span>
                    {c.triggers_non_conformity && <span className="flex items-center text-xs text-red-600"><AlertTriangle size={12} className="mr-1" />NC créée</span>}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={submitControl} className="space-y-3 border-t pt-4">
              <h4 className="font-bold text-gray-700 text-sm">Ajouter un point de contrôle</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select className="w-full border rounded-lg p-2" value={controlForm.category} onChange={e => setControlForm({ ...controlForm, category: e.target.value })}>
                    <option value="Documentaire">Documentaire</option>
                    <option value="Bio">Bio</option>
                    <option value="Tracabilite">Traçabilité</option>
                    <option value="Stock">Stock</option>
                    <option value="Qualite">Qualité</option>
                    <option value="Export">Export</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Résultat</label>
                  <select className="w-full border rounded-lg p-2" value={controlForm.result} onChange={e => setControlForm({ ...controlForm, result: e.target.value })}>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                    <option value="Non applicable">Non applicable</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Point de contrôle</label>
                <input required type="text" placeholder="Ex. Contrat signé disponible" className="w-full border rounded-lg p-2" value={controlForm.control_point} onChange={e => setControlForm({ ...controlForm, control_point: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau de risque</label>
                  <select className="w-full border rounded-lg p-2" value={controlForm.risk_level} onChange={e => setControlForm({ ...controlForm, risk_level: e.target.value })}>
                    <option value="">Non renseigné</option>
                    <option value="Faible">Faible</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Eleve">Élevé</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={controlForm.triggers_non_conformity} onChange={e => setControlForm({ ...controlForm, triggers_non_conformity: e.target.checked })} />
                    <span>Déclenche une non-conformité</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={controlForm.comment} onChange={e => setControlForm({ ...controlForm, comment: e.target.value })} />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700">Ajouter le contrôle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inspections
