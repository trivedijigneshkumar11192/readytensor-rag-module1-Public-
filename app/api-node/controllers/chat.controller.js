const { retrieveAndAnswer } = require('../services/rag.service');

async function chatHandler(req, res) {
  try {
    const { query, lang = 'hinglish' } = req.body || {};
    if (!query) return res.status(400).json({ ok:false, error:'query required' });
    const out = await retrieveAndAnswer(query, { lang });
    res.json({ ok:true, ...out });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
}
module.exports = { chatHandler };
