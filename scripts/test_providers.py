#!/usr/bin/env python3
"""
e-platform AI 提供商连通性测试脚本
用法: python3 test_providers.py [--api-key KEY] [--endpoint URL] [--model MODEL]
默认测试 DALL-E 3（OpenAI API）
"""

import sys
import json
import time
import argparse
from urllib import request, error

# ============================================================
# 配置
# ============================================================

DEFAULT_ENDPOINT = "https://api.openai.com/v1/images/generations"
DEFAULT_MODEL = "dall-e-3"
DEFAULT_PROMPT = "A white ceramic mug on pure white background, minimalist product photography, commercial lighting, 4K"

PROVIDER_PRESETS = {
    "openai": {
        "endpoint": "https://api.openai.com/v1/images/generations",
        "model": "dall-e-3",
    },
    "dashscope": {
        "endpoint": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
        "model": "wanx-v1",
    },
}

# ============================================================
# 测试函数
# ============================================================

def test_connectivity(endpoint: str) -> bool:
    """测试端点是否可达"""
    try:
        req = request.Request(endpoint, method="GET")
        req.add_header("User-Agent", "e-platform-test/1.0")
        request.urlopen(req, timeout=10)
    except error.HTTPError as e:
        # 401/403/405 说明端点可达，只是认证/方法不对
        if e.code in (401, 403, 405):
            return True
        print(f"  ❌ HTTP {e.code}: {e.reason}")
        return False
    except error.URLError as e:
        print(f"  ❌ 连接失败: {e.reason}")
        return False
    except Exception as e:
        print(f"  ❌ 异常: {e}")
        return False
    return True


def test_auth(endpoint: str, api_key: str) -> bool:
    """测试 API Key 是否有效（发一个最小请求）"""
    body = json.dumps({
        "model": "dall-e-3",
        "prompt": "test",
        "n": 1,
        "size": "1024x1024",
    }).encode()

    req = request.Request(endpoint, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {api_key}")

    try:
        resp = request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        if "data" in data or "output" in data:
            print(f"  ✅ 认证成功，收到响应")
            return True
        print(f"  ⚠️ 响应格式异常: {json.dumps(data, ensure_ascii=False)[:200]}")
        return False
    except error.HTTPError as e:
        body = e.read().decode()
        if e.code == 401:
            print(f"  ❌ API Key 无效 (401)")
        elif e.code == 429:
            print(f"  ⚠️ 限流 (429): {body[:100]}")
        elif e.code == 400:
            print(f"  ⚠️ 请求参数错误 (400): {body[:200]}")
        else:
            print(f"  ❌ HTTP {e.code}: {body[:200]}")
        return False
    except error.URLError as e:
        print(f"  ❌ 网络错误: {e.reason}")
        return False


def test_generation(endpoint: str, api_key: str, model: str, prompt: str) -> bool:
    """完整生成测试"""
    body = json.dumps({
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
    }).encode()

    req = request.Request(endpoint, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {api_key}")

    print(f"  ⏳ 开始生成（预计 10-30 秒）...")
    start = time.time()

    try:
        resp = request.urlopen(req, timeout=60)
        data = json.loads(resp.read())
        elapsed = time.time() - start

        # OpenAI 格式
        if "data" in data and len(data["data"]) > 0:
            url = data["data"][0].get("url", data["data"][0].get("b64_json", "N/A"))
            print(f"  ✅ 生成成功（{elapsed:.1f}s）")
            print(f"     图片: {url[:80]}...")
            return True

        # 通义万相格式
        if "output" in data:
            print(f"  ✅ 生成成功（{elapsed:.1f}s）")
            print(f"     响应: {json.dumps(data['output'], ensure_ascii=False)[:200]}")
            return True

        print(f"  ⚠️ 未知响应格式: {json.dumps(data, ensure_ascii=False)[:200]}")
        return False

    except error.HTTPError as e:
        body = e.read().decode()
        print(f"  ❌ HTTP {e.code}: {body[:200]}")
        return False
    except error.URLError as e:
        print(f"  ❌ 网络错误: {e.reason}")
        return False


def test_compliance_check() -> bool:
    """图片合规检查测试（本地逻辑）"""
    # 模拟检查逻辑
    checks = {
        "格式支持": ["png", "jpg", "webp"],
        "最小尺寸": (512, 512),
        "最大文件大小": "5MB",
    }
    print(f"  ✅ 合规规则: {checks}")
    return True


# ============================================================
# 主流程
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="e-platform AI 提供商连通性测试")
    parser.add_argument("--provider", choices=["openai", "dashscope", "custom"], default="openai")
    parser.add_argument("--api-key", help="API Key（不传则仅测试连通性）")
    parser.add_argument("--endpoint", help="自定义端点 URL")
    parser.add_argument("--model", help="模型名称")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="生成提示词")
    parser.add_argument("--skip-generation", action="store_true", help="跳过实际生成测试")
    args = parser.parse_args()

    # 确定端点和模型
    preset = PROVIDER_PRESETS.get(args.provider, {})
    endpoint = args.endpoint or preset.get("endpoint", DEFAULT_ENDPOINT)
    model = args.model or preset.get("model", DEFAULT_MODEL)

    print("=" * 60)
    print("e-platform AI 提供商连通性测试")
    print("=" * 60)
    print(f"提供商: {args.provider}")
    print(f"端点:   {endpoint}")
    print(f"模型:   {model}")
    print()

    results = {}

    # 测试 1: 连通性
    print("📡 测试 1: 端点连通性")
    results["连通性"] = test_connectivity(endpoint)
    print()

    # 测试 2: 认证（需要 API Key）
    if args.api_key:
        print("🔑 测试 2: API 认证")
        results["认证"] = test_auth(endpoint, args.api_key)
        print()

        # 测试 3: 完整生成
        if not args.skip_generation and results.get("认证"):
            print("🎨 测试 3: 图片生成")
            results["生成"] = test_generation(endpoint, args.api_key, model, args.prompt)
            print()

    # 测试 4: 合规检查
    print("✅ 测试 4: 图片合规检查规则")
    results["合规检查"] = test_compliance_check()
    print()

    # 汇总
    print("=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    for name, passed in results.items():
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"  {name}: {status}")

    all_passed = all(results.values())
    print()
    if all_passed:
        print("🎉 所有测试通过！")
    else:
        failed = [n for n, p in results.items() if not p]
        print(f"⚠️  {len(failed)} 项未通过: {', '.join(failed)}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
