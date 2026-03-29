package cohere

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/relay/adaptor/openai"
	"github.com/songquanpeng/one-api/relay/model"
)

type CohereRerankRequest struct {
	Model           string   `json:"model"`
	Query           string   `json:"query"`
	Documents       []string `json:"documents"`
	TopN            int      `json:"top_n,omitempty"`
	MaxChunksPerDoc int      `json:"max_chunks_per_doc,omitempty"`
}

type CohereRerankResponse struct {
	Results []CohereRerankResult `json:"results"`
	Meta    CohereRerankMeta     `json:"meta"`
}

type CohereRerankResult struct {
	Index          int     `json:"index"`
	RelevanceScore float64 `json:"relevance_score"`
}

type CohereRerankMeta struct {
	Tokens CohereRerankTokens `json:"tokens"`
}

type CohereRerankTokens struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

func RerankHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError), nil
	}
	err = resp.Body.Close()
	if err != nil {
		return openai.ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError), nil
	}

	var cohereResponse CohereRerankResponse
	err = json.Unmarshal(responseBody, &cohereResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	rerankResults := make([]model.RerankResult, len(cohereResponse.Results))
	for i, result := range cohereResponse.Results {
		rerankResults[i] = model.RerankResult{
			Index:          result.Index,
			RelevanceScore: result.RelevanceScore,
		}
	}

	usage := model.Usage{
		PromptTokens:     cohereResponse.Meta.Tokens.InputTokens,
		CompletionTokens: cohereResponse.Meta.Tokens.OutputTokens,
		TotalTokens:      cohereResponse.Meta.Tokens.InputTokens + cohereResponse.Meta.Tokens.OutputTokens,
	}

	openAIRerankResponse := model.RerankResponse{
		Object:  "list",
		Model:   c.GetString("original_model"),
		Usage:   &usage,
		Results: rerankResults,
	}

	jsonResponse, err := json.Marshal(openAIRerankResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}

	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = c.Writer.Write(jsonResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "write_response_failed", http.StatusInternalServerError), nil
	}

	return nil, &usage
}
