#!/usr/bin/env python3
"""
Douyin video extractor using Playwright - returns JSON with video URL and title
"""

import asyncio
import sys
import re
import json
from playwright.async_api import async_playwright

async def extract_video_info(url: str) -> dict:
    """Extract video URL and title from Douyin share URL using headless browser"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN'
        )
        await context.set_extra_http_headers({
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })

        page = await context.new_page()

        try:
            print(f"Navigating to: {url}", file=sys.stderr)

            # Set up network interception BEFORE navigating
            video_urls = []
            def handle_response(response):
                url = response.url
                if 'douyin_pc_client' in url:
                    return
                if '.mp4' in url or 'douyinvideo' in url:
                    if 'aweme' in url or 'video' in url:
                        video_urls.append(url)
                        print(f"Video response: {url[:100]}...", file=sys.stderr)

            page.on("response", handle_response)

            await page.goto(url, wait_until='domcontentloaded', timeout=30000)

            result = {
                'video_url': '',
                'title': '',
                'error': ''
            }

            # Method 1: Try to get video src via JavaScript after page fully loads
            # Wait longer for the full video to load (preview videos are usually shorter ~9s)
            try:
                video_info = await page.evaluate('''() => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            // Try to get title
                            const title = document.title || '';

                            const video = document.querySelector('video');
                            let video_url = '';
                            let video_duration = 0;

                            if (video) {
                                video_url = video.currentSrc || video.src || '';
                                video_duration = video.duration || 0;
                            }

                            // Try to get from RENDER_DATA or __NEXT_DATA__
                            const scripts = document.querySelectorAll('script');
                            for (const script of scripts) {
                                const text = script.textContent;
                                if (text && text.includes('playAddr')) {
                                    // Try to find longer video URL (not preview)
                                    const matches = text.matchAll(/"playAddr"\\s*:\\s*"([^"]+)"/g);
                                    for (const match of matches) {
                                        const url = match[1];
                                        // Prefer URLs that don't contain 'douyin_pc_client' (preview)
                                        if (url && !url.includes('douyin_pc_client') && !video_url) {
                                            video_url = url;
                                        }
                                    }
                                }
                            }

                            resolve({
                                video_url: video_url,
                                title: title,
                                video_duration: video_duration
                            });
                        }, 5000);
                    });
                }''')

                if video_info:
                    result['video_url'] = video_info.get('video_url', '')
                    video_duration = video_info.get('video_duration', 0)
                    # Clean title - remove common suffixes
                    title = video_info.get('title', '')
                    title = re.sub(r'[-_]抖音$', '', title)
                    title = re.sub(r'@抖音$', '', title)
                    result['title'] = title.strip()

                    # Check if video duration is too short (preview video is usually ~9 seconds)
                    if result['video_url'] and video_duration > 0 and video_duration < 30:
                        print(f"Video duration {video_duration}s is too short (likely preview), trying other methods...", file=sys.stderr)
                        result['video_url'] = ''  # Force to try other methods

                    if result['video_url']:
                        clean_url = result['video_url'].replace('\\/', '/').replace('\\u002F', '/').replace('&amp;', '&')
                        print(f"Found video: {clean_url[:100]}..., duration: {video_duration}s", file=sys.stderr)
                        print(f"Found title: {result['title']}", file=sys.stderr)
                        await browser.close()
                        return result

            except Exception as e:
                print(f"JS evaluation error: {e}", file=sys.stderr)
                result['error'] = str(e)

            # Clear error for next method attempt
            result['error'] = ''

            # Method 2: Network interception (listener already set up before navigation)
            print("Waiting for network responses...", file=sys.stderr)
            await asyncio.sleep(8)

            if video_urls:
                # Filter and select the best URL
                valid_urls = []
                for vurl in video_urls:
                    if vurl.startswith('http') and '.mp4' in vurl:
                        # Skip URLs with size indicators that suggest previews
                        clean_url = vurl.replace('\\/', '/').replace('&amp;', '&')
                        # Prefer URLs with 'aweme' (full video) over generic 'video' URLs
                        if 'aweme' in clean_url:
                            valid_urls.insert(0, clean_url)  # Priority to aweme URLs
                        else:
                            valid_urls.append(clean_url)

                if valid_urls:
                    result['video_url'] = valid_urls[0]
                    print(f"Returning from network: {valid_urls[0][:100]}...", file=sys.stderr)
                    await browser.close()
                    return result

            result['error'] = 'No video URL found'
            print(result['error'], file=sys.stderr)
            await browser.close()
            return result

        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            await browser.close()
            return {'video_url': '', 'title': '', 'error': str(e)}

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_douyin.py <douyin_url>", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    result = asyncio.run(extract_video_info(url))

    # Output as JSON for Go to parse
    if result['video_url']:
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
