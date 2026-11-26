/* Landings de Google Ads SCC: rastreo + pequeños efectos. Lo comparten todas las landings.
   Al subir a GHL este archivo va pegado dentro del Custom HTML (o en el Tracking Code del funnel).
   Cada página define antes: window.SCC_LP = { tratamiento:'knee', version:'a', ads:'AW-…', convWhatsApp:'…', convCita:'…' } */
(function () {
  var C = window.SCC_LP = window.SCC_LP || {};
  var root = document.getElementById('scclp');
  if (!root) return;

  /* 1) UTMs, gclid y fbclid del anuncio: se guardan y se pasan al calendario de GHL */
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  var q = new URLSearchParams(location.search), src = {};
  try { src = JSON.parse(sessionStorage.getItem('scc_src') || '{}'); } catch (e) {}
  KEYS.forEach(function (k) { if (q.get(k)) src[k] = q.get(k); });
  try { sessionStorage.setItem('scc_src', JSON.stringify(src)); } catch (e) {}
  var cal = document.getElementById('scc-cal');
  if (cal && cal.dataset.src) {
    var u = new URL(cal.dataset.src);
    Object.keys(src).forEach(function (k) { u.searchParams.set(k, src[k]); });
    if (!src.utm_source) u.searchParams.set('utm_source', 'landing');
    u.searchParams.set('utm_content', src.utm_content || ('lp-' + C.tratamiento + '-' + (C.version || '')));
    /* el calendario se carga cuando la persona se acerca a esa sección (la página abre más rápido) */
    var cargar = function () { if (!cal.src) cal.src = u.toString(); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { cargar(); o.disconnect(); } }, { rootMargin: '1200px' }).observe(cal);
    } else cargar();
    root.querySelectorAll('a[href="#book"]').forEach(function (a) { a.addEventListener('click', cargar); });
  }

  /* 2) eventos: dataLayer, Google Ads y Meta */
  var META = { whatsapp_click: 'Contact', booking_done: 'Schedule', book_click: 'ViewContent' };
  function track(ev, extra) {
    var p = Object.assign({ treatment: C.tratamiento, variant: C.version, page: location.pathname }, src, extra || {});
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'scc_' + ev }, p)); } catch (e) {}
    if (typeof window.gtag === 'function') {
      window.gtag('event', ev, p);
      var lab = ev === 'whatsapp_click' ? C.convWhatsApp : (ev === 'booking_done' ? C.convCita : '');
      if (C.ads && lab) window.gtag('event', 'conversion', { send_to: C.ads + '/' + lab });
    }
    if (typeof window.fbq === 'function') {
      if (META[ev]) window.fbq('track', META[ev], { content_name: C.tratamiento });
      else window.fbq('trackCustom', ev, { content_name: C.tratamiento });
    }
  }
  window.sccTrack = track;
  root.querySelectorAll('[data-ev]').forEach(function (a) {
    a.addEventListener('click', function () { track(a.getAttribute('data-ev'), { place: a.getAttribute('data-place') || '' }); });
  });
  window.addEventListener('message', function (e) {
    var d = e.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch (x) {}
    var s = JSON.stringify(d || '').toLowerCase();
    if (/leadconnector|msgsender|gohighlevel/.test(e.origin || '') && /booked|booking.?success|appointment.?(booked|created)/.test(s)) {
      if (!window.__sccBooked) { window.__sccBooked = 1; track('booking_done'); }
    }
  });

  /* 3) videos de pacientes: tocar la portada lo reproduce; solo suena uno a la vez */
  var vids = [].slice.call(root.querySelectorAll('video'));
  root.querySelectorAll('[data-play]').forEach(function (b) {
    var box = b.closest('[data-video]'), v = box && box.querySelector('video');
    if (!v) return;
    b.addEventListener('click', function () { v.controls = true; v.play(); });
    v.addEventListener('play', function () {
      box.classList.add('playing');
      vids.forEach(function (o) { if (o !== v) o.pause(); });
      if (!v.__t) { v.__t = 1; track('video_play', { video: v.getAttribute('data-name') || '' }); }
    });
    v.addEventListener('ended', function () { box.classList.remove('playing'); v.controls = false; v.load(); });
  });

  /* 4) aparecer al bajar + contadores */
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rev = [].slice.call(root.querySelectorAll('.rv'));
  function contar(el) {
    var fin = parseFloat(el.getAttribute('data-count')), pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '';
    var t0 = null, dur = 1400;
    function paso(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), v = Math.round(fin * (1 - Math.pow(1 - k, 3)));
      el.textContent = pre + v.toLocaleString('en-US') + suf;
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }
  if (rm || !('IntersectionObserver' in window)) {
    rev.forEach(function (e) { e.classList.add('in'); });
  } else {
    root.classList.add('js');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting) return;
        x.target.classList.add('in'); io.unobserve(x.target);
        x.target.querySelectorAll('[data-count]').forEach(contar);
        if (x.target.hasAttribute('data-count')) contar(x.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    rev.forEach(function (e) { io.observe(e); });
  }

  /* 5) barra fija del celular: aparece al bajar y se esconde sobre la agenda */
  var dock = document.getElementById('scc-dock'), book = document.getElementById('book');
  if (dock) {
    var upd = function () {
      var past = window.scrollY > window.innerHeight * 0.7, onBook = false;
      if (book) { var r = book.getBoundingClientRect(); onBook = r.top < window.innerHeight * 0.85 && r.bottom > 0; }
      dock.classList.toggle('on', past && !onBook);
    };
    window.addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* 6) flechas del carrusel de historias */
  root.querySelectorAll('[data-carr]').forEach(function (c) {
    var pista = c.querySelector('[data-pista]');
    c.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var it = pista.firstElementChild, w = it ? it.getBoundingClientRect().width + 16 : 300;
        pista.scrollBy({ left: w * parseInt(b.getAttribute('data-dir'), 10), behavior: rm ? 'auto' : 'smooth' });
      });
    });
  });
})();
