const express = require('express');
const db = require('./db');
const requireAuth = require('./authMiddleware');

const router = express.Router();

// Protect EVERY route in this router. GET, POST, PUT and DELETE all require
// a valid JWT cookie. This is what the assignment rubric checks.
router.use(requireAuth);

// GET /api/capsules — list the logged-in user's capsules
router.get('/', (req, res) => {
  try {
    const capsules = db
      .prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
    res.json(capsules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch capsules' });
  }
});

// POST /api/capsules — create a new capsule owned by the logged-in user
router.post('/', (req, res) => {
  try {
    const {
      project_name,
      prompt_title,
      prompt_version,
      prompt_text,
      response_summary,
      category,
      usefulness,
      reviewed,
      improved,
      screenshot_url,
      notes,
    } = req.body;

    if (!project_name || !prompt_title || !prompt_text) {
      return res.status(400).json({
        error: 'project_name, prompt_title and prompt_text are required',
      });
    }

    const result = db
      .prepare(
        `INSERT INTO capsules
         (user_id, project_name, prompt_title, prompt_version, prompt_text,
          response_summary, category, usefulness, reviewed, improved,
          screenshot_url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,                       // <-- from verified JWT, NOT from body
        project_name,
        prompt_title,
        prompt_version || null,
        prompt_text,
        response_summary || null,
        category || null,
        usefulness || null,
        reviewed ? 1 : 0,
        improved ? 1 : 0,
        screenshot_url || null,
        notes || null
      );

    const newCapsule = db
      .prepare('SELECT * FROM capsules WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(newCapsule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create capsule' });
  }
});

// PUT /api/capsules/:id — update a capsule the logged-in user owns
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Ownership check: is this capsule owned by req.user.id?
    const existing = db
      .prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!existing) {
      // 404 (not 403) so we don't leak which ids exist for other users
      return res.status(404).json({ error: 'Capsule not found' });
    }

    const {
      project_name,
      prompt_title,
      prompt_version,
      prompt_text,
      response_summary,
      category,
      usefulness,
      reviewed,
      improved,
      screenshot_url,
      notes,
    } = req.body;

    db.prepare(
      `UPDATE capsules SET
        project_name = ?,
        prompt_title = ?,
        prompt_version = ?,
        prompt_text = ?,
        response_summary = ?,
        category = ?,
        usefulness = ?,
        reviewed = ?,
        improved = ?,
        screenshot_url = ?,
        notes = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      project_name ?? existing.project_name,
      prompt_title ?? existing.prompt_title,
      prompt_version ?? existing.prompt_version,
      prompt_text ?? existing.prompt_text,
      response_summary ?? existing.response_summary,
      category ?? existing.category,
      usefulness ?? existing.usefulness,
      reviewed !== undefined ? (reviewed ? 1 : 0) : existing.reviewed,
      improved !== undefined ? (improved ? 1 : 0) : existing.improved,
      screenshot_url ?? existing.screenshot_url,
      notes ?? existing.notes,
      id,
      req.user.id
    );

    const updated = db
      .prepare('SELECT * FROM capsules WHERE id = ?')
      .get(id);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update capsule' });
  }
});

// DELETE /api/capsules/:id — remove a capsule the logged-in user owns
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db
      .prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Capsule not found' });
    }

    res.json({ message: 'Capsule deleted', id: Number(id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete capsule' });
  }
});

module.exports = router;
