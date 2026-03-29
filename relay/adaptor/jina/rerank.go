package jina

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/relay/adaptor/openai"
	"github.com/songquanpeng/one-api/relay/model"
)

type JinaRerankResponse struct {
	Results []JinaRerankResult `json:"results"`
	Usage   JinaUsage          `json:"usage"`
}

type JinaRerankResult struct {
	Document       JinaDocument `json:"document"`
	Index          int          `json:"index"`
	RelevanceScore float64      `json:"relevance_score"`
}

type JinaDocument struct {
	Text string `json:"text"`
}

type JinaUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

func RerankHandler(c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	err = resp.Body.Close()
	if err != nil {
		return nil, openai.ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError)
	}

	var jinaResponse JinaRerankResponse
	err = json.Unmarshal(responseBody, &jinaResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	rerankResults := make([]model.RerankResult, len(jinaResponse.Results))
	for i, result := range jinaResponse.Results {
		rerankResults[i] = model.RerankResult{
			Index:          result.Index,
			RelevanceScore: result.RelevanceScore,
		}
	}

	usage := model.Usage{
		PromptTokens:     jinaResponse.Usage.PromptTokens,
		CompletionTokens: jinaResponse.Usage.CompletionTokens,
		TotalTokens:      jinaResponse.Usage.TotalTokens,
	}

	openAIRerankResponse := model.RerankResponse{
		Object:  "list",
		Model:   c.GetString("original_model"),
		Usage:   &usage,
		Results: rerankResults,
	}

	jsonResponse, err := json.Marshal(openAIRerankResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = c.Writer.Write(jsonResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "write_response_failed", http.StatusInternalServerError)
	}

	return &usage, nil
}
