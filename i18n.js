/**
 * Sevenda — sistema i18n condiviso
 * Lingue: en | it | es | fr
 * Uso: data-i18n="chiave"       → textContent
 *      data-i18n-html="chiave"  → innerHTML
 *      data-i18n-placeholder="chiave" → placeholder
 */

const SEVENDA_I18N = {

  /* ────────────────────────────────────────────────────────────
   * INGLESE (default)
   * ──────────────────────────────────────────────────────────── */
  en: {
    /* ── NAV comune ── */
    'nav.features':'Features','nav.insights':'Insights','nav.usecases':'Use Cases',
    'nav.how':'How it works','nav.pricing':'Pricing','nav.docs':'Docs','nav.faq':'FAQ',
    'nav.cta':'Add to Chrome',

    /* ── HERO (index) ── */
    'hero.pill':'Now powered by Claude Sonnet 4 →',
    'hero.h1':'Every click tells a story.<br><span class="dim">Sevenda reads it.</span>',
    'hero.sub':'Sevenda records your browser session and instantly generates BPMN 2.0 process diagrams AND actionable insights — helping developers, business analysts and marketing teams understand what really happens inside their digital processes.',
    'hero.cta1':'Add to Chrome','hero.cta2':'▶ Watch demo',

    /* ── HOW IT WORKS (index) ── */
    'how.label':'How it works',
    'how.title':'Three steps to a<br>BPMN diagram',
    'how.sub':'From raw browser events to structured process models — without lifting a pen.',
    'step1.h':'Record','step1.p':'Click start in DevTools. Sevenda captures clicks, form submissions, navigation events, network calls, and DOM mutations — everything that matters.',
    'step2.h':'AI generates','step2.p':'Claude Sonnet reads the event stream, identifies the process flow, and produces validated BPMN 2.0 XML with correct pools, lanes, gateways, and sequence flows.',
    'step3.h':'Export','step3.p':'Download .bpmn for Camunda, Signavio or Bizagi. Export .svg or .png for presentations. Generate a full process report in .docx format — ready to share with stakeholders, no technical skills required. Refine with natural language chat.',

    /* ── INSIGHTS (index) ── */
    'insights.label':'Insights',
    'insights.title':'Beyond diagrams.<br>Real intelligence.',
    'insights.sub':'Every session becomes a source of insight — not just a process map.',
    'ic1.title':'GTM Event Suggestions','ic1.desc':'Sevenda analyses your session and recommends Google Tag Manager events to track, so nothing goes unmeasured. Get a ready-to-implement event taxonomy in seconds.',
    'ic2.title':'Tracking Gap Analysis','ic2.desc':'Identifies touchpoints in your funnel with missing or incomplete tracking coverage. Know exactly where your analytics blind spots are before they cost you.',
    'ic3.title':'Process Report','ic3.desc':'A full .docx report combining the BPMN diagram, event log, insights and recommendations. Ready to share with any stakeholder — no technical skills required.',

    /* ── USE CASES (index) ── */
    'uc.label':'USE CASES','uc.title':'Built for the people who document processes.','uc.sub':'Three teams. Three problems. One tool.',
    'uc1.badge':'Business Analyst','uc1.scenario':'AS-IS process documentation. Day one.',
    'uc1.narrative':'A new client engagement starts Monday. No process documentation exists. The BA opens Chrome DevTools, navigates through the client\'s web application for 90 seconds, and presses Generate. Sevenda produces a validated BPMN 2.0 diagram — with every task, gateway, and flow captured automatically.',
    'uc1.o1':'BPMN 2.0 diagram ready for Camunda or Signavio','uc1.o2':'Analisi Tecnico-Funzionale .docx for stakeholders','uc1.o3':'Jira issue created with diagram attached','uc1.time':'From 8 hours → 90 seconds',
    'uc2.badge':'Marketing & Data Consultant','uc2.scenario':'GTM audit. Full gap report. One session.',
    'uc2.narrative':'The client\'s GA4 is configured, but conversion events are missing from half the funnel. The consultant switches Sevenda to Insights mode, navigates the purchase flow, and clicks Generate. Every untracked interaction is flagged — with CSS selectors, dataLayer.push() snippets, and a ready-to-import Tag Plan.',
    'uc2.o1':'Tracking gap analysis with element selectors','uc2.o2':'dataLayer.push() snippets ready for GTM','uc2.o3':'Tag Plan JSON — importable directly into GTM','uc2.o4':'Analytics Report .docx for the client','uc2.time':'From 3-day audit → 20 minutes',
    'uc3.badge':'Developer / QA','uc3.scenario':'Ship fast. Document automatically.',
    'uc3.narrative':'Release day. No time to update the process docs. The developer records the QA session in Sevenda — every API call, every navigation, every form submission captured in the event stream. One click generates the updated BPMN and a structured report, ready to commit alongside the code.',
    'uc3.o1':'User flow diagram — always up to date','uc3.o2':'API interaction log with status codes and timing','uc3.o3':'Export .svg for README or Confluence','uc3.o4':'Natural language refinement for edge cases','uc3.time':'Documentation that updates itself',

    /* ── FEATURES (index) ── */
    'feat.label':'Features','feat.title':'Built for process professionals',
    'f1.h':'Real-time event capture','f1.p':'Captures clicks, form submissions, API calls, navigation events, and DOM mutations with zero configuration — works on any website.',
    'f2.h':'Claude Sonnet AI','f2.p':'Anthropic\'s most capable model understands context, identifies decision points, and produces accurate process models — not just a sequence of steps.',
    'f3.h':'BPMN 2.0 standard','f3.p':'Output is fully compliant BPMN 2.0 XML. Open directly in Camunda Modeler, Signavio, Bizagi, or any standards-compliant tool.',
    'f4.h':'Iterative refinement','f4.p':'Chat with the diagram. "Add an error path after the API call" and Sevenda updates the BPMN while preserving the rest of the model exactly.',
    'f5.h':'Marketing & Funnel Mapping','f5.p':'Visualize customer journeys, campaign flows, and conversion funnels automatically — no diagramming tools, no manual work, no technical skills required.',
    'f6.h':'Multi-format export','f6.p':'.bpmn for process engines, .svg and .png for presentations, .docx reports for stakeholders. One session, every format you need.',

    /* ── STATS (index) ── */
    'stat1.lbl':'to first diagram','stat2.lbl':'diagrams and intelligence','stat3.lbl':'Chrome extension',

    /* ── PRICING (index + pricing.html) ── */
    'pricing.label':'Pricing','pricing.title':'Simple, transparent, scalable.','pricing.sub':'Start for free. Scale when you need. No surprises.',
    'billing.monthly':'Monthly','billing.annual':'Annual','billing.save':'Save 25%',
    'plan.free.tagline':'Start exploring','plan.free.note':'forever',
    'plan.solo.tagline':'For the independent developer',
    'plan.team.tagline':'For agile teams and consultants','plan.team.popular':'Most popular',
    'plan.enterprise.tagline':'For organizations and consulting firms','plan.enterprise.price':'Contact us','plan.enterprise.note':'custom pricing',
    'plan.see-all':'See all features →','plan.free.cta':'Get started free','plan.solo.cta':'Start 14-day free trial','plan.team.cta':'Start with your team','plan.enterprise.cta':'Contact us',
    'pricing.compare':'Compare all features →',
    'pf.free.1':'5 sessions/month','pf.free.2':'10 AI calls (BPMN + Insights)','pf.free.3':'5 exports (XML / SVG)','pf.free.4':'Local workspace','pf.free.5':'Tag Plan JSON export',
    'pf.solo.1':'30 sessions/month','pf.solo.2':'100 AI calls (BPMN + Insights)','pf.solo.3':'50 exports (XML / SVG / PNG)','pf.solo.4':'Iterative BPMN feedback (chat)','pf.solo.5':'Session history (90 days)',
    'pf.team.1':'200 sessions/month (pooled)','pf.team.2':'500 AI calls (pooled)','pf.team.3':'300 exports (all formats)','pf.team.4':'Jira integration (all members)','pf.team.5':'Priority support (email)',
    'pf.ent.1':'Unlimited sessions','pf.ent.2':'Unlimited AI calls (pooled)','pf.ent.3':'Unlimited exports (all formats)','pf.ent.4':'Advanced RBAC + audit log','pf.ent.5':'Dedicated onboarding + CSM',

    /* ── PRICING.HTML specific ── */
    'p.limits.eyebrow':'USAGE LIMITS','p.limits.title':'Rate limits by plan',
    'p.limits.sub':'All limits reset on the first of each month. Team and Enterprise plans share pooled limits across members.',
    'p.addons.eyebrow':'ADD-ONS','p.addons.title':'Pay-as-you-go add-ons',
    'p.addons.sub':'Purchase at any time, added on top of your plan limits. Never expire.',
    'p.beta.eyebrow':'🤝 BETA PARTNERSHIP PROGRAM','p.beta.title':'Are you a data-driven consulting firm?',
    'p.beta.desc':'Join the Beta Partnership Program with special terms, dedicated onboarding, and direct influence on the roadmap. Limited to 10 partners.',
    'p.beta.cta':'Apply to the program →',
    'p.faq.eyebrow':'FAQ','p.faq.title':'Frequently asked questions',

    /* ── DOCS (index) ── */
    'docs.label':'Documentation','docs.title':'Everything you need to get started.','docs.sub':'From installation to advanced BPMN generation — the complete guide is one click away.',
    'doc1.title':'Quick Start','doc1.desc':'Install Sevenda, configure your API key and generate your first BPMN diagram in under 60 seconds.','doc1.link':'Read guide →',
    'doc2.title':'Event Capture','doc2.desc':'Understand how Sevenda captures NAV, UI, NET, ERR and DOM events and how to filter them for better results.','doc2.link':'Read guide →',
    'doc3.title':'BPMN & Insights','doc3.desc':'Generate BPMN 2.0 diagrams, refine them with natural language and export to Camunda, Jira or .docx.','doc3.link':'Read guide →',

    /* ── CTA FOOTER (index) ── */
    'ctaf.h':'Start documenting<br>in seconds.',
    'ctaf.sub':'Join developers, analysts and marketers who let Sevenda do the heavy lifting.',
    'ctaf.cta':'Add to Chrome — it\'s free','ctaf.note':'No account required · Free forever plan available',

    /* ── DOCS.HTML ── */
    'dpage.pill':'User Manual · Version 0.2.0',
    'dpage.h1':'Sevenda<br>Complete Guide',
    'dpage.sub':'Complete guide to the Chrome extension that records browser sessions and generates BPMN 2.0 diagrams and GTM analysis using AI.',
    'dpage.toc':'Table of contents',

    /* ── FAQ.HTML ── */
    'fpage.label':'FAQ',
    'fpage.title':'Frequently Asked<br>Questions',
    'fpage.sub':'Everything you need to know about Sevenda — from installation to advanced BPMN generation and GTM analysis.',
    'fpage.search':'Search questions…',
    'fpage.f.all':'All','fpage.f.general':'General','fpage.f.setup':'Setup & Install',
    'fpage.f.bpmn':'BPMN','fpage.f.insights':'Insights & GTM',
    'fpage.f.privacy':'Privacy & Data','fpage.f.pricing':'Pricing',
    'fpage.noresults':'No questions match your search.',
    'fpage.cta.title':'Still have questions?',
    'fpage.cta.sub':'Read the full documentation or write to us directly.',
    'fpage.cta.docs':'Read the docs →',

    /* ── PRIVACY.HTML ── */
    'priv.title':'Privacy Policy',

    /* ── FOOTER comune ── */
    'foot.copy':'© 2025 Sevenda · Built with Claude',
    'foot.features':'Features','foot.insights':'Insights','foot.pricing':'Pricing',
    'foot.github':'GitHub','foot.privacy':'Privacy Policy','foot.docs':'Docs','foot.faq':'FAQ',
  },

  /* ────────────────────────────────────────────────────────────
   * ITALIANO
   * ──────────────────────────────────────────────────────────── */
  it: {
    'nav.features':'Funzionalità','nav.insights':'Insights','nav.usecases':'Casi d\'uso',
    'nav.how':'Come funziona','nav.pricing':'Prezzi','nav.docs':'Docs','nav.faq':'FAQ',
    'nav.cta':'Aggiungi a Chrome',

    'hero.pill':'Ora con Claude Sonnet 4 →',
    'hero.h1':'Ogni click racconta una storia.<br><span class="dim">Sevenda la legge.</span>',
    'hero.sub':'Sevenda registra la tua sessione browser e genera istantaneamente diagrammi di processo BPMN 2.0 e insight operativi — aiutando developer, business analyst e team marketing a capire cosa succede davvero nei loro processi digitali.',
    'hero.cta1':'Aggiungi a Chrome','hero.cta2':'▶ Guarda il demo',

    'how.label':'Come funziona',
    'how.title':'Tre passi verso il<br>diagramma BPMN',
    'how.sub':'Da eventi browser grezzi a modelli di processo strutturati — senza alzare una penna.',
    'step1.h':'Registra','step1.p':'Clicca start nei DevTools. Sevenda cattura click, invii di form, eventi di navigazione, chiamate di rete e mutazioni DOM — tutto ciò che conta.',
    'step2.h':'L\'AI genera','step2.p':'Claude Sonnet legge il flusso di eventi, identifica il processo e produce BPMN 2.0 XML validato con pool, corsie, gateway e flussi di sequenza corretti.',
    'step3.h':'Esporta','step3.p':'Scarica .bpmn per Camunda, Signavio o Bizagi. Esporta .svg o .png per le presentazioni. Genera un report di processo completo in formato .docx — pronto da condividere con gli stakeholder, senza competenze tecniche. Affina con chat in linguaggio naturale.',

    'insights.label':'Insights',
    'insights.title':'Oltre i diagrammi.<br>Vera intelligenza.',
    'insights.sub':'Ogni sessione diventa una fonte di insight — non solo una mappa di processo.',
    'ic1.title':'Suggerimenti GTM','ic1.desc':'Sevenda analizza la tua sessione e suggerisce gli eventi Google Tag Manager da tracciare. Ottieni una tassonomia eventi pronta da implementare in pochi secondi.',
    'ic2.title':'Analisi dei Gap di Tracking','ic2.desc':'Identifica i touchpoint del tuo funnel con copertura di tracking assente o incompleta. Sappi esattamente dove sono i punti ciechi della tua analytics prima che ti costino.',
    'ic3.title':'Report di Processo','ic3.desc':'Un report .docx completo che unisce diagramma BPMN, log degli eventi, insight e raccomandazioni. Pronto da condividere con qualsiasi stakeholder — nessuna competenza tecnica richiesta.',

    'uc.label':'CASI D\'USO','uc.title':'Fatto per chi documenta i processi.','uc.sub':'Tre team. Tre problemi. Uno strumento.',
    'uc1.badge':'Business Analyst','uc1.scenario':'Documentazione AS-IS del processo. Giorno uno.',
    'uc1.narrative':'Un nuovo incarico parte lunedì. Non esiste documentazione di processo. Il BA apre Chrome DevTools, naviga nell\'applicazione web del cliente per 90 secondi e preme Genera. Sevenda produce un diagramma BPMN 2.0 validato — con ogni task, gateway e flusso catturato automaticamente.',
    'uc1.o1':'Diagramma BPMN 2.0 pronto per Camunda o Signavio','uc1.o2':'Analisi Tecnico-Funzionale .docx per gli stakeholder','uc1.o3':'Issue Jira creata con il diagramma allegato','uc1.time':'Da 8 ore → 90 secondi',
    'uc2.badge':'Consulente Marketing & Data','uc2.scenario':'Audit GTM. Report completo dei gap. Una sessione.',
    'uc2.narrative':'Il GA4 del cliente è configurato, ma gli eventi di conversione mancano dalla metà del funnel. Il consulente attiva la modalità Insights di Sevenda, naviga il flusso di acquisto e clicca Genera. Ogni interazione non tracciata viene segnalata — con selettori CSS, snippet dataLayer.push() e un Tag Plan pronto da importare.',
    'uc2.o1':'Analisi dei gap di tracking con selettori di elementi','uc2.o2':'Snippet dataLayer.push() pronti per GTM','uc2.o3':'Tag Plan JSON — importabile direttamente in GTM','uc2.o4':'Analytics Report .docx per il cliente','uc2.time':'Da audit di 3 giorni → 20 minuti',
    'uc3.badge':'Developer / QA','uc3.scenario':'Rilascia veloce. Documenta automaticamente.',
    'uc3.narrative':'Giorno di rilascio. Nessun tempo per aggiornare i documenti di processo. Il developer registra la sessione QA in Sevenda — ogni chiamata API, ogni navigazione, ogni invio di form catturato nell\'event stream. Un click genera il BPMN aggiornato e un report strutturato, pronti da committare insieme al codice.',
    'uc3.o1':'Diagramma del flusso utente — sempre aggiornato','uc3.o2':'Log interazioni API con status code e tempi','uc3.o3':'Esporta .svg per README o Confluence','uc3.o4':'Raffinamento in linguaggio naturale per i casi limite','uc3.time':'Documentazione che si aggiorna da sola',

    'feat.label':'Funzionalità','feat.title':'Fatto per i professionisti del processo',
    'f1.h':'Cattura eventi in tempo reale','f1.p':'Cattura click, invii di form, chiamate API, eventi di navigazione e mutazioni DOM senza configurazione — funziona su qualsiasi sito.',
    'f2.h':'Claude Sonnet AI','f2.p':'Il modello più capace di Anthropic comprende il contesto, identifica i punti di decisione e produce modelli di processo accurati — non solo una sequenza di passi.',
    'f3.h':'Standard BPMN 2.0','f3.p':'L\'output è BPMN 2.0 XML completamente conforme. Apribile direttamente in Camunda Modeler, Signavio, Bizagi o qualsiasi tool conforme agli standard.',
    'f4.h':'Raffinamento iterativo','f4.p':'Chatta con il diagramma. "Aggiungi un percorso di errore dopo la chiamata API" e Sevenda aggiorna il BPMN preservando esattamente il resto del modello.',
    'f5.h':'Mapping Marketing & Funnel','f5.p':'Visualizza automaticamente customer journey, flussi di campagna e funnel di conversione — nessuno strumento di diagrammazione, nessun lavoro manuale, nessuna competenza tecnica richiesta.',
    'f6.h':'Esportazione multi-formato','f6.p':'.bpmn per i process engine, .svg e .png per le presentazioni, report .docx per gli stakeholder. Una sessione, tutti i formati di cui hai bisogno.',

    'stat1.lbl':'al primo diagramma','stat2.lbl':'diagrammi e intelligenza','stat3.lbl':'estensione Chrome',

    'pricing.label':'Prezzi','pricing.title':'Semplice, trasparente, scalabile.','pricing.sub':'Inizia gratis. Scala quando ne hai bisogno. Nessuna sorpresa.',
    'billing.monthly':'Mensile','billing.annual':'Annuale','billing.save':'Risparmia 25%',
    'plan.free.tagline':'Inizia ad esplorare','plan.free.note':'per sempre',
    'plan.solo.tagline':'Per il developer indipendente',
    'plan.team.tagline':'Per team agili e consulenti','plan.team.popular':'Più popolare',
    'plan.enterprise.tagline':'Per organizzazioni e società di consulenza','plan.enterprise.price':'Contattaci','plan.enterprise.note':'prezzo personalizzato',
    'plan.see-all':'Vedi tutte le funzionalità →','plan.free.cta':'Inizia gratis','plan.solo.cta':'Prova gratuita 14 giorni','plan.team.cta':'Inizia con il tuo team','plan.enterprise.cta':'Contattaci',
    'pricing.compare':'Confronta tutte le funzionalità →',
    'pf.free.1':'5 sessioni/mese','pf.free.2':'10 chiamate AI (BPMN + Insights)','pf.free.3':'5 esportazioni (XML / SVG)','pf.free.4':'Workspace locale','pf.free.5':'Esportazione Tag Plan JSON',
    'pf.solo.1':'30 sessioni/mese','pf.solo.2':'100 chiamate AI (BPMN + Insights)','pf.solo.3':'50 esportazioni (XML / SVG / PNG)','pf.solo.4':'Feedback BPMN iterativo (chat)','pf.solo.5':'Storico sessioni (90 giorni)',
    'pf.team.1':'200 sessioni/mese (condivise)','pf.team.2':'500 chiamate AI (condivise)','pf.team.3':'300 esportazioni (tutti i formati)','pf.team.4':'Integrazione Jira (tutti i membri)','pf.team.5':'Supporto prioritario (email)',
    'pf.ent.1':'Sessioni illimitate','pf.ent.2':'Chiamate AI illimitate (condivise)','pf.ent.3':'Esportazioni illimitate (tutti i formati)','pf.ent.4':'RBAC avanzato + audit log','pf.ent.5':'Onboarding dedicato + CSM',

    'p.limits.eyebrow':'LIMITI DI UTILIZZO','p.limits.title':'Limiti per piano',
    'p.limits.sub':'Tutti i limiti si resettano il primo di ogni mese. I piani Team ed Enterprise condividono i limiti in pool tra i membri.',
    'p.addons.eyebrow':'ADD-ON','p.addons.title':'Add-on pay-as-you-go',
    'p.addons.sub':'Acquistabili in qualsiasi momento, si aggiungono ai limiti del piano. Non scadono mai.',
    'p.beta.eyebrow':'🤝 PROGRAMMA BETA PARTNERSHIP','p.beta.title':'Sei una società di consulenza data-driven?',
    'p.beta.desc':'Unisciti al programma Beta Partnership con condizioni speciali, onboarding dedicato e influenza diretta sulla roadmap. Limitato a 10 partner.',
    'p.beta.cta':'Candidati al programma →',
    'p.faq.eyebrow':'FAQ','p.faq.title':'Domande frequenti',

    'docs.label':'Documentazione','docs.title':'Tutto quello che ti serve per iniziare.','docs.sub':'Dall\'installazione alla generazione BPMN avanzata — la guida completa è a un click.',
    'doc1.title':'Quick Start','doc1.desc':'Installa Sevenda, configura la tua API key e genera il primo diagramma BPMN in meno di 60 secondi.','doc1.link':'Leggi la guida →',
    'doc2.title':'Cattura Eventi','doc2.desc':'Scopri come Sevenda cattura eventi NAV, UI, NET, ERR e DOM e come filtrarli per ottenere risultati migliori.','doc2.link':'Leggi la guida →',
    'doc3.title':'BPMN & Insights','doc3.desc':'Genera diagrammi BPMN 2.0, affinali con linguaggio naturale ed esporta verso Camunda, Jira o .docx.','doc3.link':'Leggi la guida →',

    'ctaf.h':'Inizia a documentare<br>in pochi secondi.',
    'ctaf.sub':'Unisciti a developer, analisti e marketer che lasciano che Sevenda faccia il lavoro pesante.',
    'ctaf.cta':'Aggiungi a Chrome — è gratis','ctaf.note':'Nessun account richiesto · Piano gratuito per sempre disponibile',

    'dpage.pill':'Manuale Utente · Versione 0.2.0',
    'dpage.h1':'Sevenda<br>Guida Completa',
    'dpage.sub':'Guida completa all\'estensione Chrome che registra sessioni browser e genera diagrammi BPMN 2.0 e analisi GTM tramite AI.',
    'dpage.toc':'Indice dei contenuti',

    'fpage.label':'FAQ',
    'fpage.title':'Domande<br>Frequenti',
    'fpage.sub':'Tutto quello che devi sapere su Sevenda — dall\'installazione alla generazione BPMN avanzata e all\'analisi GTM.',
    'fpage.search':'Cerca domande…',
    'fpage.f.all':'Tutte','fpage.f.general':'Generale','fpage.f.setup':'Setup & Installazione',
    'fpage.f.bpmn':'BPMN','fpage.f.insights':'Insights & GTM',
    'fpage.f.privacy':'Privacy & Dati','fpage.f.pricing':'Prezzi',
    'fpage.noresults':'Nessuna domanda corrisponde alla ricerca.',
    'fpage.cta.title':'Hai ancora domande?',
    'fpage.cta.sub':'Leggi la documentazione completa o scrivici direttamente.',
    'fpage.cta.docs':'Leggi i docs →',

    'priv.title':'Informativa sulla Privacy',

    'foot.copy':'© 2025 Sevenda · Realizzato con Claude',
    'foot.features':'Funzionalità','foot.insights':'Insights','foot.pricing':'Prezzi',
    'foot.github':'GitHub','foot.privacy':'Privacy Policy','foot.docs':'Docs','foot.faq':'FAQ',
  },

  /* ────────────────────────────────────────────────────────────
   * SPAGNOLO
   * ──────────────────────────────────────────────────────────── */
  es: {
    'nav.features':'Funciones','nav.insights':'Insights','nav.usecases':'Casos de uso',
    'nav.how':'Cómo funciona','nav.pricing':'Precios','nav.docs':'Docs','nav.faq':'FAQ',
    'nav.cta':'Añadir a Chrome',

    'hero.pill':'Ahora con Claude Sonnet 4 →',
    'hero.h1':'Cada clic cuenta una historia.<br><span class="dim">Sevenda la lee.</span>',
    'hero.sub':'Sevenda graba tu sesión de navegador y genera instantáneamente diagramas de proceso BPMN 2.0 e insights accionables — ayudando a desarrolladores, analistas de negocio y equipos de marketing a entender qué ocurre realmente en sus procesos digitales.',
    'hero.cta1':'Añadir a Chrome','hero.cta2':'▶ Ver demo',

    'how.label':'Cómo funciona',
    'how.title':'Tres pasos hacia un<br>diagrama BPMN',
    'how.sub':'De eventos brutos del navegador a modelos de proceso estructurados — sin levantar un lápiz.',
    'step1.h':'Grabar','step1.p':'Haz clic en inicio en DevTools. Sevenda captura clics, envíos de formularios, eventos de navegación, llamadas de red y mutaciones del DOM — todo lo que importa.',
    'step2.h':'La IA genera','step2.p':'Claude Sonnet lee el flujo de eventos, identifica el flujo del proceso y produce XML BPMN 2.0 validado con pools, carriles, gateways y flujos de secuencia correctos.',
    'step3.h':'Exportar','step3.p':'Descarga .bpmn para Camunda, Signavio o Bizagi. Exporta .svg o .png para presentaciones. Genera un informe de proceso completo en formato .docx — listo para compartir con los interesados, sin habilidades técnicas. Refina con chat en lenguaje natural.',

    'insights.label':'Insights',
    'insights.title':'Más allá de los diagramas.<br>Inteligencia real.',
    'insights.sub':'Cada sesión se convierte en una fuente de insight — no solo un mapa de procesos.',
    'ic1.title':'Sugerencias de Eventos GTM','ic1.desc':'Sevenda analiza tu sesión y recomienda eventos de Google Tag Manager a rastrear. Obtén una taxonomía de eventos lista para implementar en segundos.',
    'ic2.title':'Análisis de Brechas de Tracking','ic2.desc':'Identifica los puntos de contacto en tu embudo con cobertura de rastreo ausente o incompleta. Sabe exactamente dónde están tus puntos ciegos de analítica.',
    'ic3.title':'Informe de Proceso','ic3.desc':'Un informe .docx completo que combina el diagrama BPMN, el registro de eventos, insights y recomendaciones. Listo para compartir con cualquier interesado — sin habilidades técnicas.',

    'uc.label':'CASOS DE USO','uc.title':'Hecho para quienes documentan procesos.','uc.sub':'Tres equipos. Tres problemas. Una herramienta.',
    'uc1.badge':'Analista de Negocio','uc1.scenario':'Documentación AS-IS del proceso. Día uno.',
    'uc1.narrative':'Un nuevo proyecto comienza el lunes. No existe documentación de procesos. El analista abre Chrome DevTools, navega por la aplicación web del cliente durante 90 segundos y pulsa Generar. Sevenda produce un diagrama BPMN 2.0 validado — con cada tarea, gateway y flujo capturado automáticamente.',
    'uc1.o1':'Diagrama BPMN 2.0 listo para Camunda o Signavio','uc1.o2':'Análisis Técnico-Funcional .docx para interesados','uc1.o3':'Issue de Jira creada con diagrama adjunto','uc1.time':'De 8 horas → 90 segundos',
    'uc2.badge':'Consultor de Marketing & Datos','uc2.scenario':'Auditoría GTM. Informe completo de brechas. Una sesión.',
    'uc2.narrative':'El GA4 del cliente está configurado, pero los eventos de conversión faltan en la mitad del embudo. El consultor activa el modo Insights de Sevenda, navega por el flujo de compra y hace clic en Generar. Cada interacción no rastreada se señala — con selectores CSS, fragmentos dataLayer.push() y un Plan de Tags listo para importar.',
    'uc2.o1':'Análisis de brechas de tracking con selectores de elementos','uc2.o2':'Fragmentos dataLayer.push() listos para GTM','uc2.o3':'Tag Plan JSON — importable directamente en GTM','uc2.o4':'Analytics Report .docx para el cliente','uc2.time':'De auditoría de 3 días → 20 minutos',
    'uc3.badge':'Developer / QA','uc3.scenario':'Lanza rápido. Documenta automáticamente.',
    'uc3.narrative':'Día de lanzamiento. Sin tiempo para actualizar los documentos de proceso. El desarrollador graba la sesión QA en Sevenda — cada llamada API, cada navegación, cada envío de formulario capturado en el flujo de eventos. Un clic genera el BPMN actualizado y un informe estructurado, listos para confirmar junto al código.',
    'uc3.o1':'Diagrama de flujo de usuario — siempre actualizado','uc3.o2':'Registro de interacciones API con códigos de estado y tiempos','uc3.o3':'Exporta .svg para README o Confluence','uc3.o4':'Refinamiento en lenguaje natural para casos extremos','uc3.time':'Documentación que se actualiza sola',

    'feat.label':'Funciones','feat.title':'Hecho para profesionales del proceso',
    'f1.h':'Captura de eventos en tiempo real','f1.p':'Captura clics, envíos de formularios, llamadas API, eventos de navegación y mutaciones del DOM sin configuración — funciona en cualquier sitio web.',
    'f2.h':'Claude Sonnet AI','f2.p':'El modelo más capaz de Anthropic entiende el contexto, identifica los puntos de decisión y produce modelos de proceso precisos — no solo una secuencia de pasos.',
    'f3.h':'Estándar BPMN 2.0','f3.p':'El output es XML BPMN 2.0 completamente conforme. Ábrelo directamente en Camunda Modeler, Signavio, Bizagi o cualquier herramienta compatible.',
    'f4.h':'Refinamiento iterativo','f4.p':'Chatea con el diagrama. "Añade un camino de error después de la llamada API" y Sevenda actualiza el BPMN preservando exactamente el resto del modelo.',
    'f5.h':'Mapping de Marketing & Embudo','f5.p':'Visualiza automáticamente los recorridos de clientes, flujos de campaña y embudos de conversión — sin herramientas de diagramación, sin trabajo manual, sin habilidades técnicas.',
    'f6.h':'Exportación multi-formato','f6.p':'.bpmn para motores de proceso, .svg y .png para presentaciones, informes .docx para interesados. Una sesión, todos los formatos que necesitas.',

    'stat1.lbl':'al primer diagrama','stat2.lbl':'diagramas e inteligencia','stat3.lbl':'extensión de Chrome',

    'pricing.label':'Precios','pricing.title':'Simple, transparente, escalable.','pricing.sub':'Empieza gratis. Escala cuando lo necesites. Sin sorpresas.',
    'billing.monthly':'Mensual','billing.annual':'Anual','billing.save':'Ahorra 25%',
    'plan.free.tagline':'Empieza a explorar','plan.free.note':'para siempre',
    'plan.solo.tagline':'Para el desarrollador independiente',
    'plan.team.tagline':'Para equipos ágiles y consultores','plan.team.popular':'Más popular',
    'plan.enterprise.tagline':'Para organizaciones y firmas consultoras','plan.enterprise.price':'Contáctanos','plan.enterprise.note':'precio personalizado',
    'plan.see-all':'Ver todas las funciones →','plan.free.cta':'Empezar gratis','plan.solo.cta':'Prueba gratuita de 14 días','plan.team.cta':'Empieza con tu equipo','plan.enterprise.cta':'Contáctanos',
    'pricing.compare':'Comparar todas las funciones →',
    'pf.free.1':'5 sesiones/mes','pf.free.2':'10 llamadas IA (BPMN + Insights)','pf.free.3':'5 exportaciones (XML / SVG)','pf.free.4':'Espacio de trabajo local','pf.free.5':'Exportación Tag Plan JSON',
    'pf.solo.1':'30 sesiones/mes','pf.solo.2':'100 llamadas IA (BPMN + Insights)','pf.solo.3':'50 exportaciones (XML / SVG / PNG)','pf.solo.4':'Feedback BPMN iterativo (chat)','pf.solo.5':'Historial de sesiones (90 días)',
    'pf.team.1':'200 sesiones/mes (compartidas)','pf.team.2':'500 llamadas IA (compartidas)','pf.team.3':'300 exportaciones (todos los formatos)','pf.team.4':'Integración Jira (todos los miembros)','pf.team.5':'Soporte prioritario (email)',
    'pf.ent.1':'Sesiones ilimitadas','pf.ent.2':'Llamadas IA ilimitadas (compartidas)','pf.ent.3':'Exportaciones ilimitadas (todos los formatos)','pf.ent.4':'RBAC avanzado + registro de auditoría','pf.ent.5':'Onboarding dedicado + CSM',

    'p.limits.eyebrow':'LÍMITES DE USO','p.limits.title':'Límites por plan',
    'p.limits.sub':'Todos los límites se reinician el primero de cada mes. Los planes Team y Enterprise comparten límites agrupados entre miembros.',
    'p.addons.eyebrow':'COMPLEMENTOS','p.addons.title':'Complementos de pago por uso',
    'p.addons.sub':'Compra en cualquier momento, se añaden a los límites de tu plan. No caducan.',
    'p.beta.eyebrow':'🤝 PROGRAMA BETA PARTNERSHIP','p.beta.title':'¿Eres una firma consultora orientada a datos?',
    'p.beta.desc':'Únete al Programa Beta Partnership con condiciones especiales, incorporación dedicada e influencia directa en la hoja de ruta. Limitado a 10 socios.',
    'p.beta.cta':'Solicitar el programa →',
    'p.faq.eyebrow':'FAQ','p.faq.title':'Preguntas frecuentes',

    'docs.label':'Documentación','docs.title':'Todo lo que necesitas para empezar.','docs.sub':'Desde la instalación hasta la generación avanzada de BPMN — la guía completa está a un clic.',
    'doc1.title':'Inicio Rápido','doc1.desc':'Instala Sevenda, configura tu API key y genera tu primer diagrama BPMN en menos de 60 segundos.','doc1.link':'Leer guía →',
    'doc2.title':'Captura de Eventos','doc2.desc':'Entiende cómo Sevenda captura eventos NAV, UI, NET, ERR y DOM y cómo filtrarlos para mejores resultados.','doc2.link':'Leer guía →',
    'doc3.title':'BPMN & Insights','doc3.desc':'Genera diagramas BPMN 2.0, refínalos con lenguaje natural y exporta a Camunda, Jira o .docx.','doc3.link':'Leer guía →',

    'ctaf.h':'Empieza a documentar<br>en segundos.',
    'ctaf.sub':'Únete a desarrolladores, analistas y marketers que dejan que Sevenda haga el trabajo pesado.',
    'ctaf.cta':'Añadir a Chrome — es gratis','ctaf.note':'Sin cuenta requerida · Plan gratuito para siempre disponible',

    'dpage.pill':'Manual de Usuario · Versión 0.2.0',
    'dpage.h1':'Sevenda<br>Guía Completa',
    'dpage.sub':'Guía completa de la extensión Chrome que graba sesiones de navegador y genera diagramas BPMN 2.0 y análisis GTM con IA.',
    'dpage.toc':'Tabla de contenidos',

    'fpage.label':'FAQ',
    'fpage.title':'Preguntas<br>Frecuentes',
    'fpage.sub':'Todo lo que necesitas saber sobre Sevenda — desde la instalación hasta la generación avanzada de BPMN y el análisis GTM.',
    'fpage.search':'Buscar preguntas…',
    'fpage.f.all':'Todas','fpage.f.general':'General','fpage.f.setup':'Configuración e Instalación',
    'fpage.f.bpmn':'BPMN','fpage.f.insights':'Insights & GTM',
    'fpage.f.privacy':'Privacidad & Datos','fpage.f.pricing':'Precios',
    'fpage.noresults':'No hay preguntas que coincidan con tu búsqueda.',
    'fpage.cta.title':'¿Tienes más preguntas?',
    'fpage.cta.sub':'Lee la documentación completa o escríbenos directamente.',
    'fpage.cta.docs':'Leer los docs →',

    'priv.title':'Política de Privacidad',

    'foot.copy':'© 2025 Sevenda · Hecho con Claude',
    'foot.features':'Funciones','foot.insights':'Insights','foot.pricing':'Precios',
    'foot.github':'GitHub','foot.privacy':'Política de privacidad','foot.docs':'Docs','foot.faq':'FAQ',
  },

  /* ────────────────────────────────────────────────────────────
   * FRANCESE
   * ──────────────────────────────────────────────────────────── */
  fr: {
    'nav.features':'Fonctionnalités','nav.insights':'Insights','nav.usecases':'Cas d\'usage',
    'nav.how':'Comment ça marche','nav.pricing':'Tarifs','nav.docs':'Docs','nav.faq':'FAQ',
    'nav.cta':'Ajouter à Chrome',

    'hero.pill':'Maintenant avec Claude Sonnet 4 →',
    'hero.h1':'Chaque clic raconte une histoire.<br><span class="dim">Sevenda la lit.</span>',
    'hero.sub':'Sevenda enregistre votre session de navigation et génère instantanément des diagrammes de processus BPMN 2.0 et des insights actionnables — aidant les développeurs, analystes métier et équipes marketing à comprendre ce qui se passe vraiment dans leurs processus digitaux.',
    'hero.cta1':'Ajouter à Chrome','hero.cta2':'▶ Voir la démo',

    'how.label':'Comment ça marche',
    'how.title':'Trois étapes vers un<br>diagramme BPMN',
    'how.sub':'Des événements bruts du navigateur aux modèles de processus structurés — sans lever le stylo.',
    'step1.h':'Enregistrer','step1.p':'Cliquez sur démarrer dans DevTools. Sevenda capture les clics, soumissions de formulaires, événements de navigation, appels réseau et mutations DOM — tout ce qui compte.',
    'step2.h':'L\'IA génère','step2.p':'Claude Sonnet lit le flux d\'événements, identifie le flux de processus et produit un XML BPMN 2.0 validé avec des pools, couloirs, passerelles et flux de séquence corrects.',
    'step3.h':'Exporter','step3.p':'Téléchargez .bpmn pour Camunda, Signavio ou Bizagi. Exportez .svg ou .png pour les présentations. Générez un rapport de processus complet au format .docx — prêt à partager avec les parties prenantes, sans compétences techniques. Affinez avec un chat en langage naturel.',

    'insights.label':'Insights',
    'insights.title':'Au-delà des diagrammes.<br>Une vraie intelligence.',
    'insights.sub':'Chaque session devient une source d\'insight — pas seulement une carte de processus.',
    'ic1.title':'Suggestions d\'événements GTM','ic1.desc':'Sevenda analyse votre session et recommande des événements Google Tag Manager à suivre. Obtenez une taxonomie d\'événements prête à implémenter en quelques secondes.',
    'ic2.title':'Analyse des lacunes de tracking','ic2.desc':'Identifie les points de contact de votre entonnoir avec une couverture de suivi manquante ou incomplète. Sachez exactement où sont vos angles morts analytiques.',
    'ic3.title':'Rapport de processus','ic3.desc':'Un rapport .docx complet combinant le diagramme BPMN, le journal d\'événements, les insights et recommandations. Prêt à partager avec n\'importe quelle partie prenante — sans compétences techniques.',

    'uc.label':'CAS D\'USAGE','uc.title':'Fait pour ceux qui documentent les processus.','uc.sub':'Trois équipes. Trois problèmes. Un outil.',
    'uc1.badge':'Analyste Métier','uc1.scenario':'Documentation AS-IS du processus. Jour un.',
    'uc1.narrative':'Une nouvelle mission client commence lundi. Aucune documentation de processus n\'existe. L\'analyste ouvre Chrome DevTools, navigue dans l\'application web du client pendant 90 secondes et appuie sur Générer. Sevenda produit un diagramme BPMN 2.0 validé — avec chaque tâche, passerelle et flux capturé automatiquement.',
    'uc1.o1':'Diagramme BPMN 2.0 prêt pour Camunda ou Signavio','uc1.o2':'Analyse Technico-Fonctionnelle .docx pour les parties prenantes','uc1.o3':'Issue Jira créée avec le diagramme en pièce jointe','uc1.time':'De 8 heures → 90 secondes',
    'uc2.badge':'Consultant Marketing & Data','uc2.scenario':'Audit GTM. Rapport complet des lacunes. Une session.',
    'uc2.narrative':'Le GA4 du client est configuré, mais les événements de conversion manquent dans la moitié de l\'entonnoir. Le consultant active le mode Insights de Sevenda, navigue dans le flux d\'achat et clique sur Générer. Chaque interaction non suivie est signalée — avec des sélecteurs CSS, des extraits dataLayer.push() et un Plan de Tags prêt à importer.',
    'uc2.o1':'Analyse des lacunes de tracking avec sélecteurs d\'éléments','uc2.o2':'Extraits dataLayer.push() prêts pour GTM','uc2.o3':'Tag Plan JSON — importable directement dans GTM','uc2.o4':'Analytics Report .docx pour le client','uc2.time':'D\'un audit de 3 jours → 20 minutes',
    'uc3.badge':'Developer / QA','uc3.scenario':'Livrez vite. Documentez automatiquement.',
    'uc3.narrative':'Jour de release. Pas le temps de mettre à jour les documents de processus. Le développeur enregistre la session QA dans Sevenda — chaque appel API, chaque navigation, chaque soumission de formulaire capturé dans le flux d\'événements. Un clic génère le BPMN mis à jour et un rapport structuré, prêts à commiter avec le code.',
    'uc3.o1':'Diagramme de flux utilisateur — toujours à jour','uc3.o2':'Journal d\'interactions API avec codes de statut et temps','uc3.o3':'Exporter .svg pour README ou Confluence','uc3.o4':'Raffinement en langage naturel pour les cas limites','uc3.time':'Documentation qui se met à jour elle-même',

    'feat.label':'Fonctionnalités','feat.title':'Fait pour les professionnels du processus',
    'f1.h':'Capture d\'événements en temps réel','f1.p':'Capture les clics, soumissions de formulaires, appels API, événements de navigation et mutations DOM sans configuration — fonctionne sur n\'importe quel site.',
    'f2.h':'Claude Sonnet AI','f2.p':'Le modèle le plus capable d\'Anthropic comprend le contexte, identifie les points de décision et produit des modèles de processus précis — pas seulement une séquence d\'étapes.',
    'f3.h':'Standard BPMN 2.0','f3.p':'La sortie est un XML BPMN 2.0 entièrement conforme. Ouvrez-le directement dans Camunda Modeler, Signavio, Bizagi ou tout outil conforme aux standards.',
    'f4.h':'Raffinement itératif','f4.p':'Discutez avec le diagramme. "Ajoutez un chemin d\'erreur après l\'appel API" et Sevenda met à jour le BPMN en préservant exactement le reste du modèle.',
    'f5.h':'Mapping Marketing & Entonnoir','f5.p':'Visualisez automatiquement les parcours clients, flux de campagne et entonnoirs de conversion — sans outils de diagramme, sans travail manuel, sans compétences techniques.',
    'f6.h':'Export multi-format','f6.p':'.bpmn pour les moteurs de processus, .svg et .png pour les présentations, rapports .docx pour les parties prenantes. Une session, tous les formats dont vous avez besoin.',

    'stat1.lbl':'au premier diagramme','stat2.lbl':'diagrammes et intelligence','stat3.lbl':'extension Chrome',

    'pricing.label':'Tarifs','pricing.title':'Simple, transparent, évolutif.','pricing.sub':'Commencez gratuitement. Montez en charge quand vous en avez besoin. Sans surprises.',
    'billing.monthly':'Mensuel','billing.annual':'Annuel','billing.save':'Économisez 25%',
    'plan.free.tagline':'Commencez à explorer','plan.free.note':'pour toujours',
    'plan.solo.tagline':'Pour le développeur indépendant',
    'plan.team.tagline':'Pour les équipes agiles et consultants','plan.team.popular':'Le plus populaire',
    'plan.enterprise.tagline':'Pour les organisations et cabinets de conseil','plan.enterprise.price':'Contactez-nous','plan.enterprise.note':'tarif personnalisé',
    'plan.see-all':'Voir toutes les fonctionnalités →','plan.free.cta':'Commencer gratuitement','plan.solo.cta':'Essai gratuit 14 jours','plan.team.cta':'Démarrer avec votre équipe','plan.enterprise.cta':'Contactez-nous',
    'pricing.compare':'Comparer toutes les fonctionnalités →',
    'pf.free.1':'5 sessions/mois','pf.free.2':'10 appels IA (BPMN + Insights)','pf.free.3':'5 exports (XML / SVG)','pf.free.4':'Espace de travail local','pf.free.5':'Export Tag Plan JSON',
    'pf.solo.1':'30 sessions/mois','pf.solo.2':'100 appels IA (BPMN + Insights)','pf.solo.3':'50 exports (XML / SVG / PNG)','pf.solo.4':'Retour BPMN itératif (chat)','pf.solo.5':'Historique des sessions (90 jours)',
    'pf.team.1':'200 sessions/mois (mutualisées)','pf.team.2':'500 appels IA (mutualisés)','pf.team.3':'300 exports (tous formats)','pf.team.4':'Intégration Jira (tous les membres)','pf.team.5':'Support prioritaire (email)',
    'pf.ent.1':'Sessions illimitées','pf.ent.2':'Appels IA illimités (mutualisés)','pf.ent.3':'Exports illimités (tous formats)','pf.ent.4':'RBAC avancé + journal d\'audit','pf.ent.5':'Onboarding dédié + CSM',

    'p.limits.eyebrow':'LIMITES D\'UTILISATION','p.limits.title':'Limites par plan',
    'p.limits.sub':'Toutes les limites se réinitialisent le premier de chaque mois. Les plans Team et Enterprise partagent des limites mutualisées entre membres.',
    'p.addons.eyebrow':'MODULES COMPLÉMENTAIRES','p.addons.title':'Modules complémentaires à la demande',
    'p.addons.sub':'Achetez à tout moment, s\'ajoutent aux limites de votre plan. N\'expirent jamais.',
    'p.beta.eyebrow':'🤝 PROGRAMME BETA PARTNERSHIP','p.beta.title':'Êtes-vous un cabinet de conseil orienté données ?',
    'p.beta.desc':'Rejoignez le programme Beta Partnership avec des conditions spéciales, un onboarding dédié et une influence directe sur la feuille de route. Limité à 10 partenaires.',
    'p.beta.cta':'Postuler au programme →',
    'p.faq.eyebrow':'FAQ','p.faq.title':'Questions fréquentes',

    'docs.label':'Documentation','docs.title':'Tout ce dont vous avez besoin pour commencer.','docs.sub':'De l\'installation à la génération BPMN avancée — le guide complet est à un clic.',
    'doc1.title':'Démarrage rapide','doc1.desc':'Installez Sevenda, configurez votre clé API et générez votre premier diagramme BPMN en moins de 60 secondes.','doc1.link':'Lire le guide →',
    'doc2.title':'Capture d\'événements','doc2.desc':'Comprenez comment Sevenda capture les événements NAV, UI, NET, ERR et DOM et comment les filtrer pour de meilleurs résultats.','doc2.link':'Lire le guide →',
    'doc3.title':'BPMN & Insights','doc3.desc':'Générez des diagrammes BPMN 2.0, affinez-les en langage naturel et exportez vers Camunda, Jira ou .docx.','doc3.link':'Lire le guide →',

    'ctaf.h':'Commencez à documenter<br>en quelques secondes.',
    'ctaf.sub':'Rejoignez les développeurs, analystes et marketers qui laissent Sevenda faire le travail.',
    'ctaf.cta':'Ajouter à Chrome — c\'est gratuit','ctaf.note':'Aucun compte requis · Plan gratuit à vie disponible',

    'dpage.pill':'Manuel Utilisateur · Version 0.2.0',
    'dpage.h1':'Sevenda<br>Guide Complet',
    'dpage.sub':'Guide complet de l\'extension Chrome qui enregistre les sessions de navigation et génère des diagrammes BPMN 2.0 et des analyses GTM grâce à l\'IA.',
    'dpage.toc':'Table des matières',

    'fpage.label':'FAQ',
    'fpage.title':'Questions<br>Fréquentes',
    'fpage.sub':'Tout ce que vous devez savoir sur Sevenda — de l\'installation à la génération avancée de BPMN et à l\'analyse GTM.',
    'fpage.search':'Rechercher des questions…',
    'fpage.f.all':'Toutes','fpage.f.general':'Général','fpage.f.setup':'Installation & Configuration',
    'fpage.f.bpmn':'BPMN','fpage.f.insights':'Insights & GTM',
    'fpage.f.privacy':'Confidentialité & Données','fpage.f.pricing':'Tarifs',
    'fpage.noresults':'Aucune question ne correspond à votre recherche.',
    'fpage.cta.title':'Vous avez encore des questions ?',
    'fpage.cta.sub':'Lisez la documentation complète ou écrivez-nous directement.',
    'fpage.cta.docs':'Lire les docs →',

    'priv.title':'Politique de Confidentialité',

    'foot.copy':'© 2025 Sevenda · Réalisé avec Claude',
    'foot.features':'Fonctionnalités','foot.insights':'Insights','foot.pricing':'Tarifs',
    'foot.github':'GitHub','foot.privacy':'Politique de confidentialité','foot.docs':'Docs','foot.faq':'FAQ',
  }
};

/* ── LANG SWITCHER CSS (iniettato una sola volta) ─────────────── */
(function injectCSS() {
  if (document.getElementById('sevenda-i18n-css')) return;
  const s = document.createElement('style');
  s.id = 'sevenda-i18n-css';
  /* Usa CSS custom properties dove disponibili, con fallback hardcoded */
  s.textContent = `
    .lang-sw {
      display: flex;
      align-items: center;
      gap: 2px;
      border: 1px solid var(--border-hi, rgba(255,255,255,.13));
      padding: 3px;
    }
    .lang-btn {
      font-family: var(--mono, 'Geist Mono', 'Fira Code', monospace);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: .04em;
      padding: 5px 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--muted, #6e6e6a);
      transition: background .15s, color .15s;
      line-height: 1;
    }
    .lang-btn:hover { color: var(--text, #e8e8e6); }
    .lang-btn.active {
      background: var(--text, #e8e8e6);
      color: var(--bg, #0d0d0d);
    }
    @media (max-width: 768px) { nav > .lang-sw { display: none; } }
  `;
  document.head.appendChild(s);
})();

/* ── CORE ─────────────────────────────────────────────────────── */
(function() {
  'use strict';

  function applyLang(lang) {
    const t = SEVENDA_I18N[lang];
    if (!t) return;
    localStorage.setItem('sevenda-lang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t[el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const v = t[el.dataset.i18nHtml];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = t[el.dataset.i18nPlaceholder];
      if (v !== undefined) el.placeholder = v;
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  /* Esposto globalmente — usato da onclick="setLang(...)" */
  window.setLang = function(lang) { applyLang(lang); };

  /* Sincronizzazione cross-tab: se l'utente cambia lingua in un'altra scheda
     il cambiamento viene applicato anche in questa */
  window.addEventListener('storage', function(e) {
    if (e.key === 'sevenda-lang' && e.newValue && SEVENDA_I18N[e.newValue]) {
      applyLang(e.newValue);
    }
  });

  /* Applica al caricamento — defer garantisce che il DOM sia pronto */
  function doApply() {
    const saved = localStorage.getItem('sevenda-lang') || 'en';
    applyLang(saved);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doApply);
  } else {
    doApply();
  }
})();
