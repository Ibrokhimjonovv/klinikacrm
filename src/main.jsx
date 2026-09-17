import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/context.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { WaitingPatientsProvider } from './context/WaitingPatientsContext/WaitingPatientsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <ToastProvider>
        <WaitingPatientsProvider>
          <App />
        </WaitingPatientsProvider>
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
)