import os
import subprocess
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent

def run_step(title: str, cmd: list) -> bool:
    print(f"\n[*] RUNNING: {title}")
    print(f"    Command: {' '.join(cmd)}")
    env = os.environ.copy()
    backend_dir = str(root_dir / "backend")
    env["PYTHONPATH"] = backend_dir + os.pathsep + env.get("PYTHONPATH", "")
    res = subprocess.run(cmd, cwd=str(root_dir), env=env)
    if res.returncode == 0:
        print(f"[+] PASS: {title}")
        return True
    else:
        print(f"[-] FAIL: {title} (Exit code: {res.returncode})")
        return False

def main():
    print("=" * 60)
    print("FILEWATCH AUTOMATED SECURITY & QUALITY AUDIT SUITE")
    print("=" * 60)

    results = []
    # 1. Pytest suite
    results.append(("Pytest 31 Tests", run_step("Pytest Test Suite", [sys.executable, "-m", "pytest", "backend", "-v"])))

    # 2. Bandit scan
    results.append(("Bandit AST Security Scan", run_step("Bandit Security Scan", [sys.executable, "-m", "bandit", "-r", "backend/app"])))

    print("\n" + "=" * 60)
    print("AUDIT RESULTS SUMMARY")
    print("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "PASSED" if passed else "FAILED"
        print(f"  {name:<35} : {status}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\n[+] ALL SECURITY AND UNIT CHECKS PASSED SUCCESSFULLY.")
    else:
        print("\n[-] ONE OR MORE CHECKS ENCOUNTERED ISSUES.")

if __name__ == "__main__":
    main()

