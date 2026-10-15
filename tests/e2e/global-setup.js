// Fresh temp folder for each run: rate-limit data, token cache and the mock's request log.
const fs = require('fs');

module.exports = async () => {
  fs.rmSync(process.env.E2E_TMP, { recursive: true, force: true });
  fs.mkdirSync(process.env.E2E_TMP, { recursive: true });
  fs.writeFileSync(process.env.MOCK_GRAPH_LOG, '');
};
