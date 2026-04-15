#!/usr/bin/env python3
"""
Douyin video extractor using Playwright - returns JSON with video URL and title
"""

import asyncio
import sys
import re
import json
import time
from urllib.parse import unquote
from playwright.async_api import async_playwright

CHALLENGE_CHECK_INTERVAL_MS = 2000
CHALLENGE_MAX_WAIT_SECONDS = 45
DETAIL_WAIT_MS = 8000

def _looks_like_waf_challenge(html: str) -> bool:
    if not html:
        return True
    text = html.lower()
    markers = ["please wait", "waf-jschallenge", "_wafchallengeid", "argus-csp-token"]
    return any(m in text for m in markers)

async def _wait_until_page_ready(page, max_wait_seconds=CHALLENGE_MAX_WAIT_SECONDS):
    deadline = time.monotonic() + max_wait_seconds
    while time.monotonic() < deadline:
        try:
            html = await page.content()
        except Exception as e:
            msg = str(e).lower()
            if "navigating" in msg or "execution context was destroyed" in msg:
                await page.wait_for_timeout(CHALLENGE_CHECK_INTERVAL_MS)
                continue
            return False
        if not _looks_like_waf_challenge(html):
            return True
        await page.wait_for_timeout(CHALLENGE_CHECK_INTERVAL_MS)
    return False

def _first_http_url(urls):
    if not isinstance(urls, list):
        return None
    for url in urls:
        if isinstance(url, str) and url.startswith("http"):
            return url
    return None

def _extract_src_from_aweme_detail(detail_payload):
    """从 aweme_detail payload 中提取最高质量视频URL"""
    if not isinstance(detail_payload, dict):
        return None
    aweme = detail_payload.get("aweme_detail")
    if not isinstance(aweme, dict):
        return None
    video = aweme.get("video")
    if not isinstance(video, dict):
        return None

    # 优先选最高码率
    bit_rates = video.get("bit_rate")
    if isinstance(bit_rates, list):
        sortable = []
        for item in bit_rates:
            if not isinstance(item, dict):
                continue
            score = item.get("bit_rate", 0)
            play_addr = item.get("play_addr")
            urls = play_addr.get("url_list") if isinstance(play_addr, dict) else []
            src = _first_http_url(urls)
            if src:
                sortable.append((score, src))
        if sortable:
            sortable.sort(key=lambda x: x[0], reverse=True)
            return sortable[0][1]

    # fallback 字段
    for key in ["play_addr_h264", "play_addr", "download_addr", "play_addr_265"]:
        addr = video.get(key)
        if isinstance(addr, dict):
            src = _first_http_url(addr.get("url_list"))
            if src:
                return src
    return None

def _deep_find_aweme_detail(obj):
    """深度搜索 aweme_detail 结构"""
    if isinstance(obj, dict):
        if "aweme_detail" in obj and isinstance(obj.get("aweme_detail"), dict):
            return obj
        for v in obj.values():
            found = _deep_find_aweme_detail(v)
            if found:
                return found
    elif isinstance(obj, list):
        for it in obj:
            found = _deep_find_aweme_detail(it)
            if found:
                return found
    return None

def _extract_src_from_sigi_state(state: dict):
    """从 SIGI_STATE 中提取视频URL"""
    if not isinstance(state, dict):
        return None
    item_module = state.get("ItemModule") or state.get("itemModule") or {}
    if isinstance(item_module, dict):
        for _k, v in item_module.items():
            if not isinstance(v, dict):
                continue
            video = v.get("video") or {}
            if not isinstance(video, dict):
                continue
            for key in ["playAddr", "play_addr", "downloadAddr", "download_addr"]:
                addr = video.get(key)
                if isinstance(addr, dict):
                    src = _first_http_url(addr.get("urlList") or addr.get("url_list") or [])
                    if src:
                        return src
    return None

def _extract_from_html_fallback(html: str):
    """HTML回退解析：SIGI_STATE 和 RENDER_DATA"""
    if not html:
        return None

    # SIGI_STATE JSON
    m = re.search(r'<script id="SIGI_STATE"[^>]*>(.*?)</script>', html, re.S)
    if m:
        try:
            state = json.loads(m.group(1))
            src = _extract_src_from_sigi_state(state)
            if src:
                print(f"Found video from SIGI_STATE", file=sys.stderr)
                return src
        except Exception:
            pass

    # RENDER_DATA urlencoded JSON
    m = re.search(r'RENDER_DATA=([^&]+)&', html)
    if m:
        try:
            decoded = unquote(m.group(1))
            data = json.loads(decoded)
            found = _deep_find_aweme_detail(data)
            src = _extract_src_from_aweme_detail(found) if found else None
            if src:
                print(f"Found video from RENDER_DATA", file=sys.stderr)
                return src
        except Exception:
            pass

    return None

async def extract_video_info(url: str) -> dict:
    """Extract video URL and title from Douyin share URL using headless browser"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN'
        )
        await context.set_extra_http_headers({
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })

        page = await context.new_page()

        result = {
            'video_url': '',
            'title': '',
            'error': ''
        }

        aweme_detail_payload = None
        media_candidates = []
        response_tasks = []

        # 拦截非必要资源，减少加载时间
        async def route_handler(route):
            if route.request.resource_type in ["image", "font", "stylesheet"]:
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", route_handler)

        # 收集响应
        async def handle_response(response):
            nonlocal aweme_detail_payload
            try:
                url = response.url
                if response.status in [200, 206] and "douyinvod.com" in url and url.startswith("http"):
                    media_candidates.append(url)
                if response.status == 200 and "/aweme/v1/web/aweme/detail/" in url and aweme_detail_payload is None:
                    aweme_detail_payload = await response.json()
            except Exception:
                return

        page.on("response", handle_response)

        try:
            print(f"Navigating to: {url}", file=sys.stderr)
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
        except Exception as e:
            print(f"Page load error: {e}", file=sys.stderr)
            result['error'] = f'页面加载失败: {e}'
            await browser.close()
            return result

        # 检测视频不存在
        try:
            u = (page.url or "").lower()
            if "web_video_404_link" in u or "item_non_existent" in u:
                print(f"Video non-existent, url={page.url}", file=sys.stderr)
                result['error'] = '视频不存在或已删除'
                await browser.close()
                return result
        except Exception:
            pass

        # 等待 WAF challenge 完成
        ready = await _wait_until_page_ready(page, max_wait_seconds=CHALLENGE_MAX_WAIT_SECONDS)
        if not ready:
            print(f"WAF challenge not resolved", file=sys.stderr)
            result['error'] = 'WAF验证超时，请稍后重试'
            await browser.close()
            return result

        # 等待网络响应捕获
        await page.wait_for_timeout(DETAIL_WAIT_MS)

        src = None

        # 方法1: 从 aweme_detail API 响应提取
        if aweme_detail_payload:
            print(f"Found aweme_detail via network interception", file=sys.stderr)
            src = _extract_src_from_aweme_detail(aweme_detail_payload)
            if src:
                print(f"Extracted from aweme_detail: {src[:100]}...", file=sys.stderr)

        # 方法2: 从 intercept 的 media candidates 选择
        if not src and media_candidates:
            print(f"Using intercepted media candidate", file=sys.stderr)
            src = media_candidates[0]

        # 方法3: HTML 回退解析 (SIGI_STATE / RENDER_DATA)
        if not src:
            try:
                html = await page.content()
                src = _extract_from_html_fallback(html)
            except Exception as e:
                print(f"HTML fallback error: {e}", file=sys.stderr)

        # 方法4: DOM video 标签
        if not src:
            try:
                print(f"Attempting DOM extraction", file=sys.stderr)
                src = await page.evaluate("""() => {
                    const v = document.querySelector('video');
                    if (!v) return null;
                    if (v.src && v.src.startsWith('http')) return v.src;
                    const sources = Array.from(v.querySelectorAll('source'));
                    const mp4 = sources.find(s => s.type === 'video/mp4');
                    return mp4 ? mp4.src : (sources[0] ? sources[0].src : null);
                }""")
            except Exception as e:
                print(f"DOM src evaluate failed: {e}", file=sys.stderr)

        if not src:
            result['error'] = '无法提取视频地址'
            print(result['error'], file=sys.stderr)
            await browser.close()
            return result

        # 清理 URL
        clean_url = src.replace('\\/', '/').replace('\\u002F', '/').replace('&amp;', '&')
        result['video_url'] = clean_url

        # 获取标题
        try:
            title = await page.title()
            title = re.sub(r'[-_]抖音$', '', title)
            title = re.sub(r'@抖音$', '', title)
            result['title'] = title.strip()
            print(f"Title: {result['title']}", file=sys.stderr)
        except Exception:
            pass

        await browser.close()
        return result

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
