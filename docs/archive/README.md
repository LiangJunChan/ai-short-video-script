# 开发归档

本目录存放已完成功能的设计文档（spec）、实现计划（plan）。这些文档记录"当初是怎么设计、怎么实现的"，用于将来回溯。

> **不要直接修改本目录的文档** —— 它们是历史快照。新功能的设计/计划写到项目根的 `docs/superpowers/` 即可。
>
> 当前进度参见根目录 [`README.md`](../../README.md) 和 [`PRODUCT_ROADMAP.md`](../../PRODUCT_ROADMAP.md)。

## 归档清单

| 版本 | 时间 | 主题 | 文件 |
|------|------|------|------|
| **V1.3** | 2026-04-09 | 抖音链接一键提取（Playwright 反爬） | [`v1.3-douyin-extract/plan.md`](v1.3-douyin-extract/plan.md) |
| **V1.6** | 2026-04-15 | 爆款素材库（收藏夹 + 标签 + 搜索 + 批量导出） | [`v1.6-material-library/plan.md`](v1.6-material-library/plan.md) |
| **V1.7** | 2026-04-16 | 短视频广场（公开视频流 + 数据隔离 + 收藏） | [`v1.7-square/`](v1.7-square/) 3 个 plan：主计划 / 前端 SquarePage / 数据隔离修复 |
| **V2.0** | 2026-05-28 ~ 05-29 | 脚本画布阶段一（React Flow + 节点编辑 + AI 分镜 + 模板 + 导出） | [`v2.0-storyboard/`](v2.0-storyboard/) — `design.md`（产品三阶段演进规划）+ `plan.md`（M1-M6 模块拆分） |
| **V2.5** | 2026-06-03 ~ 06-18 | 工作流画布 + 异步执行进度（节点数据流 + goroutine + 1.5s 轮询 + 进度条 + 节点变色） | [`v2.5-async-workflow/`](v2.5-async-workflow/) — `plan-overview.md`（V2.5 总览）+ `spec-async-execution.md`（异步执行设计）+ `plan-async-execution.md`（异步执行实现） |
| **V2.6** | 2026-05-29 | 用户级模型配置（admin/vip 自定义 LLM/Image/Video/TTS 的 provider + key + base + model） | [`v2.6-model-config/`](v2.6-model-config/) — `spec.md`（设计）+ `plan.md`（实现） |

## 检索建议

- 想知道"某个功能为什么这样实现 / 当初的取舍是什么" → 看对应 `spec.md` 或 plan 头部的"决策"段
- 想知道"某段代码改自哪个版本" → 用 `git log -- <file>` 反查 commit，再来查对应版本目录
- 想知道"画布数据库表为什么这样设计" → 看 `v2.0-storyboard/design.md` + `v2.0-storyboard/plan.md` M1 段
- 想知道"异步执行的轮询协议长什么样" → 看 `v2.5-async-workflow/spec-async-execution.md`
- 想知道"用户级配置如何脱敏 / Provider 优先级链" → 看 `v2.6-model-config/spec.md`

## 后续版本

V2.6 之后的新增能力（暗色科技感 UI 迁移、Agnes 2.0 Flash LLM provider、provider 错误化、SIGN_UP 开关）属于增量优化，未单独立 spec/plan，相关 commit message 已记录完整改动：

```
git log --oneline --all -- DESIGN_SPEC.md frontend/src/index.css
```
