import json
import urllib.request

for tag in ["v1.37", "v1.41", "v1.43", "v1.48", "v1.51", "v1.54"]:
    try:
        with urllib.request.urlopen(
            f"https://api.github.com/repos/anza-xyz/platform-tools/releases/tags/{tag}"
        ) as r:
            d = json.load(r)
        for a in d.get("assets", []):
            if a["name"] == "platform-tools-linux-x86_64.tar.bz2":
                print(f"{tag}: {a['size'] / 1e6:.1f} MB  id={a['id']}")
    except Exception as e:
        print(tag, e)
