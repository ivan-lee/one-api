package model

type RerankRequest struct {
	Model           string   `json:"model"`
	Query           string   `json:"query" binding:"required"`
	Documents       []string `json:"documents" binding:"required"`
	TopN            int      `json:"top_n,omitempty"`
	ReturnDocuments bool     `json:"return_documents,omitempty"`
}

type RerankResponse struct {
	Object  string         `json:"object"`
	Model   string         `json:"model"`
	Usage   *Usage         `json:"usage,omitempty"`
	Results []RerankResult `json:"results"`
	ID      string         `json:"id,omitempty"`
}

type RerankResult struct {
	Index          int             `json:"index"`
	RelevanceScore float64         `json:"relevance_score"`
	Document       *RerankDocument `json:"document,omitempty"`
}

type RerankDocument struct {
	Text string `json:"text"`
}
