const NOMOR_WA = "6281919194295";

let barangPublic = [];
let barangPrivate = {};
let barang = [];
let editId = null;
let currentPage = 1;
const perPage = 12;
let isLogin = false;
let kataCari = '';
let filterMenipis = false;
let readVersion = 0;
window.FOTO_BARU = null;
window.FOTO_LAMA = null;
const IS_ADMIN_PAGE = !!document.getElementById('gateAdmin');
let loginBusy = false, writeBusy = false, privateReady = false;
const protectedElements = Array.from(document.querySelectorAll('.butuh-login'));

function bolehKelola(){ return IS_ADMIN_PAGE && isLogin; }
function pesanError(e){ return e?.message || 'Koneksi gagal. Coba lagi.'; }
function fotoAman(value){
  const v = String(value || '').trim();
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(v) || /^(?:\.\/)?[\w-]+(?:\/[\w-]+)*\.(?:png|jpe?g|webp|gif)$/i.test(v) ? v : '';
}
function aksi(nama, id){ return aman(nama + '(' + JSON.stringify(String(id)) + ')'); }

function el(id){ return document.getElementById(id); }
function toast(pesan){
  let t = document.getElementById('toastBilal');
  if(!t){ t = document.createElement('div'); t.id = 'toastBilal'; t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#16a34a;color:#fff;padding:12px 18px;border-radius:99px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.3);max-width:90%;text-align:center;'; document.body.appendChild(t); }
  t.style.background = '#16a34a'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; }, 2000);
}
function toastError(pesan){
  let t = document.getElementById('toastBilal'); if(!t){ toast(pesan); t = el('toastBilal'); }
  t.style.background = '#ef4444'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; t.style.background='#16a34a'; }, 2500);
}

let cropScale = 1, cropX = 0, cropY = 0, cropImgW = 0, cropImgH = 0;
let cropStartX = 0, cropStartY = 0, cropStartPX = 0, cropStartPY = 0, cropDragging = false, cropPointerId = null;

function clampCrop(){
  const img = el('cropImg');
  const side = el('cropFrame')?.getBoundingClientRect().width || 0;
  if (!side || !img || !img.naturalWidth) return;
  const fit = side / Math.min(img.naturalWidth, img.naturalHeight);
  cropImgW = img.naturalWidth * fit;
  cropImgH = img.naturalHeight * fit;
  img.style.width = cropImgW + 'px';
  img.style.height = cropImgH + 'px';
  const maxX = Math.max(0, (cropImgW * cropScale - side) / 2);
  const maxY = Math.max(0, (cropImgH * cropScale - side) / 2);
  cropX = Math.max(-maxX, Math.min(maxX, cropX));
  cropY = Math.max(-maxY, Math.min(maxY, cropY));
}
function updateCropTransform(){
  clampCrop();
  const img = el('cropImg');
  if(!img) return;
  img.style.transform = `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropScale})`;
  const lbl = el('zoomLabel');
  if(lbl) lbl.innerText = Math.round(cropScale*100) + '%';
}
window.aturZoom = (v) => { cropScale = Number(v)/100; if(cropScale<1) cropScale=1; if(cropScale>3) cropScale=3; updateCropTransform(); const sl=el('zoomSlider'); if(sl && Number(sl.value)!==Math.round(cropScale*100)) sl.value=Math.round(cropScale*100); };
window.zoomTambah = () => { cropScale = Math.min(3, cropScale + 0.2); const sl=el('zoomSlider'); if(sl) sl.value=Math.round(cropScale*100); updateCropTransform(); };
window.zoomKurang = () => { cropScale = Math.max(1, cropScale - 0.2); const sl=el('zoomSlider'); if(sl) sl.value=Math.round(cropScale*100); updateCropTransform(); };
window.resetCrop = () => { cropScale=1; cropX=0; cropY=0; const sl=el('zoomSlider'); if(sl) sl.value=100; updateCropTransform(); };

window.addEventListener('resize', () => {
  if (el('cropFrame')?.getBoundingClientRect().width) updateCropTransform();
});

function bukaCrop(base64){
  cropScale = 1; cropX = 0; cropY = 0;
  const img = el('cropImg'), sl = el('zoomSlider'), m = el('cropModal');
  if(!img) return;
  if(sl) sl.value = 100;
  img.style.opacity = '0';
  if(m) m.classList.remove('hidden');
  const siapCrop = () => {
    requestAnimationFrame(() => {
      updateCropTransform();
      img.style.opacity = '1';
    });
  };
  img.onload = siapCrop;
  img.src = base64;
  if(img.complete && img.naturalWidth) siapCrop();
}
window.batalCrop = () => {
  const m = el('cropModal'), inp = el('fotoInput'), img = el('cropImg');
  if(m) m.classList.add('hidden');
  if(inp) inp.value = '';
  if(img){ img.onload = null; img.style.opacity = '0'; img.removeAttribute('src'); }
};

function dataURLkeBlob(dataURL) {
  const [head, data] = dataURL.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

window.potongFoto = () => {
  try {
    const img = el('cropImg');
    if (!img || !img.complete || !img.naturalWidth) {
      return toastError('Foto belum siap, tunggu sebentar lalu coba lagi.');
    }
    updateCropTransform();
    const frameSide = el('cropFrame')?.getBoundingClientRect().width || 0;
    if (!frameSide || !cropImgW || !cropImgH) {
      return toastError('Area crop belum siap, coba lagi.');
    }

    const renderedW = cropImgW * cropScale;
    const renderedH = cropImgH * cropScale;
    const ratio = img.naturalWidth / renderedW;
    const side = Math.min(img.naturalWidth, img.naturalHeight, frameSide * ratio);
    const offsetX = (renderedW - frameSide) / 2 - cropX;
    const offsetY = (renderedH - frameSide) / 2 - cropY;
    const sx = Math.max(0, Math.min(img.naturalWidth - side, offsetX * ratio));
    const sy = Math.max(0, Math.min(img.naturalHeight - side, offsetY * ratio));

    const canvas = document.createElement('canvas');
    let hasil = '';
    for (const [size, quality] of [[400, 0.8], [320, 0.68], [256, 0.55]]) {
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      hasil = canvas.toDataURL('image/jpeg', quality);
      if (hasil.startsWith('data:image/') && hasil.length < 150000) break;
    }

    if (!hasil.startsWith('data:image/')) {
      return toastError('Gagal memproses gambar di HP ini.');
    }

    const blobFoto = dataURLkeBlob(hasil);
    const ukKB = (blobFoto.size / 1024).toFixed(1);
    window.FOTO_BARU = blobFoto;

    const prev = el('fotoPreview');
    if (prev) { prev.src = hasil; prev.classList.remove('hidden'); }
    const st = el('fotoStatus');
    if (st) st.innerText = `✅ Foto otomatis dikompres jadi ${ukKB} KB, siap disimpan!`;
    const m = el('cropModal');
    if (m) m.classList.add('hidden');
    const inp = el('fotoInput');
    if (inp) inp.value = '';
    toast(`✅ Foto siap (${ukKB} KB)`);
  } catch (e) {
    toastError('Gagal potong foto: ' + (e?.message || e));
  }
};

function olahFoto(file){
  if(!file) return;
  const imgTemp = new Image();
  const url = URL.createObjectURL(file);
  imgTemp.onload = () => {
    const max = 1000; let w = imgTemp.naturalWidth, h = imgTemp.naturalHeight;
    if(w > max || h > max){ let r = Math.min(max/w, max/h); w = Math.round(w*r); h = Math.round(h*r); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(imgTemp, 0, 0, w, h);
    URL.revokeObjectURL(url);
    bukaCrop(c.toDataURL('image/jpeg', 0.8));
  };
  imgTemp.onerror = () => { URL.revokeObjectURL(url); toastError('Foto tidak dapat dibaca.'); };
  imgTemp.src = url;
}
document.addEventListener('change', (e)=>{ if(e.target && e.target.id === 'fotoInput'){ if(e.target.files[0]) olahFoto(e.target.files[0]); } });

document.addEventListener('DOMContentLoaded', () => {
  const box = el('cropBox'); if(!box) return;
  box.addEventListener('pointerdown', (e)=>{ cropDragging=true; cropPointerId=e.pointerId; cropStartX=e.clientX; cropStartY=e.clientY; cropStartPX=cropX; cropStartPY=cropY; box.setPointerCapture(e.pointerId); e.preventDefault(); });
  box.addEventListener('pointermove', (e)=>{ if(!cropDragging || e.pointerId!==cropPointerId) return; cropX=cropStartPX+(e.clientX-cropStartX); cropY=cropStartPY+(e.clientY-cropStartY); updateCropTransform(); e.preventDefault(); });
  const endDrag=(e)=>{ if(e.pointerId===cropPointerId){ cropDragging=false; cropPointerId=null; } };
  box.addEventListener('pointerup', endDrag); box.addEventListener('pointercancel', endDrag);
});

function getTanggalHariIni(){
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
}
function isHariIni(tgl){return String(tgl || '').slice(0, 10) === getTanggalHariIni();}
function formatTanggalUpdate(tgl){
  if (!tgl) return '-';
  const bersih = String(tgl).trim().slice(0, 10);
  const bagian = bersih.split('-');
  if (bagian.length === 3 && bagian[0].length === 4) {
    return `${bagian[2]}-${bagian[1]}-${bagian[0]}`;
  }
  return bersih || '-';
}
function bersihKet(teks) { if (!teks) return ''; return teks.toString().replace(/^\s*\/\s*/, '').trim(); }
function aman(teks) { return String(teks ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function tampilStok(b) { let s = (b.stok ?? '').toString().trim(); if (!s) return '0'; return s; }
function gabungData() { barang = barangPublic.map(p => ({ ...p, modal: (barangPrivate[p.id] ? barangPrivate[p.id].modal : 0) })); render(); }

async function muat(){
  const ticket = ++readVersion;
  const [produk,modal] = await Promise.all([semua('barang_public','id'), bolehKelola() ? semua('barang_private','id') : []]);
  if(ticket!==readVersion) return;
  barangPublic = produk.sort((a,b)=>String(a.nama ?? '').localeCompare(String(b.nama ?? ''),'id'));
  barangPrivate = Object.fromEntries(modal.map(row=>[row.id,row]));
  privateReady = bolehKelola();
  gabungData();
}
function updateUI() {
  protectedElements.forEach(node => node.classList.toggle('butuh-login', !isLogin));
  if (el('gateAdmin')) el('gateAdmin').style.display = isLogin ? 'none' : 'flex';
  const st = el('statusLogin');
  if (st) {
    st.innerText = isLogin ? 'Halo Admin UD. BILAL' : '🔒 Mode Lihat Saja';
    st.style.color = isLogin ? '#fef3c7' : '#fecaca';
    st.style.fontWeight = '700';
    st.style.fontSize = '12px';
  }
  const bl = el('btnLogin'); if(bl) bl.innerText = isLogin ? 'LOGOUT' : 'LOGIN';
  const bt = el('btnTambah'); if(bt){ if(isLogin) bt.classList.remove('hidden'); else bt.classList.add('hidden'); }
}

window.toggleLogin = async () => {
  if (!IS_ADMIN_PAGE || !isLogin || loginBusy || writeBusy) return;
  try { await hasil(db.auth.signOut()); toast('Berhasil Logout'); }
  catch(e){ toastError(pesanError(e)); }
};

window.gateMasuk = async () => {
  if (!IS_ADMIN_PAGE || loginBusy) return;
  const email = el('gateEmail')?.value.trim();
  const pass = el('gatePass')?.value;
  if (!email || !pass) { toastError('Isi Email & Password dulu!'); return; }
  loginBusy = true;
  const buttons = document.querySelectorAll('[data-login-submit]');
  buttons.forEach(b => { b.disabled = true; b.textContent = 'MEMPROSES...'; });
  try {
    await masuk(email, pass);
    toast('Login Berhasil!');
  } catch(e){ toastError(pesanError(e)); }
  finally {
    if (el('gatePass')) el('gatePass').value = '';
    loginBusy = false;
    buttons.forEach(b => { b.disabled = false; b.textContent = 'MASUK'; });
  }
};
['gatePass','gateEmail'].forEach(id => el(id)?.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); window.gateMasuk(); }
}));

window.bukaForm = () => {
  if (!bolehKelola()){ toastError("Harus Login dulu!"); return; }
  if (writeBusy) return;
  window.batalEdit();
  const j = el('judulForm'); if(j) j.innerText = 'Tambah Barang';
  const bb = el('btnBatalForm'); if(bb) bb.innerText = 'Batal';
  const p = el('popupForm'); if(p) p.classList.remove('hidden');
};
window.tutupForm = () => { if(!writeBusy) window.batalEdit(); };

let cariTimer = null;
window.cariBarang = (teks) => { clearTimeout(cariTimer); cariTimer = setTimeout(()=>{ kataCari = teks.toLowerCase().trim(); currentPage = 1; render(); }, 250); };

window.toggleFilterMenipis = () => {
  if (!bolehKelola()) return;
  filterMenipis = !filterMenipis;
  currentPage = 1;
  const card = el('cardStokMenipis');
  if (card) card.classList.toggle('aktif-filter', filterMenipis);
  render();
  toast(filterMenipis ? 'Menampilkan produk stok menipis (≤ 5)' : 'Menampilkan semua produk');
};

window.bukaZoomFoto = (id) => {
  const b = barang.find(x => String(x.id) === String(id));
  const srcFoto = fotoAman(b?.foto);
  if (!srcFoto) return;
  let modal = document.getElementById('modalZoomFoto'); if(modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'modalZoomFoto';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `<img src="${aman(srcFoto)}" alt="${aman(b?.nama || 'Foto Produk')}" style="max-width:95%;max-height:88%;object-fit:contain;border-radius:12px;"><button type="button" onclick="document.getElementById('modalZoomFoto').remove()" style="position:absolute;top:16px;right:16px;background:#ffffff;color:#111827;width:38px;height:38px;border-radius:50%;border:none;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.3);">✕</button>`;
  modal.addEventListener('click', (e)=>{ if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window.beliSekarang = (id) => {
  const b = barang.find(x => String(x.id) === String(id)); if(!b) return;
  let q = 1; let j = b.jual ?? b.harga ?? 0; let total = q * j;
  let pesan = `Halo UD. BILAL, saya mau pesan:\n- ${b.nama}\n- Jumlah: ${q}\n- Harga: Rp ${Number(j).toLocaleString('id-ID')} / pcs\n- Total: Rp ${Number(total).toLocaleString('id-ID')}`;
  window.open(`https://wa.me/${NOMOR_WA}?text=${encodeURIComponent(pesan)}`, '_blank');
};

function filteredBarang(){
  return barang.filter(b => {
    const cocokCari = String(b.nama ?? '').toLowerCase().includes(kataCari) || String(b.keterangan ?? '').toLowerCase().includes(kataCari);
    if (!cocokCari) return false;
    if (IS_ADMIN_PAGE && filterMenipis) {
      const stokAngka = Math.max(0, parseFloat(String(b.stok ?? '').replace(',', '.')) || 0);
      return stokAngka <= 5;
    }
    return true;
  });
}

function render() {
  updateUI();
  let totalUntung = 0;
  let stokMenipis = 0;
  barang.forEach(b => {
    let j = b.jual ?? b.harga ?? 0;
    let stokAngka = Math.max(0, parseFloat(String(b.stok ?? '').replace(',', '.')) || 0);
    if (isLogin) totalUntung += (j - (b.modal || 0)) * stokAngka;
    if (stokAngka <= 5) stokMenipis++;
  });
  if (el('statTotalProduk')) el('statTotalProduk').innerText = barang.length;
  if (el('statTotalUntung')) el('statTotalUntung').innerText = 'Rp ' + totalUntung.toLocaleString('id-ID');
  if (el('statStokMenipis')) el('statStokMenipis').innerText = stokMenipis;
  if (el('cardStokMenipis')) el('cardStokMenipis').classList.toggle('aktif-filter', IS_ADMIN_PAGE && filterMenipis);

  let hasilCari = filteredBarang();
  let totalPage = Math.max(1, Math.ceil(hasilCari.length / perPage)); if (currentPage > totalPage) currentPage = totalPage;
  let list = hasilCari.slice((currentPage - 1) * perPage, currentPage * perPage); let html = '';
  list.forEach(b => {
    let j = b.jual ?? b.harga ?? 0; let modal = b.modal || 0; let u = j - modal; let ket = bersihKet(b.keterangan);
    let badgeBaru = isHariIni(b.tanggal_update) ? `<span class="badge-baru">BARU</span>` : '';
    let stokAngka = Math.max(0, parseFloat(String(b.stok ?? '').replace(',', '.')) || 0);
    let srcFoto = fotoAman(b.foto);
    let foto = srcFoto ? `<img loading="lazy" decoding="async" src="${aman(srcFoto)}" onclick="${aksi('bukaZoomFoto', b.id)}" class="foto-produk cursor-pointer" alt="${aman(b.nama)}">` : `<div class="w-full flex items-center justify-center text-gray-400 text-xs" style="aspect-ratio:1/1;background:#f8f8f8;">Belum ada foto</div>`;
    let tombolWA = IS_ADMIN_PAGE ? '' : `<div style="margin-top:auto;padding-top:8px;"><button onclick="${aksi('beliSekarang', b.id)}" class="rounded-full font-bold text-white" style="width:94%;max-width:162px;margin:0 auto 2px;padding:7px 10px;font-size:12px;line-height:1.1;white-space:nowrap;background:linear-gradient(135deg,#166534 0%,#15803d 100%);box-shadow:0 2px 6px rgba(22,101,52,.28);display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="17" height="17" viewBox="0 0 32 32" style="flex-shrink:0;overflow:visible;"><path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.54 1.74 6.52L3 29l6.66-1.71A12.94 12.94 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="#25D366" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/><path fill="#ffffff" d="M21.6 18.6c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg><span>Pesan via WA</span></button></div>`;
    let blokKet = ket ? `<p class="text-[12px] text-gray-500 mt-1 line-clamp-2">${aman(ket)}</p>` : '';
    let isiKartu = `<div class="p-2 text-center flex-1 flex flex-col"><p class="font-bold text-[15px] leading-tight line-clamp-2" style="color:#1f2937;">${aman(b.nama)}</p><p class="font-bold text-[14px] mt-1" style="color:#166534;">Rp ${Number(j).toLocaleString('id-ID')}</p>${blokKet}${tombolWA}</div>`;
    let infoAdmin = '';
    if (IS_ADMIN_PAGE && isLogin) {
      infoAdmin = `<div class="info-admin-box"><div class="flex justify-between"><span style="color:#888;">Modal</span><b>Rp ${Number(modal).toLocaleString('id-ID')}</b></div><div class="flex justify-between mt-0.5"><span style="color:#888;">Untung</span><b class="${u>=0?'text-green-600':'text-red-600'}">Rp ${u.toLocaleString('id-ID')}</b></div><div class="mt-0.5"><div class="flex justify-between"><span style="color:#888;">Stok</span><b class="${stokAngka<=5?'text-red-600':''}">${stokAngka <= 5 ? '❗ ' : ''}${aman(tampilStok(b))}</b></div></div><div class="flex justify-between mt-0.5"><span style="color:#888;">Update</span><b style="color:#475569;">${aman(formatTanggalUpdate(b.tanggal_update))}</b></div></div><div class="flex gap-2 px-2 pb-2 pt-1"><button onclick="${aksi('editBarang', b.id)}" class="btn-edit">✏️ Edit</button><button onclick="${aksi('hapus', b.id)}" class="btn-hapus">🗑️ Hapus</button></div>`;
    }
    html += `<div class="kartu"><div class="relative">${foto}<div class="absolute top-1 left-1">${badgeBaru}</div></div>${isiKartu}${infoAdmin}</div>`;
  });
  if (hasilCari.length === 0) {
    const pesanKosong = (IS_ADMIN_PAGE && filterMenipis && !kataCari)
      ? 'Stok aman! Tidak ada barang dengan stok menipis.'
      : 'Barang gak ketemu, coba kata lain';
    html = `<p class="text-center text-gray-400 py-6" style="grid-column: 1 / -1;">${pesanKosong}</p>`;
  }
  const tabel = el('tabel'); if(tabel) tabel.innerHTML = html;
  const info = el('infoPage'); if(info) info.innerText = `Page ${currentPage} / ${totalPage} (Total ${hasilCari.length} barang)`;
  const foot = document.querySelector('.footer'); if(foot) foot.innerHTML = (IS_ADMIN_PAGE && isLogin) ? `Total Jenis Produk: ${barang.length} | Total Untung: Rp ${totalUntung.toLocaleString('id-ID')}` : `Total Jenis Produk: ${barang.length}`;
}

window.gantiPage = (n) => { let tp = Math.max(1, Math.ceil(filteredBarang().length / perPage)); currentPage += n; if (currentPage < 1) currentPage = 1; if (currentPage > tp) currentPage = tp; render(); window.scrollTo(0, 0); };

window.simpan = async () => {
  if (!bolehKelola()){ toastError('Harus Login dulu!'); return; }
  if (writeBusy) return;
  if (!privateReady){ toastError('Data modal belum siap. Tunggu atau muat ulang halaman.'); return; }
  
  const nama = el('nama').value.trim(), modalText = el('modal').value.trim(), jualText = el('harga').value.trim();
  const modal = Number(modalText), jual = Number(jualText), stok = el('stok').value.trim();
  const keterangan = bersihKet(el('keterangan').value);
  
  if (!nama || !modalText || !jualText || !stok || !Number.isFinite(modal) || !Number.isFinite(jual) || modal < 0 || jual < 0){ 
    toastError('Lengkapi data. Harga harus angka nol atau lebih.'); 
    return; 
  }
  
  writeBusy = true;
  const button = el('btnSimpan'); 
  button.disabled = true; 
  button.innerText = 'MENYIMPAN...';

  const idEdit = editId;
  const idProduk = idEdit || crypto.randomUUID();
  const fotoLama = window.FOTO_LAMA || null;
  const fotoBaru = window.FOTO_BARU;
  let fotoBaruTerupload = null;
  let tahap = 'upload';

  try {
    let fotoUntukDisimpan = idEdit ? fotoLama : null;
    if (fotoBaru) {
      fotoBaruTerupload = await uploadFoto(fotoBaru, `produk-${idProduk}-${crypto.randomUUID()}.jpg`);
      fotoUntukDisimpan = fotoBaruTerupload;
    }
    tahap = 'database';
    await hasil(db.rpc('simpan_produk', {
      p_id: idProduk, p_baru: !idEdit, p_nama: nama,
      p_jual: jual, p_modal: modal, p_stok: stok, p_keterangan: keterangan,
      p_foto: fotoUntukDisimpan, p_tanggal: getTanggalHariIni()
    }));
  } catch(e) {
    if (fotoBaruTerupload) hapusFoto(fotoBaruTerupload).catch(()=>{});
    toastError(tahap === 'upload'
      ? 'Upload foto gagal: ' + pesanError(e)
      : 'Hasil penyimpanan belum terkonfirmasi: ' + pesanError(e) + '. Muat ulang dan periksa produk sebelum mencoba lagi.');
    writeBusy = false;
    button.disabled = false;
    button.innerText = editId ? 'UPDATE' : 'SIMPAN';
    return;
  }

  let pesan = '✅ Berhasil disimpan!';
  try {
    const dipakaiProdukLain = barang.some(b => String(b.id) !== String(idProduk) && b.foto === fotoLama);
    if (fotoBaruTerupload && fotoLama && !dipakaiProdukLain) {
      try { await hapusFoto(fotoLama); }
      catch(e) { pesan += ' Foto lama belum dapat dibersihkan.'; }
    }
    resetFormProduk();
    try { await muat(); }
    catch(e) { pesan += ' Daftar belum diperbarui; muat ulang halaman.'; }
    toast(pesan);
  } finally {
    writeBusy = false;
    button.disabled = false;
    button.innerText = editId ? 'UPDATE' : 'SIMPAN';
  }
};

window.editBarang = (id) => {
  if(writeBusy) return;
  if(!privateReady){ toastError('Data modal belum siap.'); return; }
  if (!bolehKelola()){ toastError("Harus Login dulu!"); return; } 
  let b = barang.find(x => String(x.id) === String(id)); if (!b){ toastError("Barang gak ketemu!"); return; }
  window.FOTO_LAMA = b.foto || null;
  el('nama').value = b.nama; el('modal').value = b.modal ?? ''; el('harga').value = b.jual ?? b.harga ?? 0; el('keterangan').value = bersihKet(b.keterangan); el('stok').value = b.stok; window.FOTO_BARU = null;
  const prev = el('fotoPreview'); const st = el('fotoStatus');
  const safeFoto = fotoAman(b.foto);
  if(prev){ 
    if(safeFoto){ prev.src=safeFoto; prev.classList.remove('hidden'); if(st) st.innerText='Foto lama aktif. Pilih foto baru jika ingin mengganti.'; } 
    else { prev.src=''; prev.classList.add('hidden'); if(st) st.innerText='Belum ada foto.'; } 
  }
  const inpFoto = el('fotoInput'); if(inpFoto) inpFoto.value=''; editId = b.id; 
  if(el('btnSimpan')) el('btnSimpan').innerText = "UPDATE"; 
  if(el('btnBatalForm')) el('btnBatalForm').innerText = "Batal Edit";
  if(el('judulForm')) el('judulForm').innerText = 'Edit Barang'; 
  const pf=el('popupForm'); if(pf) pf.classList.remove('hidden');
};

window.hapus = async (id) => {
  if(!bolehKelola()){ toastError('Harus Login dulu!'); return; }
  if(writeBusy || !confirm('Hapus barang ini?')) return;
  writeBusy = true;
  try {
    const target = barang.find(x => String(x.id) === String(id));
    await hasil(db.rpc('hapus_produk', { p_id: target ? target.id : id }));
    let pesan = 'Barang dihapus';
    const dipakaiProdukLain = target?.foto && barang.some(b => String(b.id) !== String(id) && b.foto === target.foto);
    if (target?.foto && !dipakaiProdukLain) {
      try { await hapusFoto(target.foto); }
      catch(e) { pesan += ', tapi foto lama belum terhapus.'; }
    }
    await muat();
    toast(pesan);
  } catch(e){ toastError(pesanError(e)); }
  finally { writeBusy = false; }
};

function resetFormProduk() {
  editId = null;
  window.FOTO_BARU = null; window.FOTO_LAMA = null;
  const prev = el('fotoPreview'); if(prev){ prev.src=''; prev.classList.add('hidden'); }
  const inpFoto = el('fotoInput'); if(inpFoto) inpFoto.value='';
  const st = el('fotoStatus'); if(st) st.innerText='';
  if(el('nama')) el('nama').value='';
  if(el('modal')) el('modal').value='';
  if(el('harga')) el('harga').value='';
  if(el('keterangan')) el('keterangan').value='';
  if(el('stok')) el('stok').value='';
  if(el('btnSimpan')) el('btnSimpan').innerText = "SIMPAN";
  if(el('btnBatalForm')) el('btnBatalForm').innerText = "Batal";
  const pf=el('popupForm'); if(pf) pf.classList.add('hidden');
}

window.batalEdit = () => {
  if(writeBusy) return;
  resetFormProduk();
};

function refresh(){
  if(IS_ADMIN_PAGE && !isLogin) return;
  muat().catch(e=>toastError(pesanError(e)));
}
updateUI();
if(IS_ADMIN_PAGE){
  pantauAdmin(async allowed=>{
    isLogin=allowed; privateReady=false; barangPrivate={};
    readVersion++;
    if(el('gateChecking')) el('gateChecking').style.display = 'none';
    if(el('gateForm')) el('gateForm').style.display = 'block';
    if(!allowed){
      filterMenipis = false;
      kataCari = '';
      if(el('inputCari')) el('inputCari').value = '';
      if(el('btnClearCari')) el('btnClearCari').style.display = 'none';
      el('cardStokMenipis')?.classList.remove('aktif-filter');
      resetFormProduk();
      ['popupForm','cropModal'].forEach(id=>el(id)?.classList.add('hidden'));
      barangPublic = [];
      barang = [];
      render();
      return;
    }
    gabungData();
    await muat();
  },e=>{
    if(el('gateChecking')) el('gateChecking').style.display = 'none';
    if(el('gateForm')) el('gateForm').style.display = 'block';
    toastError(pesanError(e));
  });
} else refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});
