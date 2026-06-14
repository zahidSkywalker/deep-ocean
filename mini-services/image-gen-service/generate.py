import json
import time
import sys

# This script is designed to be called once and handle multiple generations
# via stdin/stdout to avoid repeated browser startup overhead

from playwright.sync_api import sync_playwright

def main():
    prompt = sys.argv[1]
    resolution = sys.argv[2] if len(sys.argv) > 2 else '768x768'
    result_path = sys.argv[3]

    result = {"success": False, "error": "Unknown error"}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox', '--disable-setuid-sandbox',
                '--disable-gpu', '--disable-dev-shm-usage',
                '--disable-extensions', '--disable-background-networking',
                '--disable-default-apps', '--disable-sync',
                '--no-first-run', '--disable-translate',
                '--disable-component-extensions-with-background-pages',
                '--metrics-recording-only', '--mute-audio',
                '--disable-breakpad', '--disable-client-side-phishing-detection',
            ]
        )
        context = browser.new_context(
            viewport={"width": 800, "height": 600},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.on('dialog', lambda dialog: dialog.accept())

        try:
            print(f"Navigating...", flush=True)
            page.goto('https://perchance.org/mqgfwnim7o', wait_until='load', timeout=45000)

            print(f"Finding output iframe...", flush=True)
            time.sleep(5)

            output_frame = None
            for frame in page.frames:
                if 'bb79c1d083afaadccc21c7c32d6894f7' in frame.url:
                    output_frame = frame
                    break

            if not output_frame:
                result = {"success": False, "error": "Output iframe not found"}
            else:
                output_frame.on('dialog', lambda dialog: dialog.accept())

                print(f"Waiting for prompt input...", flush=True)
                output_frame.wait_for_selector('#promptInput', timeout=20000)

                # Set resolution
                try:
                    output_frame.select_option('#resolutionSelect', resolution)
                except:
                    pass

                print(f"Filling prompt...", flush=True)
                output_frame.fill('#promptInput', prompt)
                time.sleep(0.3)

                print(f"Clicking generate...", flush=True)
                output_frame.click('#generateBtn')

                print(f"Waiting for image...", flush=True)
                for i in range(100):
                    r = output_frame.evaluate('''() => {
                        const img = document.querySelector('#outputImg');
                        if (img && !img.hidden && img.src && img.src.startsWith('data:image'))
                            return {ok: true, len: img.src.length};
                        return {ok: false, btn: document.querySelector('#generateBtn')?.textContent};
                    }''')
                    if r.get('ok'):
                        dataUrl = output_frame.evaluate('() => document.querySelector("#outputImg").src')
                        result = {"success": True, "dataUrl": dataUrl, "prompt": prompt, "resolution": resolution}
                        print(f"SUCCESS! len={len(dataUrl)}", flush=True)
                        break
                    if i % 15 == 0:
                        print(f"  {i}s", flush=True)
                    time.sleep(1)
                else:
                    result = {"success": False, "error": "Timeout waiting for image"}

        except Exception as e:
            result = {"success": False, "error": str(e)}
            print(f"ERROR: {e}", flush=True)
        finally:
            browser.close()

    with open(result_path, 'w') as f:
        json.dump(result, f)
    print("Done!", flush=True)

if __name__ == '__main__':
    main()