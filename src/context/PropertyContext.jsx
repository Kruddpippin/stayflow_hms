import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/services/supabase'

const PropertyContext = createContext(null)

export function PropertyProvider({ children }) {
  const { profile } = useAuth()
  const [properties, setProperties] = useState([])
  const [activeProperty, setActiveProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProperties = useCallback(async () => {
    if (!profile?.id) { setProperties([]); setActiveProperty(null); setLoading(false); return }
    const { data } = await supabase
      .from('property_members')
      .select('*, property:properties(*)')
      .eq('profile_id', profile.id)
      .order('joined_at')
    const list = (data || []).map((m) => ({ ...m.property, memberRole: m.role }))
    setProperties(list)
    const stored = localStorage.getItem('stayflow_active_property')
    const match = list.find((p) => p.id === stored) || list[0] || null
    setActiveProperty(match)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { loadProperties() }, [loadProperties])

  function switchProperty(id) {
    const p = properties.find((pr) => pr.id === id)
    if (p) { setActiveProperty(p); localStorage.setItem('stayflow_active_property', id) }
  }

  return (
    <PropertyContext.Provider value={{ properties, activeProperty, switchProperty, loading, reload: loadProperties }}>
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperty() {
  const ctx = useContext(PropertyContext)
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider')
  return ctx
}
