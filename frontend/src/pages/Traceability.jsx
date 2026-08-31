import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { ArrowLeft, FileText, ChevronRight, User, Map, Sprout, Package, History } from 'lucide-react'

const Traceability = () => {
  const { invoiceNumber } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTraceability = async () => {
      try {
        const response = await api.get(`/traceability/sale/${invoiceNumber}`)
        setData(response.data)
      } catch (error) {
        console.error("Erreur traçabilité:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTraceability()
  }, [invoiceNumber])

  if (loading) return <div className="p-8 text-center">Analyse de la généalogie en cours...</div>
  if (!data) return <div className="p-8 text-center text-red-500">Vente introuvable.</div>

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center space-x-4">
        <Link to="/sales" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Généalogie du Lot</h2>
          <p className="text-gray-500 font-mono">Facture: {data.sale.invoice_number}</p>
        </div>
      </header>

      <div className="relative">
        {/* Ligne de temps verticale */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {data.traceability.map((item, idx) => (
          <div key={idx} className="space-y-12 relative">
            
            {/* 1. Étape Vente / Lot Préparé */}
            <div className="flex items-start space-x-8">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-200 text-white">
                <FileText size={32} />
              </div>
              <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Sortie Commerciale</h3>
                    <p className="text-primary-600 font-mono font-bold">{item.prepared_lot.code}</p>
                  </div>
                  <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold uppercase">
                    {item.prepared_lot.quality}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="text-gray-500">Client: <span className="text-gray-800 font-medium">{data.sale.customer_name}</span></div>
                  <div className="text-gray-500">Poids vendu: <span className="text-gray-800 font-medium">{item.prepared_lot.weight} kg</span></div>
                </div>
              </div>
            </div>

            {/* 2. Étape Transformation */}
            <div className="flex items-start space-x-8">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl shadow-lg shadow-amber-100 text-white">
                <History size={32} />
              </div>
              <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Transformation / Préparation</h3>
                <p className="text-amber-600 font-mono font-bold">{item.transformation.operation_number}</p>
                <div className="mt-4 flex items-center space-x-6 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar size={14} className="mr-1.5" />
                    {new Date(item.transformation.start_date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500">Rendement: <span className="text-green-600 font-bold">{item.transformation.global_yield?.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* 3. Étape Lots Verts & Origines */}
            {item.inputs.map((input, iIdx) => (
              <div key={iIdx} className="space-y-6">
                <div className="flex items-start space-x-8">
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl shadow-lg shadow-green-100 text-white">
                    <Package size={32} />
                  </div>
                  <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Lot Vert Collecté</h3>
                    <p className="text-green-600 font-mono font-bold">{input.green_lot.code}</p>
                    
                    <div className="mt-6 space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Producteurs d'origine</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {input.origins.map((origin, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-600 border border-gray-200">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{origin.producer.first_name} {origin.producer.last_name}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Map size={10} className="mr-1" /> {origin.parcel.village}
                                <ChevronRight size={10} className="mx-1" />
                                <Sprout size={10} className="mr-1" /> {origin.collection.net_weight} kg
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const Calendar = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

export default Traceability
