package database

import "time"

// StoryboardEdge 节点连线模型
type StoryboardEdge struct {
	ID           int       `json:"id"`
	StoryboardID int       `json:"storyboardId"`
	SourceNodeID int       `json:"sourceNodeId"`
	TargetNodeID int       `json:"targetNodeId"`
	SourceHandle string    `json:"sourceHandle,omitempty"`
	TargetHandle string    `json:"targetHandle,omitempty"`
	Label        string    `json:"label,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// CreateEdge 创建连线
func CreateEdge(storyboardID, sourceNodeID, targetNodeID int, sourceHandle, targetHandle, label string) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO storyboard_edges (storyboard_id, source_node_id, target_node_id, source_handle, target_handle, label)
		VALUES (?, ?, ?, ?, ?, ?)
	`, storyboardID, sourceNodeID, targetNodeID, sourceHandle, targetHandle, label)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

// GetEdgesByStoryboard 获取画布所有连线
func GetEdgesByStoryboard(storyboardID int) ([]StoryboardEdge, error) {
	rows, err := DB.Query(`
		SELECT id, storyboard_id, source_node_id, target_node_id, source_handle, target_handle, label, created_at
		FROM storyboard_edges WHERE storyboard_id = ?
	`, storyboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var edges []StoryboardEdge
	for rows.Next() {
		var e StoryboardEdge
		if err := rows.Scan(
			&e.ID, &e.StoryboardID, &e.SourceNodeID, &e.TargetNodeID,
			&e.SourceHandle, &e.TargetHandle, &e.Label, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return edges, nil
}

// DeleteEdge 删除连线
func DeleteEdge(id int) error {
	_, err := DB.Exec("DELETE FROM storyboard_edges WHERE id = ?", id)
	return err
}

// DeleteEdgesByStoryboard 删除画布所有连线
func DeleteEdgesByStoryboard(storyboardID int) error {
	_, err := DB.Exec("DELETE FROM storyboard_edges WHERE storyboard_id = ?", storyboardID)
	return err
}
