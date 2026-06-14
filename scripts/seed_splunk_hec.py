#!/usr/bin/env python3
"""Push bundled demo events to Splunk HEC for live demos."""

import json
import os
import sys
from pathlib import Path

import httpx


def main() -> int:
    host = os.environ.get("SPLUNK_HOST")
    token = os.environ.get("SPLUNK_TOKEN")
    index = os.environ.get("SPLUNK_INDEX", "main")

    if not host or not token:
        print("Set SPLUNK_HOST and SPLUNK_TOKEN environment variables.")
        return 1

    seed_path = Path(__file__).resolve().parents[1] / "backend" / "data" / "demo_events.json"
    events = json.loads(seed_path.read_text(encoding="utf-8")).get("events", [])

    url = f"https://{host}:8088/services/collector/event"
    headers = {"Authorization": f"Splunk {token}"}

    sent = 0
    with httpx.Client(verify=False, timeout=30.0) as client:
        for event in events:
            payload = {
                "index": index,
                "sourcetype": event.get("sourcetype", "synapse"),
                "source": event.get("source", "synapse-seed"),
                "host": event.get("host", "synapse"),
                "time": event.get("timestamp"),
                "event": event,
            }
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            sent += 1

    print(f"Seeded {sent} events to Splunk index '{index}'.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
