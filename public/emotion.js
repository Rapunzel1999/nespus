/* Nespus emotion v2. UNPUBLISHED visual draft. No fetch, form submission,
   cart/checkout, email, analytics, persistent storage or gift-link generation.
   Text stays in JS/DOM memory. A chosen test photo uses a revocable object URL.
   Shopify's own scripts are outside this component; use fictional examples. */
(() => {
  'use strict';
  if (customElements.get('nespus-atelier')) return;
  const OCCASIONS = ['sorry', 'love', 'birthday', 'thanks', 'when'];
  const STYLES = ['paper', 'sage', 'midnight'];
  const TEXT_FIELDS = ['title', 'body', 'memory', 'ps', 'note1', 'note2', 'note3', 'tier'];
  class NespusAtelier extends HTMLElement {
    connectedCallback() {
      if (this.abort) return;
      this.fields = Object.fromEntries([...this.querySelectorAll('[data-field]')].map(el => [el.dataset.field, el]));
      this.dialog = this.querySelector('dialog');
      if (!this.dialog || !this.fields.includeNotes) return;
      this.abort = new AbortController();
      const signal = this.abort.signal;
      this.styleName = 'paper';
      this.currentOccasion = this.fields.occasion.value;
      this.drafts = new Map();
      this.undoBody = null;
      this.photoUrl = null;
      this.photoSequence = 0;
      this.pendingUrls = new Set();
      this.timers = new Set();
      this.baseNotes = [1, 2, 3].map(i => this.fields['note' + i].value);
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.envelope = this.querySelector('.ns-gift-envelope');
      this.addEventListener('submit', e => e.preventDefault(), {signal});
      this.addEventListener('input', e => {
        if (e.target.matches('[data-hero-name]')) this.fields.to.value = e.target.value.slice(0, 60);
        if (e.target === this.fields.body) this.undoBody = null;
        this.sync();
      }, {signal});
      this.addEventListener('change', e => {
        if (e.target === this.fields.occasion) this.selectOccasion(e.target.value, false);
        if (e.target.matches('[data-photo-input]')) void this.loadPhoto(e.target.files?.[0]);
        this.sync();
      }, {signal});
      this.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button || !this.contains(button)) return;
        if (button.hasAttribute('data-close')) this.dialog.close();
        else if (button.hasAttribute('data-style')) {
          this.styleName = STYLES.includes(button.dataset.style) ? button.dataset.style : 'paper';
          this.sync();
        } else if (button.hasAttribute('data-occasion')) this.selectOccasion(button.dataset.occasion, true);
        else if (button.hasAttribute('data-tier')) {
          if (!['0', '1', '2'].includes(button.dataset.tier)) return;
          this.fields.tier.value = button.dataset.tier;
          this.sync(); this.focusEditor();
        } else if (button.hasAttribute('data-demo')) this.openPreview(true, button);
        else if (button.hasAttribute('data-preview')) this.openPreview(false, button);
        else if (button.hasAttribute('data-inspire')) this.inspire();
        else if (button.hasAttribute('data-undo')) this.undo();
        else if (button.hasAttribute('data-remove-photo')) this.removePhoto();
        else if (button.hasAttribute('data-sound')) void this.toggleSound();
        else if (button.hasAttribute('data-keep')) this.keepMoment(button);
        else if (button.hasAttribute('data-replay')) this.replay();
      }, {signal});
      this.dialog.addEventListener('close', () => this.afterClose(), {signal});
      this.dialog.addEventListener('click', e => {
        if (e.target !== this.dialog) return;
        const r = this.dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) this.dialog.close();
      }, {signal});
      this.envelope.addEventListener('toggle', () => {
        if (!this.dialog.open) return;
        const open = this.envelope.open;
        this.querySelector('[data-envelope-action]').textContent = (open ? this.dataset.giftCloseEnvelope : this.dataset.open) + (open ? ' ↙' : ' ↗');
        this.querySelectorAll('.ns-gift-steps li').forEach((li, i) => li.classList.toggle('is-current', i === (open ? 1 : 0)));
        if (open) {
          if (this.previewOccasion === 'birthday' && !this.celebrated) { this.celebrated = true; this.particles(); }
          this.defer(() => { if (this.dialog.open && this.envelope.open) this.querySelector('[data-gift-title]').focus({preventScroll:true}); }, 100);
        }
      }, {signal});
      this.querySelectorAll('[data-note]').forEach(details => details.addEventListener('toggle', () => {
        this.querySelector('[data-notes-count]').textContent = String(this.querySelectorAll('[data-note][open]').length);
        this.markDetails();
      }, {signal}));
      this.querySelector('.ns-secret').addEventListener('toggle', () => this.markDetails(), {signal});
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopSound(); }, {signal});
      this.motion.addEventListener('change', () => {
        if (this.motion.matches) { this.resetTilt(); this.clearParticles(); }
      }, {signal});
      const art = this.querySelector('.ns-hero-art');
      art.addEventListener('pointermove', e => {
        if (this.motion.matches || e.pointerType !== 'mouse') return;
        const rect = art.getBoundingClientRect();
        art.style.setProperty('--tilt-x', ((e.clientY - rect.top) / rect.height * -5 + 2.5).toFixed(2) + 'deg');
        art.style.setProperty('--tilt-y', ((e.clientX - rect.left) / rect.width * 6 - 3).toFixed(2) + 'deg');
      }, {signal});
      art.addEventListener('pointerleave', () => this.resetTilt(), {signal});
      this.sync();
    }
    disconnectedCallback() {
      if (!this.abort) return;
      if (this.dialog.open) this.dialog.close();
      this.restoreScroll();
      this.stopSound();
      this.removePhoto();
      if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
      this.pendingUrls.forEach(url => URL.revokeObjectURL(url));
      this.pendingUrls.clear();
      this.timers.forEach(id => clearTimeout(id));
      this.timers.clear();
      this.drafts.clear();
      this.abort.abort(); this.abort = null;
    }
    defer(fn, ms) {
      const id = setTimeout(() => { this.timers.delete(id); if (this.abort) fn(); }, ms);
      this.timers.add(id); return id;
    }
    example(name) {
      const template = this.querySelector('template[data-example="' + name + '"]')?.content;
      const value = selector => template?.querySelector(selector)?.textContent || '';
      return {title:value('[data-title-source]'), body:value('[data-body-source]'), guide:value('[data-guide-source]'), starter:value('[data-starter-source]'), ending:value('[data-ending-source]')};
    }
    readState() {
      return {...Object.fromEntries(TEXT_FIELDS.map(key => [key, this.fields[key].value])),
        to:this.fields.to.value.trim(), from:this.fields.from.value.trim(),
        includeNotes:this.fields.includeNotes.checked, style:this.styleName, occasion:this.currentOccasion};
    }
    selectOccasion(name, scroll) {
      if (!OCCASIONS.includes(name)) return;
      if (name !== this.currentOccasion) {
        this.drafts.set(this.currentOccasion, this.readState());
        const saved = this.drafts.get(name);
        const sample = this.example(name);
        const state = saved || {...sample, memory:'', ps:'', note1:this.baseNotes[0], note2:this.baseNotes[1], note3:this.baseNotes[2], tier:name === 'when' ? '2' : '1', includeNotes:name === 'when', style:name === 'when' ? 'midnight' : ['sorry','thanks'].includes(name) ? 'sage' : 'paper'};
        TEXT_FIELDS.forEach(key => {this.fields[key].value = state[key] || '';});
        this.fields.includeNotes.checked = state.includeNotes;
        this.styleName = state.style;
        this.currentOccasion = name;
        this.fields.occasion.value = name;
        this.undoBody = null;
        this.sync();
        this.querySelector('.ns-form-status').textContent = saved ? this.dataset.draftPreserved : '';
      }
      if (scroll) this.focusEditor();
    }
    focusEditor() {
      this.querySelector('.ns-atelier').scrollIntoView({behavior:this.motion.matches ? 'auto' : 'smooth', block:'start'});
      this.fields.title.focus({preventScroll:true});
    }
    sync() {
      const state = this.readState();
      this.querySelectorAll('[data-to]').forEach(el => {el.textContent = state.to || '…';});
      this.querySelectorAll('[data-from]').forEach(el => {el.textContent = state.from || '…';});
      this.querySelectorAll('[data-title]').forEach(el => {el.textContent = state.title;});
      const heroInput = this.querySelector('[data-hero-name]');
      if (document.activeElement !== heroInput) heroInput.value = this.fields.to.value;
      this.querySelector('.ns-phone').dataset.atmosphere = this.styleName;
      this.dataset.atmosphere = this.styleName;
      this.querySelectorAll('[data-style]').forEach(el => {const yes = el.dataset.style === this.styleName; el.classList.toggle('is-active', yes); el.setAttribute('aria-pressed', String(yes));});
      this.querySelectorAll('[data-occasion]').forEach(el => {const yes = el.dataset.occasion === this.currentOccasion; el.classList.toggle('is-active', yes); el.setAttribute('aria-pressed', String(yes));});
      this.querySelectorAll('[data-tier]').forEach(el => {el.setAttribute('aria-pressed', String(el.dataset.tier === state.tier));});
      this.querySelector('[data-guide]').textContent = this.example(this.currentOccasion).guide;
      this.querySelector('[data-char-count]').textContent = String(state.body.length);
      this.querySelector('[data-undo]').hidden = this.undoBody === null;
      this.querySelector('.ns-note-editor').hidden = !state.includeNotes;
      this.querySelector('.ns-form-status').textContent = '';
    }
    inspire() {
      const body = this.fields.body;
      const starter = this.example(this.currentOccasion).starter;
      if (!starter || body.value.includes(starter)) return;
      this.undoBody = body.value;
      body.value = (starter + (body.value ? '\n\n' + body.value : '')).slice(0, 1500);
      body.focus({preventScroll:true}); body.setSelectionRange(0, starter.length);
      this.sync();
    }
    undo() {
      if (this.undoBody === null) return;
      this.fields.body.value = this.undoBody; this.undoBody = null; this.sync();
    }
    openPreview(demo, trigger) {
      if (this.dialog.open) return;
      const state = this.readState();
      if (demo) {
        const example = this.example(this.currentOccasion);
        const extras = this.querySelector('template[data-demo-extras]').content;
        Object.assign(state, {title:example.title, body:example.body, to:state.to || 'Ana', from:state.from || 'Paul', includeNotes:this.currentOccasion === 'love' || this.currentOccasion === 'when', note1:this.baseNotes[0], note2:this.baseNotes[1], note3:this.baseNotes[2], memory:this.currentOccasion === 'love' ? extras.querySelector('[data-memory-source]').textContent : '', ps:this.currentOccasion === 'love' ? extras.querySelector('[data-ps-source]').textContent : ''});
      } else if (!state.to || !state.from || !state.title.trim() || state.body.trim().length < 10) {
        this.querySelector('.ns-form-status').textContent = this.dataset.validation; this.focusEditor(); return;
      }
      this.returnFocus = trigger;
      this.renderGift(state, demo ? null : this.photoUrl);
      this.dialog.querySelectorAll('details').forEach(el => {el.open = false;});
      this.querySelector('[data-notes-count]').textContent = '0';
      this.querySelector('[data-kept-message]').textContent = '';
      this.querySelector('[data-keep]').setAttribute('aria-pressed', 'false');
      this.querySelector('[data-envelope-action]').textContent = this.dataset.open + ' ↗';
      this.celebrated = false;
      this.previousOverflow = document.documentElement.style.overflow;
      this.scrollLocked = true;
      document.documentElement.style.overflow = 'hidden';
      this.dialog.showModal(); this.dialog.scrollTop = 0;
    }
    renderGift(state, photo) {
      const set = (selector, value) => this.dialog.querySelectorAll(selector).forEach(el => {el.textContent = value;});
      set('[data-gift-to]', state.to); set('[data-gift-from]', state.from);
      set('[data-gift-title]', state.title); set('[data-letter]', state.body);
      set('[data-gift-memory]', state.memory); set('[data-gift-ps]', state.ps);
      set('[data-gift-ending]', this.example(state.occasion).ending);
      set('[data-gift-occasion]', this.fields.occasion.options[this.fields.occasion.selectedIndex].textContent);
      [1,2,3].forEach(i => set('[data-gift-note="' + i + '"]', state['note' + i]));
      this.querySelector('.ns-gift').dataset.atmosphere = state.style;
      this.querySelector('.ns-notes').hidden = !state.includeNotes;
      this.querySelector('.ns-secret').hidden = !state.ps.trim();
      this.querySelector('.ns-memory').hidden = !state.memory.trim() && !photo;
      const image = this.querySelector('[data-gift-photo]');
      image.hidden = !photo;
      if (photo) image.src = photo; else image.removeAttribute('src');
      this.querySelector('.ns-memory-symbol').hidden = Boolean(photo);
      this.previewOccasion = state.occasion;
    }
    restoreScroll() {
      if (this.scrollLocked) {document.documentElement.style.overflow = this.previousOverflow; this.scrollLocked = false;}
    }
    afterClose() {
      this.restoreScroll(); this.stopSound(); this.clearParticles();
      this.timers.forEach(id => clearTimeout(id)); this.timers.clear();
      if (this.returnFocus?.isConnected) this.returnFocus.focus({preventScroll:true});
    }
    markDetails() {
      if (!this.dialog.open || !this.envelope.open) return;
      this.querySelectorAll('.ns-gift-steps li').forEach((el, i) => el.classList.toggle('is-current', i === 2));
    }
    replay() {
      this.stopSound(); this.clearParticles();
      this.dialog.querySelectorAll('details').forEach(el => {el.open = false;});
      this.querySelector('[data-kept-message]').textContent = '';
      this.querySelector('[data-keep]').setAttribute('aria-pressed', 'false');
      this.dialog.scrollTop = 0; this.envelope.querySelector('summary').focus({preventScroll:true});
    }
    resetTilt() {
      const art = this.querySelector('.ns-hero-art');
      art.style.setProperty('--tilt-x', '0deg'); art.style.setProperty('--tilt-y', '0deg');
    }
    keepMoment(button) {
      if (button.getAttribute('aria-pressed') === 'true') return;
      button.setAttribute('aria-pressed', 'true');
      this.querySelector('[data-kept-message]').textContent = this.dataset.momentKept;
      this.markDetails(); this.particles();
    }
    particles() {
      if (this.motion.matches) return;
      const holder = this.querySelector('.ns-celebration'); this.clearParticles();
      for (let i = 0; i < 14; i++) {
        const el = document.createElement('span');
        el.textContent = i % 3 === 0 ? '✧' : '·';
        el.style.setProperty('--left', (7 + (i * 37) % 86) + '%');
        el.style.setProperty('--delay', (i % 5) * 55 + 'ms');
        holder.append(el);
      }
      this.defer(() => this.clearParticles(), 2600);
    }
    clearParticles() {this.querySelector('.ns-celebration')?.replaceChildren();}
    async loadPhoto(file) {
      if (!file) return;
      const sequence = ++this.photoSequence;
      const status = this.querySelector('[data-photo-status]');
      status.textContent = '';
      let url;
      try {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024 || file.size < 12) throw new Error('invalid');
        const b = new Uint8Array(await file.slice(0,12).arrayBuffer());
        const valid = file.type === 'image/jpeg' ? b[0]===255 && b[1]===216 && b[2]===255 : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x) : String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP';
        if (!valid || !this.abort || sequence !== this.photoSequence) return this.photoFailure(sequence);
        url = URL.createObjectURL(file); this.pendingUrls.add(url);
        const img = new Image(); img.src = url; await img.decode();
        if (!img.naturalWidth || img.naturalWidth*img.naturalHeight > 25000000) throw new Error('invalid');
        if (!this.abort || sequence !== this.photoSequence) {URL.revokeObjectURL(url); this.pendingUrls.delete(url); return;}
        if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
        this.photoUrl = url; this.pendingUrls.delete(url);
        this.querySelector('[data-photo-thumb]').src = url;
        this.querySelector('.ns-photo-thumb').hidden = false;
        status.textContent = this.dataset.photoReady;
      } catch {
        if (url) {URL.revokeObjectURL(url); this.pendingUrls.delete(url);}
        this.photoFailure(sequence);
      }
    }
    photoFailure(sequence) {
      if (this.abort && sequence === this.photoSequence) this.querySelector('[data-photo-status]').textContent = this.dataset.photoError;
    }
    removePhoto() {
      this.photoSequence++;
      if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
      this.photoUrl = null;
      this.querySelector('[data-photo-input]').value = '';
      this.querySelector('[data-photo-thumb]').removeAttribute('src');
      this.querySelector('.ns-photo-thumb').hidden = true;
      this.querySelector('[data-photo-status]').textContent = '';
    }
    async toggleSound() {
      if (this.audio) {this.stopSound(); return;}
      const Ctx = window.AudioContext || window.webkitAudioContext;
      let ctx;
      try {
        if (!Ctx) throw new Error('unavailable');
        ctx = new Ctx(); this.audio = ctx;
        await ctx.resume();
        if (!this.abort || !this.dialog.open || this.audio !== ctx) {await ctx.close().catch(()=>{}); return;}
        const master = ctx.createGain(); master.gain.value = 0.07; master.connect(ctx.destination);
        const notes = [261.63,329.63,392,523.25,440,392,329.63,261.63];
        notes.forEach((frequency,i) => {
          const oscillator = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + i*1.1;
          oscillator.type = 'sine'; oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(0.24,at+0.08); gain.gain.exponentialRampToValueAtTime(0.001,at+3);
          oscillator.connect(gain); gain.connect(master); oscillator.start(at); oscillator.stop(at+3.1);
        });
        this.setSoundState(true);
        this.soundTimer = this.defer(() => this.stopSound(), 12000);
      } catch {
        if (ctx && this.audio === ctx) this.stopSound();
        if (this.abort) this.querySelector('[data-sound-status]').textContent = this.dataset.soundUnavailable;
      }
    }
    setSoundState(on) {
      this.querySelector('[data-sound]').setAttribute('aria-pressed', String(on));
      this.querySelector('[data-sound-start]').hidden = on;
      this.querySelector('[data-sound-stop]').hidden = !on;
    }
    stopSound() {
      if (this.soundTimer) {clearTimeout(this.soundTimer); this.timers?.delete(this.soundTimer); this.soundTimer=null;}
      if (this.audio) {const ctx=this.audio; this.audio=null; void ctx.close().catch(()=>{});}
      this.setSoundState(false);
    }
  }
  customElements.define('nespus-atelier', NespusAtelier);
})();
