# Sevenda promo (versione italiana) — testo per la voce narrante

Video: `sevenda-promo-it.mp4`, 45 s, 1920×1080, testi on-screen in italiano.
Circa 94 parole, calibrate su un ritmo di 2,3–2,7 parole al secondo: l'italiano
è più lungo dell'inglese, quindi ogni battuta è stata accorciata per stare nella
propria scena. Le battute possono iniziare 0,2–0,3 s dopo l'ingresso della scena.

| Tempo | Scena | Caption on-screen | Voce narrante | Parole |
| --- | --- | --- | --- | --- |
| 0.0–4.5 s | Intro | Trasforma ogni sessione browser in un processo chiaro. | Ogni click racconta una storia. **Sevenda** la trasforma in un processo chiaro. | 12 |
| 4.5–12 s | Registrazione | Registra una sessione utente reale. | Registra una sessione utente reale: Sevenda cattura navigazioni, click, richieste ed errori, mentre accadono. | 14 |
| 12–22 s | BPMN 2.0 | BPMN 2.0 generato dall'AI, con pool isolati e message flow. | Poi l'AI costruisce il processo: un diagramma **BPMN 2.0** con pool separati per utente e sistema, gateway e message flow. | 20 |
| 22–29 s | Insights | Insight analytics GA4 e GTM istantanei. | Dalla stessa sessione ottieni subito insight di analytics: abbandoni, conversioni e gli eventi GA4 da tracciare. | 16 |
| 29–35 s | GTM live push | Invia i tag live al tuo container GTM. | E invii quei tag direttamente al tuo container Google Tag Manager. Zero configurazione manuale. | 13 |
| 35–40 s | DNA Narrative | Trasforma i flussi in una narrazione condivisibile. | Devi spiegare il flusso? Sevenda scrive la narrazione, pronta da condividere. | 11 |
| 40–43 s | Team | Condividi con il tuo team. | Condividi tutto con il tuo team. | 6 |
| 43–45 s | Chiusura | sevenda.dev | Sevenda: dai click al processo. | 5 |

## Testo continuo (per il doppiatore)

> Ogni click racconta una storia. Sevenda la trasforma in un processo chiaro.
>
> Registra una sessione utente reale: Sevenda cattura navigazioni, click, richieste ed errori, mentre accadono.
>
> Poi l'AI costruisce il processo: un diagramma BPMN 2.0 con pool separati per utente e sistema, gateway e message flow.
>
> Dalla stessa sessione ottieni subito insight di analytics: abbandoni, conversioni e gli eventi GA4 da tracciare. E invii quei tag direttamente al tuo container Google Tag Manager. Zero configurazione manuale.
>
> Devi spiegare il flusso? Sevenda scrive la narrazione, pronta da condividere.
>
> Condividi tutto con il tuo team.
>
> Sevenda: dai click al processo.

## Note di lettura

* **Pronuncia**: "BPMN" si legge lettera per lettera ("bi-pi-em-enne"); "GA4" come "gi-ei-quattro"; "GTM" come "gi-ti-em"; "Sevenda" con l'accento sulla seconda sillaba ("se-VEN-da").
* **Tono**: calmo e sicuro, senza enfasi da televendita. Una pausa di mezzo secondo prima dell'ultima frase.
* **Chiusura**: l'indirizzo `sevenda.dev` è già a schermo. Se vuoi pronunciarlo, "sevenda punto dev", servono circa 1,5 s in più: in quel caso togli "Zero configurazione manuale" oppure allunga l'outro di un secondo.
* **Termini lasciati in inglese** come sul sito: BPMN, message flow, pool, gateway, insight, GA4, GTM, BYOK.

## Mix audio

* Traccia a 48 kHz; loudness −16 LUFS per i social, −23 LUFS per l'uso broadcast.
* Il video è muto. Per aggiungere la voce:

```bash
ffmpeg -i sevenda-promo-it.mp4 -i voiceover-it.wav -c:v copy -c:a aac -b:a 192k -shortest sevenda-promo-it-vo.mp4
```
