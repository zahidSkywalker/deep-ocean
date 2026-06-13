#!/usr/bin/env python3
"""
Batch Perchance image generator v3 - SIMPLE & ROBUST.
Reload page for each prompt to guarantee fresh image capture.
"""

import os
import sys
import time
import base64
import hashlib
import logging
import subprocess
from pathlib import Path

CHROME_BIN = "/home/z/chrome-bin/chrome-143/chrome"
CHROMEDRIVER = "/home/z/chrome-bin/chromedriver-linux64/chromedriver"
GENERATOR = "mqgfwnim7o"
API_TOKEN = "perm-agent-token-7h3k9p2q"
OUTPUT_DIR = "/home/z/my-project/scifi_video/images"
XVFB_DISPLAY = ":99"
XVFB_RESOLUTION = "1280x720x24"
MAX_WAIT = 45
POLL_INTERVAL = 2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger("V3")


def kill_stale():
    subprocess.run(['pkill', '-9', '-x', 'chrome'], capture_output=True)
    subprocess.run(['pkill', '-9', '-x', 'chromedriver'], capture_output=True)
    subprocess.run(['pkill', '-9', '-x', 'Xvfb'], capture_output=True)
    time.sleep(1)


def start_xvfb():
    p = subprocess.Popen(
        ['Xvfb', XVFB_DISPLAY, '-screen', '0', XVFB_RESOLUTION, '-ac', '-nolisten', 'tcp'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    os.environ['DISPLAY'] = XVFB_DISPLAY
    time.sleep(1)
    return p


def create_browser():
    import undetected_chromedriver as uc
    opts = uc.ChromeOptions()
    opts.binary_location = CHROME_BIN
    for arg in ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
                '--use-gl=swiftshader', '--disable-extensions', '--disable-popup-blocking',
                '--window-size=1280,720', '--lang=en-US,en', '--ozone-platform=x11',
                '--disable-blink-features=AutomationControlled']:
        opts.add_argument(arg)
    opts.add_argument(
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
    )
    driver = uc.Chrome(
        options=opts, driver_executable_path=CHROMEDRIVER,
        headless=False, use_subprocess=True, version_main=143,
    )
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
            window.chrome = { runtime: {} };
        """
    })
    return driver


def generate_one(driver, prompt, scene_num):
    """Generate a single image for a scene. Reloads page each time."""
    from selenium.webdriver.common.by import By
    
    url = f"https://perchance.org/{GENERATOR}?apiToken={API_TOKEN}"
    driver.get(url)
    
    # CF wait
    for i in range(15):
        if "just a moment" not in driver.title.lower():
            break
        time.sleep(1)
    time.sleep(1.5)
    
    # Switch to iframe
    switched = False
    for iframe in driver.find_elements(By.TAG_NAME, "iframe"):
        src = iframe.get_attribute("src") or ""
        if iframe.is_displayed() and "perchance.org" in src and "?" in src:
            driver.switch_to.frame(iframe)
            time.sleep(1.5)
            switched = True
            break
    
    if not switched:
        log.warning(f"[Scene {scene_num}] No iframe found")
        return None
    
    # Find textarea
    textarea = None
    for ta in driver.find_elements(By.TAG_NAME, "textarea"):
        if ta.is_displayed():
            textarea = ta
            break
    if not textarea:
        log.error(f"[Scene {scene_num}] No textarea")
        return None
    
    # Enter prompt
    textarea.clear()
    textarea.send_keys(prompt)
    time.sleep(0.5)
    
    # Click generate
    clicked = False
    for btn in driver.find_elements(By.TAG_NAME, "button"):
        if btn.is_displayed() and ("\u2728" in btn.text or "generate" in btn.text.lower()):
            btn.click()
            clicked = True
            break
    if not clicked:
        log.error(f"[Scene {scene_num}] No generate button")
        return None
    
    # Poll for image
    seen = set()
    poll_start = time.time()
    
    while time.time() - poll_start < MAX_WAIT:
        try:
            images = driver.find_elements(By.XPATH, "//img[starts-with(@src, 'data:image/')]")
        except:
            images = []
        
        for img in images:
            src = img.get_attribute("src") or ""
            if len(src) < 1000:
                continue
            try:
                _, b64 = src.split(",", 1)
                img_bytes = base64.b64decode(b64)
            except:
                continue
            if len(img_bytes) < 20000:
                continue
            h = hashlib.md5(img_bytes).hexdigest()
            if h in seen:
                continue
            seen.add(h)
            
            img_path = os.path.join(OUTPUT_DIR, f"scene_{scene_num:02d}.jpg")
            with open(img_path, "wb") as f:
                f.write(img_bytes)
            return img_path
        
        time.sleep(POLL_INTERVAL)
    
    return None


def main():
    prompts_file = sys.argv[1] if len(sys.argv) > 1 else "prompts.txt"
    prompts = []
    with open(prompts_file) as f:
        for line in f:
            line = line.strip()
            if line:
                prompts.append(line)
    
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    log.info(f"Generating {len(prompts)} images (one per page reload)...")
    
    kill_stale()
    xvfb = start_xvfb()
    driver = create_browser()
    t_overall = time.time()
    
    try:
        results = []
        for idx, prompt in enumerate(prompts):
            img_path = os.path.join(OUTPUT_DIR, f"scene_{idx+1:02d}.jpg")
            
            if os.path.exists(img_path) and os.path.getsize(img_path) > 25000:
                log.info(f"[{idx+1}/{len(prompts)}] EXISTS: scene_{idx+1:02d}.jpg")
                results.append(img_path)
                continue
            
            t = time.time()
            result = generate_one(driver, prompt, idx+1)
            
            if result:
                sz = os.path.getsize(result) // 1024
                log.info(f"[{idx+1}/{len(prompts)}] scene_{idx+1:02d}.jpg ({sz}KB) in {time.time()-t:.1f}s")
                results.append(result)
            else:
                log.error(f"[{idx+1}/{len(prompts)}] FAILED scene_{idx+1:02d}")
                results.append(None)
            
            # Switch back to main frame for next reload
            try:
                driver.switch_to.default_content()
            except:
                pass
    
        total = time.time() - t_overall
        ok = sum(1 for r in results if r)
        log.info(f"\nDONE: {ok}/{len(prompts)} in {total:.1f}s")
        
    finally:
        try:
            driver.quit()
        except:
            pass
        try:
            xvfb.terminate()
        except:
            pass
        kill_stale()


if __name__ == "__main__":
    main()
