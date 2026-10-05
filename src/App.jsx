import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
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
import NurseInpatients from './pages/Xamshira/NurseInpatients/NurseInpatients'
import NurseInpatientDetail from './pages/Xamshira/NurseInpatientDetail/NurseInpatientDetail'
import AdminDoctors from './pages/Admin/AdminDoctors/AdminDoctors'
import AdminNurses from './pages/Admin/AdminNurses/AdminNurses'
import AdminResNurses from './pages/Admin/AdminResNurses/AdminResNurses'
import AdminMedicines from './pages/Admin/AdminMedicines/AdminMedicines'
import AssistantDoctorTasks from './pages/AssistantDoctor/AssistantDoctorTasks/AssistantDoctorTasks'
import AssistantDoctorPTaskDetail from './pages/AssistantDoctor/AssistantDoctorTasksDetail/AssistantDoctorTaskDetail'
import CashierHome from './pages/Cashier/CashierHome/CashierHome'
import CashierVisitPayments from './pages/Cashier/CashierVisitPayment/CashierVisitPayments'
import NurseServices from './pages/XamshiraReseption/NurseServices/NurseServices'
import NurseServiceDetail from './pages/XamshiraReseption/NurseServiceDetail/NurseServiceDetail'
import AssistantDoctorExcaminationPatients from './pages/AssistantDoctor/AssistantDoctorExcaminationPatients/AssistantDoctorExcaminationPatients'
import AssistantDoctorExcaminationDetail from './pages/AssistantDoctor/AssistantDoctorExcaminationDetail/AssistantDoctorExcaminationDetail'
import CashierTreatmentPayment from './pages/Cashier/CashierTreatmentPayment/CashierTreatmentPayment'
import CashierServicesPayments from './pages/Cashier/CashierServicesPayments/CashierServicesPayments'
import CashierDoctorServicesPayments from './pages/Cashier/CashierDoctorServicesPayments/CashierDoctorServicesPayment'
import NurseRooms from './pages/XamshiraReseption/NurseRooms/NurseRooms'

export const api = 'http://192.168.1.5:8000/api/v1'

function App() {
  const { user } = useAppContext()
  const role = user?.role

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {role === 'Doctor' && (
            <>
              <Route path="/" element={<Navigate to="doctor" replace />} />
              <Route path="/doctor" element={<DoctorHome />} />

              <Route path="/doctor/patients/waitings" element={<DoctorWaitingPatients />} />
              <Route path="/doctor/patients/waitings/:id/treatments" element={<DoctorWaitingPatientTreatmentDetail />} />
              <Route path="/doctor/patients/waitings/:id/diagnostics" element={<DoctorWaitingPatientDiagnosticsDetail />} />

              <Route path="/doctor/patients/progresses" element={<DoctorProgressPatients />} />
              <Route path="/doctor/patients/progress/:id" element={<DoctorProgressPatientDetail />} />

              <Route path="/doctor/patients/completeds" element={<DoctorComplatedPatients />} />
              <Route path="/doctor/patients/completed/:id" element={<DoctorComplatedPatientDetail />} />


              <Route path="/doctor/profile" element={<DoctorProfile />} />

              <Route path="/doctor/rooms/all-rooms" element={<DoctorRooms />} />
            </>
          )}
          {role === 'ResNurse' && (
            <>
              <Route path="/" element={<Navigate to="/nurse/" replace />} />
              <Route path="/nurse" element={<ResNurseHome />} />
              <Route path="/nurse/patients/patients" element={<NursePatients />} />
              <Route path="/nurse/patients/patient/:id" element={<NursePatientDetail />} />
              <Route path="/nurse/patients/:patientId/visits/:visitId" element={<VisitDetail />} />
              <Route path="/nurse/profile" element={<ResNurseProfile />} />
              {/* <Route path="/nurse-paid-patients" element={<NursePaidPatients />} /> */}
              <Route path="nurse/services" element={<NurseServices />} />
              <Route path="nurse/service/:serviceId" element={<NurseServiceDetail />} />
              <Route path="nurse/rooms/all-rooms" element={<NurseRooms />} />
            </>
          )}
          {
            role == "Patient" && (
              <>
                <Route path="/" element={<Navigate to="/me" replace />} />
                <Route path="/me" element={<PatientHome />} />

                <Route path="/me/treatments/progresses" element={<PatientTreatmentsProgress />} />
                <Route path="/me/treatments/progress/:id" element={<PatientTreatmentsProgressDetail />} />

                <Route path="/me/treatments/completeds" element={<PatientTreatmentsComplated />} />
                <Route path="/me/treatments/completed/:id" element={<PatientTreatmentsComplatedDetail />} />

                <Route path="/me/profile" element={<PatientProfile />} />
              </>
            )
          }
          {role === 'Nurse' && (
            <>
              <Route path="/" element={<Navigate to="nurse" replace />} />
              <Route path="/nurse" element={<NurseHome />} />
              <Route path="/nurse/patients" element={<NurseProgressPatients />} />
              <Route path="nurse/inpatients" element={<NurseInpatients />} />
              <Route path="/nurse/inpatient/:planId" element={<NurseInpatientDetail />} />
              <Route path="/nurse/profile" element={<NurseProfile />} />
              {/* <Route path="/reception-nurse-profile" element={<NurseProfile />} /> */}
            </>
          )}
          {role === 'Admin' && (
            <>
              <Route path="/" element={<Navigate to="admin" replace />} />
              <Route path="/admin" element={<AdminHome />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/rooms/all-rooms" element={<AdminRooms />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
              {/* <Route path="/admin/nurses" element={<AdminNurses />} />
              <Route path="/admin/res-nurses" element={<AdminResNurses />} /> */}
              <Route path="/admin/medicines" element={<AdminMedicines />} />
            </>
          )}
          {
            role === "AssistantDoctor" && (
              <>
                <Route path="/" element={<Navigate to="doctor" replace />} />
                <Route path="/doctor" element={<AssistantDoctorHome />} />
                <Route path="/doctor/patients/waitings" element={<AssistantDoctorPatients />} />
                <Route path="/doctor/patients/waiting/:id" element={<AssistantDoctorTaskDetail />} />
                <Route path="/doctor/patients/tasks" element={<AssistantDoctorTasks />} />
                <Route
                  path="/doctor/patients/task/:planId/:serviceId"
                  element={<AssistantDoctorPTaskDetail />}
                />
                <Route path="/doctor/profile" element={<AssistantDoctorProfile />} />

                <Route path="/doctor/patients/examinations" element={<AssistantDoctorExcaminationPatients />} />
                <Route path="/doctor/patients/examination/:id" element={<AssistantDoctorExcaminationDetail />} />
              </>
            )
          }
          {
            role === "Cashier" && (
              <>
                <Route path="/" element={<Navigate to="cashier" replace />} />
                <Route path="/cashier" element={<CashierHome />} />
                <Route path="/cashier/payments/visits" element={<CashierVisitPayments />} />
                <Route path="/cashier/payments/treatments" element={<CashierTreatmentPayment />} />
                <Route path="/cashier/payments/services" element={<CashierServicesPayments />} />
                <Route path="/cashier/payments/doctor-services" element={<CashierDoctorServicesPayments />} />
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