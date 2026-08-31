import React, { useState, useEffect } from 'react'
import api from '../api'
import { History, Play, CheckCircle, TrendingDown, Scale, Package, FileText } from 'lucide-react'

const statutBadge = (v) => ({
  Cloturee: 'bg-green-100 text-green-700',
  'En cours': 'bg-blue-100 text-blue-700',
  Brouillon: 'bg-gray-100 text-gray-700',
  Bloquee: 'bg-red-100 text-red-700',
  Annulee: 'bg-red-100 text-red-700',
}[v] || 'bg-gray-100 text-gray-700')

const Transformations = () => {
  const [transformations, setTransformations] = useState([])
  const [availableLots, setAvailableLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedLotIds, setSelectedLotIds] = useState([])
  const [lotWeights, setLotWeights] = useState({})
  const [observations, setObservations] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [transRes, lotsRes] = await Promise.all([
        api.get('/transformations/'), api.get('/green-lots/'),
      ])
      setTransformations(transRes.data)
      setAvailableLots(lotsRes.data.filter(l => (l.status === 'Disponible' || l.status === 'Partiellement utilise') && l.remaining_weight > 0))
    } catch (error) {
      console.error('Erreur lors de la récupération des transformations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const toggleLot = (lot) => {
    setSelectedLotIds(prev => {
      if (prev.includes(lot.id)) {
        return prev.filter(x => x !== lot.id)
      }
      setLotWeights(w => ({ ...w, [lot.id]: lot.remaining_weight }))
      return [...prev, lot.id]
    })
  }

  const setLotWeight = (id, value) => {
    setLotWeights(w => ({ ...w, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedLotIds.length === 0) {
      alert('Sélectionnez au moins un lot vert.')
      return
    }
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      await api.post('/transformations/', {
        input_lots: selectedLotIds.map(id => ({ green_lot_id: id, weight_used: parseFloat(lotWeights[id]) })),
        manager_id: user.id, observations,
      })
      setShowModal(false)
      setSelectedLotIds([])
      setLotWeights({})
      setObservations('')
      fetchData()
    } catch (error) {
      alert("Erreur lors du lancement de la transformation : " + (error.response?.data?.detail || 'verifiez les champs.'))
    }
  }

  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [selectedTrans, setSelectedTrans] = useState(null)
  const [finalizeData, setFinalizeData] = useState({
    gourmet_weight: 0, standard_weight: 0, tk_weight: 0, fendue_weight: 0, status: 'Cloturee',
  })

  const updateTransStatus = async (t, newStatus) => {
    if (!confirm(`Passer la transformation ${t.operation_number} au statut "${newStatus}" ? Les lots verts déjà consommés ne seront pas restitués automatiquement.`)) return
    try {
      await api.put(`/transformations/${t.id}/status`, { status: newStatus })
      fetchData()
    } catch (error) {
      alert('Erreur lors du changement de statut : ' + (error.response?.data?.detail || ''))
    }
  }

  const handleFinalizeSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/transformations/${selectedTrans.id}/complete`, finalizeData)
      setShowFinalizeModal(false)
      fetchData()
    } catch (error) {
      alert('Erreur lors de la finalisation : ' + (error.response?.data?.detail || 'verifiez les poids.'))
    }
  }

  const outputTotal = (finalizeData.gourmet_weight || 0) + (finalizeData.standard_weight || 0) + (finalizeData.tk_weight || 0) + (finalizeData.fendue_weight || 0)
  const outputExceeds = !!selectedTrans && outputTotal > selectedTrans.input_weight + 1e-6

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">6. Transformations</h2>
          <p className="text-gray-500">Suivi de la préparation de la vanille (Verte → Préparée)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <Play size={20} /><span>Nouvelle Opération</span>
        </button>
      </header>

      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2 text-gray-800">Finaliser la Préparation</h3>
            <p className="text-sm text-gray-500 mb-6 font-mono">{selectedTrans?.operation_number} - Entrée: {selectedTrans?.input_weight} kg</p>

            <form onSubmit={handleFinalizeSubmit} className="space-y-6">
              <div className={`p-4 rounded-xl border ${outputExceeds ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-100'}`}>
                <p className={`text-sm font-bold ${outputExceeds ? 'text-red-800' : 'text-primary-800'}`}>Poids sortie total calculé : {outputTotal.toFixed(1)} kg</p>
                {outputExceeds ? (
                  <p className="text-xs text-red-700 mt-1 font-bold">Dépasse le poids entrant ({selectedTrans?.input_weight} kg) de {(outputTotal - (selectedTrans?.input_weight || 0)).toFixed(1)} kg — corrigez la répartition avant de valider.</p>
                ) : (
                  <p className="text-[10px] text-primary-600 mt-1 uppercase font-bold">Le rendement et les pertes seront calculés automatiquement</p>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-700 border-b pb-2 uppercase tracking-wider">Répartition par qualité</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Gourmet (kg)</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={finalizeData.gourmet_weight} onChange={e => setFinalizeData({ ...finalizeData, gourmet_weight: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Standard (kg)</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={finalizeData.standard_weight} onChange={e => setFinalizeData({ ...finalizeData, standard_weight: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">TK (kg)</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={finalizeData.tk_weight} onChange={e => setFinalizeData({ ...finalizeData, tk_weight: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fendue (kg)</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={finalizeData.fendue_weight} onChange={e => setFinalizeData({ ...finalizeData, fendue_weight: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut de la transformation</label>
                <select className="w-full border rounded-lg p-2" value={finalizeData.status} onChange={e => setFinalizeData({ ...finalizeData, status: e.target.value })}>
                  <option value="Cloturee">Cloturee</option>
                  <option value="En cours">En cours</option>
                  <option value="Bloquee">Bloquee</option>
                  <option value="Annulee">Annulee</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setShowFinalizeModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" disabled={outputExceeds} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-lg shadow-primary-100 disabled:opacity-40 disabled:cursor-not-allowed">Générer les lots</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2 text-gray-800">Lancer une Préparation</h3>
            <p className="text-sm text-gray-500 mb-4">Sélectionnez un ou plusieurs lots verts ; le poids utilisé peut être partiel (le reste demeure disponible, statut "Partiellement utilisé").</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                {availableLots.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">Aucun lot vert disponible pour transformation.</div>
                ) : (
                  availableLots.map(l => (
                    <div key={l.id} className="p-3 hover:bg-gray-50">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" checked={selectedLotIds.includes(l.id)} onChange={() => toggleLot(l)} />
                        <span className="flex-1 text-sm">{l.code} - {l.remaining_weight}kg disponible</span>
                        <span className="text-xs text-gray-500">{l.bio_status}</span>
                      </label>
                      {selectedLotIds.includes(l.id) && (
                        <div className="mt-2 ml-7 flex items-center space-x-2">
                          <label className="text-xs text-gray-500">Poids utilisé (kg)</label>
                          <input
                            type="number" step="0.1" min="0.1" max={l.remaining_weight} required
                            className="border rounded-lg p-1 text-sm w-28"
                            value={lotWeights[l.id] ?? l.remaining_weight}
                            onChange={e => setLotWeight(l.id, e.target.value)}
                          />
                          <span className="text-xs text-gray-400">/ {l.remaining_weight} kg max</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea className="w-full border rounded-lg p-2" rows="2" value={observations} onChange={e => setObservations(e.target.value)} />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Lancer ({selectedLotIds.length})</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">N° Opération</th>
              <th className="px-6 py-3">Début</th>
              <th className="px-6 py-3 text-center">Poids Entrée</th>
              <th className="px-6 py-3 text-center">Poids Sortie</th>
              <th className="px-6 py-3 text-center">Rendement</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : transformations.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Aucune opération de transformation enregistrée.</td></tr>
            ) : (
              transformations.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-800">{t.operation_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.start_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center font-medium">{t.input_weight} kg</td>
                  <td className="px-6 py-4 text-center font-medium text-primary-600">{t.output_weight ? `${t.output_weight} kg` : '-'}</td>
                  <td className="px-6 py-4 text-center">
                    {t.global_yield ? (
                      <span className="inline-flex items-center text-sm font-bold text-green-600">
                        <TrendingDown size={14} className="mr-1 rotate-180" />
                        {t.global_yield.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statutBadge(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    {(t.status === 'En cours' || t.status === 'Brouillon') ? (
                      <button
                        onClick={() => {
                          setSelectedTrans(t)
                          setFinalizeData({
                            gourmet_weight: t.gourmet_weight || 0, standard_weight: t.standard_weight || 0,
                            tk_weight: t.tk_weight || 0, fendue_weight: t.fendue_weight || 0, status: 'Cloturee',
                          })
                          setShowFinalizeModal(true)
                        }}
                        className="text-primary-600 hover:text-primary-700 font-bold text-sm"
                      >
                        Finaliser
                      </button>
                    ) : (
                      <span className="text-gray-400 font-medium text-sm">{t.status === 'Cloturee' ? 'Terminé' : '-'}</span>
                    )}
                    {(t.status === 'En cours' || t.status === 'Brouillon') && (
                      <>
                        <button onClick={() => updateTransStatus(t, 'Bloquee')} className="ml-3 text-amber-600 hover:text-amber-700 text-sm font-bold">Bloquer</button>
                        <button onClick={() => updateTransStatus(t, 'Annulee')} className="ml-3 text-red-600 hover:text-red-700 text-sm font-bold">Annuler</button>
                      </>
                    )}
                    {t.status === 'Bloquee' && (
                      <button onClick={() => updateTransStatus(t, 'En cours')} className="ml-3 text-green-600 hover:text-green-700 text-sm font-bold">Débloquer</button>
                    )}
                    {(t.status === 'Bloquee' || t.status === 'Annulee') && (
                      <span className="ml-3 text-xs text-gray-400">(lots verts non restitués)</span>
                    )}
                    <a href={`/api/documents/transformation/${t.id}/pdf`} target="_blank" rel="noreferrer" className="ml-3 text-primary-600 hover:text-primary-700 inline-flex items-center space-x-1 text-sm font-bold">
                      <FileText size={14} /><span>PDF</span>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
          <div className="flex items-center space-x-3 mb-2">
            <Scale className="text-primary-600" size={20} />
            <h4 className="font-bold text-primary-800">Calcul des pertes</h4>
          </div>
          <p className="text-sm text-primary-700">Le système calcule automatiquement la perte et le rendement entre la vanille verte et préparée.</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <div className="flex items-center space-x-3 mb-2">
            <Package className="text-amber-600" size={20} />
            <h4 className="font-bold text-amber-800">Lots préparés</h4>
          </div>
          <p className="text-sm text-amber-700">À la finalisation, les lots sont divisés par qualité : Gourmet, Standard, TK et Fendue.</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center space-x-3 mb-2">
            <History className="text-blue-600" size={20} />
            <h4 className="font-bold text-blue-800">Traçabilité</h4>
          </div>
          <p className="text-sm text-blue-700">Chaque lot préparé conserve le lien indélébile avec les lots verts d'origine.</p>
        </div>
      </div>
    </div>
  )
}

export default Transformations
