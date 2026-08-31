import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { ShoppingCart, Plus, Search, FileText, MapPin, Calendar } from 'lucide-react'

const statusBadge = (s) => ({
  Prepare: 'bg-gray-100 text-gray-700',
  Expedie: 'bg-blue-100 text-blue-700',
  Cloture: 'bg-green-100 text-green-700',
}[s] || 'bg-gray-100 text-gray-700')

const Sales = () => {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [preparedLots, setPreparedLots] = useState([])
  const [search, setSearch] = useState('')
  const [newSale, setNewSale] = useState({
    customer_name: '',
    destination: '',
    status: 'Prepare',
    items: [{ prepared_lot_id: '', weight: 0 }]
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [salesRes, lotsRes] = await Promise.all([
        api.get('/sales/'),
        api.get('/prepared-lots/'),
      ])
      setSales(salesRes.data)
      // Un lot n'est vendable que s'il est en stock ou deja reserve, et a un poids disponible > 0
      setPreparedLots(lotsRes.data.filter(l => (l.status === 'En stock' || l.status === 'Reserve') && l.weight > 0))
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filteredSales = useMemo(() => {
    if (!search.trim()) return sales
    const q = search.toLowerCase()
    return sales.filter(s => s.invoice_number.toLowerCase().includes(q) || s.customer_name.toLowerCase().includes(q) || (s.destination || '').toLowerCase().includes(q))
  }, [sales, search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/sales/', newSale)
      setShowModal(false)
      setNewSale({ customer_name: '', destination: '', status: 'Prepare', items: [{ prepared_lot_id: '', weight: 0 }] })
      fetchData()
    } catch (error) {
      alert("Erreur lors de la vente : " + (error.response?.data?.detail || 'vérifiez le stock disponible.'))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">10. Ventes & Exports</h2>
          <p className="text-gray-500">Gestion des sorties commerciales et facturation (numéro généré automatiquement)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100"
        >
          <Plus size={20} />
          <span>Nouvelle Vente</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Enregistrer une Vente</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input type="text" required className="w-full border rounded-lg p-2" value={newSale.customer_name} onChange={e => setNewSale({...newSale, customer_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select className="w-full border rounded-lg p-2" value={newSale.status} onChange={e => setNewSale({...newSale, status: e.target.value})}>
                    <option value="Prepare">Préparé</option>
                    <option value="Expedie">Expédié</option>
                    <option value="Cloture">Clôturé</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input type="text" required className="w-full border rounded-lg p-2" value={newSale.destination} onChange={e => setNewSale({...newSale, destination: e.target.value})} />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Lots à expédier</h4>
                {newSale.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 mb-2">
                    <select
                      required className="border rounded-lg p-2 text-sm"
                      value={item.prepared_lot_id}
                      onChange={e => {
                        const newItems = [...newSale.items]
                        newItems[index].prepared_lot_id = parseInt(e.target.value)
                        setNewSale({...newSale, items: newItems})
                      }}
                    >
                      <option value="">Sélectionner un lot</option>
                      {preparedLots.map(l => (
                        <option key={l.id} value={l.id}>{l.code} - {l.quality} ({l.weight} kg disponibles)</option>
                      ))}
                    </select>
                    <input
                      type="number" step="0.1" required placeholder="Poids" className="border rounded-lg p-2 text-sm"
                      value={item.weight}
                      onChange={e => {
                        const newItems = [...newSale.items]
                        newItems[index].weight = parseFloat(e.target.value)
                        setNewSale({...newSale, items: newItems})
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-6 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Valider l'export</button>
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
              placeholder="Rechercher une facture, un client ou une destination..."
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
                <th className="px-6 py-3">N° Facture</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Destination</th>
                <th className="px-6 py-3">Poids Total</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Aucune vente trouvée.</td></tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800 flex items-center space-x-2">
                      <FileText size={16} className="text-primary-600" />
                      <span>{sale.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{sale.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                      <MapPin size={14} className="mr-1 text-gray-400" />
                      {sale.destination}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary-700">{sale.total_weight} kg</td>
                    <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadge(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/traceability/${sale.invoice_number}`}
                        className="text-primary-600 hover:text-primary-700 font-bold text-sm"
                      >
                        Traçabilité
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Sales
