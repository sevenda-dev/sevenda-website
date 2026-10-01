# Sevenda promo — voice-over script (45 s)

Lingua: inglese (lingua ufficiale di comunicazione). Circa 105 parole, ritmo
naturale da spot (≈ 140 parole/minuto) con pause sui cambi di scena. Ogni
battuta è sincronizzata con la scena e con la caption on-screen; i tempi sono
quelli della timeline unica di `promo.html` (identici nella versione 9:16).

| Tempo | Scena | Voice-over |
| --- | --- | --- |
| 0.0–4.5 s | Intro | Every click your users make tells a story. **Sevenda** turns any browser session into a clear, documented process. |
| 4.5–12 s | Record | Just record a real user session. Sevenda captures every navigation, click, request and error — as it happens. |
| 12–22 s | BPMN 2.0 | Then, AI builds the process for you: a standards-compliant **BPMN 2.0** diagram, with isolated pools for user and system, gateways, and the message flows between them. |
| 22–29 s | Insights | From the same session, you get instant analytics insights — drop-offs, conversion rates and the GA4 events worth tracking. |
| 29–35 s | GTM push | And you push those tags live to your Google Tag Manager container. No manual setup. |
| 35–40 s | DNA Narrative | Need to explain the flow? Sevenda writes the narrative — a shareable story of what really happened. |
| 40–43 s | Team | Share it all with your team, in one library. |
| 43–45 s | Outro | Sevenda. From clicks to process, automatically. **sevenda-dot-dev**. |

## Testo continuo (per il doppiatore)

> Every click your users make tells a story. Sevenda turns any browser session into a clear, documented process.
>
> Just record a real user session. Sevenda captures every navigation, click, request and error — as it happens.
>
> Then, AI builds the process for you: a standards-compliant BPMN 2.0 diagram, with isolated pools for user and system, gateways, and the message flows between them.
>
> From the same session, you get instant analytics insights — drop-offs, conversion rates and the GA4 events worth tracking. And you push those tags live to your Google Tag Manager container. No manual setup.
>
> Need to explain the flow? Sevenda writes the narrative — a shareable story of what really happened.
>
> Share it all with your team, in one library.
>
> Sevenda. From clicks to process, automatically. sevenda.dev.

Note di lettura: "BPMN" si legge lettera per lettera (bee-pee-em-en); "GA4"
come "gee-ay-four"; "sevenda.dev" come "sevenda dot dev". Tono: calmo, sicuro,
senza enfasi da televendita; lasciare mezzo secondo di silenzio prima
dell'outro.

## Versione italiana (alternativa)

| Tempo | Voice-over |
| --- | --- |
| 0.0–4.5 s | Ogni click dei tuoi utenti racconta una storia. **Sevenda** trasforma qualsiasi sessione browser in un processo chiaro e documentato. |
| 4.5–12 s | Basta registrare una sessione reale: Sevenda cattura navigazioni, click, richieste ed errori, mentre accadono. |
| 12–22 s | Poi l'AI costruisce il processo per te: un diagramma **BPMN 2.0** conforme allo standard, con pool separati per utente e sistema, gateway e i message flow fra loro. |
| 22–29 s | Dalla stessa sessione ottieni subito gli insight di analytics: abbandoni, tassi di conversione e gli eventi GA4 da tracciare. |
| 29–35 s | E spingi quei tag direttamente nel tuo container di Google Tag Manager. Nessuna configurazione manuale. |
| 35–40 s | Devi spiegare il flusso? Sevenda scrive la narrazione: una storia condivisibile di ciò che è successo davvero. |
| 40–43 s | Condividi tutto con il tuo team, in un'unica libreria. |
| 43–45 s | Sevenda. Dai click al processo, automaticamente. **sevenda punto dev**. |

## Specifiche audio consigliate

* Traccia mono o stereo a 48 kHz, 24 bit; loudness −16 LUFS (social) o −23 LUFS (broadcast).
* Il video è muto: per il mix aggiungere la voce con ffmpeg, ad esempio
  `ffmpeg -i sevenda-promo.mp4 -i voiceover.wav -c:v copy -c:a aac -b:a 192k -shortest sevenda-promo-vo.mp4`.
