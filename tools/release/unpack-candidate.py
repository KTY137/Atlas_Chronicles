# SPDX-License-Identifier: BUSL-1.1
# Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
"""Extract exactly the three public release files, never a test world or a link."""
import pathlib
import stat
import sys
import zipfile

def unpack(archive: str, destination: str) -> None:
    allowed = {"Atlas-Chronicles-Setup.exe", "SHA256SUMS.txt", "release-evidence.json"}
    with zipfile.ZipFile(archive) as bundle:
        entries = bundle.infolist()
        if len(entries) != 3 or {entry.filename for entry in entries} != allowed:
            raise ValueError("Candidate must contain exactly the three public release files")
        if sum(entry.file_size for entry in entries) > 400_000_000:
            raise ValueError("Candidate exceeds extraction budget")
        if any(entry.is_dir() or stat.S_ISLNK(entry.external_attr >> 16) for entry in entries):
            raise ValueError("Candidate contains directory or symbolic link")
        out = pathlib.Path(destination)
        out.mkdir(exist_ok=False)
        for entry in entries:
            with bundle.open(entry) as src, (out / entry.filename).open("xb") as dst:
                while block := src.read(1024 * 1024):
                    dst.write(block)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: unpack-candidate.py candidate.zip output-directory")
    unpack(*sys.argv[1:])
