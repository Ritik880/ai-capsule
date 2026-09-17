import { API_BASE } from '../lib/api';

export default function Login() {
  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif', textAlign: 'center', padding: '0 20px' }}>
      <h1>Log in</h1>
      <p>Sign in with your GitHub account to manage your capsules.</p>
      {/* Plain <a>, not a router Link — this must be a full page navigation to the backend */}
      <a href={`${API_BASE}/auth/github`}>
        <button style={{ padding: '10px 20px', fontSize: 16 }}>Login with GitHub</button>
      </a>
    </div>
  );
}
