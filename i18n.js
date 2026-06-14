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
    'nav.how':'How it works','nav.pricing':'Pricing','nav.docs':'Docs','nav.faq':'FAQ','nav.privacy':'Privacy Policy',
    'nav.cta':'Add to Chrome',

    /* ── HERO (index) ── */
    'hero.pill':'Now powered by Claude Sonnet 4 →',
    'hero.h1':'Every click tells a story.<br><span class="dim">Sevenda reads it.</span>',
    'hero.sub':'Sevenda records your browser session and instantly generates BPMN 2.0 process diagrams AND actionable insights — helping developers, business analysts and marketing teams understand what really happens inside their digital processes.',
    'hero.cta1':'Add to Chrome — it\'s free',

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
    'pricing.eyebrow':'Pricing','pricing.monthly':'Monthly','pricing.annual':'Annual','pricing.save25':'Save 25%',
    'pricing.process':'Process','pricing.analytics':'Analytics','pricing.suite':'Suite','pricing.howMany':'How many users?',
    'billing.monthly':'Monthly','billing.annual':'Annual','billing.save':'Save 25%',
    /* ── VAT / IVA ── */
    'iva.country':'Country:','iva.included':'✓ VAT included','iva.totalInclVat':'Total (incl. VAT):',
    'iva.invoiceNote':'A VAT invoice with full net / VAT / total breakdown will be emailed after payment.',
    'iva.disclaimer':'All prices include VAT, applied according to the tax regulations in force in your country. For EU customers, the VAT rate of the country of residence applies (MOSS scheme). Public Administrations and B2B EU customers eligible for reverse charge may request custom invoicing at hello@sevenda.dev.',
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

    /* ── FAQ page Q&A ── */
    'faq.g1.q':'What is Sevenda and what does it do?',
    'faq.g1.a':'Sevenda is a Chrome Extension (MV3) that records your browser sessions and automatically generates <strong>BPMN 2.0 process diagrams</strong> and <strong>GTM/GA4 analytics insights</strong> — powered by Claude Sonnet AI.<br><br>It works in two modes: <strong>🧩 BPMN mode</strong> maps user flows and processes from real browser interactions; <strong>📊 Insights mode</strong> analyzes your tracking setup, identifies missing GTM events, and generates a ready-to-use Tag Plan. No code changes, no SDK, no setup required on the target site.',
    'faq.g2.q':'Who is Sevenda for?',
    'faq.g2.a':'Sevenda is built for three main audiences:<br><br><strong>Developers &amp; Business Analysts</strong> — document AS-IS processes, user flows, and API interactions directly from the browser, without manual diagramming.<br><br><strong>Marketing &amp; Data teams</strong> — audit GTM/GA4 tracking coverage, identify funnel gaps, and generate Tag Plans without manual inspection.<br><br><strong>Consultants &amp; Project Managers</strong> — produce BPMN diagrams and .docx reports for clients in minutes, and push directly to Jira.',
    'faq.g3.q':'What browsers does Sevenda support?',
    'faq.g3.a':'Sevenda is a <strong>Chrome Extension Manifest V3</strong> and works on <strong>Google Chrome</strong> and any Chromium-based browser (Brave, Edge, Arc). It requires access to Chrome DevTools, so it runs on desktop only — not on mobile browsers.',
    'faq.g4.q':'How long does it take to generate the first diagram?',
    'faq.g4.a':'From installation to your first BPMN diagram: <strong>under 60 seconds</strong>.<br><br>The generation itself (Claude Sonnet processing the event stream) typically takes <strong>15–30 seconds</strong> depending on session length and API response time. The Analytics Report in Insights mode is <strong>instantaneous</strong> — generated from cached data without an additional API call.',
    'faq.g5.q':'Can I use Sevenda on any website?',
    'faq.g5.a':'Yes. Sevenda uses <code>&lt;all_urls&gt;</code> host permissions because the target site is not known in advance — you can record any website you navigate to. It does not inject any visible code or modify the target site in any way.<br><br>Some sites with very aggressive Content Security Policies (CSP) may limit which events Sevenda can capture. The BPMN and Insights output will still be generated from the events that were successfully captured.',
    'faq.g6.q':'Does Sevenda work on localhost and internal tools?',
    'faq.g6.a':'Yes — Sevenda works on <code>localhost</code>, internal tools, and staging environments just like on public websites. This makes it particularly useful for documenting internal workflows, admin dashboards, and pre-production user flows before they go live.',
    'faq.s1.q':'How do I install Sevenda?',
    'faq.s1.a':'1. Install the extension from the <strong>Chrome Web Store</strong> (search for "Sevenda").<br>2. Click the Sevenda icon in the Chrome toolbar — a popup appears.<br>3. Go to <strong>Settings → AI Models</strong> and enter your <a href="https://console.anthropic.com" target="_blank">Anthropic API key</a>.<br>4. Open Chrome DevTools (<code>F12</code>) on any page — you\'ll find the Sevenda panel in the tabs.<br>5. Press <strong>Start Recording</strong> and start navigating.',
    'faq.s2.q':'Where do I get an Anthropic API key?',
    'faq.s2.a':'1. Create an account at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>.<br>2. Go to <strong>API Keys</strong> and click <strong>Create Key</strong>.<br>3. Copy the key (starts with <code>sk-ant-</code>) — you\'ll only see it once.<br>4. Paste it in Sevenda → Settings → AI Models → API Key field and save.<br><br>Anthropic offers a free credit tier to get started. The key is stored locally in <code>chrome.storage.sync</code> — it never leaves your device unless you explicitly click Generate.',
    'faq.s3.q':'I see "Idle" in the panel but nothing happens when I record. What\'s wrong?',
    'faq.s3.a':'A few things to check:<br><br>• Make sure you\'re on an <strong>http:// or https:// page</strong> — Sevenda doesn\'t work on Chrome internal pages (<code>chrome://</code>) or the New Tab page.<br>• Check that the <strong>Sevenda panel is the active tab</strong> in DevTools when you press start.<br>• If the connection indicator shows a warning, try <strong>closing and reopening DevTools</strong> — the Service Worker keepalive ping reconnects automatically.<br>• Verify your API key is saved in Settings → AI Models.',
    'faq.s4.q':'How do I switch between BPMN mode and Insights mode?',
    'faq.s4.a':'Click the <strong>Sevenda icon</strong> in the Chrome toolbar — the popup shows a toggle between <strong>🧩 BPMN</strong> and <strong>📊 Insights</strong>. Your selection is saved in <code>chrome.storage.sync</code> and persists across sessions.<br><br>Switching modes also changes the event capture filters automatically — Insights mode enables DOM observation and network tracking optimized for tag detection, while BPMN mode prioritizes navigation and interaction events.',
    'faq.s5.q':'Can multiple team members use Sevenda simultaneously?',
    'faq.s5.a':'Yes. Each team member installs Sevenda on their own Chrome and configures their own API key. Sessions are stored locally per device — there is no shared session storage in the Free and Solo plans.<br><br>The <strong>Team plan</strong> adds a shared session library and team analytics dashboard, allowing up to 20 team members to access and replay each other\'s sessions.',
    'faq.b1.q':'Is the generated BPMN compliant with the BPMN 2.0 standard?',
    'faq.b1.a':'Yes. Sevenda generates <strong>BPMN 2.0 XML</strong> that is standards-compliant and compatible with the major BPMN tools:<br><br>• <strong>Camunda Modeler &amp; Camunda Platform</strong> (native .bpmn export with <code>adaptForCamunda()</code>)<br>• <strong>Signavio</strong><br>• <strong>Bizagi</strong><br>• <strong>bpmn.io</strong><br><br>Sevenda includes automatic XML repair for truncated or malformed output, and validates the structure before rendering with bpmn-js.',
    'faq.b2.q':'How accurate is the generated BPMN? Can I use it directly with clients?',
    'faq.b2.a':'Accuracy depends on the quality of the recorded session. A well-structured session — with clear navigation, meaningful interactions, and a short context description — typically produces a BPMN that can be delivered with minimal edits.<br><br>Sevenda is designed as a <strong>starting point accelerator</strong>, not a replacement for expert review. The iterative feedback feature is specifically built to let you tune the diagram in seconds — add gateways, rename tasks, restructure flows — without leaving the panel.',
    'faq.b3.q':'What formats can I export the BPMN in?',
    'faq.b3.a':'From the BPMN panel toolbar you can export:<br><br>• <strong>.bpmn</strong> — BPMN 2.0 XML, ready for Camunda Modeler, Signavio or Bizagi<br>• <strong>.svg</strong> — vector image, scalable for presentations and documentation<br>• <strong>.png</strong> — raster image for slides, emails, reports<br>• <strong>.docx</strong> — full Technical-Functional Analysis (6-section enterprise report) generated via Claude<br>• <strong>Jira issue</strong> — creates a Jira issue with XML + SVG attachments and session metadata<br>• <strong>Camunda .bpmn</strong> — adapted export with <code>isExecutable="true"</code> and Camunda namespace',
    'faq.b4.q':'Can I refine the BPMN after it\'s generated?',
    'faq.b4.a':'Yes — this is one of Sevenda\'s core features. The <strong>Iterative Feedback</strong> section in the panel lets you type natural language instructions to modify the diagram:<br><br><em>"Add an exclusive gateway after the login task with two paths: registered user and guest."</em><br><em>"Rename \'Click Submit\' to \'Form Submission — Newsletter\'"</em><br><em>"Add an error boundary event on the checkout task"</em><br><br>Sevenda maintains a conversation history of up to <strong>6 turns</strong>, so Claude has full context of the previous modifications when applying new ones.',
    'faq.b5.q':'What events does Sevenda capture to build the BPMN?',
    'faq.b5.a':'Sevenda captures five categories of events, each color-coded in the live stream:<br><br>• <strong style="color:#7aafd4">NAV</strong> — page navigations, History API pushState/replaceState, URL changes<br>• <strong style="color:#a78bfa">UI</strong> — clicks, form submissions, keyboard interactions, button presses<br>• <strong style="color:#6BB89A">NET</strong> — fetch and XHR calls (monkey-patched), response status codes and timing<br>• <strong style="color:#dc5858">ERR</strong> — JavaScript errors, unhandled promise rejections<br>• <strong style="color:#c8a064">DOM</strong> — MutationObserver events: modals appearing/disappearing, dynamic content changes<br><br>Each event is scored HIGH/MEDIUM/LOW by relevance and filtered before being sent to the AI.',
    'faq.b6.q':'Can I import an existing BPMN XML into Sevenda?',
    'faq.b6.a':'Yes. In the BPMN panel, click <strong>Paste XML</strong> to paste any valid BPMN 2.0 XML and render it in the viewer. You can then use the Iterative Feedback feature to ask Claude to modify it — effectively using Sevenda as an AI-powered BPMN editor even without recording a new session.',
    'faq.i1.q':'Which tracking tools does Sevenda detect automatically?',
    'faq.i1.a':'Sevenda automatically detects the presence and configuration of:<br><br>• <strong>Google Tag Manager</strong> (GTM ID, dataLayer presence)<br>• <strong>Google Analytics 4</strong> (measurement ID, gtag.js)<br>• <strong>Cookiebot</strong> (consent management)<br>• <strong>Hotjar</strong> (heatmaps and session recording)<br>• Other common analytics and tag management tools present in the page scripts<br><br>Detection is passive and happens automatically during the session recording — no configuration needed.',
    'faq.i2.q':'What is the Tag Plan JSON export and how do I use it?',
    'faq.i2.a':'The Tag Plan JSON is a structured file containing all the suggested GTM events, triggers, variables, and dataLayer pushes identified during the session analysis. It can be:<br><br>• <strong>Imported directly into Google Tag Manager</strong> (via GTM JSON import)<br>• <strong>Shared with a developer</strong> as a complete implementation spec<br>• <strong>Included in a client deliverable</strong> alongside the Analytics Report .docx<br><br>Export it from the Insights panel using the <strong>↓ Tag Plan</strong> button.',
    'faq.i3.q':'How does Sevenda identify tracking gaps?',
    'faq.i3.a':'During the session, Sevenda captures every user interaction (clicks, form fills, navigation, CTA interactions) and compares them against the GTM events actually fired in the dataLayer. Interactions that happened but weren\'t tracked become <strong>tracking gaps</strong>.<br><br>Each gap is reported with the specific <strong>CSS selector</strong> and <strong>XPath</strong> of the untriggered element, so developers can implement the fix precisely. Claude then generates the corresponding <code>dataLayer.push()</code> snippet ready to paste into GTM.',
    'faq.i4.q':'Why is the Analytics Report generated instantly while BPMN takes longer?',
    'faq.i4.a':'The Analytics Report (.docx) is built directly from the <strong>cached Insights data</strong> already generated in the current session — it doesn\'t require a new API call to Claude. It renders instantly from the structured JSON that Claude produced during the Insights analysis.<br><br>The BPMN and Insights generation (the initial AI call) take 15–30 seconds because Claude Sonnet is processing the full event stream. Once that\'s done, all derivative outputs (report, Tag Plan) are immediate.',
    'faq.i5.q':'Can I run both BPMN and Insights analysis on the same session?',
    'faq.i5.a':'Yes. From the session replay view (Sessions tab), you can run both BPMN and Insights generation on any saved session — regardless of which mode was active when it was recorded. Switch to the session, then use the <strong>BPMN</strong> and <strong>Insights</strong> buttons independently to generate both outputs from the same event data.',
    'faq.p1.q':'Where is my session data stored?',
    'faq.p1.a':'All session data is stored <strong>locally on your device</strong> using the browser\'s <code>IndexedDB</code> API (database name: <code>flowlens</code>). Your settings and API key are stored in <code>chrome.storage.sync</code>, which is synced across your Chrome devices by Google — not by Sevenda.<br><br><strong>Sevenda Lab operates no backend infrastructure.</strong> There is no server that receives, stores, or processes your session data. You can delete all sessions at any time from the Sessions tab → Delete, or by uninstalling the extension.',
    'faq.p2.q':'Does Sevenda capture passwords or sensitive form data?',
    'faq.p2.a':'No. Sevenda does <strong>not</strong> capture:<br><br>• Passwords or any <code>type="password"</code> field values<br>• Credit card numbers or payment data<br>• Full text content of input fields (only element identifiers: tag, ID, CSS selector, visible label)<br>• Screenshots or visual recordings of the page<br>• Personal data beyond what appears in the URL or visible element labels<br><br>The captured data is limited to navigation URLs, element identifiers, network request URLs with status codes, and DOM structural changes — the minimum required to reconstruct a process flow.',
    'faq.p3.q':'What data is sent to the Anthropic Claude API?',
    'faq.p3.a':'When you click <strong>Generate</strong>, Sevenda sends the recorded event stream (a structured list of events with timestamps, types, and element identifiers) to the Anthropic Claude API using <strong>your own API key</strong>.<br><br>Anthropic\'s handling of this data is governed by their <a href="https://www.anthropic.com/privacy" target="_blank">Privacy Policy</a>. Sevenda does not see, log, or store the API request or response — the transmission happens directly from your browser to Anthropic\'s servers.',
    'faq.p4.q':'Is Sevenda GDPR compliant?',
    'faq.p4.a':'Yes. Sevenda is designed with a <strong>local-first, privacy-by-design</strong> architecture:<br><br>• No backend infrastructure — zero data transmitted to Sevenda Lab servers<br>• Explicit user consent required before any AI generation (you must click Generate)<br>• Full user control over stored data — delete sessions at any time<br>• No collection of personally identifiable information (PII)<br><br>Our full Privacy Policy is available at <a href="privacy.html">sevenda.dev/privacy.html</a>. For GDPR-related requests, contact <a href="mailto:hello@sevenda.dev">hello@sevenda.dev</a>.',
    'faq.p5.q':'Can I use Sevenda to record sessions on client websites?',
    'faq.p5.a':'Technically yes — Sevenda works on any website. However, we recommend <strong>informing your client</strong> that you are conducting a session observation for process documentation purposes, consistent with how you would handle any usability observation or screen-sharing session.<br><br>Sevenda does not capture passwords, payment data, or full form content. That said, always check your client\'s internal data policies before recording.',
    'faq.pr1.q':'What\'s included in the Free plan?',
    'faq.pr1.a':'The Free plan includes <strong>5 sessions per month</strong>, BPMN 2.0 generation, export in .bpmn and .svg formats, and full access to the Chrome DevTools panel.<br><br>Features exclusive to Solo and Team plans: Insights &amp; GTM analysis, .docx report export, .png export, Jira and Camunda integration, and team collaboration tools.',
    'faq.pr2.q':'What are the Anthropic API costs and how do I estimate them?',
    'faq.pr2.a':'Sevenda uses a <strong>BYOK (Bring Your Own Key)</strong> model — you pay Anthropic directly for API usage, so costs are transparent and under your control.<br><br>Rough estimate: <strong>40 sessions with BPMN or Insights generation costs approximately €15–25 total</strong> using Claude Sonnet. The Analytics Report (.docx) is generated without an API call, so it doesn\'t add to your costs.<br><br>You can monitor your exact usage in the <a href="https://console.anthropic.com" target="_blank">Anthropic Console</a>.',
    'faq.pr3.q':'Can I cancel my subscription at any time?',
    'faq.pr3.a':'Yes. There are no long-term commitments. You can cancel your Solo or Team subscription at any time — your access continues until the end of the current billing period, then reverts to the Free plan. No cancellation fees, no data loss.',
    'faq.pr4.q':'Do you offer a trial or a partnership program for consultancies?',
    'faq.pr4.a':'Yes — we offer a <strong>Beta Partnership Program</strong> for consulting firms and agencies. Qualified partners receive free access to the Team plan for 60 working days, dedicated onboarding, and direct support from the founder in exchange for structured feedback and a case study.<br><br>If you\'re interested, write to <a href="mailto:hello@sevenda.dev">hello@sevenda.dev</a> with a brief description of your firm and use case.',

    /* ── Pricing bottom FAQ ── */
    'pfaq.1.q':'What happens if I exceed my plan limits?',
    'pfaq.1.a':'The extension notifies you when you reach 80% of your limit. You can purchase add-ons on demand or upgrade to the next plan. There are no automatic blocks without prior notice.',
    'pfaq.2.q':'Is my Anthropic API key separate from Sevenda limits?',
    'pfaq.2.a':'Yes. Sevenda limits apply to platform features (sessions, exports, retention). Calls to the Claude model use your personal Anthropic API key, with separate token costs.',
    'pfaq.3.q':'Can I change plans at any time?',
    'pfaq.3.a':'Yes, upgrades are immediate. Downgrades take effect at the end of the current billing cycle. Data within the new plan limits is preserved.',
    'pfaq.4.q':'How many users does the Team plan cover?',
    'pfaq.4.a':'The Team plan scales with the number of users in your workspace. Pricing is per user/month; sessions, AI calls and export limits are shared as a pool across all members.',
    'pfaq.5.q':'Do saved sessions expire?',
    'pfaq.5.a':'It depends on your plan: 7 days (Free), 90 days (Solo), 12 months (Team), unlimited (Enterprise). Before expiry you can export everything as XML or SVG.',

    /* ── Docs TOC + section headers ── */
    'dtoc.01':'Introduction','dtoc.02':'Installation','dtoc.03':'The Popup',
    'dtoc.04':'Guided Onboarding','dtoc.05':'Operating Modes','dtoc.06':'The DevTools Panel',
    'dtoc.07':'Recording','dtoc.08':'Event Stream','dtoc.09':'BPMN Generation',
    'dtoc.10':'BPMN Panel','dtoc.11':'Iterative Feedback','dtoc.12':'Insights Generation',
    'dtoc.13':'Documentation','dtoc.14':'Session Management','dtoc.15':'Jira Integration',
    'dtoc.16':'Camunda Export','dtoc.17':'Settings','dtoc.18':'FAQ',
    'ds.01.eye':'01 — Introduction','ds.01.h2':'What Sevenda does',
    'ds.02.eye':'02 — Installation','ds.02.h2':'Installing Sevenda','ds.02.p':'Install from an unpacked folder in under 2 minutes.',
    'ds.03.eye':'03 — The Popup','ds.03.h2':'Main control point','ds.03.p':'Click the ≋ icon in the Chrome toolbar to access all features without opening DevTools.',
    'ds.04.eye':'04 — Guided Onboarding','ds.04.h2':'Three steps on first launch','ds.04.p':'On first use, Sevenda guides the user through a 3-step journey. It does not repeat on subsequent openings.',
    'ds.05.eye':'05 — Operating Modes','ds.05.h2':'BPMN or Insights — two distinct audiences','ds.05.p':'The selected mode adapts filters, UI, and AI outputs for the active user profile.',
    'ds.06.eye':'06 — The DevTools Panel','ds.06.h2':'The heart of Sevenda','ds.06.p':'The panel lives inside Chrome\'s DevTools. Open with F12 → Sevenda tab.',
    'ds.07.eye':'07 — Recording','ds.07.h2':'Capture a session','ds.07.p':'Sevenda automatically captures all events without any changes to the target application.',
    'ds.08.eye':'08 — Event Stream','ds.08.h2':'The real-time event log','ds.08.p':'Filter, search and inspect every event with a click to view complete details.',
    'ds.09.eye':'09 — BPMN Generation','ds.09.h2':'From log to diagram','ds.09.p':'Claude Sonnet transforms the event sequence into a BPMN 2.0 standard-compliant diagram.',
    'ds.10.eye':'10 — BPMN Panel','ds.10.h2':'Views and available tools','ds.10.p':'The BPMN panel offers three tabs with contextual tools for each view.',
    'ds.11.eye':'11 — Iterative Feedback','ds.11.h2':'Refine the BPMN in natural language','ds.11.p':'Modify the diagram without regenerating from scratch. The conversation keeps the last 6 interactions.',
    'ds.12.eye':'12 — Insights Generation','ds.12.h2':'Automatic GTM/GA4 analysis','ds.12.p':'Identifies tracking gaps, missing events and produces an implementation-ready tag plan.',
    'ds.13.eye':'13 — Documentation','ds.13.h2':'Two documents, two audiences','ds.13.p':'Generate professional enterprise Word documents with one click.',
    'ds.14.eye':'14 — Session Management','ds.14.h2':'Archive and replay','ds.14.p':'All sessions are saved to IndexedDB and available for replay and later analysis.',
    'ds.15.eye':'15–16 — Integrations','ds.15.h2':'Jira and Camunda','ds.15.p':'Bring the BPMN directly into your existing workflow.',
    'ds.17.eye':'17 — Settings','ds.17.h2':'Settings page','ds.17.p':'Accessible from popup → Settings & AI Models or from the ⚙ modal in the panel.',
    'ds.18.eye':'18 — FAQ','ds.18.h2':'Frequently asked questions',
  },

  /* ────────────────────────────────────────────────────────────
   * ITALIANO
   * ──────────────────────────────────────────────────────────── */
  it: {
    'nav.features':'Funzionalità','nav.insights':'Insights','nav.usecases':'Casi d\'uso',
    'nav.how':'Come funziona','nav.pricing':'Prezzi','nav.docs':'Docs','nav.faq':'FAQ','nav.privacy':'Privacy Policy',
    'nav.cta':'Aggiungi a Chrome',

    'hero.pill':'Ora con Claude Sonnet 4 →',
    'hero.h1':'Ogni click racconta una storia.<br><span class="dim">Sevenda la legge.</span>',
    'hero.sub':'Sevenda registra la tua sessione browser e genera istantaneamente diagrammi di processo BPMN 2.0 e insight operativi — aiutando developer, business analyst e team marketing a capire cosa succede davvero nei loro processi digitali.',
    'hero.cta1':'Aggiungi a Chrome — è gratis',

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
    'pricing.eyebrow':'Prezzi','pricing.monthly':'Mensile','pricing.annual':'Annuale','pricing.save25':'Risparmia 25%',
    'pricing.process':'Processo','pricing.analytics':'Analytics','pricing.suite':'Suite','pricing.howMany':'Quanti utenti?',
    'billing.monthly':'Mensile','billing.annual':'Annuale','billing.save':'Risparmia 25%',
    /* ── IVA ── */
    'iva.country':'Paese:','iva.included':'✓ IVA inclusa','iva.totalInclVat':'Totale (IVA incl.):',
    'iva.invoiceNote':'Una fattura con il dettaglio imponibile / IVA / totale verrà inviata via email dopo il pagamento.',
    'iva.disclaimer':'Tutti i prezzi sono comprensivi di IVA, applicata in base alla normativa fiscale vigente nel tuo paese. Per i clienti UE si applica l\'aliquota IVA del paese di residenza (regime MOSS). Le Pubbliche Amministrazioni e i clienti B2B UE idonei al reverse charge possono richiedere fatturazione personalizzata scrivendo a hello@sevenda.dev.',
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

    /* ── FAQ Q&A IT ── */
    'faq.g1.q':'Cos\'è Sevenda e cosa fa?',
    'faq.g1.a':'Sevenda è una Chrome Extension (MV3) che registra le sessioni browser e genera automaticamente <strong>diagrammi di processo BPMN 2.0</strong> e <strong>insight analytics GTM/GA4</strong> — alimentato da Claude Sonnet AI.<br><br>Funziona in due modalità: <strong>🧩 BPMN mode</strong> mappa flussi utente e processi dalle interazioni browser reali; <strong>📊 Insights mode</strong> analizza il setup di tracking, identifica eventi GTM mancanti e genera un Tag Plan pronto all\'uso. Nessuna modifica al codice, nessun SDK, nessuna configurazione sul sito target.',
    'faq.g2.q':'A chi è rivolto Sevenda?',
    'faq.g2.a':'Sevenda è pensato per tre pubblici principali:<br><br><strong>Developer e Business Analyst</strong> — documentano processi AS-IS, flussi utente e interazioni API direttamente dal browser, senza diagrammazione manuale.<br><br><strong>Team Marketing e Data</strong> — verificano la copertura di tracking GTM/GA4, identificano i gap nel funnel e generano Tag Plan senza ispezione manuale.<br><br><strong>Consulenti e Project Manager</strong> — producono diagrammi BPMN e report .docx per i clienti in minuti, e li inviano direttamente a Jira.',
    'faq.g3.q':'Quali browser supporta Sevenda?',
    'faq.g3.a':'Sevenda è una <strong>Chrome Extension Manifest V3</strong> e funziona su <strong>Google Chrome</strong> e qualsiasi browser basato su Chromium (Brave, Edge, Arc). Richiede l\'accesso a Chrome DevTools, quindi funziona solo su desktop — non su browser mobile.',
    'faq.g4.q':'Quanto tempo ci vuole per generare il primo diagramma?',
    'faq.g4.a':'Dall\'installazione al primo diagramma BPMN: <strong>meno di 60 secondi</strong>.<br><br>La generazione stessa (Claude Sonnet che elabora l\'event stream) richiede tipicamente <strong>15–30 secondi</strong> in base alla lunghezza della sessione e al tempo di risposta API. L\'Analytics Report in modalità Insights è <strong>istantaneo</strong> — generato dai dati in cache senza una chiamata API aggiuntiva.',
    'faq.g5.q':'Posso usare Sevenda su qualsiasi sito web?',
    'faq.g5.a':'Sì. Sevenda usa permessi host <code>&lt;all_urls&gt;</code> perché il sito target non è noto in anticipo — puoi registrare qualsiasi sito che visiti. Non inietta codice visibile né modifica il sito target in alcun modo.<br><br>Alcuni siti con Content Security Policy (CSP) molto restrittive potrebbero limitare gli eventi catturabili. Il BPMN e gli Insights saranno comunque generati dagli eventi catturati con successo.',
    'faq.g6.q':'Sevenda funziona su localhost e strumenti interni?',
    'faq.g6.a':'Sì — Sevenda funziona su <code>localhost</code>, strumenti interni e ambienti di staging esattamente come sui siti pubblici. Questo lo rende particolarmente utile per documentare workflow interni, dashboard admin e flussi utente pre-produzione prima che vadano live.',
    'faq.s1.q':'Come installo Sevenda?',
    'faq.s1.a':'1. Installa l\'estensione dal <strong>Chrome Web Store</strong> (cerca "Sevenda").<br>2. Clicca l\'icona Sevenda nella toolbar di Chrome — appare un popup.<br>3. Vai in <strong>Impostazioni → AI Models</strong> e inserisci la tua <a href="https://console.anthropic.com" target="_blank">Anthropic API key</a>.<br>4. Apri Chrome DevTools (<code>F12</code>) su qualsiasi pagina — troverai il pannello Sevenda tra le tab.<br>5. Premi <strong>Avvia Registrazione</strong> e inizia a navigare.',
    'faq.s2.q':'Dove ottengo una Anthropic API key?',
    'faq.s2.a':'1. Crea un account su <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>.<br>2. Vai in <strong>API Keys</strong> e clicca <strong>Create Key</strong>.<br>3. Copia la chiave (inizia con <code>sk-ant-</code>) — la vedrai solo una volta.<br>4. Incollala in Sevenda → Impostazioni → AI Models → campo API Key e salva.<br><br>Anthropic offre un tier gratuito per iniziare. La chiave è salvata localmente in <code>chrome.storage.sync</code> — non lascia mai il tuo dispositivo, a meno che tu non clicchi Genera.',
    'faq.s3.q':'Vedo "Idle" nel pannello ma non succede nulla quando registro. Cosa c\'è che non va?',
    'faq.s3.a':'Alcune cose da verificare:<br><br>• Assicurati di essere su una pagina <strong>http:// o https://</strong> — Sevenda non funziona su pagine interne di Chrome (<code>chrome://</code>) o sulla New Tab page.<br>• Verifica che il <strong>pannello Sevenda sia la tab attiva</strong> nei DevTools quando premi start.<br>• Se l\'indicatore di connessione mostra un avviso, prova a <strong>chiudere e riaprire DevTools</strong>.<br>• Verifica che la tua API key sia salvata in Impostazioni → AI Models.',
    'faq.s4.q':'Come passo dalla modalità BPMN alla modalità Insights?',
    'faq.s4.a':'Clicca l\'<strong>icona Sevenda</strong> nella toolbar di Chrome — il popup mostra un toggle tra <strong>🧩 BPMN</strong> e <strong>📊 Insights</strong>. La selezione è salvata in <code>chrome.storage.sync</code> e persiste tra le sessioni.<br><br>Il cambio di modalità aggiorna automaticamente anche i filtri di cattura degli eventi — la modalità Insights abilita l\'osservazione DOM ottimizzata per la rilevazione dei tag, mentre la modalità BPMN priorizza gli eventi di navigazione e interazione.',
    'faq.s5.q':'Più membri del team possono usare Sevenda contemporaneamente?',
    'faq.s5.a':'Sì. Ogni membro del team installa Sevenda sul proprio Chrome e configura la propria API key. Le sessioni sono salvate localmente su ogni dispositivo — non c\'è storage condiviso nei piani Free e Solo.<br><br>Il <strong>piano Team</strong> aggiunge una libreria di sessioni condivisa e una dashboard analytics team, permettendo fino a 20 membri di accedere e riprodurre le sessioni degli altri.',
    'faq.b1.q':'Il BPMN generato è conforme allo standard BPMN 2.0?',
    'faq.b1.a':'Sì. Sevenda genera <strong>BPMN 2.0 XML</strong> conforme agli standard e compatibile con i principali tool BPMN:<br><br>• <strong>Camunda Modeler e Camunda Platform</strong> (esportazione nativa .bpmn con <code>adaptForCamunda()</code>)<br>• <strong>Signavio</strong><br>• <strong>Bizagi</strong><br>• <strong>bpmn.io</strong><br><br>Sevenda include riparazione automatica dell\'XML per output troncati o malformati, e valida la struttura prima del rendering con bpmn-js.',
    'faq.b2.q':'Quanto è accurato il BPMN generato? Posso usarlo direttamente con i clienti?',
    'faq.b2.a':'L\'accuratezza dipende dalla qualità della sessione registrata. Una sessione ben strutturata — con navigazione chiara, interazioni significative e una breve descrizione del contesto — produce tipicamente un BPMN consegnabile con modifiche minime.<br><br>Sevenda è progettato come <strong>acceleratore del punto di partenza</strong>, non come sostituto della revisione esperta. La funzionalità di feedback iterativo è pensata per permetterti di ottimizzare il diagramma in secondi — aggiungere gateway, rinominare task, ristrutturare flussi — senza uscire dal pannello.',
    'faq.b3.q':'In quali formati posso esportare il BPMN?',
    'faq.b3.a':'Dalla toolbar del pannello BPMN puoi esportare:<br><br>• <strong>.bpmn</strong> — BPMN 2.0 XML, pronto per Camunda Modeler, Signavio o Bizagi<br>• <strong>.svg</strong> — immagine vettoriale, scalabile per presentazioni e documentazione<br>• <strong>.png</strong> — immagine raster per slide, email, report<br>• <strong>.docx</strong> — Analisi Tecnico-Funzionale completa (report aziendale in 6 sezioni) generata via Claude<br>• <strong>Issue Jira</strong> — crea un\'issue Jira con allegati XML + SVG e metadati della sessione<br>• <strong>Camunda .bpmn</strong> — esportazione adattata con <code>isExecutable="true"</code> e namespace Camunda',
    'faq.b4.q':'Posso raffinare il BPMN dopo che è stato generato?',
    'faq.b4.a':'Sì — è una delle funzionalità core di Sevenda. La sezione <strong>Feedback Iterativo</strong> nel pannello ti permette di digitare istruzioni in linguaggio naturale per modificare il diagramma:<br><br><em>"Aggiungi un gateway esclusivo dopo il task di login con due percorsi: utente registrato e ospite."</em><br><em>"Rinomina \'Click Submit\' in \'Invio Form — Newsletter\'"</em><br><em>"Aggiungi un evento di errore sul task di checkout"</em><br><br>Sevenda mantiene una cronologia della conversazione fino a <strong>6 turni</strong>, così Claude ha il contesto completo delle modifiche precedenti.',
    'faq.b5.q':'Quali eventi cattura Sevenda per costruire il BPMN?',
    'faq.b5.a':'Sevenda cattura cinque categorie di eventi, ognuna con un colore nel live stream:<br><br>• <strong style="color:#7aafd4">NAV</strong> — navigazioni di pagina, History API pushState/replaceState, cambi di URL<br>• <strong style="color:#a78bfa">UI</strong> — click, invii di form, interazioni da tastiera, pressioni di bottoni<br>• <strong style="color:#6BB89A">NET</strong> — chiamate fetch e XHR, status code e tempi di risposta<br>• <strong style="color:#dc5858">ERR</strong> — errori JavaScript, promise rejection non gestite<br>• <strong style="color:#c8a064">DOM</strong> — eventi MutationObserver: modali, cambiamenti di contenuto dinamico<br><br>Ogni evento è valutato HIGH/MEDIUM/LOW per rilevanza e filtrato prima di essere inviato all\'AI.',
    'faq.b6.q':'Posso importare un BPMN XML esistente in Sevenda?',
    'faq.b6.a':'Sì. Nel pannello BPMN, clicca <strong>Incolla XML</strong> per incollare qualsiasi BPMN 2.0 XML valido e renderizzarlo nel viewer. Puoi poi usare la funzionalità di Feedback Iterativo per chiedere a Claude di modificarlo — usando Sevenda come editor BPMN con AI anche senza registrare una nuova sessione.',
    'faq.i1.q':'Quali strumenti di tracking rileva automaticamente Sevenda?',
    'faq.i1.a':'Sevenda rileva automaticamente la presenza e la configurazione di:<br><br>• <strong>Google Tag Manager</strong> (GTM ID, presenza dataLayer)<br>• <strong>Google Analytics 4</strong> (measurement ID, gtag.js)<br>• <strong>Cookiebot</strong> (gestione consenso)<br>• <strong>Hotjar</strong> (heatmap e session recording)<br>• Altri comuni strumenti analytics presenti negli script della pagina<br><br>Il rilevamento è passivo e avviene automaticamente durante la registrazione della sessione — nessuna configurazione necessaria.',
    'faq.i2.q':'Cos\'è l\'esportazione Tag Plan JSON e come si usa?',
    'faq.i2.a':'Il Tag Plan JSON è un file strutturato contenente tutti gli eventi GTM suggeriti, trigger, variabili e dataLayer push identificati durante l\'analisi della sessione. Può essere:<br><br>• <strong>Importato direttamente in Google Tag Manager</strong> (via importazione JSON GTM)<br>• <strong>Condiviso con uno sviluppatore</strong> come specifica di implementazione completa<br>• <strong>Incluso in un deliverable cliente</strong> insieme al report Analytics .docx<br><br>Esportalo dal pannello Insights usando il pulsante <strong>↓ Tag Plan</strong>.',
    'faq.i3.q':'Come identifica Sevenda i gap di tracking?',
    'faq.i3.a':'Durante la sessione, Sevenda cattura ogni interazione utente e la confronta con gli eventi GTM effettivamente sparati nel dataLayer. Le interazioni avvenute ma non tracciate diventano <strong>tracking gap</strong>.<br><br>Ogni gap è riportato con il <strong>selettore CSS</strong> e lo <strong>XPath</strong> specifici dell\'elemento non triggerato. Claude genera poi il corrispondente snippet <code>dataLayer.push()</code> pronto da incollare in GTM.',
    'faq.i4.q':'Perché il report Analytics si genera istantaneamente mentre il BPMN richiede più tempo?',
    'faq.i4.a':'Il report Analytics (.docx) è costruito direttamente dai <strong>dati Insights in cache</strong> già generati nella sessione corrente — non richiede una nuova chiamata API a Claude. Si renderizza istantaneamente dal JSON strutturato che Claude ha prodotto durante l\'analisi Insights.<br><br>La generazione BPMN e Insights (la chiamata AI iniziale) richiede 15–30 secondi perché Claude Sonnet sta elaborando l\'intero event stream. Una volta completata, tutti gli output derivati sono immediati.',
    'faq.i5.q':'Posso eseguire l\'analisi BPMN e Insights sulla stessa sessione?',
    'faq.i5.a':'Sì. Dalla vista di replay della sessione (tab Sessioni), puoi eseguire sia la generazione BPMN che quella Insights su qualsiasi sessione salvata — indipendentemente dalla modalità attiva quando è stata registrata. Usa i pulsanti <strong>BPMN</strong> e <strong>Insights</strong> indipendentemente per generare entrambi gli output dagli stessi dati eventi.',
    'faq.p1.q':'Dove vengono salvati i dati della sessione?',
    'faq.p1.a':'Tutti i dati di sessione sono salvati <strong>localmente sul tuo dispositivo</strong> usando l\'API <code>IndexedDB</code> del browser (nome database: <code>flowlens</code>). Le impostazioni e la API key sono salvate in <code>chrome.storage.sync</code>.<br><br><strong>Sevenda Lab non gestisce alcuna infrastruttura backend.</strong> Non esiste un server che riceve, salva o elabora i tuoi dati di sessione. Puoi eliminare tutte le sessioni in qualsiasi momento dalla tab Sessioni, o disinstallando l\'estensione.',
    'faq.p2.q':'Sevenda cattura password o dati sensibili dei form?',
    'faq.p2.a':'No. Sevenda <strong>non</strong> cattura:<br><br>• Password o qualsiasi valore dei campi <code>type="password"</code><br>• Numeri di carta di credito o dati di pagamento<br>• Contenuto testuale completo dei campi input (solo identificatori elemento: tag, ID, selettore CSS, label visibile)<br>• Screenshot o registrazioni visive della pagina<br>• Dati personali al di là di ciò che appare nell\'URL o nelle label degli elementi visibili<br><br>I dati catturati si limitano a URL di navigazione, identificatori di elementi, URL di richieste di rete con status code e modifiche strutturali del DOM.',
    'faq.p3.q':'Quali dati vengono inviati all\'API Anthropic Claude?',
    'faq.p3.a':'Quando clicchi <strong>Genera</strong>, Sevenda invia l\'event stream registrato all\'API Anthropic Claude usando <strong>la tua API key personale</strong>.<br><br>La gestione di questi dati da parte di Anthropic è regolata dalla loro <a href="https://www.anthropic.com/privacy" target="_blank">Privacy Policy</a>. Sevenda non vede, non registra né salva la richiesta o la risposta API — la trasmissione avviene direttamente dal tuo browser ai server di Anthropic.',
    'faq.p4.q':'Sevenda è conforme al GDPR?',
    'faq.p4.a':'Sì. Sevenda è progettato con un\'architettura <strong>local-first, privacy-by-design</strong>:<br><br>• Nessuna infrastruttura backend — zero dati trasmessi ai server di Sevenda Lab<br>• Consenso esplicito dell\'utente richiesto prima di qualsiasi generazione AI (devi cliccare Genera)<br>• Controllo completo dell\'utente sui dati salvati — elimina le sessioni in qualsiasi momento<br>• Nessuna raccolta di informazioni personali identificabili (PII)<br><br>La nostra Privacy Policy completa è disponibile su <a href="privacy.html">sevenda.dev/privacy.html</a>. Per richieste relative al GDPR: <a href="mailto:hello@sevenda.dev">hello@sevenda.dev</a>.',
    'faq.p5.q':'Posso usare Sevenda per registrare sessioni su siti dei clienti?',
    'faq.p5.a':'Tecnicamente sì — Sevenda funziona su qualsiasi sito web. Tuttavia, raccomandiamo di <strong>informare il cliente</strong> che stai conducendo un\'osservazione della sessione per scopi di documentazione del processo.<br><br>Sevenda non cattura password, dati di pagamento o contenuto completo dei form. Detto questo, verifica sempre le policy interne sui dati del cliente prima di registrare.',
    'faq.pr1.q':'Cosa include il piano Free?',
    'faq.pr1.a':'Il piano Free include <strong>5 sessioni al mese</strong>, generazione BPMN 2.0, esportazione nei formati .bpmn e .svg, e accesso completo al pannello Chrome DevTools.<br><br>Funzionalità esclusive dei piani Solo e Team: analisi Insights e GTM, esportazione report .docx, esportazione .png, integrazione Jira e Camunda, e strumenti di collaborazione team.',
    'faq.pr2.q':'Quali sono i costi API Anthropic e come posso stimarli?',
    'faq.pr2.a':'Sevenda usa un modello <strong>BYOK (Bring Your Own Key)</strong> — paghi Anthropic direttamente per l\'utilizzo API, quindi i costi sono trasparenti e sotto il tuo controllo.<br><br>Stima indicativa: <strong>40 sessioni con generazione BPMN o Insights costano circa €15–25 in totale</strong> con Claude Sonnet. Il report Analytics (.docx) viene generato senza chiamata API, quindi non aggiunge costi.<br><br>Puoi monitorare il tuo utilizzo esatto nella <a href="https://console.anthropic.com" target="_blank">Anthropic Console</a>.',
    'faq.pr3.q':'Posso cancellare l\'abbonamento in qualsiasi momento?',
    'faq.pr3.a':'Sì. Non ci sono impegni a lungo termine. Puoi cancellare il tuo abbonamento Solo o Team in qualsiasi momento — l\'accesso continua fino alla fine del periodo di fatturazione corrente, poi torna al piano Free. Nessuna penale di cancellazione, nessuna perdita di dati.',
    'faq.pr4.q':'Offrite una prova o un programma di partnership per le società di consulenza?',
    'faq.pr4.a':'Sì — offriamo un <strong>Beta Partnership Program</strong> per società di consulenza e agenzie. I partner qualificati ricevono accesso gratuito al piano Team per 60 giorni lavorativi, onboarding dedicato e supporto diretto dal fondatore in cambio di feedback strutturato e un case study.<br><br>Se sei interessato, scrivi a <a href="mailto:hello@sevenda.dev">hello@sevenda.dev</a>.',

    /* ── Pricing bottom FAQ IT ── */
    'pfaq.1.q':'Cosa succede se supero i limiti del piano?',
    'pfaq.1.a':'L\'estensione ti notifica quando raggiungi l\'80% del limite. Puoi acquistare add-on su richiesta o passare al piano successivo. Non ci sono blocchi automatici senza preavviso.',
    'pfaq.2.q':'La mia Anthropic API key è separata dai limiti di Sevenda?',
    'pfaq.2.a':'Sì. I limiti di Sevenda si applicano alle funzionalità della piattaforma (sessioni, esportazioni, retention). Le chiamate al modello Claude usano la tua API key personale Anthropic, con costi di token separati.',
    'pfaq.3.q':'Posso cambiare piano in qualsiasi momento?',
    'pfaq.3.a':'Sì, gli upgrade sono immediati. I downgrade hanno effetto alla fine del ciclo di fatturazione corrente. I dati nei limiti del nuovo piano vengono preservati.',
    'pfaq.4.q':'Quanti utenti copre il piano Team?',
    'pfaq.4.a':'Il piano Team scala con il numero di utenti nel tuo workspace. Il prezzo è per utente/mese; sessioni, chiamate AI e limiti di esportazione sono condivisi come pool tra tutti i membri.',
    'pfaq.5.q':'Le sessioni salvate scadono?',
    'pfaq.5.a':'Dipende dal piano: 7 giorni (Free), 90 giorni (Solo), 12 mesi (Team), illimitato (Enterprise). Prima della scadenza puoi esportare tutto come XML o SVG.',

    /* ── Docs TOC + sezioni IT ── */
    'dtoc.01':'Introduzione','dtoc.02':'Installazione','dtoc.03':'Il Popup',
    'dtoc.04':'Onboarding Guidato','dtoc.05':'Modalità Operative','dtoc.06':'Il Pannello DevTools',
    'dtoc.07':'Registrazione','dtoc.08':'Event Stream','dtoc.09':'Generazione BPMN',
    'dtoc.10':'Pannello BPMN','dtoc.11':'Feedback Iterativo','dtoc.12':'Generazione Insights',
    'dtoc.13':'Documentazione','dtoc.14':'Gestione Sessioni','dtoc.15':'Integrazione Jira',
    'dtoc.16':'Esportazione Camunda','dtoc.17':'Impostazioni','dtoc.18':'FAQ',
    'ds.01.eye':'01 — Introduzione','ds.01.h2':'Cosa fa Sevenda',
    'ds.02.eye':'02 — Installazione','ds.02.h2':'Installare Sevenda','ds.02.p':'Installa dalla cartella decompressa in meno di 2 minuti.',
    'ds.03.eye':'03 — Il Popup','ds.03.h2':'Punto di controllo principale','ds.03.p':'Clicca l\'icona ≋ nella toolbar di Chrome per accedere a tutte le funzionalità senza aprire DevTools.',
    'ds.04.eye':'04 — Onboarding Guidato','ds.04.h2':'Tre passi al primo avvio','ds.04.p':'Al primo utilizzo, Sevenda guida l\'utente attraverso un percorso in 3 passi. Non si ripete nelle aperture successive.',
    'ds.05.eye':'05 — Modalità Operative','ds.05.h2':'BPMN o Insights — due pubblici distinti','ds.05.p':'La modalità selezionata adatta filtri, UI e output AI per il profilo utente attivo.',
    'ds.06.eye':'06 — Il Pannello DevTools','ds.06.h2':'Il cuore di Sevenda','ds.06.p':'Il pannello vive all\'interno dei Chrome DevTools. Aprilo con F12 → tab Sevenda.',
    'ds.07.eye':'07 — Registrazione','ds.07.h2':'Registrare una sessione','ds.07.p':'Sevenda cattura automaticamente tutti gli eventi senza alcuna modifica all\'applicazione target.',
    'ds.08.eye':'08 — Event Stream','ds.08.h2':'Il log degli eventi in tempo reale','ds.08.p':'Filtra, cerca e ispeziona ogni evento con un click per visualizzare i dettagli completi.',
    'ds.09.eye':'09 — Generazione BPMN','ds.09.h2':'Dal log al diagramma','ds.09.p':'Claude Sonnet trasforma la sequenza di eventi in un diagramma conforme allo standard BPMN 2.0.',
    'ds.10.eye':'10 — Pannello BPMN','ds.10.h2':'Viste e strumenti disponibili','ds.10.p':'Il pannello BPMN offre tre tab con strumenti contestuali per ogni vista.',
    'ds.11.eye':'11 — Feedback Iterativo','ds.11.h2':'Raffina il BPMN in linguaggio naturale','ds.11.p':'Modifica il diagramma senza rigenerarlo da zero. La conversazione mantiene le ultime 6 interazioni.',
    'ds.12.eye':'12 — Generazione Insights','ds.12.h2':'Analisi GTM/GA4 automatica','ds.12.p':'Identifica gap di tracking, eventi mancanti e produce un tag plan pronto per l\'implementazione.',
    'ds.13.eye':'13 — Documentazione','ds.13.h2':'Due documenti, due pubblici','ds.13.p':'Genera documenti Word aziendali professionali con un click.',
    'ds.14.eye':'14 — Gestione Sessioni','ds.14.h2':'Archivio e replay','ds.14.p':'Tutte le sessioni sono salvate in IndexedDB e disponibili per replay e analisi successive.',
    'ds.15.eye':'15–16 — Integrazioni','ds.15.h2':'Jira e Camunda','ds.15.p':'Porta il BPMN direttamente nel tuo workflow esistente.',
    'ds.17.eye':'17 — Impostazioni','ds.17.h2':'Pagina delle impostazioni','ds.17.p':'Accessibile da popup → Impostazioni e AI Models o dal modale ⚙ nel pannello.',
    'ds.18.eye':'18 — FAQ','ds.18.h2':'Domande frequenti',
  },

  /* ────────────────────────────────────────────────────────────
   * SPAGNOLO
   * ──────────────────────────────────────────────────────────── */
  es: {
    'nav.features':'Funciones','nav.insights':'Insights','nav.usecases':'Casos de uso',
    'nav.how':'Cómo funciona','nav.pricing':'Precios','nav.docs':'Docs','nav.faq':'FAQ','nav.privacy':'Política de Privacidad',
    'nav.cta':'Añadir a Chrome',

    'hero.pill':'Ahora con Claude Sonnet 4 →',
    'hero.h1':'Cada clic cuenta una historia.<br><span class="dim">Sevenda la lee.</span>',
    'hero.sub':'Sevenda graba tu sesión de navegador y genera instantáneamente diagramas de proceso BPMN 2.0 e insights accionables — ayudando a desarrolladores, analistas de negocio y equipos de marketing a entender qué ocurre realmente en sus procesos digitales.',
    'hero.cta1':'Añadir a Chrome — es gratis',

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
    'pricing.eyebrow':'Precios','pricing.monthly':'Mensual','pricing.annual':'Anual','pricing.save25':'Ahorra 25%',
    'pricing.process':'Proceso','pricing.analytics':'Analytics','pricing.suite':'Suite','pricing.howMany':'¿Cuántos usuarios?',
    'billing.monthly':'Mensual','billing.annual':'Anual','billing.save':'Ahorra 25%',
    /* ── IVA ── */
    'iva.country':'País:','iva.included':'✓ IVA incluido','iva.totalInclVat':'Total (IVA incl.):',
    'iva.invoiceNote':'Se enviará por correo electrónico una factura con el desglose de base imponible / IVA / total tras el pago.',
    'iva.disclaimer':'Todos los precios incluyen IVA, aplicado según la normativa fiscal vigente en tu país. Para clientes de la UE se aplica el tipo de IVA del país de residencia (régimen MOSS). Las Administraciones Públicas y los clientes B2B de la UE con derecho a inversión del sujeto pasivo pueden solicitar facturación personalizada en hello@sevenda.dev.',
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

    /* ── FAQ Q&A ES ── */
    'faq.g1.q':'¿Qué es Sevenda y qué hace?',
    'faq.g1.a':'Sevenda es una Chrome Extension (MV3) que graba tus sesiones de navegador y genera automáticamente <strong>diagramas de proceso BPMN 2.0</strong> e <strong>insights analytics GTM/GA4</strong> — impulsado por Claude Sonnet AI.<br><br>Funciona en dos modos: <strong>🧩 BPMN mode</strong> mapea flujos de usuario y procesos desde interacciones reales del navegador; <strong>📊 Insights mode</strong> analiza tu configuración de tracking, identifica eventos GTM faltantes y genera un Tag Plan listo para usar. Sin cambios de código, sin SDK, sin configuración en el sitio objetivo.',
    'faq.g2.q':'¿Para quién es Sevenda?',
    'faq.g2.a':'Sevenda está diseñado para tres públicos principales:<br><br><strong>Desarrolladores y Analistas de Negocio</strong> — documentan procesos AS-IS, flujos de usuario e interacciones API directamente desde el navegador, sin diagramación manual.<br><br><strong>Equipos de Marketing y Datos</strong> — auditan la cobertura de tracking GTM/GA4, identifican brechas en el embudo y generan Tag Plans sin inspección manual.<br><br><strong>Consultores y Gestores de Proyectos</strong> — producen diagramas BPMN e informes .docx para clientes en minutos, y los envían directamente a Jira.',
    'faq.g3.q':'¿Qué navegadores admite Sevenda?',
    'faq.g3.a':'Sevenda es una <strong>Chrome Extension Manifest V3</strong> y funciona en <strong>Google Chrome</strong> y cualquier navegador basado en Chromium (Brave, Edge, Arc). Requiere acceso a Chrome DevTools, por lo que funciona solo en escritorio — no en navegadores móviles.',
    'faq.g4.q':'¿Cuánto tiempo se tarda en generar el primer diagrama?',
    'faq.g4.a':'Desde la instalación hasta tu primer diagrama BPMN: <strong>menos de 60 segundos</strong>.<br><br>La generación en sí (Claude Sonnet procesando el flujo de eventos) típicamente tarda <strong>15–30 segundos</strong> según la longitud de la sesión. El Analytics Report en modo Insights es <strong>instantáneo</strong> — generado desde datos en caché sin una llamada API adicional.',
    'faq.g5.q':'¿Puedo usar Sevenda en cualquier sitio web?',
    'faq.g5.a':'Sí. Sevenda usa permisos host <code>&lt;all_urls&gt;</code> porque el sitio objetivo no se conoce de antemano — puedes grabar cualquier sitio que visites. No inyecta código visible ni modifica el sitio objetivo de ninguna manera.<br><br>Algunos sitios con Content Security Policies (CSP) muy restrictivas pueden limitar los eventos capturables. El BPMN y los Insights se generarán igualmente desde los eventos capturados con éxito.',
    'faq.g6.q':'¿Funciona Sevenda en localhost y herramientas internas?',
    'faq.g6.a':'Sí — Sevenda funciona en <code>localhost</code>, herramientas internas y entornos de staging igual que en sitios públicos. Esto lo hace especialmente útil para documentar flujos de trabajo internos, dashboards de administración y flujos de usuario en preproducción.',
    'faq.s1.q':'¿Cómo instalo Sevenda?',
    'faq.s1.a':'1. Instala la extensión desde la <strong>Chrome Web Store</strong> (busca "Sevenda").<br>2. Haz clic en el icono Sevenda en la barra de herramientas de Chrome — aparece un popup.<br>3. Ve a <strong>Configuración → AI Models</strong> e introduce tu <a href="https://console.anthropic.com" target="_blank">clave API de Anthropic</a>.<br>4. Abre Chrome DevTools (<code>F12</code>) en cualquier página — encontrarás el panel Sevenda en las pestañas.<br>5. Pulsa <strong>Iniciar Grabación</strong> y empieza a navegar.',
    'faq.s2.q':'¿Dónde obtengo una clave API de Anthropic?',
    'faq.s2.a':'1. Crea una cuenta en <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>.<br>2. Ve a <strong>API Keys</strong> y haz clic en <strong>Create Key</strong>.<br>3. Copia la clave (empieza con <code>sk-ant-</code>) — solo la verás una vez.<br>4. Pégala en Sevenda → Configuración → AI Models → campo API Key y guarda.<br><br>Anthropic ofrece un nivel de créditos gratuitos para empezar. La clave se guarda localmente en <code>chrome.storage.sync</code> — nunca abandona tu dispositivo a menos que hagas clic en Generar.',
    'faq.s3.q':'Veo "Idle" en el panel pero nada sucede cuando grabo. ¿Qué está mal?',
    'faq.s3.a':'Algunas cosas a verificar:<br><br>• Asegúrate de estar en una página <strong>http:// o https://</strong> — Sevenda no funciona en páginas internas de Chrome (<code>chrome://</code>) ni en la Nueva Pestaña.<br>• Comprueba que el <strong>panel Sevenda sea la pestaña activa</strong> en DevTools cuando pulses iniciar.<br>• Si el indicador de conexión muestra una advertencia, prueba a <strong>cerrar y reabrir DevTools</strong>.<br>• Verifica que tu clave API esté guardada en Configuración → AI Models.',
    'faq.s4.q':'¿Cómo cambio entre el modo BPMN y el modo Insights?',
    'faq.s4.a':'Haz clic en el <strong>icono Sevenda</strong> en la barra de herramientas de Chrome — el popup muestra un toggle entre <strong>🧩 BPMN</strong> y <strong>📊 Insights</strong>. Tu selección se guarda en <code>chrome.storage.sync</code> y persiste entre sesiones.',
    'faq.s5.q':'¿Pueden varios miembros del equipo usar Sevenda simultáneamente?',
    'faq.s5.a':'Sí. Cada miembro del equipo instala Sevenda en su propio Chrome y configura su propia clave API. Las sesiones se guardan localmente por dispositivo.<br><br>El <strong>plan Team</strong> añade una biblioteca de sesiones compartida y un dashboard de analytics de equipo, permitiendo hasta 20 miembros acceder y reproducir las sesiones de los demás.',
    'faq.b1.q':'¿El BPMN generado es compatible con el estándar BPMN 2.0?',
    'faq.b1.a':'Sí. Sevenda genera <strong>XML BPMN 2.0</strong> compatible con los estándares y con las principales herramientas BPMN: Camunda Modeler, Signavio, Bizagi y bpmn.io.<br><br>Sevenda incluye reparación automática de XML para outputs truncados o malformados, y valida la estructura antes del renderizado con bpmn-js.',
    'faq.b2.q':'¿Qué tan preciso es el BPMN generado? ¿Puedo usarlo directamente con clientes?',
    'faq.b2.a':'La precisión depende de la calidad de la sesión grabada. Una sesión bien estructurada — con navegación clara, interacciones significativas y una breve descripción del contexto — típicamente produce un BPMN entregable con ediciones mínimas.<br><br>Sevenda está diseñado como un <strong>acelerador del punto de partida</strong>, no como sustituto de la revisión experta.',
    'faq.b3.q':'¿En qué formatos puedo exportar el BPMN?',
    'faq.b3.a':'Desde la barra de herramientas del panel BPMN puedes exportar:<br><br>• <strong>.bpmn</strong> — XML BPMN 2.0, listo para Camunda, Signavio o Bizagi<br>• <strong>.svg</strong> — imagen vectorial para presentaciones<br>• <strong>.png</strong> — imagen raster para diapositivas y correos<br>• <strong>.docx</strong> — Análisis Técnico-Funcional completo generado via Claude<br>• <strong>Issue Jira</strong> — con adjuntos XML + SVG y metadatos de sesión<br>• <strong>Camunda .bpmn</strong> — exportación adaptada con namespace Camunda',
    'faq.b4.q':'¿Puedo refinar el BPMN después de generarlo?',
    'faq.b4.a':'Sí — es una de las funcionalidades core de Sevenda. La sección <strong>Retroalimentación Iterativa</strong> en el panel te permite escribir instrucciones en lenguaje natural para modificar el diagrama.<br><br>Sevenda mantiene un historial de conversación de hasta <strong>6 turnos</strong>, para que Claude tenga el contexto completo de las modificaciones anteriores.',
    'faq.b5.q':'¿Qué eventos captura Sevenda para construir el BPMN?',
    'faq.b5.a':'Sevenda captura cinco categorías de eventos:<br><br>• <strong style="color:#7aafd4">NAV</strong> — navegaciones de página, History API, cambios de URL<br>• <strong style="color:#a78bfa">UI</strong> — clics, envíos de formularios, interacciones de teclado<br>• <strong style="color:#6BB89A">NET</strong> — llamadas fetch y XHR, códigos de estado y tiempos<br>• <strong style="color:#dc5858">ERR</strong> — errores JavaScript, promesas rechazadas<br>• <strong style="color:#c8a064">DOM</strong> — eventos MutationObserver: modales, cambios dinámicos',
    'faq.b6.q':'¿Puedo importar un XML BPMN existente en Sevenda?',
    'faq.b6.a':'Sí. En el panel BPMN, haz clic en <strong>Pegar XML</strong> para pegar cualquier XML BPMN 2.0 válido y renderizarlo en el visor. Luego puedes usar la Retroalimentación Iterativa para pedirle a Claude que lo modifique.',
    'faq.i1.q':'¿Qué herramientas de seguimiento detecta automáticamente Sevenda?',
    'faq.i1.a':'Sevenda detecta automáticamente: <strong>Google Tag Manager</strong> (ID GTM, presencia de dataLayer), <strong>Google Analytics 4</strong> (measurement ID, gtag.js), <strong>Cookiebot</strong>, <strong>Hotjar</strong> y otras herramientas comunes presentes en los scripts de la página.<br><br>La detección es pasiva y ocurre automáticamente durante la grabación de la sesión.',
    'faq.i2.q':'¿Qué es la exportación Tag Plan JSON y cómo se usa?',
    'faq.i2.a':'El Tag Plan JSON es un archivo estructurado con todos los eventos GTM sugeridos, triggers, variables y dataLayer pushes identificados durante el análisis. Puede importarse directamente en GTM, compartirse con un desarrollador como especificación de implementación, o incluirse en un entregable cliente junto al informe Analytics .docx.',
    'faq.i3.q':'¿Cómo identifica Sevenda las brechas de seguimiento?',
    'faq.i3.a':'Durante la sesión, Sevenda captura cada interacción de usuario y la compara con los eventos GTM realmente disparados en el dataLayer. Las interacciones que ocurrieron pero no fueron rastreadas se convierten en <strong>brechas de tracking</strong>.<br><br>Cada brecha se reporta con el <strong>selector CSS</strong> y <strong>XPath</strong> específicos del elemento no disparado. Claude genera el snippet <code>dataLayer.push()</code> correspondiente listo para pegar en GTM.',
    'faq.i4.q':'¿Por qué el Informe de Analytics se genera instantáneamente mientras que el BPMN tarda más?',
    'faq.i4.a':'El Analytics Report (.docx) se construye directamente desde los <strong>datos Insights en caché</strong> — no requiere una nueva llamada a la API de Claude. Se renderiza instantáneamente desde el JSON estructurado producido durante el análisis Insights.<br><br>La generación BPMN e Insights (la llamada AI inicial) tarda 15–30 segundos porque Claude Sonnet procesa el flujo completo de eventos.',
    'faq.i5.q':'¿Puedo ejecutar el análisis BPMN e Insights en la misma sesión?',
    'faq.i5.a':'Sí. Desde la vista de reproducción de sesión (pestaña Sesiones), puedes ejecutar tanto la generación BPMN como la de Insights en cualquier sesión guardada, independientemente del modo activo cuando fue grabada.',
    'faq.p1.q':'¿Dónde se almacenan los datos de mi sesión?',
    'faq.p1.a':'Todos los datos de sesión se almacenan <strong>localmente en tu dispositivo</strong> usando la API <code>IndexedDB</code> del navegador. <strong>Sevenda Lab no opera ninguna infraestructura de backend.</strong> No existe ningún servidor que reciba, almacene o procese tus datos de sesión.',
    'faq.p2.q':'¿Captura Sevenda contraseñas o datos de formularios sensibles?',
    'faq.p2.a':'No. Sevenda <strong>no</strong> captura contraseñas, números de tarjeta de crédito, contenido completo de campos de texto, capturas de pantalla ni datos personales más allá de lo que aparece en la URL o en las etiquetas visibles de los elementos.<br><br>Los datos capturados se limitan a URLs de navegación, identificadores de elementos, URLs de solicitudes de red con códigos de estado y cambios estructurales del DOM.',
    'faq.p3.q':'¿Qué datos se envían a la API de Anthropic Claude?',
    'faq.p3.a':'Cuando haces clic en <strong>Generar</strong>, Sevenda envía el flujo de eventos grabado a la API de Anthropic Claude usando <strong>tu propia clave API</strong>.<br><br>El manejo de estos datos por parte de Anthropic se rige por su <a href="https://www.anthropic.com/privacy" target="_blank">Política de Privacidad</a>. Sevenda no ve, registra ni almacena la solicitud o respuesta de la API.',
    'faq.p4.q':'¿Cumple Sevenda con el RGPD?',
    'faq.p4.a':'Sí. Sevenda está diseñado con una arquitectura <strong>local-first, privacy-by-design</strong>: sin infraestructura de backend, consentimiento explícito antes de cualquier generación AI, control total del usuario sobre los datos almacenados y sin recopilación de información de identificación personal (PII).',
    'faq.p5.q':'¿Puedo usar Sevenda para grabar sesiones en sitios web de clientes?',
    'faq.p5.a':'Técnicamente sí. Sin embargo, recomendamos <strong>informar al cliente</strong> de que estás realizando una observación de sesión con fines de documentación de procesos.<br><br>Sevenda no captura contraseñas, datos de pago ni contenido completo de formularios. Dicho esto, verifica siempre las políticas internas de datos del cliente antes de grabar.',
    'faq.pr1.q':'¿Qué incluye el plan gratuito?',
    'faq.pr1.a':'El plan Free incluye <strong>5 sesiones por mes</strong>, generación BPMN 2.0, exportación en formatos .bpmn y .svg, y acceso completo al panel Chrome DevTools.<br><br>Funcionalidades exclusivas de los planes Solo y Team: análisis Insights y GTM, exportación de informes .docx, exportación .png, integración Jira y Camunda.',
    'faq.pr2.q':'¿Cuáles son los costes de la API de Anthropic y cómo estimarlos?',
    'faq.pr2.a':'Sevenda usa un modelo <strong>BYOK (Bring Your Own Key)</strong> — pagas a Anthropic directamente. Estimación: <strong>40 sesiones con generación BPMN o Insights cuestan aproximadamente €15–25 en total</strong> con Claude Sonnet. El Analytics Report no añade costes.',
    'faq.pr3.q':'¿Puedo cancelar mi suscripción en cualquier momento?',
    'faq.pr3.a':'Sí. No hay compromisos a largo plazo. Puedes cancelar tu suscripción Solo o Team en cualquier momento — el acceso continúa hasta el final del período de facturación actual, luego vuelve al plan Free.',
    'faq.pr4.q':'¿Ofrecen una prueba o un programa de asociación para consultoras?',
    'faq.pr4.a':'Sí — ofrecemos un <strong>Programa Beta Partnership</strong> para firmas consultoras y agencias. Los socios cualificados reciben acceso gratuito al plan Team durante 60 días laborables.<br><br>Si estás interesado, escribe a <a href="mailto:hello@sevenda.dev">hello@sevenda.dev</a>.',

    /* ── Pricing bottom FAQ ES ── */
    'pfaq.1.q':'¿Qué sucede si supero los límites de mi plan?',
    'pfaq.1.a':'La extensión te notifica cuando alcanzas el 80% de tu límite. Puedes comprar complementos bajo demanda o actualizar al siguiente plan. No hay bloqueos automáticos sin previo aviso.',
    'pfaq.2.q':'¿Mi clave API de Anthropic es independiente de los límites de Sevenda?',
    'pfaq.2.a':'Sí. Los límites de Sevenda se aplican a las funcionalidades de la plataforma (sesiones, exportaciones, retención). Las llamadas al modelo Claude usan tu clave API personal de Anthropic, con costes de tokens separados.',
    'pfaq.3.q':'¿Puedo cambiar de plan en cualquier momento?',
    'pfaq.3.a':'Sí, las actualizaciones son inmediatas. Las reducciones de plan tienen efecto al final del ciclo de facturación actual. Los datos dentro de los límites del nuevo plan se conservan.',
    'pfaq.4.q':'¿A cuántos usuarios cubre el plan Team?',
    'pfaq.4.a':'El plan Team escala con el número de usuarios en tu workspace. El precio es por usuario/mes; sesiones, llamadas IA y límites de exportación se comparten como pool entre todos los miembros.',
    'pfaq.5.q':'¿Expiran las sesiones guardadas?',
    'pfaq.5.a':'Depende del plan: 7 días (Free), 90 días (Solo), 12 meses (Team), ilimitado (Enterprise). Antes de que expiren puedes exportar todo como XML o SVG.',

    /* ── Docs TOC + secciones ES ── */
    'dtoc.01':'Introducción','dtoc.02':'Instalación','dtoc.03':'El Popup',
    'dtoc.04':'Incorporación guiada','dtoc.05':'Modos de operación','dtoc.06':'El panel DevTools',
    'dtoc.07':'Grabación','dtoc.08':'Flujo de eventos','dtoc.09':'Generación BPMN',
    'dtoc.10':'Panel BPMN','dtoc.11':'Retroalimentación iterativa','dtoc.12':'Generación de Insights',
    'dtoc.13':'Documentación','dtoc.14':'Gestión de sesiones','dtoc.15':'Integración Jira',
    'dtoc.16':'Exportación Camunda','dtoc.17':'Configuración','dtoc.18':'FAQ',
    'ds.01.eye':'01 — Introducción','ds.01.h2':'Qué hace Sevenda',
    'ds.02.eye':'02 — Instalación','ds.02.h2':'Instalando Sevenda','ds.02.p':'Instala desde una carpeta descomprimida en menos de 2 minutos.',
    'ds.03.eye':'03 — El Popup','ds.03.h2':'Punto de control principal','ds.03.p':'Haz clic en el icono ≋ en la barra de Chrome para acceder a todas las funciones sin abrir DevTools.',
    'ds.04.eye':'04 — Incorporación guiada','ds.04.h2':'Tres pasos en el primer lanzamiento','ds.04.p':'En el primer uso, Sevenda guía al usuario a través de un recorrido de 3 pasos.',
    'ds.05.eye':'05 — Modos de operación','ds.05.h2':'BPMN o Insights — dos públicos distintos','ds.05.p':'El modo seleccionado adapta filtros, UI y salidas AI para el perfil de usuario activo.',
    'ds.06.eye':'06 — El panel DevTools','ds.06.h2':'El corazón de Sevenda','ds.06.p':'El panel vive dentro de Chrome DevTools. Ábrelo con F12 → pestaña Sevenda.',
    'ds.07.eye':'07 — Grabación','ds.07.h2':'Capturar una sesión','ds.07.p':'Sevenda captura automáticamente todos los eventos sin ningún cambio en la aplicación objetivo.',
    'ds.08.eye':'08 — Flujo de eventos','ds.08.h2':'El registro de eventos en tiempo real','ds.08.p':'Filtra, busca e inspecciona cada evento con un clic para ver los detalles completos.',
    'ds.09.eye':'09 — Generación BPMN','ds.09.h2':'Del registro al diagrama','ds.09.p':'Claude Sonnet transforma la secuencia de eventos en un diagrama conforme al estándar BPMN 2.0.',
    'ds.10.eye':'10 — Panel BPMN','ds.10.h2':'Vistas y herramientas disponibles','ds.10.p':'El panel BPMN ofrece tres pestañas con herramientas contextuales para cada vista.',
    'ds.11.eye':'11 — Retroalimentación iterativa','ds.11.h2':'Refina el BPMN en lenguaje natural','ds.11.p':'Modifica el diagrama sin regenerarlo desde cero.',
    'ds.12.eye':'12 — Generación de Insights','ds.12.h2':'Análisis GTM/GA4 automático','ds.12.p':'Identifica brechas de tracking, eventos faltantes y produce un plan de etiquetas listo para implementar.',
    'ds.13.eye':'13 — Documentación','ds.13.h2':'Dos documentos, dos públicos','ds.13.p':'Genera documentos Word empresariales profesionales con un clic.',
    'ds.14.eye':'14 — Gestión de sesiones','ds.14.h2':'Archivo y reproducción','ds.14.p':'Todas las sesiones se guardan en IndexedDB y están disponibles para reproducción y análisis posteriores.',
    'ds.15.eye':'15–16 — Integraciones','ds.15.h2':'Jira y Camunda','ds.15.p':'Lleva el BPMN directamente a tu flujo de trabajo existente.',
    'ds.17.eye':'17 — Configuración','ds.17.h2':'Página de configuración','ds.17.p':'Accesible desde popup → Configuración y AI Models o desde el modal ⚙ en el panel.',
    'ds.18.eye':'18 — FAQ','ds.18.h2':'Preguntas frecuentes',
  },

  /* ────────────────────────────────────────────────────────────
   * FRANCESE
   * ──────────────────────────────────────────────────────────── */
  fr: {
    'nav.features':'Fonctionnalités','nav.insights':'Insights','nav.usecases':'Cas d\'usage',
    'nav.how':'Comment ça marche','nav.pricing':'Tarifs','nav.docs':'Docs','nav.faq':'FAQ','nav.privacy':'Politique de Confidentialité',
    'nav.cta':'Ajouter à Chrome',

    'hero.pill':'Maintenant avec Claude Sonnet 4 →',
    'hero.h1':'Chaque clic raconte une histoire.<br><span class="dim">Sevenda la lit.</span>',
    'hero.sub':'Sevenda enregistre votre session de navigation et génère instantanément des diagrammes de processus BPMN 2.0 et des insights actionnables — aidant les développeurs, analystes métier et équipes marketing à comprendre ce qui se passe vraiment dans leurs processus digitaux.',
    'hero.cta1':'Ajouter à Chrome — c\'est gratuit',

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
    'pricing.eyebrow':'Tarifs','pricing.monthly':'Mensuel','pricing.annual':'Annuel','pricing.save25':'Économisez 25%',
    'pricing.process':'Processus','pricing.analytics':'Analytics','pricing.suite':'Suite','pricing.howMany':'Combien d\'utilisateurs?',
    'billing.monthly':'Mensuel','billing.annual':'Annuel','billing.save':'Économisez 25%',
    /* ── TVA ── */
    'iva.country':'Pays:','iva.included':'✓ TVA incluse','iva.totalInclVat':'Total (TVA incl.):',
    'iva.invoiceNote':'Une facture avec le détail HT / TVA / total sera envoyée par e-mail après le paiement.',
    'iva.disclaimer':'Tous les prix incluent la TVA, appliquée selon la réglementation fiscale en vigueur dans votre pays. Pour les clients de l\'UE, le taux de TVA du pays de résidence s\'applique (régime MOSS). Les administrations publiques et les clients B2B de l\'UE éligibles à l\'autoliquidation peuvent demander une facturation personnalisée à hello@sevenda.dev.',
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

    /* ── FAQ Q&A FR ── */
    'faq.g1.q':'Qu\'est-ce que Sevenda et que fait-il ?',
    'faq.g1.a':'Sevenda est une Chrome Extension (MV3) qui enregistre vos sessions de navigation et génère automatiquement des <strong>diagrammes de processus BPMN 2.0</strong> et des <strong>insights analytics GTM/GA4</strong> — propulsé par Claude Sonnet AI.<br><br>Il fonctionne en deux modes : <strong>🧩 BPMN mode</strong> cartographie les flux utilisateurs et processus depuis les interactions réelles du navigateur ; <strong>📊 Insights mode</strong> analyse votre configuration de tracking, identifie les événements GTM manquants et génère un Tag Plan prêt à l\'emploi. Aucune modification de code, aucun SDK, aucune configuration sur le site cible.',
    'faq.g2.q':'À qui s\'adresse Sevenda ?',
    'faq.g2.a':'Sevenda est conçu pour trois publics principaux :<br><br><strong>Développeurs et Analystes Métier</strong> — documentent les processus AS-IS, flux utilisateurs et interactions API directement depuis le navigateur, sans diagrammation manuelle.<br><br><strong>Équipes Marketing et Data</strong> — auditent la couverture de tracking GTM/GA4, identifient les lacunes dans l\'entonnoir et génèrent des Tag Plans sans inspection manuelle.<br><br><strong>Consultants et Chefs de projet</strong> — produisent des diagrammes BPMN et rapports .docx pour les clients en quelques minutes, et les envoient directement vers Jira.',
    'faq.g3.q':'Quels navigateurs Sevenda prend-il en charge ?',
    'faq.g3.a':'Sevenda est une <strong>Chrome Extension Manifest V3</strong> et fonctionne sur <strong>Google Chrome</strong> et tout navigateur basé sur Chromium (Brave, Edge, Arc). Il nécessite l\'accès à Chrome DevTools, donc fonctionne uniquement sur desktop — pas sur les navigateurs mobiles.',
    'faq.g4.q':'Combien de temps faut-il pour générer le premier diagramme ?',
    'faq.g4.a':'De l\'installation à votre premier diagramme BPMN : <strong>moins de 60 secondes</strong>.<br><br>La génération elle-même (Claude Sonnet traitant le flux d\'événements) prend typiquement <strong>15–30 secondes</strong> selon la longueur de la session. Le rapport Analytics en mode Insights est <strong>instantané</strong> — généré depuis des données en cache sans appel API supplémentaire.',
    'faq.g5.q':'Puis-je utiliser Sevenda sur n\'importe quel site web ?',
    'faq.g5.a':'Oui. Sevenda utilise des permissions host <code>&lt;all_urls&gt;</code> car le site cible n\'est pas connu à l\'avance — vous pouvez enregistrer n\'importe quel site visité. Il n\'injecte aucun code visible et ne modifie pas le site cible.<br><br>Certains sites avec des Content Security Policies très restrictives peuvent limiter les événements capturables. Le BPMN et les Insights seront quand même générés depuis les événements capturés avec succès.',
    'faq.g6.q':'Sevenda fonctionne-t-il sur localhost et les outils internes ?',
    'faq.g6.a':'Oui — Sevenda fonctionne sur <code>localhost</code>, les outils internes et les environnements de staging tout comme sur les sites publics. Cela le rend particulièrement utile pour documenter les workflows internes, tableaux de bord d\'administration et flux utilisateurs en préproduction.',
    'faq.s1.q':'Comment installer Sevenda ?',
    'faq.s1.a':'1. Installez l\'extension depuis le <strong>Chrome Web Store</strong> (recherchez "Sevenda").<br>2. Cliquez sur l\'icône Sevenda dans la barre d\'outils Chrome — un popup apparaît.<br>3. Allez dans <strong>Paramètres → AI Models</strong> et entrez votre <a href="https://console.anthropic.com" target="_blank">clé API Anthropic</a>.<br>4. Ouvrez Chrome DevTools (<code>F12</code>) sur n\'importe quelle page — vous trouverez le panneau Sevenda dans les onglets.<br>5. Appuyez sur <strong>Démarrer l\'enregistrement</strong> et commencez à naviguer.',
    'faq.s2.q':'Où obtenir une clé API Anthropic ?',
    'faq.s2.a':'1. Créez un compte sur <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>.<br>2. Allez dans <strong>API Keys</strong> et cliquez sur <strong>Create Key</strong>.<br>3. Copiez la clé (commence par <code>sk-ant-</code>) — vous ne la verrez qu\'une fois.<br>4. Collez-la dans Sevenda → Paramètres → AI Models → champ API Key et sauvegardez.<br><br>Anthropic offre un niveau de crédits gratuits pour démarrer.',
    'faq.s3.q':'Je vois "Idle" dans le panneau mais rien ne se passe quand j\'enregistre. Que se passe-t-il ?',
    'faq.s3.a':'Quelques points à vérifier :<br><br>• Assurez-vous d\'être sur une page <strong>http:// ou https://</strong> — Sevenda ne fonctionne pas sur les pages internes de Chrome (<code>chrome://</code>) ni sur la Nouvelle Onglet.<br>• Vérifiez que le <strong>panneau Sevenda est l\'onglet actif</strong> dans DevTools quand vous appuyez sur démarrer.<br>• Essayez de <strong>fermer et rouvrir DevTools</strong> en cas de problème de connexion.<br>• Vérifiez que votre clé API est sauvegardée dans Paramètres → AI Models.',
    'faq.s4.q':'Comment passer du mode BPMN au mode Insights ?',
    'faq.s4.a':'Cliquez sur l\'<strong>icône Sevenda</strong> dans la barre d\'outils Chrome — le popup affiche un toggle entre <strong>🧩 BPMN</strong> et <strong>📊 Insights</strong>. Votre sélection est sauvegardée dans <code>chrome.storage.sync</code> et persiste entre les sessions.',
    'faq.s5.q':'Plusieurs membres de l\'équipe peuvent-ils utiliser Sevenda simultanément ?',
    'faq.s5.a':'Oui. Chaque membre de l\'équipe installe Sevenda sur son propre Chrome et configure sa propre clé API. Les sessions sont stockées localement par appareil.<br><br>Le <strong>plan Team</strong> ajoute une bibliothèque de sessions partagée et un tableau de bord analytics d\'équipe, permettant à jusqu\'à 20 membres d\'accéder et relire les sessions des autres.',
    'faq.b1.q':'Le BPMN généré est-il conforme au standard BPMN 2.0 ?',
    'faq.b1.a':'Oui. Sevenda génère du <strong>XML BPMN 2.0</strong> conforme aux standards et compatible avec les principaux outils BPMN : Camunda Modeler, Signavio, Bizagi et bpmn.io.<br><br>Sevenda inclut la réparation automatique du XML pour les sorties tronquées ou malformées, et valide la structure avant le rendu avec bpmn-js.',
    'faq.b2.q':'Quelle est la précision du BPMN généré ? Puis-je l\'utiliser directement avec des clients ?',
    'faq.b2.a':'La précision dépend de la qualité de la session enregistrée. Une session bien structurée — avec une navigation claire, des interactions significatives et une brève description du contexte — produit typiquement un BPMN livrable avec des modifications minimales.<br><br>Sevenda est conçu comme un <strong>accélérateur du point de départ</strong>, pas comme un substitut à la révision experte.',
    'faq.b3.q':'Dans quels formats puis-je exporter le BPMN ?',
    'faq.b3.a':'Depuis la barre d\'outils du panneau BPMN vous pouvez exporter :<br><br>• <strong>.bpmn</strong> — XML BPMN 2.0, prêt pour Camunda, Signavio ou Bizagi<br>• <strong>.svg</strong> — image vectorielle pour présentations<br>• <strong>.png</strong> — image raster pour diapositives et e-mails<br>• <strong>.docx</strong> — Analyse Technico-Fonctionnelle complète générée via Claude<br>• <strong>Issue Jira</strong> — avec pièces jointes XML + SVG et métadonnées de session<br>• <strong>Camunda .bpmn</strong> — export adapté avec namespace Camunda',
    'faq.b4.q':'Puis-je affiner le BPMN après sa génération ?',
    'faq.b4.a':'Oui — c\'est l\'une des fonctionnalités core de Sevenda. La section <strong>Retour itératif</strong> dans le panneau vous permet de saisir des instructions en langage naturel pour modifier le diagramme.<br><br>Sevenda maintient un historique de conversation jusqu\'à <strong>6 tours</strong>, pour que Claude ait le contexte complet des modifications précédentes.',
    'faq.b5.q':'Quels événements Sevenda capture-t-il pour construire le BPMN ?',
    'faq.b5.a':'Sevenda capture cinq catégories d\'événements :<br><br>• <strong style="color:#7aafd4">NAV</strong> — navigations de page, History API, changements d\'URL<br>• <strong style="color:#a78bfa">UI</strong> — clics, soumissions de formulaires, interactions clavier<br>• <strong style="color:#6BB89A">NET</strong> — appels fetch et XHR, codes de statut et durées<br>• <strong style="color:#dc5858">ERR</strong> — erreurs JavaScript, promesses rejetées<br>• <strong style="color:#c8a064">DOM</strong> — événements MutationObserver : modales, changements dynamiques',
    'faq.b6.q':'Puis-je importer un XML BPMN existant dans Sevenda ?',
    'faq.b6.a':'Oui. Dans le panneau BPMN, cliquez sur <strong>Coller XML</strong> pour coller tout XML BPMN 2.0 valide et le rendre dans le visualiseur. Vous pouvez ensuite utiliser le Retour itératif pour demander à Claude de le modifier.',
    'faq.i1.q':'Quels outils de tracking Sevenda détecte-t-il automatiquement ?',
    'faq.i1.a':'Sevenda détecte automatiquement : <strong>Google Tag Manager</strong> (ID GTM, présence dataLayer), <strong>Google Analytics 4</strong> (measurement ID, gtag.js), <strong>Cookiebot</strong>, <strong>Hotjar</strong> et d\'autres outils analytics courants présents dans les scripts de la page.<br><br>La détection est passive et se produit automatiquement pendant l\'enregistrement de la session.',
    'faq.i2.q':'Qu\'est-ce que l\'export Tag Plan JSON et comment l\'utiliser ?',
    'faq.i2.a':'Le Tag Plan JSON est un fichier structuré contenant tous les événements GTM suggérés, triggers, variables et dataLayer pushes identifiés pendant l\'analyse. Il peut être importé directement dans GTM, partagé avec un développeur comme spécification d\'implémentation, ou inclus dans un livrable client avec le rapport Analytics .docx.',
    'faq.i3.q':'Comment Sevenda identifie-t-il les lacunes de tracking ?',
    'faq.i3.a':'Pendant la session, Sevenda capture chaque interaction utilisateur et la compare aux événements GTM réellement déclenchés dans le dataLayer. Les interactions qui ont eu lieu mais n\'ont pas été suivies deviennent des <strong>lacunes de tracking</strong>.<br><br>Chaque lacune est signalée avec le <strong>sélecteur CSS</strong> et le <strong>XPath</strong> spécifiques de l\'élément non déclenché. Claude génère ensuite le snippet <code>dataLayer.push()</code> correspondant prêt à coller dans GTM.',
    'faq.i4.q':'Pourquoi le rapport Analytics est-il généré instantanément alors que le BPMN prend plus de temps ?',
    'faq.i4.a':'Le rapport Analytics (.docx) est construit directement depuis les <strong>données Insights en cache</strong> — il ne nécessite pas de nouvel appel API à Claude. Il se rend instantanément depuis le JSON structuré produit pendant l\'analyse Insights.<br><br>La génération BPMN et Insights (l\'appel AI initial) prend 15–30 secondes car Claude Sonnet traite l\'intégralité du flux d\'événements.',
    'faq.i5.q':'Puis-je exécuter les analyses BPMN et Insights sur la même session ?',
    'faq.i5.a':'Oui. Depuis la vue de relecture de session (onglet Sessions), vous pouvez exécuter la génération BPMN et Insights sur n\'importe quelle session sauvegardée, indépendamment du mode actif lors de son enregistrement.',
    'faq.p1.q':'Où sont stockées les données de ma session ?',
    'faq.p1.a':'Toutes les données de session sont stockées <strong>localement sur votre appareil</strong> via l\'API <code>IndexedDB</code> du navigateur. <strong>Sevenda Lab n\'opère aucune infrastructure de backend.</strong> Il n\'existe aucun serveur qui reçoit, stocke ou traite vos données de session.',
    'faq.p2.q':'Sevenda capture-t-il les mots de passe ou les données de formulaires sensibles ?',
    'faq.p2.a':'Non. Sevenda ne capture <strong>pas</strong> les mots de passe, numéros de carte de crédit, contenu complet des champs de saisie, captures d\'écran ni données personnelles au-delà de ce qui apparaît dans l\'URL ou dans les libellés visibles des éléments.<br><br>Les données capturées se limitent aux URLs de navigation, identifiants d\'éléments, URLs des requêtes réseau avec codes de statut et changements structurels du DOM.',
    'faq.p3.q':'Quelles données sont envoyées à l\'API Anthropic Claude ?',
    'faq.p3.a':'Lorsque vous cliquez sur <strong>Générer</strong>, Sevenda envoie le flux d\'événements enregistré à l\'API Anthropic Claude en utilisant <strong>votre propre clé API</strong>.<br><br>Le traitement de ces données par Anthropic est régi par leur <a href="https://www.anthropic.com/privacy" target="_blank">Politique de Confidentialité</a>. Sevenda ne voit, ne consigne ni ne stocke la requête ou la réponse API.',
    'faq.p4.q':'Sevenda est-il conforme au RGPD ?',
    'faq.p4.a':'Oui. Sevenda est conçu avec une architecture <strong>local-first, privacy-by-design</strong> : sans infrastructure de backend, consentement explicite avant toute génération AI, contrôle total de l\'utilisateur sur les données stockées et aucune collecte d\'informations personnellement identifiables (PII).',
    'faq.p5.q':'Puis-je utiliser Sevenda pour enregistrer des sessions sur les sites clients ?',
    'faq.p5.a':'Techniquement oui. Cependant, nous recommandons d\'<strong>informer votre client</strong> que vous effectuez une observation de session à des fins de documentation de processus.<br><br>Sevenda ne capture pas les mots de passe, données de paiement ni contenu complet des formulaires. Vérifiez toujours les politiques internes de données du client avant d\'enregistrer.',
    'faq.pr1.q':'Qu\'est-ce qui est inclus dans le plan gratuit ?',
    'faq.pr1.a':'Le plan Free inclut <strong>5 sessions par mois</strong>, la génération BPMN 2.0, l\'export aux formats .bpmn et .svg, et un accès complet au panneau Chrome DevTools.<br><br>Fonctionnalités exclusives aux plans Solo et Team : analyse Insights et GTM, export de rapports .docx, export .png, intégration Jira et Camunda.',
    'faq.pr2.q':'Quels sont les coûts de l\'API Anthropic et comment les estimer ?',
    'faq.pr2.a':'Sevenda utilise un modèle <strong>BYOK (Bring Your Own Key)</strong> — vous payez Anthropic directement. Estimation : <strong>40 sessions avec génération BPMN ou Insights coûtent environ €15–25 au total</strong> avec Claude Sonnet. Le rapport Analytics ne génère pas de coûts supplémentaires.',
    'faq.pr3.q':'Puis-je annuler mon abonnement à tout moment ?',
    'faq.pr3.a':'Oui. Il n\'y a pas d\'engagement à long terme. Vous pouvez annuler votre abonnement Solo ou Team à tout moment — votre accès continue jusqu\'à la fin de la période de facturation en cours, puis revient au plan Free.',
    'faq.pr4.q':'Proposez-vous un essai ou un programme de partenariat pour les cabinets de conseil ?',
    'faq.pr4.a':'Oui — nous proposons un <strong>Programme Beta Partnership</strong> pour les cabinets de conseil et agences. Les partenaires qualifiés reçoivent un accès gratuit au plan Team pendant 60 jours ouvrables.<br><br>Si vous êtes intéressé, écrivez à <a href="mailto:hello@sevenda.dev">hello@sevenda.dev</a>.',

    /* ── Pricing bottom FAQ FR ── */
    'pfaq.1.q':'Que se passe-t-il si je dépasse les limites de mon plan ?',
    'pfaq.1.a':'L\'extension vous notifie lorsque vous atteignez 80% de votre limite. Vous pouvez acheter des modules complémentaires à la demande ou passer au plan supérieur. Il n\'y a pas de blocages automatiques sans préavis.',
    'pfaq.2.q':'Ma clé API Anthropic est-elle séparée des limites Sevenda ?',
    'pfaq.2.a':'Oui. Les limites Sevenda s\'appliquent aux fonctionnalités de la plateforme (sessions, exports, rétention). Les appels au modèle Claude utilisent votre clé API personnelle Anthropic, avec des coûts de tokens séparés.',
    'pfaq.3.q':'Puis-je changer de plan à tout moment ?',
    'pfaq.3.a':'Oui, les mises à niveau sont immédiates. Les rétrogradations prennent effet à la fin du cycle de facturation en cours. Les données dans les limites du nouveau plan sont conservées.',
    'pfaq.4.q':'Combien d\'utilisateurs le plan Team couvre-t-il ?',
    'pfaq.4.a':'Le plan Team évolue avec le nombre d\'utilisateurs dans votre espace de travail. Le tarif est par utilisateur/mois ; les sessions, appels IA et limites d\'export sont partagés en pool entre tous les membres.',
    'pfaq.5.q':'Les sessions sauvegardées expirent-elles ?',
    'pfaq.5.a':'Cela dépend de votre plan : 7 jours (Free), 90 jours (Solo), 12 mois (Team), illimité (Enterprise). Avant expiration, vous pouvez tout exporter en XML ou SVG.',

    /* ── Docs TOC + sections FR ── */
    'dtoc.01':'Introduction','dtoc.02':'Installation','dtoc.03':'Le Popup',
    'dtoc.04':'Intégration guidée','dtoc.05':'Modes de fonctionnement','dtoc.06':'Le panneau DevTools',
    'dtoc.07':'Enregistrement','dtoc.08':'Flux d\'événements','dtoc.09':'Génération BPMN',
    'dtoc.10':'Panneau BPMN','dtoc.11':'Retour itératif','dtoc.12':'Génération d\'Insights',
    'dtoc.13':'Documentation','dtoc.14':'Gestion des sessions','dtoc.15':'Intégration Jira',
    'dtoc.16':'Export Camunda','dtoc.17':'Paramètres','dtoc.18':'FAQ',
    'ds.01.eye':'01 — Introduction','ds.01.h2':'Ce que fait Sevenda',
    'ds.02.eye':'02 — Installation','ds.02.h2':'Installer Sevenda','ds.02.p':'Installez depuis un dossier décompressé en moins de 2 minutes.',
    'ds.03.eye':'03 — Le Popup','ds.03.h2':'Point de contrôle principal','ds.03.p':'Cliquez sur l\'icône ≋ dans la barre Chrome pour accéder à toutes les fonctionnalités sans ouvrir DevTools.',
    'ds.04.eye':'04 — Intégration guidée','ds.04.h2':'Trois étapes au premier lancement','ds.04.p':'Au premier démarrage, Sevenda guide l\'utilisateur à travers un parcours en 3 étapes.',
    'ds.05.eye':'05 — Modes de fonctionnement','ds.05.h2':'BPMN ou Insights — deux publics distincts','ds.05.p':'Le mode sélectionné adapte les filtres, l\'interface et les sorties AI pour le profil d\'utilisateur actif.',
    'ds.06.eye':'06 — Le panneau DevTools','ds.06.h2':'Le cœur de Sevenda','ds.06.p':'Le panneau vit dans Chrome DevTools. Ouvrez-le avec F12 → onglet Sevenda.',
    'ds.07.eye':'07 — Enregistrement','ds.07.h2':'Capturer une session','ds.07.p':'Sevenda capture automatiquement tous les événements sans aucune modification de l\'application cible.',
    'ds.08.eye':'08 — Flux d\'événements','ds.08.h2':'Le journal d\'événements en temps réel','ds.08.p':'Filtrez, recherchez et inspectez chaque événement d\'un clic pour voir les détails complets.',
    'ds.09.eye':'09 — Génération BPMN','ds.09.h2':'Du journal au diagramme','ds.09.p':'Claude Sonnet transforme la séquence d\'événements en un diagramme conforme au standard BPMN 2.0.',
    'ds.10.eye':'10 — Panneau BPMN','ds.10.h2':'Vues et outils disponibles','ds.10.p':'Le panneau BPMN offre trois onglets avec des outils contextuels pour chaque vue.',
    'ds.11.eye':'11 — Retour itératif','ds.11.h2':'Affiner le BPMN en langage naturel','ds.11.p':'Modifiez le diagramme sans le régénérer depuis zéro.',
    'ds.12.eye':'12 — Génération d\'Insights','ds.12.h2':'Analyse GTM/GA4 automatique','ds.12.p':'Identifie les lacunes de tracking, les événements manquants et produit un plan de tags prêt à implémenter.',
    'ds.13.eye':'13 — Documentation','ds.13.h2':'Deux documents, deux publics','ds.13.p':'Générez des documents Word professionnels en un clic.',
    'ds.14.eye':'14 — Gestion des sessions','ds.14.h2':'Archive et relecture','ds.14.p':'Toutes les sessions sont sauvegardées dans IndexedDB et disponibles pour relecture et analyse ultérieure.',
    'ds.15.eye':'15–16 — Intégrations','ds.15.h2':'Jira et Camunda','ds.15.p':'Intégrez le BPMN directement dans votre flux de travail existant.',
    'ds.17.eye':'17 — Paramètres','ds.17.h2':'Page des paramètres','ds.17.p':'Accessible depuis popup → Paramètres et AI Models ou depuis le modal ⚙ dans le panneau.',
    'ds.18.eye':'18 — FAQ','ds.18.h2':'Questions fréquentes',
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
