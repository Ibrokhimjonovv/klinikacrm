import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import NotFound from './pages/NotFound/NotFound'
import Login from './pages/Login/Login'
import Header from './components/Header/Header'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import { useAppContext } from './context/context'
import s from './App.module.scss'
import DoctorHome from './pages/Shifokor/DoctorHome/DoctorHome'
import NurseHome from './pages/XamshiraReseption/NurseHome/NurseHome'
import NursePatientDetail from './pages/XamshiraReseption/PatientDetail/PatientDetail'
import NursePatients from './pages/XamshiraReseption/NursePatients/NursePatients'
import VisitDetail from './pages/XamshiraReseption/VisitDetail/VisitDetail'
import DoctorWaitingPatients from './pages/Shifokor/DoctorWaiting/DoctorWaitingPatients/DoctorWaitingPatients'
import DoctorWaitingPatientDetail from './pages/Shifokor/DoctorWaiting/DoctorWaitingPatientDetail/DoctorWaitingPatientDetail'
import DoctorProgressPatientDetail from './pages/Shifokor/DoctorProgress/DoctorProgressPatientDetail/DoctorProgressPatientDetail'
import DoctorProgressPatients from './pages/Shifokor/DoctorProgress/DoctorProgressPatients/DoctorProgressPatients'
import DoctorComplatedPatients from './pages/Shifokor/DoctorComplated/DoctorComplatedPatients/DoctorComplatedPatients'
import DoctorComplatedPatientDetail from './pages/Shifokor/DoctorComplated/DoctorComplatedPatientDetail/DoctorComplatedPatientDetail'
import PatientHome from './pages/Bemor/PatientHome/PatientHome'

export const api = 'http://192.168.1.50:8000/api/v1'

function App() {
  const { user } = useAppContext()
  const role = user?.role

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {role === 'Doctor' && (
            <>
              <Route path="/" element={<DoctorHome />} />
              {/* <Route path="/doctor-patients" element={<DoctorPatients />} /> */}
              {/* <Route path="/doctor-patients/:id" element={<DoctorPatientDetail />} /> */}
              <Route path="/doctor-waiting-patients" element={<DoctorWaitingPatients />} />
              <Route path="/doctor-waiting-patients/:id" element={<DoctorWaitingPatientDetail />} />

              <Route path="/doctor-progress-patients" element={<DoctorProgressPatients />} />
              <Route path="/doctor-progress-patients/:id" element={<DoctorProgressPatientDetail />} />

              <Route path="/doctor-complated-patients" element={<DoctorComplatedPatients />} />
              <Route path="/doctor-complated-patients/:id" element={<DoctorComplatedPatientDetail />} />
            </>
          )}
          {role === 'Res Admin' && (
            <>
              <Route path="/" element={<NurseHome />} />
              <Route path="/nurse-patients" element={<NursePatients />} />
              <Route path="/nurse-patients/:id" element={<NursePatientDetail />} />
              <Route path="/nurse-patients/:patientId/visits/:visitId" element={<VisitDetail />} />
            </>
          )}
          {
            role == "Patient" && (
              <>
                <Route path="/" element={<PatientHome />} />
              </>
            )
          }
          
          
          <Route path="*" element={<NotFound />} />

        </Route>
        <Route path="/sign-in" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

function MainLayout() {
  const { collapsed, setCollapsed } = useAppContext()

  return (
    <div className={`${s.body}`}>
      <Header />
      <div className={`${s.DashMenu} ${collapsed ? s.DashMenuLong : ''}`}>
        <Outlet />
      </div>
    </div>
  )
}

export default App