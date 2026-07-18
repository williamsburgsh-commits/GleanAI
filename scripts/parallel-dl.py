#!/usr/bin/env python3
"""Multi-connection resumable download for GitHub release assets."""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import urllib.request

TAG = sys.argv[1] if len(sys.argv) > 1 else "v1.41"
NAME = "platform-tools-linux-x86_64.tar.bz2"
PARTS = int(sys.argv[2]) if len(sys.argv) > 2 else 8
OUT_DIR = os.path.expanduser(f"~/.cache/solana/{TAG}/platform-tools")
OUT = os.path.join(OUT_DIR, NAME)


def api_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "gleanai-parallel-dl"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def resolve_asset():
    d = api_json(f"https://api.github.com/repos/anza-xyz/platform-tools/releases/tags/{TAG}")
    for a in d["assets"]:
        if a["name"] == NAME:
            return a["id"], a["size"]
    raise SystemExit(f"asset {NAME} not found for {TAG}")


def fresh_url(asset_id: int) -> str:
    req = urllib.request.Request(
        f"https://api.github.com/repos/anza-xyz/platform-tools/releases/assets/{asset_id}",
        headers={
            "Accept": "application/octet-stream",
            "User-Agent": "gleanai-parallel-dl",
        },
    )
    # Don't follow redirects fully — get final URL
    opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler)
    with opener.open(req, timeout=60) as r:
        return r.geturl()


def download_range(url: str, start: int, end: int, path: str, idx: int):
    # Skip if complete
    if os.path.exists(path) and os.path.getsize(path) == (end - start + 1):
        print(f"part {idx}: already complete", flush=True)
        return
    headers = {
        "User-Agent": "gleanai-parallel-dl",
        "Range": f"bytes={start}-{end}",
    }
    # Resume partial part
    mode = "wb"
    resume_from = start
    if os.path.exists(path):
        have = os.path.getsize(path)
        if have > 0 and have < (end - start + 1):
            resume_from = start + have
            headers["Range"] = f"bytes={resume_from}-{end}"
            mode = "ab"
        elif have == (end - start + 1):
            return

    attempts = 0
    while True:
        attempts += 1
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=120) as r, open(path, mode) as f:
                while True:
                    chunk = r.read(1024 * 256)
                    if not chunk:
                        break
                    f.write(chunk)
            got = os.path.getsize(path)
            need = end - start + 1
            if got == need:
                print(f"part {idx}: done ({got} bytes)", flush=True)
                return
            print(f"part {idx}: short write {got}/{need}, retry", flush=True)
            mode = "ab"
            headers["Range"] = f"bytes={start + got}-{end}"
        except Exception as e:
            print(f"part {idx}: error {e}; retry in 3s (attempt {attempts})", flush=True)
            time.sleep(3)
            # refresh CDN URL periodically
            if attempts % 3 == 0:
                try:
                    url = fresh_url(ASSET_ID)
                except Exception:
                    pass
            mode = "ab" if os.path.exists(path) else "wb"
            have = os.path.getsize(path) if os.path.exists(path) else 0
            headers["Range"] = f"bytes={start + have}-{end}"


def main():
    global ASSET_ID
    os.makedirs(OUT_DIR, exist_ok=True)
    ASSET_ID, size = resolve_asset()
    print(f"{TAG} size={size} parts={PARTS}", flush=True)
    url = fresh_url(ASSET_ID)
    print(f"cdn url ok", flush=True)

    part_size = (size + PARTS - 1) // PARTS
    threads = []
    part_paths = []
    for i in range(PARTS):
        start = i * part_size
        end = min(size - 1, start + part_size - 1)
        path = f"{OUT}.part{i}"
        part_paths.append((path, start, end))
        t = threading.Thread(target=download_range, args=(url, start, end, path, i), daemon=True)
        t.start()
        threads.append(t)

    while any(t.is_alive() for t in threads):
        done = 0
        for path, start, end in part_paths:
            if os.path.exists(path):
                done += os.path.getsize(path)
        pct = 100.0 * done / size
        print(f"progress: {done/1e6:.1f}/{size/1e6:.1f} MB ({pct:.1f}%)", flush=True)
        time.sleep(10)

    for t in threads:
        t.join()

    print("assembling...", flush=True)
    with open(OUT, "wb") as out:
        for path, start, end in part_paths:
            need = end - start + 1
            got = os.path.getsize(path)
            if got != need:
                raise SystemExit(f"incomplete part {path}: {got}/{need}")
            with open(path, "rb") as inp:
                while True:
                    chunk = inp.read(1024 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)
    for path, _, _ in part_paths:
        os.remove(path)
    print(f"OK wrote {OUT} ({os.path.getsize(OUT)} bytes)", flush=True)


if __name__ == "__main__":
    main()
