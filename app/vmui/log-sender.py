#!/usr/bin/env python3
import json
import time
import urllib.request
import urllib.error
import sys
from datetime import datetime, timezone

VLOGS_URL = "http://localhost:9428/insert/jsonline?_stream_fields=service,level"
LOG_FILE = sys.argv[1] if len(sys.argv) > 1 else "/tmp/app-logs.json"

print(f"Sending logs from {LOG_FILE} to VictoriaLogs at {VLOGS_URL}...")

def send_log(line):
    try:
        # Send log as-is - VictoriaLogs will convert 'message' to '_msg'
        data = line.encode('utf-8')
        req = urllib.request.Request(VLOGS_URL, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('VL-Msg-Field', 'message')
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        print(f"Error: {e}")
        return None

# Send existing logs first
try:
    with open(LOG_FILE, "r") as f:
        lines = f.readlines()
        for line in lines:
            if line.strip():
                status = send_log(line)
        print(f"Sent {len(lines)} existing logs")
except Exception as e:
    print(f"No existing logs: {e}")

# Follow and send new logs
with open(LOG_FILE, "r") as f:
    f.seek(0, 2)  # Go to end of file
    
    while True:
        line = f.readline()
        if not line:
            time.sleep(1)
            continue
        
        if line.strip():
            status = send_log(line)
            print(f"Sent: {line.strip()[:60]}... ({status})")
