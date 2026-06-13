#!/usr/bin/env python3
"""
Batch Perchance image generator v2 - FIXED.
Each generation: clear page, enter prompt, generate, capture ONLY new images.
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
MAX_WAIT = 60
POLL_INTERVAL = 2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger("BatchGen")


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
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--disable-gpu')
    opts.add_argument('--use-gl=swiftshader')
    opts.add_argument('--disable-extensions')
    opts.add_argument('--disable-popup-blocking')
    opts.add_argument('--window-size=1280,720')
    opts.add_argument('--lang=en-US,en')
    opts.add_argument('--ozone-platform=x11')
    opts.add_argument('--disable-blink-features=AutomationControlled')
    opts.add_argument(
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
    )
    driver = uc.Chrome(
        options=opts,
        driver_executable_path=CHROMEDRIVER,
        headless=False,
        use_subprocess=True,
        version_main=143,
    )
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
            window.chrome = { runtime: {} };
        """
    })
    return driver


def main():
    prompts_file = sys.argv[1] if len(sys.argv) > 1 else "prompts.txt"
    prompts = []
    with open(prompts_file) as f:
        for line in f:
            line = line.strip()
            if line:
                prompts.append(line)
    
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    log.info(f"Generating {len(prompts)} images (fresh batch)...")
    
    kill_stale()
    xvfb = start_xvfb()
    
    driver = create_browser()
    t_overall = time.time()
    
    from selenium.webdriver.common.by import By
    
    try:
        url = f"https://perchance.org/{GENERATOR}?apiToken={API_TOKEN}"
        driver.get(url)
        
        for i in range(15):
            if "just a moment" not in driver.title.lower():
                break
            time.sleep(1)
        time.sleep(2)
        log.info("CF bypassed")
        
        # Switch to iframe
        for iframe in driver.find_elements(By.TAG_NAME, "iframe"):
            src = iframe.get_attribute("src") or ""
            if iframe.is_displayed() and "perchance.org" in src and "?" in src:
                driver.switch_to.frame(iframe)
                time.sleep(2)
                break
        
        # Find textarea
        textarea = None
        for ta in driver.find_elements(By.TAG_NAME, "textarea"):
            if ta.is_displayed():
                textarea = ta
                break
        if not textarea:
            log.error("No textarea found!")
            return
        
        # Find generate button
        gen_btn = None
        for btn in driver.find_elements(By.TAG_NAME, "button"):
            if btn.is_displayed() and ("\u2728" in btn.text or "generate" in btn.text.lower()):
                gen_btn = btn
                break
        if not gen_btn:
            log.error("No generate button found!")
            return
        
        log.info("Generator ready.")
        
        # JS to capture all current data:image src hashes (before generation)
        get_current_hashes_js = """
        var imgs = document.querySelectorAll('img[src^="data:image/"]');
        var hashes = [];
        for (var i = 0; i < imgs.length; i++) {
            hashes.push(imgs[i].src.length);
        }
        return JSON.stringify(hashes);
        """
        
        results = []
        
        for idx, prompt in enumerate(prompts):
            img_path = os.path.join(OUTPUT_DIR, f"scene_{idx+1:02d}.jpg")
            
            if os.path.exists(img_path) and os.path.getsize(img_path) > 25000:
                log.info(f"[{idx+1}/{len(prompts)}] Already exists: {img_path}")
                results.append(img_path)
                continue
            
            t_start = time.time()
            
            # Get current image "fingerprints" (src lengths) before generating
            try:
                old_fingerprints = driver.execute_script(get_current_hashes_js)
            except:
                old_fingerprints = "[]"
            
            # Clear textarea, enter prompt
            textarea.clear()
            time.sleep(0.3)
            textarea.send_keys(prompt)
            time.sleep(0.5)
            
            # Click generate
            gen_btn.click()
            
            # Poll for NEW images only
            found = False
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
                    
                    # Check if this is a new image (different src length = different content)
                    try:
                        _, b64 = src.split(",", 1)
                        img_bytes = base64.b64decode(b64)
                    except:
                        continue
                    if len(img_bytes) < 20000:
                        continue
                    
                    # Dedup by MD5
                    content_hash = hashlib.md5(img_bytes).hexdigest()
                    
                    # Skip if this hash matches any previously saved image
                    if any(content_hash == hashlib.md5(open(p, 'rb').read()).hexdigest() for p in results if p):
                        continue
                    
                    with open(img_path, "wb") as f:
                        f.write(img_bytes)
                    
                    elapsed = time.time() - t_start
                    log.info(f"[{idx+1}/{len(prompts)}] scene_{idx+1:02d}.jpg ({len(img_bytes)//1024}KB, hash:{content_hash[:8]}) in {elapsed:.1f}s")
                    results.append(img_path)
                    found = True
                    break
                
                if found:
                    break
                time.sleep(POLL_INTERVAL)
            
            if not found:
                log.warning(f"[{idx+1}/{len(prompts)}] FAILED: scene_{idx+1:02d}")
                results.append(None)
        
        total = time.time() - t_overall
        successful = sum(1 for r in results if r)
        log.info(f"\nDONE: {successful}/{len(prompts)} images in {total:.1f}s ({total/max(successful,1):.1f}s avg)")
        
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
