import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { fetchMe, logout } from '../lib/auth';

const emptyForm = {
  project_name: '',
  prompt_title: '',
  prompt_version: '',
  prompt_text: '',
  response_summary: '',
  category: '',
  usefulness: '',
  reviewed: false,
  improved: false,
  screenshot_url: '',
  notes: '',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMe().then(setUser).catch(() => {});
    loadCapsules();
  }, []);

  async function loadCapsules() {
    try {
      const res = await api.get('/capsules');
      setCapsules(res.data);
      setError('');
    } catch (err) {
      setError('Could not load capsules.');
      console.error(err);
    }
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(capsule) {
    setEditingId(capsule.id);
    setForm({
      project_name: capsule.project_name || '',
      prompt_title: capsule.prompt_title || '',
      prompt_version: capsule.prompt_version || '',
      prompt_text: capsule.prompt_text || '',
      response_summary: capsule.response_summary || '',
      category: capsule.category || '',
      usefulness: capsule.usefulness || '',
      reviewed: !!capsule.reviewed,
      improved: !!capsule.improved,
      screenshot_url: capsule.screenshot_url || '',
      notes: capsule.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/capsules/${editingId}`, form);
      } else {
        await api.post('/capsules', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadCapsules();
    } catch (err) {
      setError(editingId ? 'Could not update capsule.' : 'Could not create capsule.');
      console.error(err);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/capsules/${id}`);
      if (editingId === id) cancelEdit();
      loadCapsules();
    } catch (err) {
      setError('Could not delete capsule.');
      console.error(err);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>AI Capsule</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && (
            <>
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  width={28}
                  height={28}
                  style={{ borderRadius: '50%' }}
                />
              )}
              <span>{user.username}</span>
            </>
          )}
          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>
      <p>A small prompt library for your favourite AI prompts.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>{editingId ? `Edit capsule #${editingId}` : 'Add a new capsule'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, marginBottom: 30 }}>
        <input
          placeholder="Project name"
          value={form.project_name}
          onChange={(e) => updateField('project_name', e.target.value)}
          required
        />
        <input
          placeholder="Prompt title"
          value={form.prompt_title}
          onChange={(e) => updateField('prompt_title', e.target.value)}
          required
        />
        <input
          placeholder="Prompt version (e.g. v1)"
          value={form.prompt_version}
          onChange={(e) => updateField('prompt_version', e.target.value)}
        />
        <textarea
          placeholder="Prompt text"
          value={form.prompt_text}
          onChange={(e) => updateField('prompt_text', e.target.value)}
          rows={3}
          required
        />
        <textarea
          placeholder="Response summary"
          value={form.response_summary}
          onChange={(e) => updateField('response_summary', e.target.value)}
          rows={2}
        />

        <label style={{ display: 'grid', gap: 4 }}>
          Category
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
          >
            <option value="">-- select --</option>
            <option value="Coding">Coding</option>
            <option value="Writing">Writing</option>
            <option value="Research">Research</option>
            <option value="Debugging">Debugging</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          Usefulness
          <select
            value={form.usefulness}
            onChange={(e) => updateField('usefulness', e.target.value)}
          >
            <option value="">-- select --</option>
            <option value="Good">Good</option>
            <option value="Needs Improvement">Needs Improvement</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={form.reviewed}
            onChange={(e) => updateField('reviewed', e.target.checked)}
          />
          Reviewed
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={form.improved}
            onChange={(e) => updateField('improved', e.target.checked)}
          />
          Improved
        </label>

        <input
          placeholder="Screenshot URL (optional)"
          value={form.screenshot_url}
          onChange={(e) => updateField('screenshot_url', e.target.value)}
        />
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">{editingId ? 'Update capsule' : 'Save capsule'}</button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2>Your capsules ({capsules.length})</h2>
      {capsules.length === 0 && <p>No capsules yet — add one above.</p>}
      {capsules.map((c) => (
        <div key={c.id} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 6, marginBottom: 10 }}>
          <strong>{c.prompt_title}</strong> <em>({c.project_name}{c.prompt_version ? `, ${c.prompt_version}` : ''})</em>
          <p style={{ margin: '6px 0' }}>{c.prompt_text}</p>
          {c.response_summary && <p style={{ margin: '6px 0', color: '#555' }}><strong>Response:</strong> {c.response_summary}</p>}
          <p style={{ margin: '6px 0', fontSize: 13, color: '#777' }}>
            {c.category && <>Category: {c.category} · </>}
            {c.usefulness && <>Usefulness: {c.usefulness} · </>}
            Reviewed: {c.reviewed ? 'Yes' : 'No'} · Improved: {c.improved ? 'Yes' : 'No'}
          </p>
          {c.screenshot_url && (
            <p style={{ margin: '6px 0' }}>
              <a href={c.screenshot_url} target="_blank" rel="noreferrer">Screenshot</a>
            </p>
          )}
          {c.notes && <p style={{ margin: '6px 0', fontStyle: 'italic' }}>{c.notes}</p>}
          <small>Created: {c.created_at}</small>
          <br />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => startEdit(c)}>Edit</button>
            <button onClick={() => handleDelete(c.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
