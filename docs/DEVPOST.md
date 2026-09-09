# Devpost submission kit

Copy-paste fields for [Splunk Agentic Ops Hackathon](https://splunk.devpost.com/) if submissions reopen or for portfolio.

## Project name

**Synapse**

## Tagline

Every incident tells a story. Synapse connects the dots.

## Elevator pitch (short)

Synapse is an observability incident intelligence app. Ask why complaints are spiking — get root cause, causal service map, timeline, historical matches, impact, and Splunk-verifiable evidence in one view.

## About the project

### Inspiration

Ops teams drown in Splunk searches during incidents. The data exists — the story doesn't. We wanted an investigation companion that connects deploy → service → symptom → customer impact automatically.

### What it does

- Ingests operational events from Splunk (or mock demo data)
- Builds a causal knowledge graph
- Answers natural-language incident questions
- Links every conclusion to Splunk evidence
- Surfaces similar past incidents and blast radius
- Exports stakeholder reports (executive + technical)

### How we built it

- **Backend:** Python, FastAPI, NetworkX graph engine
- **Frontend:** React, TypeScript, Vite
- **Data:** Splunk REST/HEC connector with offline mock mode
- **Track:** Observability

### Demo query

> Why are customer complaints increasing?

### Results

- Root cause: Auth latency +320% after Deployment v4.2
- Chain: Deploy → Auth Service → Latency → Login failures → Tickets → Complaints
- Impact: 18,000 users, +240% tickets
- Historical: INC-2841, INC-2910

## Built with

Python · FastAPI · React · TypeScript · Splunk · NetworkX · Docker · Vite

## Links

| Field | URL |
|-------|-----|
| GitHub | https://github.com/carolgallegos/Synapse |
| Try it out | https://github.com/carolgallegos/Synapse/blob/main/docs/TRY_IT_OUT.md |
| Video | *(YouTube URL after recording — see VIDEO_SCRIPT.md)* |

## Video checklist

- [ ] Record with `docs/VIDEO_SCRIPT.md`
- [ ] Upload to YouTube (unlisted is OK)
- [ ] Paste URL in Devpost
- [ ] 2 min max recommended

## Screenshots for Devpost

1. Full dashboard with root cause + graph  
2. Splunk evidence panel  
3. Early warning banner  

## Category

**Observability**
