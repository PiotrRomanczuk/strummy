#!/usr/bin/env python3
"""Turn a process-notification-queue response into one journal line.

    read-response.py <http-code> <body-file>

Prints "<verdict> <details>", verdict in ok | stale | failed. Used by
trigger.sh; the route's response shape is app/api/cron/process-notification-queue/route.ts.
Never prints the body verbatim beyond a short error excerpt (it carries no secret,
but it is not meant for the journal in full).
"""

import json
import sys


def verdict(code: str, body: str) -> str:
    if code != "200":
        return f"failed HTTP {code} {body[:120]!r}"
    try:
        doc = json.loads(body)
    except ValueError:
        return f"failed non-JSON body {body[:120]!r}"
    if doc.get("success") is not True:
        return f"failed success:false error={doc.get('error')!r}"

    queue = doc.get("queue") or {}
    retry = doc.get("retry") or {}
    backlog = doc.get("backlog")
    stats = (
        f"sent={queue.get('processed')} send_failed={queue.get('failed')} "
        f"retried={retry.get('retried')} dead={retry.get('deadLettered')}"
    )
    if not isinstance(backlog, dict):
        # A deployment older than the backlog report: drained, but unmonitored.
        return f"ok {stats} backlog=unreported"
    if backlog.get("isStale"):
        return (
            f"stale {stats} overdue={backlog.get('overdue')} "
            f"oldest_due={backlog.get('oldestDueAt')} "
            f"age_min={backlog.get('oldestAgeMinutes')}"
        )
    return f"ok {stats} overdue=0"


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: read-response.py <http-code> <body-file>")
    with open(sys.argv[2], encoding="utf-8", errors="replace") as fh:
        body = fh.read()
    print(verdict(sys.argv[1], body))


if __name__ == "__main__":
    main()
