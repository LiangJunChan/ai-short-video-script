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

// Execute 执行整个工作流
func (e *WorkflowEngine) Execute() (*RunResult, error) {
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

	// 3. 创建执行记录
	runID, err := createRun(e.StoryboardID, e.UserID)
	if err != nil {
		return nil, fmt.Errorf("创建执行记录失败: %v", err)
	}

	// 4. 依次执行每个节点
	var results []NodeExecutionResult
	totalCost := 0
	nodeOutputs := make(map[int]string) // nodeID -> output
	hasError := false

	for _, node := range orderedNodes {
		// 跳过不需要执行的节点类型
		if node.NodeType == "scene" || node.NodeType == "start" || node.NodeType == "end" {
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
			database.DB.Exec("UPDATE storyboard_nodes SET state = 'error', result_json = ?, updated_at = ? WHERE id = ?",
				result.Error, time.Now(), node.ID)
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
		database.DB.Exec("UPDATE storyboard_nodes SET state = 'error', result_json = ? WHERE id = ?", result.Error, nodeID)
	}

	return &result, nil
}

// executeNode 执行单个节点
func (e *WorkflowEngine) executeNode(node database.StoryboardNode, nodeOutputs map[int]string) NodeExecutionResult {
	// 解析节点配置
	var config map[string]interface{}
	if node.ConfigJSON != nil && *node.ConfigJSON != "" {
		json.Unmarshal([]byte(*node.ConfigJSON), &config)
	}

	// 获取上游节点的输入文本
	inputText := e.getInputText(node, nodeOutputs)

	switch node.NodeType {
	case "ai_text":
		return e.executeAIText(node.ID, config, inputText)
	case "ai_split":
		return e.executeAISplit(node.ID, inputText)
	case "ai_image":
		return e.executeAIImage(node.ID)
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
			Error:   "缺少输入文案：请将 ai_text 节点连接到此节点",
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

// executeAIImage 执行 AI 图片生成节点（占位）
func (e *WorkflowEngine) executeAIImage(nodeID int) NodeExecutionResult {
	return NodeExecutionResult{
		NodeID:  nodeID,
		Status:  "error",
		Error:   "AI 图片生成功能暂未实现",
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

// createRun 创建执行记录
func createRun(storyboardID, userID int) (int, error) {
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
