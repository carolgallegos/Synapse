import re
from dataclasses import dataclass, field


@dataclass
class ExtractedEntity:
    name: str
    kind: str
    confidence: float = 1.0


@dataclass
class ExtractedRelation:
    source: str
    target: str
    relation: str
    confidence: float = 1.0


@dataclass
class ExtractionResult:
    entities: list[ExtractedEntity] = field(default_factory=list)
    relations: list[ExtractedRelation] = field(default_factory=list)


SERVICE_PATTERNS = [
    re.compile(r"\b(payment service|authentication service|checkout api|login service|customer portal|payment api|database cluster|auth service)\b", re.I),
    re.compile(r"service[:=\s]+([a-z0-9\- ]+)", re.I),
]

EVENT_PATTERNS = [
    re.compile(r"\b(deployment|timeout|failure|security alert|latency spike|error rate|login failure|complaint|ticket)\b", re.I),
    re.compile(r"event[:=\s]+([a-z0-9\- ]+)", re.I),
]

DEPLOYMENT_PATTERN = re.compile(r"deployment\s+(v[\d.]+|[\w\-]+)", re.I)
DEPENDS_PATTERN = re.compile(r"([a-z0-9 \-]+)\s+(?:depends on|requires|uses)\s+([a-z0-9 \-]+)", re.I)
CAUSES_PATTERN = re.compile(r"([a-z0-9 \-]+)\s+(?:causes|triggered|led to|resulted in)\s+([a-z0-9 \-]+)", re.I)


def _normalize(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower())


def _node_id(kind: str, name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", _normalize(name))
    return f"{kind}:{slug}"


class OperationalParser:
    """Rule-based entity and relationship extraction from operational events."""

    def extract(self, message: str, context: dict | None = None) -> ExtractionResult:
        context = context or {}
        entities: dict[str, ExtractedEntity] = {}
        relations: list[ExtractedRelation] = []

        def add_entity(name: str, kind: str, confidence: float = 0.9) -> None:
            key = _node_id(kind, name)
            if key not in entities:
                entities[key] = ExtractedEntity(name=_normalize(name).title(), kind=kind, confidence=confidence)

        for pattern in SERVICE_PATTERNS:
            for match in pattern.finditer(message):
                add_entity(match.group(1), "service")

        for pattern in EVENT_PATTERNS:
            for match in pattern.finditer(message):
                add_entity(match.group(1), "event")

        deploy_match = DEPLOYMENT_PATTERN.search(message)
        if deploy_match:
            add_entity(f"Deployment {deploy_match.group(1).upper()}", "deployment", 1.0)

        if context.get("service"):
            add_entity(context["service"], "service")
        if context.get("event_type"):
            add_entity(context["event_type"], "event")

        for pattern in (DEPENDS_PATTERN, CAUSES_PATTERN):
            for match in pattern.finditer(message):
                left, right = match.group(1), match.group(2)
                add_entity(left, "service" if "service" in left.lower() else "event")
                add_entity(right, "event" if "failure" in right.lower() or "error" in right.lower() else "service")
                relations.append(
                    ExtractedRelation(
                        source=_node_id("service" if "service" in left.lower() else "event", left),
                        target=_node_id("event" if "failure" in right.lower() else "service", right),
                        relation="causes" if pattern is CAUSES_PATTERN else "depends_on",
                    )
                )

        return ExtractionResult(entities=list(entities.values()), relations=relations)
