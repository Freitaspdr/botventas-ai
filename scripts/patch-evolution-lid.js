/**
 * Patch para Evolution API v2.2.3 — soporte de números LID (@lid de WhatsApp)
 *
 * Problema: onWhatsApp() de WhatsApp no puede verificar JIDs con @lid,
 * por lo que Evolution API devuelve exists:false y rechaza enviar.
 *
 * Fix: si el JID tiene @lid, asumimos que existe (ya nos escribió, sabemos que existe).
 *
 * Ejecutar tras cada `docker-compose up -d` con el contenedor evolution-api activo:
 *   node scripts/patch-evolution-lid.js
 *
 * O automáticamente: el Makefile / start script lo llama antes de arrancar el backend.
 */

const { execSync } = require('child_process');

const ORIGINAL = 'g||(g=l.find(y=>y.jid===u.jid));let h=g?.jid||u.jid;return{exists:!!g?.exists';
const PATCHED  = 'g||(g=l.find(y=>y.jid===u.jid));if(!g&&u.jid&&u.jid.includes("@lid")){g={jid:u.jid,exists:true}}let h=g?.jid||u.jid;return{exists:!!g?.exists';

const FILES = [
  '/evolution/dist/main.js',
  '/evolution/dist/main.mjs',
  '/evolution/dist/api/services/channel.service.js',
  '/evolution/dist/api/services/channel.service.mjs',
];

const script = `
const fs = require('fs');
const orig = ${JSON.stringify(ORIGINAL)};
const patched = ${JSON.stringify(PATCHED)};
const files = ${JSON.stringify(FILES)};
let allOk = true;
files.forEach(f => {
  try {
    let code = fs.readFileSync(f, 'utf8');
    if (code.includes(patched)) { console.log('[OK already] ' + f); return; }
    if (code.includes(orig)) {
      fs.writeFileSync(f, code.split(orig).join(patched));
      console.log('[PATCHED] ' + f);
    } else {
      console.log('[SKIP - pattern not found] ' + f);
    }
  } catch(e) { console.log('[ERROR] ' + f + ': ' + e.message); allOk = false; }
});
process.exit(allOk ? 0 : 1);
`;

try {
  // Write temp script to container
  execSync(`docker exec evolution-api sh -c "cat > /tmp/patch_lid.js << 'JSEOF'\n${script}\nJSEOF"`, { stdio: 'inherit' });

  // Actually write via stdin to avoid heredoc issues
  const fs = require('fs');
  fs.writeFileSync('/tmp/_evo_patch.js', script);
  execSync('docker cp /tmp/_evo_patch.js evolution-api:/tmp/patch_lid.js');
  execSync('docker exec evolution-api node /tmp/patch_lid.js', { stdio: 'inherit' });

  // Restart the node process inside the container (not the container itself)
  execSync('docker exec evolution-api sh -c "pkill -f \'node dist/main\' || true"');
  console.log('\n✅ Patch aplicado. Evolution API reiniciando (10s)...');
  setTimeout(() => {
    try {
      const { execSync: exec } = require('child_process');
      const state = exec('curl -s http://localhost:8080/instance/connectionState/beleti -H "apikey: botventas-local-key"').toString();
      console.log('Estado instancia:', state);
    } catch(e) {}
  }, 12000);
} catch(e) {
  console.error('Error aplicando patch:', e.message);
  process.exit(1);
}
