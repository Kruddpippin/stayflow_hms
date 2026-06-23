import { useState, useEffect, useCallback } from 'react'

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function useFormFields(initial) {
  const [form, setForm] = useState(initial)
  const set = useCallback((k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value })), [])
  const reset = useCallback((values) => setForm(values || initial), [initial])
  return [form, set, setForm, reset]
}
