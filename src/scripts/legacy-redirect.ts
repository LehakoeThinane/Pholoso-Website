/**
 * The old single-page site used hash URLs (/#about, /#involved …). Hashes never reach the
 * server, so .htaccess cannot redirect them; this does, on the home page only.
 */
const legacy: Record<string, string> = {
  '#about': '/about/',
  '#how': '/approach/',
  '#approach': '/approach/',
  '#stories': '/stories/',
  '#involved': '/get-involved/',
  '#resources': '/resources/',
  '#contact': '/contact/',
  '#privacy': '/privacy/',
};

const target = legacy[window.location.hash.toLowerCase()];
if (target && window.location.pathname === '/') window.location.replace(target);
