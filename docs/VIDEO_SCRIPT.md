# Video script (~2 minutes)

Record at **1920×1080**, browser fullscreen (F11), dashboard at `http://localhost:5173`.

**Before recording:** backend on port 8000, frontend `npm run dev`, click Analyze once so data loads.

---

## 0:00–0:15 — Hook

> "When customer complaints spike, teams don't need another dashboard — they need the story. Synapse connects Splunk operational data into one investigation view."

*Show: header "Synapse" + query bar with "Why are customer complaints increasing?"*

---

## 0:15–0:30 — Root cause

*Click **Analyze** if not loaded.*

> "I ask a plain question. Synapse returns the root cause: auth latency jumped after deployment v4.2."

*Pause on the pink **Root cause** box — 2 seconds.*

---

## 0:30–0:45 — Timeline

*Scroll slightly to Timeline.*

> "The timeline shows how it unfolded — deploy, latency, login failures, tickets."

*Point at the dots left to right — 3 seconds.*

---

## 0:45–1:05 — Service map

*Scroll to Service map.*

> "The service map is the causal chain. I can drag nodes and click one to filter evidence."

*Drag one node slightly · click "Customer Complaints" or similar — 5 seconds.*

---

## 1:05–1:25 — Right panel

*Move to right column — **Agent investigation** panel first.*

> "Synapse uses Splunk MCP Server tools — generate SPL from my question, run the query, pull indexes — you can see each agent step here."

*Pause on MCP steps + generated SPL — 4 seconds.*

> "Causal chain shows each hop. Impact: eighteen thousand users. Similar incidents INC-2841 and INC-2910."

---

## 1:25–1:45 — Splunk evidence

*Scroll to Splunk evidence panel.*

> "Every conclusion links to Splunk. Click an event — open in Splunk for the raw search."

*Click **Open in Splunk** on one event (tab may show mock URL — that's OK for demo).*

---

## 1:45–1:55 — Early warning

*Scroll down to Early warning banner.*

> "Synapse also surfaces independent risk signals — here Payment API trending wrong, separate from this incident."

---

## 1:55–2:00 — Close

*Click **Export report** top-right.*

> "Synapse — every incident tells a story. We connect the dots. GitHub: carolgallegos/Synapse."

---

## Recording tips

- **Windows:** Win + G → screen capture  
- **Mic:** quiet room, speak slower than normal  
- **Mouse:** move smoothly, don't rush  
- **One take is OK** — cut pauses in CapCut later  

## Subtitles (CapCut / YouTube)

```
When complaints spike, teams need the story—not another dashboard.
Synapse turns Splunk data into root cause, timeline, and impact.
Drag the service map. Click evidence. Open in Splunk.
Every incident tells a story. Synapse connects the dots.
```

## Thumbnail

Screenshot of service map + root cause visible, or use `docs/demo-recording-guide.png`.
