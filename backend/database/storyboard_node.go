package database

import (
	"time"
)

// StoryboardNode 分镜节点模型
type StoryboardNode struct {
	ID           int        `json:"id"`
	StoryboardID int        `json:"storyboardId"`
	NodeType     string     `json:"nodeType"`
	PositionX    float64    `json:"positionX"`
	PositionY    float64    `json:"positionY"`
	Width        float64    `json:"width"`
	Height       float64    `json:"height"`
	ConfigJSON   *string    `json:"configJson,omitempty"`
	State        string     `json:"state"`
	ResultJSON   *string    `json:"resultJson,omitempty"`
	OrderIndex   *int       `json:"orderIndex,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

// CreateNode 创建节点
func CreateNode(storyboardID int, nodeType string, posX, posY float64, configJSON string) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO storyboard_nodes (storyboard_id, node_type, position_x, position_y, config_json)
		VALUES (?, ?, ?, ?, ?)
	`, storyboardID, nodeType, posX, posY, configJSON)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

// GetNodesByStoryboard 获取画布所有节点
func GetNodesByStoryboard(storyboardID int) ([]StoryboardNode, error) {
	rows, err := DB.Query(`
		SELECT id, storyboard_id, node_type, position_x, position_y, width, height,
		       config_json, state, result_json, order_index, created_at, updated_at
		FROM storyboard_nodes WHERE storyboard_id = ?
		ORDER BY order_index ASC, id ASC
	`, storyboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []StoryboardNode
	for rows.Next() {
		var n StoryboardNode
		if err := rows.Scan(
			&n.ID, &n.StoryboardID, &n.NodeType, &n.PositionX, &n.PositionY,
			&n.Width, &n.Height, &n.ConfigJSON, &n.State, &n.ResultJSON,
			&n.OrderIndex, &n.CreatedAt, &n.UpdatedAt,
		); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return nodes, nil
}

// UpdateNode 更新节点
func UpdateNode(id int, configJSON string, posX, posY float64) error {
	_, err := DB.Exec(`
		UPDATE storyboard_nodes SET config_json = ?, position_x = ?, position_y = ?, updated_at = ?
		WHERE id = ?
	`, configJSON, posX, posY, time.Now(), id)
	return err
}

// DeleteNode 删除节点
func DeleteNode(id int) error {
	_, err := DB.Exec("DELETE FROM storyboard_nodes WHERE id = ?", id)
	return err
}

// GetNodeByID 根据ID获取节点
func GetNodeByID(id int) (*StoryboardNode, error) {
	var n StoryboardNode
	err := DB.QueryRow(`
		SELECT id, storyboard_id, node_type, position_x, position_y, width, height,
		       config_json, state, result_json, order_index, created_at, updated_at
		FROM storyboard_nodes WHERE id = ?
	`, id).Scan(
		&n.ID, &n.StoryboardID, &n.NodeType, &n.PositionX, &n.PositionY,
		&n.Width, &n.Height, &n.ConfigJSON, &n.State, &n.ResultJSON,
		&n.OrderIndex, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

// BatchCreateNodes 批量创建节点
func BatchCreateNodes(storyboardID int, nodes []StoryboardNode) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for i, n := range nodes {
		_, err := tx.Exec(`
			INSERT INTO storyboard_nodes (storyboard_id, node_type, position_x, position_y, width, height, config_json, order_index)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, storyboardID, n.NodeType, n.PositionX, n.PositionY, n.Width, n.Height, n.ConfigJSON, i)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
