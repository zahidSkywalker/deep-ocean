#!/usr/bin/env python3
"""Upload video to Cloudinary"""
import subprocess, json, time, hashlib, hmac, sys

filepath = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/production/output/ant_grasshopper_preview.mp4"
CLOUD_NAME = "dbi2rwlso"
API_KEY = "975947371117363"
API_SECRET = "Y-CEk6WYx-uDd_R7L7gByjk5Fdg"

timestamp = str(int(time.time()))
public_id = "ant_and_grasshopper_preview"
# Cloudinary signature: sha1(api_secret + sorted params) - must include ALL params except file, api_key, signature, resource_type
string_to_sign = f"public_id={public_id}&timestamp={timestamp}"
signature = hmac.new(API_SECRET.encode(), string_to_sign.encode(), hashlib.sha1).hexdigest()

print(f"Uploading: {filepath}")
print(f"File size: {subprocess.run(['du','-h',filepath], capture_output=True).stdout.decode().strip().split()[0]}")

result = subprocess.run([
    "curl", "-s", "-X", "POST",
    f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/video/upload",
    "-F", f"file=@{filepath}",
    "-F", f"api_key={API_KEY}",
    "-F", f"timestamp={timestamp}",
    "-F", f"signature={signature}",
    "-F", "resource_type=video",
    "-F", "public_id=ant_and_grasshopper_preview",
], capture_output=True, text=True, timeout=600)

try:
    resp = json.loads(result.stdout)
    url = resp.get("secure_url", "")
    public_id = resp.get("public_id", "")
    duration = resp.get("duration", "")
    bytes_size = resp.get("bytes", "")
    
    if url:
        print(f"SUCCESS!")
        print(f"URL: {url}")
        print(f"Public ID: {public_id}")
        print(f"Duration: {duration}s")
        print(f"Size: {bytes_size} bytes")
    else:
        print(f"Response: {json.dumps(resp, indent=2)[:500]}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Stdout: {result.stdout[:500]}")
    print(f"Stderr: {result.stderr[:500]}")
