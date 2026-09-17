import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchMe } from '../lib/auth';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking'); // checking | authed | anon

  useEffect(() => {
    fetchMe()
      .then(() => setStatus('authed'))
      .catch(() => setStatus('anon'));
  }, []);

  if (status === 'checking') {
    return <p style={{ textAlign: 'center', marginTop: 60 }}>Checking session...</p>;
  }
  if (status === 'anon') {
    return <Navigate to="/login" replace />;
  }
  return children;
}
