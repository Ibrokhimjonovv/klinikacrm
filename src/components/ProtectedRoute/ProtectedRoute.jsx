import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/context'

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAppContext()

    if (loading) return null
    const token = localStorage.getItem('hospital_access')
    if (!token || !user) {
        return <Navigate to="/sign-in" replace />
    }

    return children
}

export default ProtectedRoute