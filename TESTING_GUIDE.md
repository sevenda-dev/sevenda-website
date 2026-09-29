# Sevenda Pricing & Checkout Testing Guide

Guida per testare il flusso di pricing e checkout nel browser.

## 🚀 Quick Start

1. **Apri il sito locale** in un browser:
   - Index.html: http://localhost:8000 (o il tuo local server)
   - Pricing.html: http://localhost:8000/pricing.html

2. **Testa il flusso di checkout**:
   - Naviga a `/pricing.html`
   - Seleziona un track (Process, Analytics, Suite)
   - Seleziona un range di utenze (1, 2–5, 6–20, 20+)
   - Togglate billing (Annual/Monthly)
   - Usa il contatore (+/−) per aumentare/diminuire quantità utenti
   - Guarda il prezzo aggiornarsi in tempo reale
   - Clicca il pulsante CTA (es. "Start 14-day free trial")
   - La modale di checkout dovrebbe aprirsi

## ✅ Test Cases

### Test 1: Selezione Piano e Carrello
- [ ] Naviga a pricing.html
- [ ] Seleziona "Process" track
- [ ] Clicca "Start 14-day free trial" (Analyst plan)
- [ ] Verifica che la modale di checkout si apra
- [ ] Verifica che il piano sia visualizzato correttamente

### Test 2: Contatore Utenze
- [ ] Seleziona "2–5" utenti
- [ ] Usa il contatore (+) per aumentare la quantità
- [ ] Verifica che il prezzo si aggiorna (price × qty)
- [ ] Usa il contatore (−) per diminuire
- [ ] Verifica che il prezzo si aggiorna correttamente

### Test 3: Sincronizzazione Billing
- [ ] Seleziona "Annual" billing
- [ ] Aggiungi un piano al carrello
- [ ] Cambia a "Monthly" billing
- [ ] Clicca CTA per aprire checkout
- [ ] Verifica che il billing sia "Monthly" nella modale

### Test 4: Persistenza Carrello
- [ ] Aggiungi un piano al carrello
- [ ] Verifica che il carrello sia salvato in localStorage:
   ```javascript
   // In console (F12):
   localStorage.getItem('sevenda-cart')
   ```
- [ ] Ricarica la pagina (Ctrl+R o Cmd+R)
- [ ] Verifica che il carrello sia ancora disponibile
- [ ] Apri la modale di checkout
- [ ] Verifica che i piani siano ancora presenti

### Test 5: Validazione Carrello
- [ ] Prova ad aprire il checkout senza selezionare un piano
- [ ] Dovrebbe visualizzare un alert: "Please select a plan"
- [ ] Chiudi il checkout
- [ ] Aggiungi un piano al carrello
- [ ] Verifica che il checkout si apra correttamente

### Test 6: Rimozione dal Carrello
- [ ] Aggiungi 2 piani diversi al carrello
- [ ] Apri la modale di checkout
- [ ] Clicca "Remove" su uno dei piani
- [ ] Verifica che il piano sia rimosso e il totale si aggiorni
- [ ] Clicca "Remove" sull'ultimo piano
- [ ] Verifica che la modale si chiuda

### Test 7: Selettore Lingua
- [ ] Clicca "IT" nel selettore della lingua
- [ ] Verifica che i testi si aggiornino in italiano
- [ ] Clicca "EN" per tornare all'inglese
- [ ] Verifica la sincronizzazione tra pagine (naviga a index.html e ritorna)

### Test 8: Contatore Funzionamento
- [ ] Seleziona "2–5" utenti
- [ ] Clicca il pulsante + del contatore per 3 volte
- [ ] Verifica che la quantità arrivi a 5 (non più)
- [ ] Clicca il pulsante − del contatore per 4 volte
- [ ] Verifica che la quantità arrivi a 2 (non meno)
- [ ] Verifica che il prezzo si aggiorni ad ogni click

## 🔗 Stripe Payment Links

### Configurare i veri Stripe Links

1. **Accedi a Stripe Dashboard**:
   - https://dashboard.stripe.com/

2. **Crea o seleziona i Prodotti**:
   - Products → Create Product per ogni piano
   - Nome: "Sevenda - Analyst (Annual)", etc.

3. **Genera Payment Links**:
   - Per ogni prodotto:
     - Seleziona il prodotto
     - Clicca "Create payment link"
     - Configura: prezzo, valuta (EUR), ciclo di fatturazione
     - Genera il link

4. **Aggiorna stripe.config.js**:
   ```javascript
   analyst: {
     annual: 'https://buy.stripe.com/test/YOUR_REAL_LINK_HERE',
     monthly: 'https://buy.stripe.com/test/YOUR_REAL_LINK_HERE',
   },
   ```

5. **Test con Stripe Test Cards**:
   - Numero: 4242 4242 4242 4242
   - Scadenza: 12/25 (future date)
   - CVC: 123
   - Clicca il pulsante "Proceed to Stripe"
   - Dovrebbe reindirizzare a Stripe Checkout

### Link di Test Attuali
I link in stripe.config.js sono placeholder per il testing. Sostituiscili con i veri link Stripe quando pronto per production.

## 🛠️ Browser Console Debugging

### Verifica il carrello
```javascript
// In console (F12):
console.log(S.cart);  // Mostra il carrello corrente
```

### Verifica localStorage
```javascript
// In console:
localStorage.getItem('sevenda-cart');  // JSON del carrello salvato
localStorage.clear();  // Pulisci localStorage (cauto!)
```

### Verifica la configurazione Stripe
```javascript
// In console:
getStripeLink('analyst', 'annual');  // Ritorna il link per Analyst annual
isStripeLinksConfigured('analyst', 'annual');  // Verifica se il link è configurato
```

### Verifica Stato Applicazione
```javascript
// In console:
S;  // Mostra tutto lo stato (track, seats, billing, bulkQty, cart)
```

## 🎟️ Newsletter e codice sconto 30%

Flusso: modale su `index.html` → Edge Function `newsletter-subscribe` (riga in
`newsletter_subscriber` + Promotion Code Stripe monouso, email via Resend) →
campo "Codice sconto" in `checkout.html` (anteprima via `validate-promo-code`)
→ `create-subscription` v14 applica lo sconto alla subscription.

### Setup una tantum (per ambiente: staging e prod)
1. Esegui `db/migrations/2026-09-29-newsletter-subscriber.sql` (tre sezioni separate)
2. Stripe → Product catalog → Coupons → crea un coupon **30% off** e scegli la
   durata (`once` = solo primo pagamento, `repeating` N mesi, `forever`)
3. Secrets: `supabase secrets set STRIPE_NEWSLETTER_COUPON_ID=<id coupon>`
   (facoltativi: `NEWSLETTER_CODE_DAYS=30`, `NEWSLETTER_FROM`, `RESEND_API_KEY` già presente)
4. Deploy: `supabase functions deploy newsletter-subscribe --no-verify-jwt`,
   `supabase functions deploy validate-promo-code --no-verify-jwt`,
   `supabase functions deploy create-subscription --no-verify-jwt`

### Test 1: Modale sulla landing
- [ ] Apri `/` in una finestra in incognito: dopo ~6 s (o al 30% di scroll) compare la modale
- [ ] `/?nl=1` la forza subito, `/?nl=0` la disattiva; il link "Newsletter −30%" in footer la riapre
- [ ] Sul lato sinistro c'è il logo (stesso `/logo.svg` della sezione in fondo alla pagina)
- [ ] Invia il form vuoto → errore "Compila nome, cognome ed email"
- [ ] Telefono vuoto → accettato; telefono "abc" → errore; "333 1234567" → accettato
- [ ] Iscrizione valida → schermata con codice `SEVENDA-XXXXXX`, bottone "Copia", data di scadenza
- [ ] Verifica in localStorage: `sevenda-nl-state` (status `subscribed`) e `sevenda-promo` (code, expiresAt)
- [ ] Ricarica: la modale NON ricompare; chiudi senza iscriverti → non ricompare per 7 giorni
- [ ] Stessa email una seconda volta → stesso codice ("Bentornato!"), nessun secondo Promotion Code su Stripe
- [ ] Cambia lingua (EN/IT/ES/FR) con la modale aperta → tutti i testi si aggiornano

### Test 2: Codice al checkout
- [ ] Apri `/checkout.html?plan=analyst`: il campo "Codice sconto" è precompilato dal localStorage e verificato
- [ ] Riepilogo: riga "Sconto (CODICE) −€X", IVA calcolata sul netto scontato, totale scontato
- [ ] Nota sotto il riepilogo coerente con la durata del coupon (primo pagamento / N mesi / ogni rinnovo)
- [ ] "Rimuovi" → riepilogo a prezzo pieno; codice inventato → "non valido o scaduto"
- [ ] `?promo=CODICE` nell'URL precompila e verifica il campo; il codice sopravvive al giro di login
- [ ] Completa il checkout con carta test → su Stripe la subscription ha il discount e `metadata.promoCode`
- [ ] Riusa lo stesso codice con un altro account → "già stato utilizzato" (monouso)

## 📋 Checklist Finale

Prima di andare in production:

- [ ] Stripe payment links sono configurati (real links, non test)
- [ ] Tutti i prezzi in pricing.html corrispondono ai dati di pricing.html DATA
- [ ] Contatore +/− funziona correttamente
- [ ] Carrello persiste dopo refresh di pagina
- [ ] Validazione carrello mostra alert se vuoto
- [ ] Pulsante "Remove" nel checkout funziona
- [ ] Selettore lingua funziona correttamente
- [ ] Toggle monthly/annual aggiorna i prezzi
- [ ] Link su index.html vanno a pricing.html
- [ ] Rindirizzamento a Stripe funziona

## 🐛 Troubleshooting

### Il carrello non si salva dopo refresh
**Soluzione**: Verifica che localStorage sia abilitato nel browser (non in modalità private)

### Il contatore non funziona
**Soluzione**: Controlla la console per errori JavaScript. Verifica che il range di utenze sia corretto (min/max).

### Stripe link non funziona
**Soluzione**: 
1. Verifica che il link sia copiato correttamente
2. Controlla che il link sia vero (non test/)
3. Usa il test link di Stripe: 4242 4242 4242 4242

### Le traduzioni non appaiono
**Soluzione**: Verifica che i18n.js sia caricato. Controlla la console per errori di traduzione.

## 📞 Support

Per domande o problemi:
- Controlla la console del browser (F12)
- Verifica il localStorage (F12 → Application → Local Storage)
- Apri un issue su GitHub
