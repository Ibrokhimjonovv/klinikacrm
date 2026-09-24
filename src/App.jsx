import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import NotFound from './pages/NotFound/NotFound'
import Login from './pages/Login/Login'
import Header from './components/Header/Header'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import { useAppContext } from './context/context'
import s from './App.module.scss'
import DoctorHome from './pages/Shifokor/DoctorHome/DoctorHome'
import ResNurseHome from './pages/XamshiraReseption/NurseHome/NurseHome'
import NursePatientDetail from './pages/XamshiraReseption/PatientDetail/PatientDetail'
import NursePatients from './pages/XamshiraReseption/NursePatients/NursePatients'
import VisitDetail from './pages/XamshiraReseption/VisitDetail/VisitDetail'
import DoctorWaitingPatients from './pages/Shifokor/DoctorWaiting/DoctorWaitingPatients/DoctorWaitingPatients'
import DoctorWaitingPatientDetail from './pages/Shifokor/DoctorWaiting/DoctorWaitingPatientDetail/DoctorWaitingPatientDiagnosticDetail'
import DoctorProgressPatientDetail from './pages/Shifokor/DoctorProgress/DoctorProgressPatientDetail/DoctorProgressPatientDetail'
import DoctorProgressPatients from './pages/Shifokor/DoctorProgress/DoctorProgressPatients/DoctorProgressPatients'
import DoctorComplatedPatients from './pages/Shifokor/DoctorComplated/DoctorComplatedPatients/DoctorComplatedPatients'
import DoctorComplatedPatientDetail from './pages/Shifokor/DoctorComplated/DoctorComplatedPatientDetail/DoctorComplatedPatientDetail'
import PatientHome from './pages/Bemor/PatientHome/PatientHome'
import DoctorProfile from './pages/Shifokor/DoctorProfile/DoctorProfile'
import ResNurseProfile from './pages/XamshiraReseption/NurseProfile/NurseProfile'
import PatientTreatmentsProgress from './pages/Bemor/PatientTreatmentsProgress/PatientTreatmentsProgress/PatientTreatmentsProgress'
import PatientTreatmentsProgressDetail from './pages/Bemor/PatientTreatmentsProgress/PatientTreatmentsProgressDetail/PatientTreatmentsProgressDetail'
import PatientTreatmentsComplated from './pages/Bemor/PatientTreatmentsComplated/PatientTreatmentsComplated/PatientTreatmentsComplated'
import PatientTreatmentsComplatedDetail from './pages/Bemor/PatientTreatmentsComplated/PatientTreatmentsComplatedDetail/PatientTreatmentsComplatedDetail'
import PatientProfile from './pages/Bemor/PatientProfile/PatientProfile'
import NurseHome from './pages/Xamshira/NurseHome/NurseHome'
import NurseProgressPatients from './pages/Xamshira/NurseProgress/NurseProgressPatients/NurseProgressPatients'
import NurseProfile from './pages/Xamshira/NurseProfile/NurseProfile'
import WaitingNotification from './components/Doctor/WaitingNotification/WaitingNotification'
import NursePaidPatients from './pages/XamshiraReseption/NursePaidPatients/NursePaidPatients'
import DoctorWaitingPatientTreatmentDetail from './pages/Shifokor/DoctorWaiting/DoctorWaitingPatientDetail/DoctorWaitingPatientTreatmentDetail'
import DoctorWaitingPatientDiagnosticsDetail from './pages/Shifokor/DoctorWaiting/DoctorWaitingPatientDetail/DoctorWaitingPatientDiagnosticDetail'
import AdminHome from './pages/Admin/AdminHome/AdminHome'
import AdminServices from './pages/Admin/AdminServices/AdminServices'
import AssistantDoctorHome from './pages/AssistantDoctor/AssistantDoctorHome/AssistantDoctorHome'
import AssistantDoctorProfile from './pages/AssistantDoctor/AssistantDoctorProfile/AssistantDoctorProfile'
import AssistantDoctorPatients from './pages/AssistantDoctor/AssistantDoctorPatients/AssistantDoctorPatients'
import AssistantDoctorTaskDetail from './pages/AssistantDoctor/AssistantDoctorPatientsDetail/AssistantDoctorPatientsDetail'
import AdminRooms from './pages/Admin/AdminRooms/AdminRooms'
import DoctorRooms from './pages/Shifokor/DoctorRooms/DoctorRooms'

export const api = 'http://192.168.1.24:8000/api/v1'
// export const api = 'https://bkapi.aoc.uz/api/v1'
// export const api = 'https://6397-87-192-225-30.ngrok-free.app/api/v1'

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
              <Route path="/doctor-waiting-patients/:id/treatment" element={<DoctorWaitingPatientTreatmentDetail />} />
              <Route path="/doctor-waiting-patients/:id/diagnostics" element={<DoctorWaitingPatientDiagnosticsDetail />} />

              <Route path="/doctor-progress-patients" element={<DoctorProgressPatients />} />
              <Route path="/doctor-progress-patients/:id" element={<DoctorProgressPatientDetail />} />

              <Route path="/doctor-complated-patients" element={<DoctorComplatedPatients />} />
              <Route path="/doctor-complated-patients/:id" element={<DoctorComplatedPatientDetail />} />


              <Route path="/doctor-profile" element={<DoctorProfile />} />
              <Route path="/doctor-rooms" element={<DoctorRooms />} />
            </>
          )}
          {role === 'ResNurse' && (
            <>
              <Route path="/" element={<ResNurseHome />} />
              <Route path="/nurse-patients" element={<NursePatients />} />
              <Route path="/nurse-patients/:id" element={<NursePatientDetail />} />
              <Route path="/nurse-patients/:patientId/visits/:visitId" element={<VisitDetail />} />
              <Route path="/reception-nurse-profile" element={<ResNurseProfile />} />
              <Route path="/nurse-paid-patients" element={<NursePaidPatients />} />
            </>
          )}
          {
            role == "Patient" && (
              <>
                <Route path="/" element={<PatientHome />} />

                <Route path="/me/treatments-progress-list" element={<PatientTreatmentsProgress />} />
                <Route path="/me/treatments-progress-list/:id" element={<PatientTreatmentsProgressDetail />} />

                <Route path="/me/treatments-complated-list" element={<PatientTreatmentsComplated />} />
                <Route path="/me/treatments-complated-list/:id" element={<PatientTreatmentsComplatedDetail />} />

                <Route path="/patient-profile" element={<PatientProfile />} />
              </>
            )
          }
          {role === 'Nurse' && (
            <>
              <Route path="/" element={<NurseHome />} />
              <Route path="/nurse-patients" element={<NurseProgressPatients />} />
              <Route path="/nurse-profile" element={<NurseProfile />} />
              {/* <Route path="/reception-nurse-profile" element={<NurseProfile />} /> */}
            </>
          )}

          {role === 'Admin' && (
            <>
              <Route path="/" element={<AdminHome />} />
              <Route path="/services" element={<AdminServices />} />
              <Route path="/admin-rooms" element={<AdminRooms />} />
            </>
          )}

          {
            role === "AssistantDoctor" && (
              <>
                <Route path="/" element={<AssistantDoctorHome />} />
                <Route path="/waiting-patients" element={<AssistantDoctorPatients />} />
                <Route path="/waiting-patients/:id" element={<AssistantDoctorTaskDetail />} />
                <Route path="/doctor-profile" element={<AssistantDoctorProfile />} />
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
        <WaitingNotification />
      </div>
    </div>
  )
}

export default App