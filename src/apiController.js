export const healthCheck = (req, res) => {
  res.json({ ok: true, service: "merchant", timestamp: new Date().toISOString() });
};

