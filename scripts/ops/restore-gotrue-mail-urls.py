#!/usr/bin/env python3
"""Re-point GoTrue's email and OAuth callback links at the public tunnel
after a CLI restart.

WHY THIS EXISTS
---------------
The self-hosted stacks on `uwh` are managed by the Supabase CLI, which derives
every container's environment from `config.toml`. That file has no knob for
`GOTRUE_MAILER_URLPATHS_*` or for `[auth.external.google].redirect_uri`, so the
CLI always sets them to the stack's *local* API address:

    GOTRUE_MAILER_URLPATHS_INVITE=http://127.0.0.1:54321/auth/v1/verify
    GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=http://127.0.0.1:54321/auth/v1/callback

Those are absolute URLs, and GoTrue uses them verbatim: the mailer vars as the
base of every confirmation link it emails, and the Google redirect URI as the
`redirect_uri` sent to Google's OAuth `authorize` request. On a laptop that is
fine. Here the stack is only reachable from the outside through a Cloudflare
tunnel, so every invite/reset/confirmation link points at 127.0.0.1 -- the
recipient's own device -- and every Google sign-in redirects the user's browser
to 127.0.0.1:54321 after Google auth completes, which fails to connect.

`supabase stop && supabase start` therefore SILENTLY BREAKS ALL AUTH EMAIL AND
GOOGLE SIGN-IN. The mailer half happened on 2026-07-31; the Google OAuth half
happened on 2026-08-03 -- same root cause (a config.toml gap), different env
var, not caught by the first fix because the script only covered mailer vars.
Nothing errors -- GoTrue returns 200 either way; only the resulting link/redirect
is dead.

Run this on `prod` after ANY CLI-driven restart -- that is the stack whose mail
and sign-ins reach real students. `dev` is optional: its mail lands in the
stack's own inbox and its Google OAuth client (if any) is dev-only, where a
localhost link/redirect is perfectly usable. Only repair dev if something
off-host has to follow a dev link.

    ./restore-gotrue-mail-urls.py prod --check   # report, change nothing
    ./restore-gotrue-mail-urls.py prod           # repair

Verify with:

    docker exec supabase_auth_<project> env | grep -E 'MAILER_URLPATHS|GOOGLE_REDIRECT_URI'

Setting API_EXTERNAL_URL alone is NOT enough -- the URLPATHS and
GOOGLE_REDIRECT_URI values win.

Existing environment is read from the running container and written straight
back, so secrets never leave the host and are never printed.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

STACKS = {
    "prod": ("StudentProduction", "db.strummy.online"),
    "dev": ("StudentDevelopment", "strummy-dev-db.marszal-arts.online"),
}


def docker(*args: str) -> str:
    return subprocess.check_output(["docker", *args], text=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("stack", choices=sorted(STACKS), help="which Supabase stack to repair")
    ap.add_argument("--host", help="override the public hostname")
    ap.add_argument(
        "--check",
        action="store_true",
        help="report whether a repair is needed and exit non-zero if so; changes nothing",
    )
    args = ap.parse_args()

    project, default_host = STACKS[args.stack]
    host = args.host or default_host
    name = f"supabase_auth_{project}"
    base = f"https://{host}"
    verify = f"{base}/auth/v1/verify"

    callback = f"{base}/auth/v1/callback"
    overrides = {
        "API_EXTERNAL_URL": f"{base}/auth/v1",
        "GOTRUE_API_EXTERNAL_URL": f"{base}/auth/v1",
        # Lets GoTrue trust the tunnel's forwarded host as well, so links stay
        # correct even if the base URL is ever wrong again.
        "GOTRUE_MAILER_EXTERNAL_HOSTS": host,
        "GOTRUE_MAILER_URLPATHS_INVITE": verify,
        "GOTRUE_MAILER_URLPATHS_CONFIRMATION": verify,
        "GOTRUE_MAILER_URLPATHS_RECOVERY": verify,
        "GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE": verify,
        "GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI": callback,
    }

    try:
        spec = json.loads(docker("inspect", name))[0]
    except subprocess.CalledProcessError:
        print(f"error: container {name} is not running", file=sys.stderr)
        return 2

    current = dict(e.split("=", 1) for e in spec["Config"]["Env"] if "=" in e)
    wrong = {k: current.get(k, "(unset)") for k, v in overrides.items() if current.get(k) != v}

    if not wrong:
        print(f"{name}: mail URLs already point at {host} — nothing to do")
        return 0

    print(f"{name}: {len(wrong)} var(s) need repair")
    for k, v in sorted(wrong.items()):
        print(f"  {k}\n    is:     {v}\n    should: {overrides[k]}")

    if args.check:
        print("\n--check given; not modifying anything. Re-run without it to repair.")
        return 1

    env = [e for e in spec["Config"]["Env"] if e.split("=", 1)[0] not in overrides]
    env += [f"{k}={v}" for k, v in overrides.items()]

    env_file = f"/tmp/.gotrue-{project}.env"
    fd = os.open(env_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as fh:
        fh.write("\n".join(env) + "\n")

    try:
        # NOTE: removing the container and running `supabase start` does NOT
        # bring it back -- the CLI sees the stack as up and skips it, leaving
        # auth down. The replacement has to be created here, explicitly.
        docker("rm", "-f", name)
        docker(
            "run", "-d",
            "--name", name,
            "--network", f"supabase_network_{project}",
            "--network-alias", "auth",
            "--restart", "unless-stopped",
            "--label", f"com.docker.compose.project={project}",
            "--label", f"com.supabase.cli.project={project}",
            "--env-file", env_file,
            "--health-cmd", "wget --no-verbose --tries=1 --spider http://127.0.0.1:9999/health",
            "--health-interval", "10s",
            "--health-timeout", "2s",
            "--health-retries", "3",
            spec["Config"]["Image"],
            *(spec["Config"]["Cmd"] or []),
        )
    finally:
        os.remove(env_file)

    print(f"\n{name} recreated. Confirm with:")
    print(f"  docker exec {name} env | grep MAILER_URLPATHS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
