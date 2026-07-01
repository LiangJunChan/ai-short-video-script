#!/usr/bin/env python3
"""
Douyin video extractor using Playwright - returns JSON with video URL and title
"""

import asyncio
import os
import sys
import re
import json
import time
from urllib.parse import unquote
from playwright.async_api import async_playwright

CHALLENGE_CHECK_INTERVAL_MS = 2000
# WAF 挑战最长等待:本机浏览器一般 5-15 秒过;容器/新 IP 常触发加强挑战,给到 90 秒
CHALLENGE_MAX_WAIT_SECONDS = 90
# WAF 过后等抖音 SPA 渲染:本机 8s 够;容器里 stealth 后首次访问要拉更多资源,给到 20s
DETAIL_WAIT_MS = 20000

def _looks_like_waf_challenge(html: str) -> bool:
    """判断当前 HTML 是不是 WAF 挑战 shell 页面(而非真实内容页)

    真实内容页的特征:体积大(>50KB) + 有 aweme 相关 payload。
    仅仅出现 waf-jschallenge 等关键词不足以判定 -- 真实页也可能保留 challenge 脚本。
    """
    if not html:
        return True
    # 关键:真实抖音分享页 >50KB(1.2MB 是完整版,压缩过至少也几十 KB);挑战 shell 通常 3-10KB
    if len(html) < 20000:
        return True
    # 有真实内容标志(RENDER_DATA / aweme_detail / SIGI_STATE) 就一定不是 shell
    real_markers = ["render_data=", "aweme_detail", "sigi_state", "playaddr", "play_addr"]
    text_lower = html.lower()
    if any(m in text_lower for m in real_markers):
        return False
    # 既没大也没真实标志:检查是否只有 challenge 内容
    shell_markers = ["please wait", "_wafchallengeid", "argus-csp-token"]
    return any(m in text_lower for m in shell_markers)

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
        # 反检测(stealth)配置:抖音 WAF 会检测 headless chromium 的特征,直接拒绝
        # 关键三招:
        #   1. --disable-blink-features=AutomationControlled 隐藏 Chrome DevTools Protocol 特征
        #   2. UA 对齐容器里实际 chromium 版本(149),不再用旧的 Chrome 120
        #   3. add_init_script 抹掉 navigator.webdriver 属性
        stealth_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
        ]
        # Docker 容器里 chromium 必须 --no-sandbox(容器本身已隔离,不需 chrome sandbox)
        # channel="chromium" 强制用完整 chromium 二进制,避免 playwright 1.49+ 默认找 chrome-headless-shell
        launch_args = {"headless": True, "channel": "chromium", "args": stealth_args}
        if os.environ.get("DOCKER") == "1":
            launch_args["args"] = launch_args["args"] + ["--no-sandbox", "--disable-setuid-sandbox"]

        browser = await p.chromium.launch(**launch_args)
        # UA 从 Chrome 120 → Chrome 149(与 chromium-1228 build 一致),
        # 平台 macOS(容器里跑 Linux 但 UA 装成 macOS,抖音移动/桌面判断走这个)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN',
            timezone_id='Asia/Shanghai',
        )
        await context.set_extra_http_headers({
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'sec-ch-ua': '"Chromium";v="149", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
        })

        # 抹掉 navigator.webdriver,注入模拟真实 Chrome 的 window.chrome 对象
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
            Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['zh-CN','zh','en']});
        """)

        page = await context.new_page()

        result = {
            'video_url': '',
            'title': '',
            'error': ''
        }

        aweme_detail_payload = None
        media_candidates = []
        all_video_urls = []  # 诊断:所有可能是视频的响应

        # 拦截非必要资源，减少加载时间
        async def route_handler(route):
            # 阻止 font/stylesheet 加载减少体积;image 保留(抖音 SPA 需要 poster 触发 video 渲染)
            if route.request.resource_type in ["font", "stylesheet"]:
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", route_handler)

        # 收集响应(放宽匹配:除了 douyinvod.com,也捕获其它已知视频域名和 API)
        video_domain_patterns = ["douyinvod.com", "byteimg.com/img", "aweme.snssdk.com", "amemv.com"]
        api_url_patterns = ["/aweme/v1/web/aweme/detail/", "/aweme/v1/", "/web/api/aweme/"]

        async def handle_response(response):
            nonlocal aweme_detail_payload
            try:
                url = response.url
                status = response.status
                if not url.startswith("http"):
                    return
                # 视频流域名
                if status in [200, 206] and any(p in url for p in video_domain_patterns):
                    media_candidates.append(url)
                    all_video_urls.append(f"[media {status}] {url[:120]}")
                # 明确的 aweme_detail API
                if status == 200 and "/aweme/v1/web/aweme/detail/" in url and aweme_detail_payload is None:
                    aweme_detail_payload = await response.json()
                # 诊断:所有 200 的 aweme API 响应
                elif status == 200 and any(p in url for p in api_url_patterns):
                    all_video_urls.append(f"[api {status}] {url[:150]}")
                # 诊断:所有 mp4 / m3u8 响应(不管什么域名)
                elif status in [200, 206] and (".mp4" in url or ".m3u8" in url):
                    media_candidates.append(url)
                    all_video_urls.append(f"[mp4/m3u8 {status}] {url[:120]}")
            except Exception:
                return

        page.on("response", handle_response)

        try:
            print(f"Navigating to: {url}", file=sys.stderr)
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            # 打印跳转后的最终 URL(v.douyin.com 短链会 302,可能落在 m/webcast/share 等页面)
            print(f"Final URL after redirect: {page.url}", file=sys.stderr)

            # ★★★ 关键跳板:抖音移动分享页 WAF 极严,桌面 video 页需登录会跳首页
            # 依次尝试三种桌面 URL 变体,任一拿到 aweme_detail_payload 就 break
            aweme_id_match_initial = re.search(r'/share/video/(\d+)', page.url or "")
            if aweme_id_match_initial:
                aid = aweme_id_match_initial.group(1)
                # 三种 URL 依次试(discover?modal_id 是抖音站内推荐弹窗,note 是通用格式)
                candidate_urls = [
                    f"https://www.douyin.com/discover?modal_id={aid}",
                    f"https://www.douyin.com/note/{aid}",
                    f"https://www.douyin.com/video/{aid}",
                ]
                for candidate in candidate_urls:
                    if aweme_detail_payload is not None:
                        break
                    print(f"Trying URL variant: {candidate}", file=sys.stderr)
                    try:
                        await page.goto(candidate, wait_until='domcontentloaded', timeout=60000)
                        print(f"  Landed on: {page.url}", file=sys.stderr)
                        # 给 SPA 请求 aweme_detail 的时间
                        await page.wait_for_timeout(8000)
                        # 检查是否已被 handle_response 拿到 payload
                        if aweme_detail_payload is not None:
                            print(f"  ✅ Got aweme_detail_payload from this variant!", file=sys.stderr)
                            break
                        else:
                            print(f"  ✗ No aweme_detail intercepted (page may still be loading)", file=sys.stderr)
                    except Exception as e:
                        print(f"  Variant failed: {e}", file=sys.stderr)
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

        # ★★★ 快路径:如果落在 iesdouyin.com/share/video/<id>/... 走两条子路径
        # 1) 先等 WAF 过完拿到完整 HTML(share 页 SSR,不用等 SPA 渲染)
        # 2) 从 HTML 里挖 RENDER_DATA 里的 aweme_detail
        # 3) 兜底:调 aweme_detail API(可能因 signature 缺失 403)
        is_share_page = False
        aweme_id_match = re.search(r'/share/video/(\d+)', page.url or "")
        if aweme_id_match:
            is_share_page = True
            aweme_id = aweme_id_match.group(1)
            print(f"Detected share page, aweme_id={aweme_id}", file=sys.stderr)

            # 等 WAF 过完拿到完整 HTML(share 页 SSR,HTML 里就有 RENDER_DATA)
            print(f"Waiting for real HTML(not WAF shell)...", file=sys.stderr)
            share_ready = await _wait_until_page_ready(page, max_wait_seconds=CHALLENGE_MAX_WAIT_SECONDS)
            if share_ready:
                print(f"Share page WAF passed", file=sys.stderr)
                try:
                    html = await page.content()
                    print(f"HTML fetched, length={len(html)}", file=sys.stderr)
                    src = _extract_from_html_fallback(html)
                    if src:
                        print(f"Extracted from share HTML: {src[:100]}", file=sys.stderr)
                        clean_url = src.replace('\\/', '/').replace('\\u002F', '/').replace('&amp;', '&')
                        result['video_url'] = clean_url
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
                    else:
                        print(f"HTML content len OK but no aweme_detail found, will try API...", file=sys.stderr)
                except Exception as e:
                    print(f"HTML fetch exception: {e}", file=sys.stderr)
            else:
                print(f"Share page WAF not passed within timeout", file=sys.stderr)

            # 兜底:调 aweme_detail API
            print(f"Trying direct aweme_detail API as fallback...", file=sys.stderr)
            try:
                api_result = await page.evaluate(f"""
                    async () => {{
                        const url = 'https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id={aweme_id}&aid=6383';
                        try {{
                            const resp = await fetch(url, {{
                                method: 'GET',
                                credentials: 'include',
                                headers: {{'Accept': 'application/json'}}
                            }});
                            if (!resp.ok) return {{error: 'HTTP ' + resp.status}};
                            const text = await resp.text();
                            return {{ok: true, body: text}};
                        }} catch (e) {{
                            return {{error: String(e)}};
                        }}
                    }}
                """)
                if isinstance(api_result, dict) and api_result.get('ok'):
                    try:
                        aweme_detail_payload = json.loads(api_result['body'])
                        print(f"Direct API OK, payload keys: {list(aweme_detail_payload.keys())[:5]}", file=sys.stderr)
                    except Exception as e:
                        print(f"Direct API JSON parse fail: {e}", file=sys.stderr)
                else:
                    print(f"Direct API failed: {api_result}", file=sys.stderr)
            except Exception as e:
                print(f"Direct API exception: {e}", file=sys.stderr)

        # 等待 WAF challenge 完成(非分享页:走 douyin.com/video/<id> 桌面 SPA)
        if not is_share_page:
            ready = await _wait_until_page_ready(page, max_wait_seconds=CHALLENGE_MAX_WAIT_SECONDS)
            if not ready:
                print(f"WAF challenge not resolved", file=sys.stderr)
                if not aweme_detail_payload:
                    result['error'] = 'WAF验证超时，请稍后重试'
                    await browser.close()
                    return result
                print(f"But direct API payload available, continue extraction...", file=sys.stderr)
            else:
                print(f"WAF passed, waiting for SPA render...", file=sys.stderr)
        else:
            print(f"Share page path done, proceeding to extract from payload", file=sys.stderr)

        # 先等 <video> 元素出现(比死 sleep 聪明:出现就继续,最多等 DETAIL_WAIT_MS 毫秒)
        try:
            await page.wait_for_selector('video', timeout=DETAIL_WAIT_MS, state='attached')
            print(f"<video> element rendered", file=sys.stderr)
        except Exception as e:
            print(f"<video> not rendered within {DETAIL_WAIT_MS}ms, continue anyway: {e}", file=sys.stderr)

        # 分享 h5 页面 video src 是懒加载的,需要用户交互才拉流
        # 尝试主动"点击"页面来触发:1) 播放按钮 2) video 元素本身 3) 页面中央
        try:
            print(f"Attempting user interaction to trigger lazy video load...", file=sys.stderr)
            # 优先点击可能的播放按钮(常见选择器)
            for selector in ['.play-btn', '[class*="play"]', 'button[aria-label*="播放"]', 'video']:
                try:
                    await page.click(selector, timeout=1500, force=True)
                    print(f"  Clicked: {selector}", file=sys.stderr)
                    break
                except Exception:
                    continue
        except Exception as e:
            print(f"  Click attempt failed (ok): {e}", file=sys.stderr)

        # 再给 API 响应/懒加载 5 秒落地(点击后视频 API 才会请求)
        await page.wait_for_timeout(5000)

        # 诊断:打印当前抓到的所有 URL,方便判断到底缺哪一环
        print(f"Diagnostic: aweme_detail_payload={aweme_detail_payload is not None}, media_candidates={len(media_candidates)}", file=sys.stderr)
        for u in all_video_urls[:15]:
            print(f"  {u}", file=sys.stderr)

        src = None

        # 方法1: 从 aweme_detail API 响应提取
        if aweme_detail_payload:
            print(f"Found aweme_detail via network interception", file=sys.stderr)
            src = _extract_src_from_aweme_detail(aweme_detail_payload)
            if src:
                print(f"Extracted from aweme_detail: {src[:100]}...", file=sys.stderr)

        # 方法2: 从 intercept 的 media candidates 选择
        if not src and media_candidates:
            print(f"Using intercepted media candidate: {media_candidates[0][:100]}", file=sys.stderr)
            src = media_candidates[0]

        # 方法3: HTML 回退解析 (SIGI_STATE / RENDER_DATA)
        if not src:
            try:
                html = await page.content()
                print(f"HTML fallback: content length={len(html)}", file=sys.stderr)
                src = _extract_from_html_fallback(html)
            except Exception as e:
                print(f"HTML fallback error: {e}", file=sys.stderr)

        # 方法4: DOM video 标签
        if not src:
            try:
                print(f"Attempting DOM extraction", file=sys.stderr)
                src = await page.evaluate("""() => {
                    const v = document.querySelector('video');
                    if (!v) return {err: 'no <video> element'};
                    const info = {src: v.src, currentSrc: v.currentSrc, sources: []};
                    for (const s of v.querySelectorAll('source')) {
                        info.sources.push({src: s.src, type: s.type});
                    }
                    return info;
                }""")
                # 兼容旧格式(返回字符串)和新诊断格式(返回对象)
                if isinstance(src, dict):
                    print(f"DOM diagnostic: {src}", file=sys.stderr)
                    # 从诊断结果里挑一个能用的
                    candidate = src.get('currentSrc') or src.get('src')
                    if candidate and candidate.startswith('http'):
                        src = candidate
                    else:
                        for s in src.get('sources', []):
                            if s.get('src', '').startswith('http'):
                                src = s['src']
                                break
                        else:
                            src = None
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
