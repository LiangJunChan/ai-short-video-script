package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"ai-short-video-backend/database"
)

// WorkflowEngine 工作流执行引擎
type WorkflowEngine struct {
	UserID       int
	StoryboardID int
	Force        bool // true = 强制重新执行已成功的节点
}

// NodeExecutionResult 节点执行结果
type NodeExecutionResult struct {
	NodeID   int    `json:"nodeId"`
	Status   string `json:"status"` // done/error
	Output   string `json:"output"` // result_json content
	Error    string `json:"error,omitempty"`
	Credits  int    `json:"credits"`
}

// RunResult 工作流执行结果
type RunResult struct {
	RunID     int                   `json:"runId"`
	Status    string                `json:"status"`
	Results   []NodeExecutionResult `json:"results"`
	TotalCost int                   `json:"totalCost"`
}

// Execute 执行整个工作流。runID 由调用方预先创建（保证异步返回前 run 已存在）。
func (e *WorkflowEngine) Execute(runID int) (ret *RunResult, err error) {
	// panic recover：goroutine 内崩溃时把 run 标记 failed，避免永久 running
	defer func() {
		if r := recover(); r != nil {
			updateRun(runID, "failed", 0)
			ret = &RunResult{RunID: runID, Status: "failed"}
			err = fmt.Errorf("执行 panic: %v", r)
		}
	}()

	// 1. 获取所有节点和边
	nodes, err := database.GetNodesByStoryboard(e.StoryboardID)
	if err != nil {
		return nil, fmt.Errorf("获取节点失败: %v", err)
	}
	edges, err := database.GetEdgesByStoryboard(e.StoryboardID)
	if err != nil {
		return nil, fmt.Errorf("获取边失败: %v", err)
	}

	if len(nodes) == 0 {
		return nil, fmt.Errorf("画布中没有节点")
	}

	// 2. 构建执行顺序（拓扑排序）
	orderedNodes := topologicalSort(nodes, edges)

	// runID 由调用方传入，这里不再 createRun


	// 4. 依次执行每个节点
	var results []NodeExecutionResult
	totalCost := 0
	nodeOutputs := make(map[int]string) // nodeID -> output
	hasError := false

	for _, node := range orderedNodes {
		// start/end 节点是流程标记，纯视觉用，不执行
		if node.NodeType == "start" || node.NodeType == "end" {
			continue
		}

		// scene 节点是数据容器，但它需要"虚拟执行"以把 description/script 暴露给下游
		// 默认跳过已成功执行的节点（除非强制重新执行）
		// 强制执行的来源有两种：全局 e.Force 或节点级 config.force_execute
		nodeForceExecute := false
		if node.ConfigJSON != nil {
			var cfg map[string]interface{}
			if json.Unmarshal([]byte(*node.ConfigJSON), &cfg) == nil {
				if v, ok := cfg["force_execute"].(bool); ok {
					nodeForceExecute = v
				}
			}
		}
		if !e.Force && !nodeForceExecute && node.State == "done" {
			output := ""
			if node.ResultJSON != nil {
				output = *node.ResultJSON
			}
			results = append(results, NodeExecutionResult{
				NodeID:  node.ID,
				Status:  "done",
				Output:  output,
				Credits: 0,
			})
			if node.ResultJSON != nil {
				nodeOutputs[node.ID] = *node.ResultJSON
			}
			continue
		}

		// 更新状态为 running
		database.DB.Exec("UPDATE storyboard_nodes SET state = 'running', updated_at = ? WHERE id = ?",
			time.Now(), node.ID)

		result := e.executeNode(node, nodeOutputs)
		results = append(results, result)
		totalCost += result.Credits

		if result.Status == "done" {
			database.DB.Exec("UPDATE storyboard_nodes SET state = 'done', result_json = ?, updated_at = ? WHERE id = ?",
				result.Output, time.Now(), node.ID)
			nodeOutputs[node.ID] = result.Output
		} else {
			errOutput, _ := json.Marshal(map[string]interface{}{
				"error":   result.Error,
				"credits": 0,
			})
			database.DB.Exec("UPDATE storyboard_nodes SET state = 'error', result_json = ?, updated_at = ? WHERE id = ?",
				string(errOutput), time.Now(), node.ID)
			hasError = true
		}
	}

	// 5. 更新执行记录
	status := "completed"
	if hasError {
		status = "partial_error"
	}
	updateRun(runID, status, totalCost)

	return &RunResult{
		RunID:     runID,
		Status:    status,
		Results:   results,
		TotalCost: totalCost,
	}, nil
}

// ExecuteNode 执行单个节点
func (e *WorkflowEngine) ExecuteNode(nodeID int) (*NodeExecutionResult, error) {
	node, err := database.GetNodeByID(nodeID)
	if err != nil {
		return nil, err
	}

	database.DB.Exec("UPDATE storyboard_nodes SET state = 'running' WHERE id = ?", nodeID)

	nodeOutputs := make(map[int]string)
	result := e.executeNode(*node, nodeOutputs)

	if result.Status == "done" {
		database.DB.Exec("UPDATE storyboard_nodes SET state = 'done', result_json = ? WHERE id = ?", result.Output, nodeID)
	} else {
		errOutput, _ := json.Marshal(map[string]interface{}{
			"error":   result.Error,
			"credits": 0,
		})
		database.DB.Exec("UPDATE storyboard_nodes SET state = 'error', result_json = ? WHERE id = ?", string(errOutput), nodeID)
	}

	return &result, nil
}

// executeNode 执行单个节点
func (e *WorkflowEngine) executeNode(node database.StoryboardNode, nodeOutputs map[int]string) NodeExecutionResult {
	// Check if node needs input but has none
	if e.nodeNeedsInput(node) && !e.nodeHasInput(node, nodeOutputs) {
		return NodeExecutionResult{
			NodeID:  node.ID,
			Status:  "error",
			Error:   "需要上游节点输入或配置提示词",
			Credits: 0,
		}
	}

	// 解析节点配置
	var config map[string]interface{}
	if node.ConfigJSON != nil && *node.ConfigJSON != "" {
		json.Unmarshal([]byte(*node.ConfigJSON), &config)
	}

	// 获取上游节点的输入文本
	inputText := e.getInputText(node, nodeOutputs)

	switch node.NodeType {
	case "scene":
		// scene 节点是数据容器，不调用 AI，但要把 config 暴露给下游节点
		// 虚拟 result_json 包含 description / script / text 三个字段
		// 下游节点通过 getInputText 拿 description（画面描述）作为 prompt
		sceneOutput := map[string]interface{}{
			"text":       getStringConfig(config, "description", getStringConfig(config, "script", "")),
			"description": getStringConfig(config, "description", ""),
			"script":     getStringConfig(config, "script", ""),
		}
		sceneJSON, _ := json.Marshal(sceneOutput)
		return NodeExecutionResult{
			NodeID:  node.ID,
			Status:  "done",
			Output:  string(sceneJSON),
			Credits: 0,
		}
	case "ai_text":
		return e.executeAIText(node.ID, config, inputText)
	case "ai_split":
		return e.executeAISplit(node.ID, inputText)
	case "ai_image":
		return e.executeAIImage(node.ID, config, inputText)
	case "ai_video":
		return e.executeAIVideo(node.ID, config, inputText, nodeOutputs)
	case "tts":
		return e.executeTTS(node.ID)
	default:
		return NodeExecutionResult{
			NodeID:  node.ID,
			Status:  "error",
			Error:   "未知的节点类型: " + node.NodeType,
			Credits: 0,
		}
	}
}

// executeAIText 执行 AI 文案生成节点
func (e *WorkflowEngine) executeAIText(nodeID int, config map[string]interface{}, inputText string) NodeExecutionResult {
	// 从配置中提取参数
	style := "亲切自然"
	if s, ok := config["style"].(string); ok && s != "" {
		style = s
	}
	wordCount := 200
	if wc, ok := config["word_count"].(float64); ok {
		wordCount = int(wc)
	}

	// 如果没有输入文本，使用配置中的 prompt
	topic := inputText
	if topic == "" {
		if p, ok := config["prompt"].(string); ok {
			topic = p
		}
		if t, ok := config["input_text"].(string); ok {
			topic = t
		}
	}
	if topic == "" {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   "缺少输入内容：请在上游节点或配置中提供文案主题",
			Credits: 0,
		}
	}

	prompt := fmt.Sprintf(`你是一个短视频文案专家。请根据以下要求生成短视频文案。

要求：
- 风格：%s
- 字数：约%d字
- 选题/提示：%s

请直接输出文案内容，不要添加额外说明。`, style, wordCount, topic)

	provider := GetProviderForUser(e.UserID)
	response, err := provider.Chat([]ChatMessage{{Role: "user", Content: prompt}})
	if err != nil {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   fmt.Sprintf("AI 调用失败: %v", err),
			Credits: 0,
		}
	}

	// 去掉 LLM 思考标签
	response = stripThinkingTags(response)

	output, _ := json.Marshal(map[string]interface{}{
		"text":    response,
		"credits": 5,
	})
	return NodeExecutionResult{
		NodeID:   nodeID,
		Status:   "done",
		Output:   string(output),
		Credits:  5,
	}
}

// executeAISplit 执行 AI 分镜拆分节点
func (e *WorkflowEngine) executeAISplit(nodeID int, inputText string) NodeExecutionResult {
	if inputText == "" {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   "缺少输入文案：请连接 ai_text 节点或在节点配置中填写 input_text",
			Credits: 0,
		}
	}

	scenes, err := AutoSplitStoryboard(e.UserID, e.StoryboardID, inputText)
	if err != nil {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   fmt.Sprintf("AI 分镜拆分失败: %v", err),
			Credits: 0,
		}
	}

	output, _ := json.Marshal(map[string]interface{}{
		"scenes":  scenes,
		"credits": 5,
	})
	return NodeExecutionResult{
		NodeID:   nodeID,
		Status:   "done",
		Output:   string(output),
		Credits:  5,
	}
}

// executeAIImage 执行 AI 图片生成节点
func (e *WorkflowEngine) executeAIImage(nodeID int, config map[string]interface{}, inputText string) NodeExecutionResult {
	prompt := inputText
	if prompt == "" {
		if p, ok := config["prompt"].(string); ok {
			prompt = p
		}
	}
	if prompt == "" {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   "缺少图片提示词：请在上游节点或配置中提供 prompt",
			Credits: 0,
		}
	}

	size := getStringConfig(config, "size", "1024x768")
	responseFormat := getStringConfig(config, "response_format", "url")
	provider := NewAgnesService(GetUserModelConfig(e.UserID, "image"))
	result, err := provider.GenerateImage(AgnesImageRequest{
		Prompt:         prompt,
		Size:           size,
		ResponseFormat: responseFormat,
	})
	if err != nil {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   fmt.Sprintf("AI 图片生成失败: %v", err),
			Credits: 0,
		}
	}

	output, _ := json.Marshal(map[string]interface{}{
		"image_url":      result.URL,
		"b64_json":       result.B64JSON,
		"revised_prompt": result.RevisedPrompt,
		"model":          result.Model,
		"size":           result.Size,
		"credits":        0,
	})
	return NodeExecutionResult{
		NodeID:  nodeID,
		Status:  "done",
		Output:  string(output),
		Credits: 0,
	}
}

// executeAIVideo 执行 AI 视频生成节点
func (e *WorkflowEngine) executeAIVideo(nodeID int, config map[string]interface{}, inputText string, nodeOutputs map[int]string) NodeExecutionResult {
	mode := getStringConfig(config, "mode", "text_to_video")
	prompt := inputText
	if prompt == "" {
		if p, ok := config["prompt"].(string); ok {
			prompt = p
		}
	}
	if prompt == "" {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   "缺少视频提示词：请在上游节点或配置中提供 prompt",
			Credits: 0,
		}
	}

	imageURL := ""
	if mode == "image_to_video" {
		imageURL = e.getInputImageURL(nodeID, nodeOutputs)
		if imageURL == "" {
			if u, ok := config["image_url"].(string); ok {
				imageURL = strings.TrimSpace(u)
			}
		}
		if imageURL == "" {
			return NodeExecutionResult{
				NodeID:  nodeID,
				Status:  "error",
				Error:   "缺少输入图片：请连接 AI 图片节点或手动填写图片 URL",
				Credits: 0,
			}
		}
	}

	provider := NewAgnesService(GetUserModelConfig(e.UserID, "video"))
	result, err := provider.GenerateVideo(AgnesVideoRequest{
		Prompt:         prompt,
		ImageURL:       imageURL,
		Width:          getIntConfig(config, "width", 1152),
		Height:         getIntConfig(config, "height", 768),
		NumFrames:      getIntConfig(config, "num_frames", 121),
		FrameRate:      getIntConfig(config, "frame_rate", 24),
		NegativePrompt: getStringConfig(config, "negative_prompt", ""),
	})
	if err != nil {
		return NodeExecutionResult{
			NodeID:  nodeID,
			Status:  "error",
			Error:   fmt.Sprintf("AI 视频生成失败: %v", err),
			Credits: 0,
		}
	}

	output, _ := json.Marshal(map[string]interface{}{
		"video_url":  result.VideoURL,
		"task_id":    result.TaskID,
		"video_id":   result.VideoID,
		"status":     result.Status,
		"progress":   result.Progress,
		"model":      result.Model,
		"mode":       mode,
		"image_url":  imageURL,
		"width":      result.Width,
		"height":     result.Height,
		"num_frames": result.NumFrames,
		"frame_rate": result.FrameRate,
		"credits":    0,
	})
	return NodeExecutionResult{
		NodeID:  nodeID,
		Status:  "done",
		Output:  string(output),
		Credits: 0,
	}
}

// executeTTS 执行语音合成节点（占位）
func (e *WorkflowEngine) executeTTS(nodeID int) NodeExecutionResult {
	return NodeExecutionResult{
		NodeID:  nodeID,
		Status:  "error",
		Error:   "语音合成功能暂未实现",
		Credits: 0,
	}
}

// nodeNeedsInput 判断节点类型是否需要上游输入
func (e *WorkflowEngine) nodeNeedsInput(node database.StoryboardNode) bool {
	return node.NodeType == "ai_text" || node.NodeType == "ai_image" ||
		node.NodeType == "ai_split" || node.NodeType == "ai_video" || node.NodeType == "tts"
}

// nodeHasInput 判断节点是否有有效输入（上游边输出或配置提示词）
func (e *WorkflowEngine) nodeHasInput(node database.StoryboardNode, nodeOutputs map[int]string) bool {
	// 检查是否有上游边提供了输出
	edges, _ := database.GetEdgesByStoryboard(e.StoryboardID)
	for _, edge := range edges {
		if edge.TargetNodeID == node.ID {
			if _, ok := nodeOutputs[edge.SourceNodeID]; ok {
				return true
			}
		}
	}
	// 检查配置是否有 prompt/input_text
	if node.ConfigJSON != nil {
		var config map[string]interface{}
		json.Unmarshal([]byte(*node.ConfigJSON), &config)
		if p, ok := config["prompt"].(string); ok && p != "" {
			return true
		}
		if t, ok := config["input_text"].(string); ok && t != "" {
			return true
		}
	}
	return false
}

// getInputText 获取节点的输入文本（从上游节点的输出）
func (e *WorkflowEngine) getInputText(node database.StoryboardNode, nodeOutputs map[int]string) string {
	// 从边中查找指向当前节点的上游节点
	edges, _ := database.GetEdgesByStoryboard(e.StoryboardID)
	for _, edge := range edges {
		if edge.TargetNodeID == node.ID {
			if output, ok := nodeOutputs[edge.SourceNodeID]; ok {
				var result map[string]interface{}
				json.Unmarshal([]byte(output), &result)
				if text, ok := result["text"].(string); ok {
					return text
				}
				if prompt, ok := result["prompt"].(string); ok {
					return prompt
				}
				// ai_split 节点的输出是 {scenes: [...]}
				// 把所有 scenes 的 script 字段拼成一段文本
				if scenes, ok := result["scenes"].([]interface{}); ok && len(scenes) > 0 {
					parts := make([]string, 0, len(scenes))
					for _, s := range scenes {
						scene, ok := s.(map[string]interface{})
						if !ok {
							continue
						}
						if script, ok := scene["script"].(string); ok && strings.TrimSpace(script) != "" {
							parts = append(parts, script)
						}
					}
					if len(parts) > 0 {
						return strings.Join(parts, "\n")
					}
				}
			}
		}
	}
	// 如果没有上游节点的输出，使用配置中的输入
	if node.ConfigJSON != nil {
		var config map[string]interface{}
		json.Unmarshal([]byte(*node.ConfigJSON), &config)
		if prompt, ok := config["prompt"].(string); ok {
			return prompt
		}
		if text, ok := config["input_text"].(string); ok {
			return text
		}
	}
	return ""
}

func (e *WorkflowEngine) getInputImageURL(nodeID int, nodeOutputs map[int]string) string {
	edges, _ := database.GetEdgesByStoryboard(e.StoryboardID)
	for _, edge := range edges {
		if edge.TargetNodeID != nodeID {
			continue
		}
		output, ok := nodeOutputs[edge.SourceNodeID]
		if !ok {
			continue
		}
		var result map[string]interface{}
		if err := json.Unmarshal([]byte(output), &result); err != nil {
			continue
		}
		if imageURL, ok := result["image_url"].(string); ok && strings.TrimSpace(imageURL) != "" {
			return strings.TrimSpace(imageURL)
		}
		if imageURL, ok := result["imageUrl"].(string); ok && strings.TrimSpace(imageURL) != "" {
			return strings.TrimSpace(imageURL)
		}
	}
	return ""
}

func getStringConfig(config map[string]interface{}, key, defaultValue string) string {
	if value, ok := config[key].(string); ok && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return defaultValue
}

func getIntConfig(config map[string]interface{}, key string, defaultValue int) int {
	switch value := config[key].(type) {
	case int:
		return value
	case float64:
		return int(value)
	case json.Number:
		if i, err := value.Int64(); err == nil {
			return int(i)
		}
	}
	return defaultValue
}

// topologicalSort 拓扑排序 - BFS (Kahn's algorithm)
func topologicalSort(nodes []database.StoryboardNode, edges []database.StoryboardEdge) []database.StoryboardNode {
	nodeMap := make(map[int]database.StoryboardNode)
	inDegree := make(map[int]int)
	adjList := make(map[int][]int)

	for _, n := range nodes {
		nodeMap[n.ID] = n
		inDegree[n.ID] = 0
	}
	for _, edge := range edges {
		adjList[edge.SourceNodeID] = append(adjList[edge.SourceNodeID], edge.TargetNodeID)
		inDegree[edge.TargetNodeID]++
	}

	// BFS：从入度为 0 的节点开始
	var queue []int
	for id, deg := range inDegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	var sorted []database.StoryboardNode
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		sorted = append(sorted, nodeMap[current])
		for _, next := range adjList[current] {
			inDegree[next]--
			if inDegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}
	return sorted
}

// CreateRun 创建执行记录，返回 runID。导出给 handler 预先创建 run。
func CreateRun(storyboardID, userID int) (int, error) {
	result, err := database.DB.Exec(`
		INSERT INTO storyboard_runs (storyboard_id, user_id, status) VALUES (?, ?, 'running')
	`, storyboardID, userID)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}

// updateRun 更新执行记录
func updateRun(runID int, status string, totalCredits int) {
	database.DB.Exec(`
		UPDATE storyboard_runs SET status = ?, finished_at = ?, total_credits = ?
		WHERE id = ?
	`, status, time.Now(), totalCredits, runID)
}

// stripThinkingTags 去掉 LLM 思考标签
func stripThinkingTags(s string) string {
	// 去掉 <think>...</think> 标签
	for {
		start := strings.Index(s, "<think>")
		if start == -1 {
			break
		}
		end := strings.Index(s[start:], "</think>")
		if end == -1 {
			break
		}
		s = s[:start] + s[start+end+len("</think></s>"):]
	}
	return strings.TrimSpace(s)
}
