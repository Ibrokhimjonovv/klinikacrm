import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { api } from '../App'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  // ---- Bemorlar (hamshira uchun umumiy ro'yxat) ----
  const [patients, setPatients] = useState([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState(null)
  const [patientsCount, setPatientsCount] = useState(0)

  // ---- Doctor uchun 3 xil holatdagi bemorlar soni ----
  const [doctorCounts, setDoctorCounts] = useState({
    waiting: 0,
    process: 0,
    completed: 0,
    all: 0,
  })

  const [patientCounts, setPatientCounts] = useState({
    waiting: 0,
    process: 0,
    done: 0,
    all: 0,
  })

  const fetchMe = async () => {
    const token = localStorage.getItem('hospital_access')

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${api}/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        localStorage.removeItem('hospital_access')
        localStorage.removeItem('hospital_refresh')
        setUser(null)
        return
      }

      const data = await res.json()
      setUser(data)

    } catch (err) {
      console.error("Foydalanuvchi ma'lumotini olishda xatolik:", err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const formatPatient = (patient, index) => ({
    id: patient.id || index + 1,
    name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || "Noma'lum",
    time: patient.create_date || patient.created_at || '00:00',
    complaint: patient.complaints?.at(-1)?.complaint || "Ko'rsatilmagan",
    doctor_name: patient.created_by?.first_name || patient.doctor || 'Kutilmoqda',
    doctor_surename: patient.created_by?.middle_name || patient.doctor || 'Kutilmoqda',
    raw: patient,
  })

  const fetchPatients = useCallback(async () => {
    try {
      setPatientsLoading(true)
      const token = localStorage.getItem('hospital_access')
      const res = await fetch(`${api}/patientInfo/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      const data = await res.json()
      setPatients(data.map(formatPatient))
      setPatientsError(null)
    } catch (err) {
      console.error('Bemorlarni olishda xatolik:', err)
      setPatientsError(err.message)
    } finally {
      setPatientsLoading(false)
    }
  }, [])

  const fetchPatientsCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('hospital_access')
      const res = await fetch(`${api}/countPatients/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setPatientsCount(data.count || 0)
    } catch (err) {
      console.error('Bemorlar sonini olishda xatolik:', err)
    }
  }, [])

  const fetchDoctorCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('hospital_access')
      const res = await fetch(`${api}/countall/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()

      setDoctorCounts({
        waiting: data.waiting ?? 0,
        process: data.in_progress ?? 0,
        completed: data.done ?? 0,
        all: data.all ?? 0,
      })
    } catch (err) {
      console.error('Doctor uchun bemorlar sonini olishda xatolik:', err)
    }
  }, [])

  const fetchPatientCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('hospital_access')

      const res = await fetch(
        `${api}/patient/me/treatments/count/`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      setPatientCounts({
        waiting: data.waiting ?? 0,
        process: data.in_progress ?? 0,
        done: data.done ?? 0,
        all: data.all ?? 0,
      })

    } catch (err) {
      console.error(
        "Bemor statistikalarini olishda xatolik:",
        err
      )
    }
  }, [])

  const addPatientLocally = useCallback((patientRaw) => {
    setPatients(prev => [formatPatient(patientRaw, prev.length), ...prev])
    setPatientsCount(prev => prev + 1)
  }, [])

  const removePatientLocally = useCallback((patientId) => {
    setPatients(prev => prev.filter(p => String(p.id) !== String(patientId)))
    setPatientsCount(prev => Math.max(0, prev - 1))
  }, [])

  useEffect(() => {
    fetchMe()
  }, [])

  useEffect(() => {
    if (user?.role === 'ResNurse') {
      fetchPatientsCount()
    }

    if (user?.role === 'Doctor') {
      fetchDoctorCounts()
    }

    if (user?.role === 'Patient') {
      fetchPatientCounts()
    }
  }, [
    user,
    fetchPatientsCount,
    fetchDoctorCounts,
    fetchPatientCounts,
  ])

  useEffect(() => {
    let wasSmall = window.innerWidth < 1000

    const handleResize = () => {
      const isSmall = window.innerWidth < 1000
      if (isSmall !== wasSmall) {
        setCollapsed(isSmall)
        wasSmall = isSmall
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const logout = () => {
    localStorage.removeItem('hospital_access')
    localStorage.removeItem('hospital_refresh')
    setUser(null)
  }

  const value = {
    user,
    loading,
    setUser,
    fetchMe,
    logout,
    collapsed,
    setCollapsed,

    patients,
    patientsLoading,
    patientsError,
    fetchPatients,
    addPatientLocally,
    removePatientLocally,
    patientsCount,
    fetchPatientsCount,

    doctorCounts,
    fetchDoctorCounts,

    patientCounts,
    fetchPatientCounts,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

export default AppContext