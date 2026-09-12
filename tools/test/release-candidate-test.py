# SPDX-License-Identifier: BUSL-1.1
# Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import importlib.util
import pathlib
import stat
import tempfile
import unittest
import zipfile
spec = importlib.util.spec_from_file_location("candidate", pathlib.Path(__file__).parents[1] / "release" / "unpack-candidate.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CandidateTests(unittest.TestCase):
    def check_zip(self, names, succeeds=False, symbolic=False):
        with tempfile.TemporaryDirectory() as d:
            archive = pathlib.Path(d) / "in.zip"
            with zipfile.ZipFile(archive, "w") as z:
                for name in names:
                    entry = zipfile.ZipInfo(name)
                    if symbolic:
                        entry.create_system = 3
                        entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                    z.writestr(entry, b"test")
            out = pathlib.Path(d) / "output"
            if succeeds:
                module.unpack(str(archive), str(out))
                self.assertEqual({p.name for p in out.iterdir()}, set(names))
            else:
                with self.assertRaises(ValueError):
                    module.unpack(str(archive), str(out))
                self.assertFalse(out.exists())

    def test_valid(self):
        self.check_zip(["Atlas-Chronicles-Setup.exe", "SHA256SUMS.txt", "release-evidence.json"], True)

    def test_reject_unexpected_or_traversal(self):
        for wrong in ["../profile.db", "C:\\secrets", "test-world.json", "./Atlas-Chronicles-Setup.exe"]:
            self.check_zip([wrong, "SHA256SUMS.txt", "release-evidence.json"])

    def test_reject_links_and_missing(self):
        self.check_zip(["Atlas-Chronicles-Setup.exe", "SHA256SUMS.txt", "release-evidence.json"], symbolic=True)
        self.check_zip(["Atlas-Chronicles-Setup.exe", "SHA256SUMS.txt"])

if __name__ == "__main__":
    unittest.main()
