import os
import platform
import subprocess
import sys
import time
import signal

def main():
    print("==================================================")
    # 1. Start FastAPI Backend in the background
    backend_dir = os.path.join(os.getcwd(), "Backend")
    print("Starting FastAPI backend on port 8000...")
    
    # We set the working directory to Backend so uvicorn finds the app module
    backend_process = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir
    )

    # 2. Wait briefly to let the backend initialize
    time.sleep(3)

    # 3. Determine the frontend port (Databricks port or local default 3000)
    port = os.environ.get("DATABRICKS_APP_PORT", "3000")
    print(f"Starting Next.js frontend on port {port} (binding to 0.0.0.0)...")

    is_windows = platform.system() == "Windows"
    npm_bin = "npm.cmd" if is_windows else "npm"
    frontend_dir = os.path.join(os.getcwd(), "Frontend")

    # Command: npm run start -- -p <port> -H 0.0.0.0
    frontend_cmd = [npm_bin, "run", "start", "--", "-p", port, "-H", "0.0.0.0"]

    try:
        # Run Next.js in the foreground (blocking)
        # On Databricks, Next.js handles the user requests directly
        subprocess.run(frontend_cmd, cwd=frontend_dir, check=True)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    except Exception as e:
        print(f"\nNext.js process exited with error: {e}")
    finally:
        print("Terminating Backend process...")
        try:
            # Terminate uvicorn cleanly
            if is_windows:
                backend_process.terminate()
            else:
                os.kill(backend_process.pid, signal.SIGINT)
            backend_process.wait(timeout=5)
        except Exception:
            # Force kill if needed
            backend_process.kill()
        print("Shutdown complete.")
    print("==================================================")

if __name__ == "__main__":
    main()
