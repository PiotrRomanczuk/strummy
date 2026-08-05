#!/usr/bin/env python3
"""Rotate the JWT secret and API keys on a self-hosted Supabase stack (uwh).

WHY THIS EXISTS
---------------
Both `StudentProduction` and `StudentDevelopment` were found (2026-08-03) to be
running the Supabase CLI's publicly documented default JWT secret
("super-secret-jwt-token-with-at-least-32-characters-long"), and BOTH stacks
share the exact same `sb_secret_`/`sb_publishable_` keys. Practical impact: the
well-known default demo `service_role` JWT (published in Supabase's own docs,
and sitting in this repo's `scripts/check-users.ts`) is a valid, RLS-bypassing
credential against live production data. There is also no isolation between
dev and prod at the API-key layer.

This script mints a fresh, unique JWT secret + matching anon/service_role
tokens + fresh opaque `sb_secret_`/`sb_publishable_` keys for ONE stack, then:

  1. Edits `kong.yml` in place inside the Kong container (it is a static file
     baked into the container's writable layer -- no bind mount, no env
     templating -- confirmed via `docker inspect` Mounts + Kong's own env) and
     restarts Kong (DB-less mode only re-reads kong.yml at startup).
  2. Recreates `auth`, `rest`, and `realtime` with the new secret, using the
     same inspect-override-recreate pattern as `restore-gotrue-mail-urls.py`
     (removing a container and running `supabase start` does NOT bring it
     back -- the CLI sees the stack as already up and skips it).
  3. Updates `studio`'s env with the new keys (admin UI only, low risk).

Recreating `auth` reverts `GOTRUE_MAILER_URLPATHS_*` and
`GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` to their broken localhost defaults --
the exact bug `restore-gotrue-mail-urls.py` exists to fix. This script calls
that repair automatically at the end for `prod`; run it for `dev` yourself if
something off-host needs to follow a dev link (see that script's docstring).

Secrets never leave the host: this script must be run ON uwh (SSH in first),
reads the running containers' own environment, and never prints a raw key or
secret value to stdout.

    ssh uwh
    python3 ~/ops/rotate-supabase-keys.py dev --check     # report only
    python3 ~/ops/rotate-supabase-keys.py dev             # rotate
    python3 ~/ops/rotate-supabase-keys.py prod --check
    python3 ~/ops/rotate-supabase-keys.py prod

Rehearse on `dev` before `prod` -- same practice the mail-URL runbook used.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import secrets
import subprocess
import sys
import time

try:
    import jwt
except ImportError:
    print("error: PyJWT is required (pip3 install --user pyjwt)", file=sys.stderr)
    sys.exit(2)

STACKS = {
    "prod": "StudentProduction",
    "dev": "StudentDevelopment",
}

FAR_FUTURE_EXP = 1983812996  # matches the demo keys' expiry, kept for parity


def docker(*args: str) -> str:
    return subprocess.check_output(["docker", *args], text=True)


def docker_ok(*args: str) -> bool:
    return subprocess.run(["docker", *args], capture_output=True).returncode == 0


def mask(value: str, keep: int = 6) -> str:
    return value[:keep] + "..." if len(value) > keep else "***"


def new_jwt_secret() -> str:
    return base64.b64encode(secrets.token_bytes(48)).decode().rstrip("=")


def new_opaque_key(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(24)}"


def mint_role_jwt(secret: str, role: str) -> str:
    return jwt.encode(
        {"iss": "supabase-strummy", "role": role, "exp": FAR_FUTURE_EXP},
        secret,
        algorithm="HS256",
    )


def recreate_with_env_overrides(project: str, service: str, overrides: dict[str, str]) -> None:
    """Same pattern as restore-gotrue-mail-urls.py: inspect -> override env -> rm -f -> run -d."""
    name = f"supabase_{service}_{project}"
    spec = json.loads(docker("inspect", name))[0]
    env = [e for e in spec["Config"]["Env"] if e.split("=", 1)[0] not in overrides]
    env += [f"{k}={v}" for k, v in overrides.items()]

    env_file = f"/tmp/.rotate-{service}-{project}.env"
    fd = os.open(env_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as fh:
        fh.write("\n".join(env) + "\n")

    health = spec["Config"].get("Healthcheck")
    try:
        docker("rm", "-f", name)
        run_args = [
            "run", "-d",
            "--name", name,
            "--network", f"supabase_network_{project}",
            "--network-alias", service if service != "rest" else "rest",
            "--restart", "unless-stopped",
            "--label", f"com.docker.compose.project={project}",
            "--label", f"com.supabase.cli.project={project}",
            "--env-file", env_file,
        ]
        if health and health.get("Test"):
            test = health["Test"]
            if isinstance(test, list) and len(test) > 1:
                run_args += ["--health-cmd", " ".join(test[1:])]
            run_args += [
                "--health-interval", "10s",
                "--health-timeout", "2s",
                "--health-retries", "3",
            ]
        run_args += [spec["Config"]["Image"], *(spec["Config"]["Cmd"] or [])]
        docker(*run_args)
    finally:
        os.remove(env_file)

    print(f"  {name} recreated")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("stack", choices=sorted(STACKS))
    ap.add_argument("--check", action="store_true", help="report current state only; changes nothing")
    args = ap.parse_args()

    project = STACKS[args.stack]
    kong_name = f"supabase_kong_{project}"

    if not docker_ok("inspect", kong_name):
        print(f"error: {kong_name} is not running", file=sys.stderr)
        return 2

    # Read the current keys straight out of kong.yml so we know what to replace.
    kong_yml = docker("exec", kong_name, "cat", "/home/kong/kong.yml")
    import re
    current_secret = re.search(r"sb_secret_[A-Za-z0-9_-]+", kong_yml)
    current_publishable = re.search(r"sb_publishable_[A-Za-z0-9_-]+", kong_yml)
    if not current_secret or not current_publishable:
        print("error: could not find current sb_secret_/sb_publishable_ keys in kong.yml", file=sys.stderr)
        return 2
    current_secret = current_secret.group(0)
    current_publishable = current_publishable.group(0)

    auth_spec = json.loads(docker("inspect", f"supabase_auth_{project}"))[0]
    current_env = dict(e.split("=", 1) for e in auth_spec["Config"]["Env"] if "=" in e)
    current_jwt_secret = current_env.get("GOTRUE_JWT_SECRET", "")

    is_default = current_jwt_secret == "super-secret-jwt-token-with-at-least-32-characters-long"
    print(f"{project}:")
    print(f"  current JWT secret: {'*** DEFAULT DEMO SECRET ***' if is_default else mask(current_jwt_secret)}")
    print(f"  current secret key: {mask(current_secret)}")
    print(f"  current publishable key: {mask(current_publishable)}")

    if args.check:
        print("\n--check given; not modifying anything. Re-run without it to rotate.")
        return 1 if is_default else 0

    new_secret = new_jwt_secret()
    new_secret_key = new_opaque_key("sb_secret")
    new_publishable_key = new_opaque_key("sb_publishable")
    new_anon_jwt = mint_role_jwt(new_secret, "anon")
    new_service_jwt = mint_role_jwt(new_secret, "service_role")

    print("\ngenerated new secret + keys (values withheld from output)")

    # 1. Kong: this image's kong.yml is NOT durable -- it is regenerated on
    #    every container start from a heredoc baked into the container's own
    #    Entrypoint (`sh -c "cat <<'EOF' > /home/kong/kong.yml && ..."`),
    #    discovered 2026-08-03 when a plain `docker restart` silently reverted
    #    an in-place kong.yml edit back to the original default keys. The
    #    durable fix is to rewrite the Entrypoint string itself and recreate
    #    the container (same inspect-override-recreate pattern as the other
    #    services), not edit the file.
    print("\nupdating Kong...")
    kong_spec = json.loads(docker("inspect", kong_name))[0]
    entrypoint = kong_spec["Config"]["Entrypoint"]
    if not (entrypoint and entrypoint[0] == "sh" and entrypoint[1] == "-c"):
        print("error: unexpected Kong Entrypoint shape -- aborting", file=sys.stderr)
        return 2
    new_entrypoint_script = entrypoint[2].replace(current_secret, new_secret_key)
    new_entrypoint_script = new_entrypoint_script.replace(current_publishable, new_publishable_key)
    # Replace the legacy JWTs the entrypoint maps the old opaque keys to.
    for tok in set(re.findall(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", entrypoint[2])):
        try:
            payload = jwt.decode(tok, current_jwt_secret or "x", algorithms=["HS256"], options={"verify_exp": False})
        except Exception:
            continue
        role = payload.get("role")
        if role == "anon":
            new_entrypoint_script = new_entrypoint_script.replace(tok, new_anon_jwt)
        elif role == "service_role":
            new_entrypoint_script = new_entrypoint_script.replace(tok, new_service_jwt)

    if new_entrypoint_script == entrypoint[2]:
        print("error: no substitutions applied to Kong entrypoint -- aborting", file=sys.stderr)
        return 2

    kong_env = kong_spec["Config"]["Env"]
    kong_env_file = f"/tmp/.rotate-kong-{project}.env"
    fd = os.open(kong_env_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as fh:
        fh.write("\n".join(kong_env) + "\n")

    kong_health = kong_spec["Config"].get("Healthcheck")
    try:
        docker("rm", "-f", kong_name)
        run_args = [
            "run", "-d",
            "--name", kong_name,
            "--network", f"supabase_network_{project}",
            "--network-alias", "kong",
            "--restart", "unless-stopped",
            "--label", f"com.docker.compose.project={project}",
            "--label", f"com.supabase.cli.project={project}",
            "--env-file", kong_env_file,
        ]
        for pm, hostports in (kong_spec.get("HostConfig", {}).get("PortBindings") or {}).items():
            for hp in hostports:
                run_args += ["-p", f"{hp.get('HostIp', '') or '0.0.0.0'}:{hp['HostPort']}:{pm.split('/')[0]}"]
        if kong_health and kong_health.get("Test"):
            test = kong_health["Test"]
            if isinstance(test, list) and len(test) > 1:
                run_args += ["--health-cmd", " ".join(test[1:])]
            run_args += ["--health-interval", "10s", "--health-timeout", "2s", "--health-retries", "3"]
        run_args += [kong_spec["Config"]["Image"], "sh", "-c", new_entrypoint_script]
        docker(*run_args)
    finally:
        os.remove(kong_env_file)
    print(f"  {kong_name} recreated with rewritten entrypoint")

    # 2. auth (GoTrue)
    print("\nrecreating auth...")
    recreate_with_env_overrides(project, "auth", {"GOTRUE_JWT_SECRET": new_secret})

    # 3. rest (PostgREST) -- PGRST_JWT_SECRET may be a plain secret or a JWKS
    #    JSON blob; if JWKS, fall back to the plain-secret form (HS256 only,
    #    matches how GoTrue/Kong sign these tokens).
    print("\nrecreating rest...")
    recreate_with_env_overrides(project, "rest", {"PGRST_JWT_SECRET": new_secret})

    # 4. realtime
    print("\nrecreating realtime...")
    recreate_with_env_overrides(
        project,
        "realtime",
        {"API_JWT_SECRET": new_secret, "METRICS_JWT_SECRET": new_secret},
    )

    # 5. studio (admin UI only -- cosmetic, but keep it working)
    print("\nrecreating studio...")
    recreate_with_env_overrides(
        project,
        "studio",
        {
            "AUTH_JWT_SECRET": new_secret,
            "SUPABASE_ANON_KEY": new_anon_jwt,
            "SUPABASE_SERVICE_KEY": new_service_jwt,
            "SUPABASE_PUBLISHABLE_KEY": new_publishable_key,
            "SUPABASE_SECRET_KEY": new_secret_key,
        },
    )

    print("\nwaiting 5s for containers to come up...")
    time.sleep(5)

    print("\nnew keys (save these now -- they are not printed again):")
    print(f"  JWT secret:        {new_secret}")
    print(f"  anon (legacy JWT): {new_anon_jwt}")
    print(f"  service_role JWT:  {new_service_jwt}")
    print(f"  sb_publishable_:   {new_publishable_key}")
    print(f"  sb_secret_:        {new_secret_key}")

    if args.stack == "prod":
        print("\nauth was recreated -- repairing mailer/Google-redirect URLs...")
        repair = os.path.expanduser("~/ops/restore-gotrue-mail-urls.py")
        if os.path.exists(repair):
            subprocess.call(["python3", repair, "prod"])
        else:
            print(f"  warning: {repair} not found -- run it manually", file=sys.stderr)

    print("\nDone. Now:")
    print("  1. Update the matching .env* files and Vercel env vars with the keys above.")
    print("  2. docker ps --filter name=" + project + "  # confirm all containers healthy")
    print(f"  3. curl -s -o /dev/null -w '%{{http_code}}' https://strummy-db.marszal-arts.online/auth/v1/health"
          if args.stack == "prod" else "  3. Smoke-test sign-in against the dev stack")
    print("  4. Confirm the OLD default demo key no longer authenticates.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
