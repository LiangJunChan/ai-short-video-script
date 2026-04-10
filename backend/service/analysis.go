package service

import (
	"encoding/json"
	"fmt"
	"strings"
)

// AnalysisResult 分析结果结构
type AnalysisResult struct {
	Structure *StructureAnalysis  `json:"structure,omitempty"`
	ViralPoints []string          `json:"viralPoints,omitempty"`
	Tags       []string           `json:"tags,omitempty"`
	Rhythm     *RhythmAnalysis    `json:"rhythm,omitempty"`
	Report     string             `json:"report,omitempty"`
}

// StructureAnalysis 文案结构分析
type StructureAnalysis struct {
	Hook       *HookPart       `json:"hook,omitempty"`
	Content    *ContentPart    `json:"content,omitempty"`
	Ending     *EndingPart     `json:"ending,omitempty"`
}

// HookPart 开头钩子
type HookPart struct {
	Text        string `json:"text"`
	Duration    string `json:"duration"`    // 如 "0-3秒"
	Feature     string `json:"feature"`      // 特点描述
}

// ContentPart 主体内容
type ContentPart struct {
	Duration    string `json:"duration"`
	Structure   string `json:"structure"`   // 如 "观点+案例+总结"
	Points      []string `json:"points"`    // 核心要点
}

// EndingPart 结尾
type EndingPart struct {
	Text        string `json:"text"`
	Duration    string `json:"duration"`
	Action      string `json:"action"`      // 引导动作，如 "关注点赞"
}

// FormatStructureAnalysis 格式化输出文案结构分析结果
func (s *StructureAnalysis) Format() string {
	if s == nil {
		return "暂无分析结果"
	}

	var sb strings.Builder

	if s.Hook != nil {
		sb.WriteString("【开头钩子】\n")
		sb.WriteString(fmt.Sprintf("  文字内容：%s\n", s.Hook.Text))
		sb.WriteString(fmt.Sprintf("  时长：%s\n", s.Hook.Duration))
		sb.WriteString(fmt.Sprintf("  特点：%s\n", s.Hook.Feature))
		sb.WriteString("\n")
	}

	if s.Content != nil {
		sb.WriteString("【主体内容】\n")
		sb.WriteString(fmt.Sprintf("  时长：%s\n", s.Content.Duration))
		sb.WriteString(fmt.Sprintf("  结构：%s\n", s.Content.Structure))
		if len(s.Content.Points) > 0 {
			sb.WriteString("  核心要点：\n")
			for _, p := range s.Content.Points {
				sb.WriteString(fmt.Sprintf("    - %s\n", p))
			}
		}
		sb.WriteString("\n")
	}

	if s.Ending != nil {
		sb.WriteString("【结尾引导】\n")
		sb.WriteString(fmt.Sprintf("  文字内容：%s\n", s.Ending.Text))
		sb.WriteString(fmt.Sprintf("  时长：%s\n", s.Ending.Duration))
		sb.WriteString(fmt.Sprintf("  引导动作：%s\n", s.Ending.Action))
	}

	return sb.String()
}

// RhythmAnalysis 口播节奏分析
type RhythmAnalysis struct {
	PausePoints  []PausePoint `json:"pausePoints,omitempty"`
	HighlightMoments []HighlightMoment `json:"highlightMoments,omitempty"`
	DurationSuggestion string `json:"durationSuggestion,omitempty"`
}

// PausePoint 停顿点
type PausePoint struct {
	Position    string `json:"position"`    // 如 "开头"
	Description string `json:"description"`
}

// HighlightMoment 高潮点
type HighlightMoment struct {
	Position    string `json:"position"`    // 如 "中部"
	Description string `json:"description"`
}

// AnalyzeVideoStructure 分析文案结构（钩子/内容/结尾）
func AnalyzeVideoStructure(text string, duration float64) (string, error) {
	provider := getCurrentProvider()

	systemPrompt := `你是一个专业的短视频文案分析师。请分析以下文案的结构，将其分为三部分：
1. 开头钩子：前3-5秒，用来吸引观众注意力的部分
2. 主体内容：中间部分，核心信息传递
3. 结尾引导：最后3-5秒，引导关注/点赞/评论的部分

请用JSON格式输出：
{
  "hook": {"text": "钩子原文", "duration": "0-3秒", "feature": "特点描述"},
  "content": {"duration": "3-45秒", "structure": "结构描述", "points": ["要点1", "要点2"]},
  "ending": {"text": "结尾原文", "duration": "45-50秒", "action": "引导动作"}
}

注意：如果视频总时长不足60秒，请根据实际情况调整时间段划分。`

	userContent := fmt.Sprintf("视频时长：%.0f秒\n\n文案内容：\n%s", duration, text)

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}

	response, err := provider.Chat(messages)
	if err != nil {
		return "", err
	}

	// 解析 JSON 响应
	analysis, err := parseStructureAnalysis(response)
	if err != nil || analysis == nil {
		// 如果解析失败，返回原始响应
		return response, nil
	}
	// 返回格式化后的结果
	return analysis.Format(), nil
}

func parseStructureAnalysis(jsonStr string) (*StructureAnalysis, error) {
	// 尝试提取 JSON 部分（去掉可能的 markdown 代码块）
	jsonStr = strings.TrimSpace(jsonStr)
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	// 使用标准 JSON 解析
	result := &StructureAnalysis{}
	if err := json.Unmarshal([]byte(jsonStr), result); err != nil {
		// 如果解析失败，返回 nil error 让调用方使用原始响应
		return nil, err
	}
	return result, nil
}

// AnalyzeViralPoints 分析爆款点
func AnalyzeViralPoints(text string) (string, error) {
	provider := getCurrentProvider()

	systemPrompt := `你是一个专业的短视频内容分析师。请分析以下文案爆在哪里，从以下几个维度分析：
1. 选题：是否击中目标人群的痛点/痒点/共鸣点
2. 表达方式：是否通俗易懂、有记忆点、有感染力
3. 情绪价值：是否提供了情绪出口（认同感/焦虑感/优越感/归属感等）
4. 结构：开头是否吸引人，结尾是否有引导

请输出一段简洁的分析，直接列出3-5个爆款点。不要使用JSON格式。`

	userContent := fmt.Sprintf("文案内容：\n%s", text)

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}

	response, err := provider.Chat(messages)
	if err != nil {
		return "", err
	}

	// 格式化为带标题的输出
	var sb strings.Builder
	sb.WriteString("【爆款点分析】\n")
	lines := strings.Split(strings.TrimSpace(response), "\n")
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			// 去掉可能的序号
			line = strings.TrimLeft(line, "0123456789.、、 ")
			sb.WriteString(fmt.Sprintf("  %d. %s\n", i+1, line))
		}
	}
	return sb.String(), nil
}

// ExtractTags 提取选题标签
func ExtractTags(text string) (string, error) {
	provider := getCurrentProvider()

	systemPrompt := `你是一个专业的短视频内容标签分析师。请从以下文案中提取核心选题和标签。

请分析文案涉及的主题领域、情感类型、内容类型等，输出5-8个标签。

标签格式要求：
- 用 # 开头，如 #职场 #情感 #干货
- 标签要精准，不要过于宽泛或过于细分
- 按相关性从高到低排列

请直接输出标签，用空格分隔，不要有多余的解释。`

	userContent := fmt.Sprintf("文案内容：\n%s", text)

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}

	response, err := provider.Chat(messages)
	if err != nil {
		return "", err
	}

	// 格式化为带标题的输出
	var sb strings.Builder
	sb.WriteString("【选题标签】\n")
	words := strings.Fields(response)
	for _, word := range words {
		word = strings.TrimSpace(word)
		if strings.HasPrefix(word, "#") {
			sb.WriteString(fmt.Sprintf("  %s\n", word))
		}
	}
	return sb.String(), nil
}

// AnalyzeRhythm 分析口播节奏
func AnalyzeRhythm(text string, duration float64) (string, error) {
	provider := getCurrentProvider()

	systemPrompt := `你是一个专业的短视频口播节奏分析师。请分析以下文案的口播节奏特点：

1. 停顿点：分析文案中适合停顿的地方（让观众消化信息）
2. 高潮点：分析文案中情绪或信息的高潮位置
3. 时长建议：根据文案内容量，建议的短视频时长

请用简洁的语言输出分析结果。`

	userContent := fmt.Sprintf("视频时长：%.0f秒\n\n文案内容：\n%s", duration, text)

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}

	response, err := provider.Chat(messages)
	if err != nil {
		return "", err
	}

	// 格式化为带标题的输出
	var sb strings.Builder
	sb.WriteString("【口播节奏分析】\n")
	sb.WriteString(fmt.Sprintf("  视频时长：%.0f秒\n", duration))
	sb.WriteString("\n")
	sb.WriteString(response)
	return sb.String(), nil
}

// GenerateAnalysisReport 生成完整分析报告
func GenerateAnalysisReport(text string, duration float64, structure *StructureAnalysis, viralPoints []string, tags []string) (string, error) {
	provider := getCurrentProvider()

	systemPrompt := "你是一个专业的短视频文案分析师。请根据以下分析结果，生成一份结构化的爆款文案分析报告。\n\n报告格式要求：\n【爆款文案结构分析】\n- 开头钩子：...（描述）\n- 主体内容：...（描述）\n- 结尾引导：...（描述）\n\n【爆款点分析】\n- ...（逐条列出）\n\n【标签】\n#标签1 #标签2 ...\n\n请直接输出报告内容，不要有多余的格式符号（如 markdown 代码块）。"

	userContent := fmt.Sprintf("视频时长：%.0f秒\n文案内容：\n%s", duration, text)

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}

	response, err := provider.Chat(messages)
	if err != nil {
		return "", err
	}

	// 清理格式符号
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "```markdown")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	return response, nil
}
