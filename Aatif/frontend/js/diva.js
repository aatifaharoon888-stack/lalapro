// DIVA STUDIO — drag & drop outfit builder
const DIVA = { items: [], composed: { top:null, bottom:null, shoes:null, acc:null }, rotation: 0 };

async function loadPool() {
  const r = await F.get(F.api + '/items.php?action=list');
  DIVA.items = r.items || [];
  F.$('#diva-pool').innerHTML = DIVA.items.map(i => `
    <div class="pool-item" draggable="true" data-id="${i.id}" data-cat="${i.slug}" title="${i.name}">
      <img src="${i.image}" alt="${i.name}">
    </div>`).join('') || '<p class="muted" style="grid-column:1/-1;padding:1rem">Closet is empty. Upload pieces first.</p>';

  F.$$('.pool-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.dataset.id);
      e.dataTransfer.setData('cat', el.dataset.cat);
    });
  });
}
function setupSlots() {
  const map = { tops:'top', bottoms:'bottom', dresses:'top', outerwear:'top', shoes:'shoes', accessories:'acc', jewelry:'acc', handbags:'acc' };
  F.$$('.slot').forEach(slot => {
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('over'));
    slot.addEventListener('drop', e => {
      e.preventDefault(); slot.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const cat = e.dataTransfer.getData('cat');
      const item = DIVA.items.find(i => i.id == id); if (!item) return;
      const target = map[cat] || slot.dataset.slot;
      const targetSlot = F.$(`.slot.${target}`) || slot;
      DIVA.composed[target] = item;
      targetSlot.innerHTML = `<img src="${item.image}" alt="${item.name}">`;
    });
  });
}
function rotateMannequin(dir) {
  DIVA.rotation += dir * 25;
  F.$('.mannequin').style.transform = `rotateY(${DIVA.rotation}deg)`;
}
window.rotateMannequin = rotateMannequin;

async function saveOutfit() {
  const ids = Object.values(DIVA.composed).filter(Boolean).map(i => i.id);
  if (!ids.length) return F.toast('Compose a look first', 'err');
  const name = prompt('Name your look:', 'Untitled Look') || 'Untitled Look';
  const r = await F.post(F.api + '/outfit-engine.php?action=save', { name, item_ids: JSON.stringify(ids) });
  if (r.ok) F.toast('Look saved to your archive');
}
function clearLook() {
  DIVA.composed = { top:null, bottom:null, shoes:null, acc:null };
  F.$$('.slot').forEach(s => s.innerHTML = s.dataset.label);
}
async function autoCompose() {
  const r = await F.get(F.api + '/outfit-engine.php?action=recommend');
  clearLook();
  (r.picks || []).forEach(p => {
    const map = { tops:'top', bottoms:'bottom', dresses:'top', outerwear:'top', shoes:'shoes', accessories:'acc', jewelry:'acc', handbags:'acc' };
    const target = map[p.slug];
    if (!target) return;
    DIVA.composed[target] = p;
    const slot = F.$(`.slot.${target}`);
    if (slot) slot.innerHTML = `<img src="${p.image}" alt="${p.name}">`;
  });
}
window.saveOutfit = saveOutfit; window.clearLook = clearLook; window.autoCompose = autoCompose;

document.addEventListener('DOMContentLoaded', () => { loadPool(); setupSlots(); });
