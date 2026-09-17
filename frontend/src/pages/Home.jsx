import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ maxWidth: 700, margin: '80px auto', fontFamily: 'sans-serif', textAlign: 'center', padding: '0 20px' }}>
      <h1>AI Capsule</h1>
      <p>A small prompt library for your favourite AI prompts.</p>
      <Link to="/login">
        <button style={{ padding: '10px 20px', fontSize: 16 }}>Get started</button>
      </Link>
    </div>
  );
}
