package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"ai-short-video-backend/database"
)

// SplitScene 分镜结果
type SplitScene struct {
	Script      string `json:"script"`
	Description string `json:"description"`
	Duration    string `json:"duration"`
	ShotType    string `json:"shot_type"`
	CameraMove  string `json:"camera_move"`
}

// AutoSplitStoryboard AI 自动拆分分镜
func AutoSplitStoryboard(userID int, storyboardID int, text string) ([]SplitScene, error) {
	prompt := fmt.Sprintf(`你是一个短视频分镜脚本专家。请根据以下文案内容，将其拆分为合理的分镜节点。

要求：
1. 每个分镜节点包含：文案片段、画面描述、建议时长、景别、运镜
2. 遵循"钩子→内容→结尾"的短视频结构
3. 每个分镜时长建议 3-15 秒
4. 总分镜数控制在 4-8 个
5. 景别使用：close/medium/long/extreme_close
6. 运镜使用：static/push/pull/pan/track

文案内容：
%s

请以 JSON 数组格式返回，不要包含其他文字：
[{"script":"文案片段","description":"画面描述","duration":"建议时长","shot_type":"景别","camera_move":"运镜"}]`, text)

	provider := GetProviderForUser(userID)
	response, err := provider.Chat([]ChatMessage{
		{Role: "system", Content: "你是JSON生成器。只输出JSON数组，不要输出任何其他文字、解释、思考过程。直接输出以[开头的JSON数组。"},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, fmt.Errorf("AI 调用失败: %v", err)
	}

	response = strings.TrimSpace(response)

	// 去掉 LLM 思考标签
	if idx := strings.LastIndex(response, "</think>"); idx != -1 {
		response = response[idx+len("</think>"):]
	}

	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	var scenes []SplitScene
	if err := json.Unmarshal([]byte(response), &scenes); err != nil {
		return nil, fmt.Errorf("解析 AI 响应失败: %v", err)
	}

	// 创建分镜节点
	for i, scene := range scenes {
		configJSON, _ := json.Marshal(map[string]interface{}{
			"script":      scene.Script,
			"description": scene.Description,
			"duration":    scene.Duration,
			"shot_type":   scene.ShotType,
			"camera_move": scene.CameraMove,
		})
		database.CreateNode(storyboardID, "scene", float64(200+i*350), 200, string(configJSON))
	}

	// 调整 start/end 节点位置，避免与 scene 节点重叠
	existingNodes, _ := database.GetNodesByStoryboard(storyboardID)
	endX := float64(200 + len(scenes)*350)
	for _, n := range existingNodes {
		if n.NodeType == "start" {
			database.DB.Exec("UPDATE storyboard_nodes SET position_x = 50, position_y = 50 WHERE id = ?", n.ID)
		} else if n.NodeType == "end" {
			database.DB.Exec("UPDATE storyboard_nodes SET position_x = ?, position_y = 50 WHERE id = ?", endX, n.ID)
		}
	}

	return scenes, nil
}
