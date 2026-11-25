const endpoint = 'https://dtnnmyhqajjonrdroilp.supabase.co';
const publishableKey = 'sb_publishable_oXJDmTUAiNoNpVh8R31ZUQ_FykFUQUS';
const db = supabase.createClient(endpoint, publishableKey);

// Cache hasil cek admin 10 detik + deduplikasi request bersamaan
let _adminCache = null, _adminCacheAt = 0, _adminPromise = null;
async function cekAdmin() {
  if (_adminCache !== null && Date.now() - _adminCacheAt < 10000) return _adminCache;
  if (_adminPromise) return _adminPromise;
  _adminPromise = hasil(db.rpc('admin_toko'))
    .then(res => {
      _adminCache = Boolean(res);
      _adminCacheAt = Date.now();
      return _adminCache;
    })
    .finally(() => { _adminPromise = null; });
  return _adminPromise;
}

async function hasil(request) {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}

async function semua(table, order) {
  const rows = [];
  for (;;) {
    const page = await hasil(db.from(table).select('*').order(order)
      .range(rows.length, rows.length + 99));
    rows.push(...page);
    if (page.length < 100) return rows;
  }
}

async function masuk(email, password) {
  _adminCache = null;
  _adminCacheAt = 0;
  await hasil(db.auth.signInWithPassword({ email, password }));
  if (!await cekAdmin()) {
    await db.auth.signOut();
    throw new Error('Akun ini belum memiliki akses admin toko.');
  }
}

function pantauAdmin(onChange, onError) {
  let version = 0;
  let current;
  db.auth.onAuthStateChange((event, session) => {
    const id = session?.user?.id ?? null;
    if (id !== current) {
      _adminCache = null;
      _adminCacheAt = 0;
    }
    if (id === current && event !== 'INITIAL_SESSION') return;
    current = id;
    const ticket = ++version;
    setTimeout(async () => {
      try {
        const allowed = id ? await cekAdmin() : false;
        if (ticket === version) await onChange(allowed);
      } catch (err) {
        if (ticket === version) {
          current = undefined;
          await onChange(false);
          onError?.(err);
        }
      }
    }, 0);
  });
}

async function uploadFoto(file, namaFile) {
  const { error } = await db.storage
    .from('foto-produk')
    .upload(namaFile, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false
    });
  if (error) throw new Error(error.message);

  const { data } = db.storage
    .from('foto-produk')
    .getPublicUrl(namaFile);

  return data.publicUrl;
}

async function hapusFoto(urlFoto) {
  if (!urlFoto || !urlFoto.includes('/foto-produk/')) return;
  const rawNama = urlFoto.split('/foto-produk/').pop().split('?')[0].split('#')[0];
  let namaFile = '';
  try { namaFile = decodeURIComponent(rawNama); }
  catch { namaFile = rawNama; }
  if (!namaFile) return;

  const { error } = await db.storage.from('foto-produk').remove([namaFile]);
  if (error) throw new Error(error.message);
}
