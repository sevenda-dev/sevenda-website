# Sevenda × Camunda (LinkedIn, 10 s) — testo per la voce narrante

Video: `sevenda-camunda-linkedin.mp4` (EN) e `sevenda-camunda-linkedin-it.mp4` (IT),
1080×1350, 10 s. Circa 23 parole per lingua: in 10 s non c'è spazio per altro,
quindi la voce riprende le parole a schermo invece di aggiungerne. Ogni battuta
può partire 0,1–0,2 s dopo l'ingresso della scena.

| Tempo | Scena | Voce EN | Voce IT |
| --- | --- | --- | --- |
| 0.0–2.3 s | "Every click" → logo Sevenda | Every click. **Sevenda.** | Ogni click. **Sevenda.** |
| 2.3–5.4 s | Il diagramma BPMN si disegna | Record a session, get a **BPMN 2.0** diagram. | Registri una sessione, ottieni un diagramma **BPMN 2.0**. |
| 5.4–8.1 s | Export → Camunda, spunte | Export it to Camunda in one click. Zero rework. | Un click, ed è pronto per Camunda. Zero rework. |
| 8.1–10 s | Sevenda × Camunda | Sevenda, meet Camunda. | Sevenda incontra Camunda. |

## Testo continuo

**English**

> Every click. Sevenda.
> Record a session, get a BPMN 2.0 diagram.
> Export it to Camunda in one click. Zero rework.
> Sevenda, meet Camunda.

**Italiano**

> Ogni click. Sevenda.
> Registri una sessione, ottieni un diagramma BPMN 2.0.
> Un click, ed è pronto per Camunda. Zero rework.
> Sevenda incontra Camunda.

## Note di lettura

* **Pronuncia**: "BPMN 2.0" → EN "bee-pee-em-en two-point-oh", IT "bi-pi-emme-enne due punto zero"; "Sevenda" con l'accento sulla seconda sillaba (se-VEN-da); "Camunda" ca-MUN-da.
* **Ritmo**: la prima battuta va staccata ("Every click." pausa "Sevenda."), in sincrono con le due parole a schermo. Mezzo secondo di silenzio prima della chiusura.
* **Tono**: calmo e sicuro, senza enfasi da televendita.
* Se la battuta su BPMN sfora, in italiano si può accorciare in "Registri una sessione: ecco il BPMN 2.0."

## Mix audio

* Traccia a 48 kHz, loudness −16 LUFS (social). Il video è muto.

```bash
ffmpeg -i sevenda-camunda-linkedin.mp4 -i voiceover-en.wav -c:v copy -c:a aac -b:a 192k -shortest sevenda-camunda-linkedin-vo.mp4
ffmpeg -i sevenda-camunda-linkedin-it.mp4 -i voiceover-it.wav -c:v copy -c:a aac -b:a 192k -shortest sevenda-camunda-linkedin-it-vo.mp4
```
