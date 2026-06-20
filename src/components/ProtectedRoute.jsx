import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Enforce Role Based Access Control
  if (allowedRoles && userRole) {
    // Admin always gets master access. If not admin, check if userRole is in allowedRoles list.
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute;
