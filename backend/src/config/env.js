const required = [
  'JWT_SECRET',
];

required.forEach((k) => {
  if (!process.env[k]) {
    // just warn in dev — env may be set in hosting
    console.warn(`Warning: ${k} not set`);
  }
});

module.exports = {};
