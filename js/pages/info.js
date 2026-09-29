import { runPage, esc, pageHero, sectionHead, icon, linkify, sponsorLogos } from '../ui.js';

// Shown until the organisers fill in the Info tab of the sheet.
const DEFAULT_INFO = [
  { name: 'Rules', items: [
    { title: 'Match length', body: 'To be confirmed by the organising committee.' },
    { title: 'Who can play', body: 'Old boys and old girls of the school, playing for the team of their year group. Details to be confirmed by the organising committee.' },
    { title: 'Points & ranking', body: 'Win 3, draw 1, loss 0. Group ties are broken by goal difference, goals scored, then head-to-head.' },
    { title: 'Knockouts', body: 'Top 2 in each group and the 2 best third-placed teams go to the quarterfinals. A level knockout match goes to penalties.' },
    { title: 'Cards', body: 'A red card means the player sits out the rest of that match. Further discipline to be confirmed by the organising committee.' },
  ] },
];

runPage('info', (model, page) => {
  const venue = model.cfg.venue || 'Kitabuguma Playground, Bishop McAllister, Sheema';
  const mapQ = encodeURIComponent(model.cfg.mapquery || venue);
  const sections = model.info.length ? model.info : DEFAULT_INFO;
  const contacts = sections.find((s) => /contact/i.test(s.name));
  const others = sections.filter((s) => s !== contacts);

  page.innerHTML = pageHero('Info', 'Rules, how to get there, who to call — everything for match day.') + `
  <div class="wrap">
    ${model.announcements.length ? `<section class="section">
      ${sectionHead('Match-day updates')}
      <ul class="updates">${model.announcements.map((a) => `<li class="${a.urgent ? 'urgent' : ''}">${a.time ? `<b>${esc(a.time)}</b>` : ''}<span>${linkify(a.message)}</span></li>`).join('')}</ul>
    </section>` : ''}

    <section class="section">
      ${sectionHead('Venue & directions')}
      <article class="card venue-card">
        <div class="pad">
          <p class="venue-name">${icon('pin', 'ic')} <b>${esc(venue)}</b></p>
          ${model.cfg.directions ? `<p>${linkify(model.cfg.directions)}</p>` : ''}
          <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener">${icon('pin', 'ic ic-sm')} Open in Google Maps</a>
        </div>
        <iframe class="map" title="Map of ${esc(venue)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://maps.google.com/maps?q=${mapQ}&z=14&output=embed"></iframe>
      </article>
    </section>

    ${others.map((sec) => `<section class="section">
      ${sectionHead(esc(sec.name))}
      <div class="info-list">${sec.items.map((it) => `
        <details class="card info-item" open>
          <summary>${esc(it.title || sec.name)}</summary>
          <div class="info-body">${linkify(it.body)}${it.link ? `<p><a href="${esc(it.link)}" target="_blank" rel="noopener">More ${icon('arrow', 'ic ic-xs')}</a></p>` : ''}</div>
        </details>`).join('')}</div>
    </section>`).join('')}

    ${contacts ? `<section class="section">
      ${sectionHead('Contacts')}
      <div class="contacts">${contacts.items.map((c) => {
        const num = (c.body.match(/\+?\d[\d\s-]{8,}\d/) || [''])[0].replace(/[\s-]/g, '');
        const wa = num ? num.replace(/^0/, '256').replace(/^\+/, '') : '';
        return `<article class="card contact">
          <div><b>${esc(c.title)}</b><span class="muted">${linkify(c.body)}</span></div>
          ${num ? `<div class="contact-actions">
            <a class="btn btn-sm" href="tel:${esc(num)}">${icon('phone', 'ic ic-sm')} Call</a>
            <a class="btn btn-sm btn-wa" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>
          </div>` : ''}
        </article>`;
      }).join('')}</div>
    </section>` : ''}

    ${model.sponsors.length ? `<section class="section">
      ${sectionHead('Our sponsors', 'Thank you for supporting the Kyogyera League.')}
      ${sponsorLogos(model.sponsors, 'sponsors-big')}
    </section>` : ''}
  </div>`;
});
