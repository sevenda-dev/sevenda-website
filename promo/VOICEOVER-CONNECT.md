# Sevenda Connect (45 s) — testo per la voce narrante

Video: `sevenda-connect-promo.mp4`, 1920×1080, 45 s, montaggio su griglia a
124 BPM. La voce segue le caption a schermo (Geist 800, come il wordmark):
ogni battuta parte 0,1–0,2 s dopo l'ingresso della caption e finisce prima che
esca. Circa 90 parole in inglese, 85 in italiano. Tono calmo e sicuro, senza
enfasi da televendita; la musica elettronica a ritmo medio resta sotto la voce.

| Tempo | Scena | Caption a schermo | Voce EN | Voce IT |
| --- | --- | --- | --- | --- |
| 0.0–4.0 s | Brand opening | — | *(solo musica)* | *(solo musica)* |
| 4.8–6.7 s | Linea fra i punti | One recording. | One recording. | Una registrazione. |
| 6.8–8.9 s | Linea fra i punti | Every destination. | Every destination. | Ogni destinazione. |
| 9.4–15.6 s | Le integrazioni entrano | The BPMN 2.0 diagram and the insights Sevenda generates, straight into the tools your team already lives in. | The BPMN diagram and the insights Sevenda generates go straight into the tools your team already lives in. | Il diagramma BPMN e gli insight che Sevenda genera arrivano direttamente negli strumenti in cui il tuo team lavora già. |
| 16.5–19.4 s | Primo piano Jira | Every step becomes a Jira issue — stories, tasks, acceptance criteria. | Every step of the process becomes a Jira issue: stories, tasks, acceptance criteria. | Ogni passo del processo diventa una issue Jira: storie, task, criteri di accettazione. |
| 19.4–22.3 s | Primo piano Camunda | Standards-compliant BPMN 2.0 that opens in Camunda Modeler. | Standards-compliant BPMN 2.0, ready to open in Camunda Modeler. | BPMN 2.0 conforme allo standard, pronto da aprire in Camunda Modeler. |
| 22.3–25.2 s | Primo piano GA4 | Captured events become a GA4 tracking plan, pushed to Tag Manager as drafts. | Captured events become a GA4 tracking plan, pushed to Tag Manager as drafts. | Gli eventi catturati diventano un tracking plan GA4, inviato a Tag Manager come bozza. |
| 25.2–28.1 s | Primo piano Confluence | Diagram and narrative, published to a Confluence page. | Diagram and narrative, published to a Confluence page your team can review. | Diagramma e narrazione, pubblicati in una pagina Confluence che il team può rivedere. |
| 28.1–30.5 s | Primo piano SAP Signavio | Coming soon · SAP Signavio | And coming soon: SAP Signavio, | E in arrivo: SAP Signavio, |
| 30.5–32.9 s | Primo piano Mermaid | Coming soon · Mermaid | Mermaid, | Mermaid, |
| 32.9–35.3 s | Primo piano Notion | Coming soon · Notion | and Notion. | e Notion. |
| 35.6–38.1 s | Campo largo | Build on the tools you already use. | Build on the tools you already use. | Costruisci sugli strumenti che usi già. |
| 38–45 s | Buio, brand closing | — | *(pausa)* Sevenda. | *(pausa)* Sevenda. |

## Testo continuo

**English**

> One recording. Every destination.
> The BPMN diagram and the insights Sevenda generates go straight into the tools your team already lives in.
> Every step of the process becomes a Jira issue: stories, tasks, acceptance criteria.
> Standards-compliant BPMN 2.0, ready to open in Camunda Modeler.
> Captured events become a GA4 tracking plan, pushed to Tag Manager as drafts.
> Diagram and narrative, published to a Confluence page your team can review.
> And coming soon: SAP Signavio, Mermaid, and Notion.
> Build on the tools you already use.
> Sevenda.

**Italiano**

> Una registrazione. Ogni destinazione.
> Il diagramma BPMN e gli insight che Sevenda genera arrivano direttamente negli strumenti in cui il tuo team lavora già.
> Ogni passo del processo diventa una issue Jira: storie, task, criteri di accettazione.
> BPMN 2.0 conforme allo standard, pronto da aprire in Camunda Modeler.
> Gli eventi catturati diventano un tracking plan GA4, inviato a Tag Manager come bozza.
> Diagramma e narrazione, pubblicati in una pagina Confluence che il team può rivedere.
> E in arrivo: SAP Signavio, Mermaid e Notion.
> Costruisci sugli strumenti che usi già.
> Sevenda.

## Note di lettura

* **Pronuncia**: "BPMN 2.0" → EN "bee-pee-em-en two-point-oh", IT "bi-pi-emme-enne due punto zero"; "GA4" → EN "gee-ay-four", IT "gi-a-quattro"; "Jira" come "gìra" (EN "JEE-ra"); "Sevenda" con l'accento sulla seconda sillaba (se-VEN-da).
* **Ritmo**: le tre integrazioni "coming soon" vanno lette come un unico elenco, un nome ogni 2,4 s, in sincrono con i cambi di inquadratura (28,1 / 30,5 / 32,9 s).
* **Chiusura**: "Sevenda." si pronuncia quando il logo è già a schermo (dopo il secondo 41). In alternativa si lascia solo la musica.
* **Termini lasciati in inglese** come sul sito: BPMN, insight, tracking plan, issue, task, Tag Manager.

## Mix audio

* Voce a 48 kHz, loudness −16 LUFS (social) o −23 LUFS (broadcast); musica elettronica a ritmo medio (124 BPM, la griglia del montaggio) con ducking di 6–8 dB sotto la voce.

```bash
ffmpeg -i sevenda-connect-promo.mp4 -i voiceover-connect-en.wav -c:v copy -c:a aac -b:a 192k -shortest sevenda-connect-promo-vo.mp4
```
