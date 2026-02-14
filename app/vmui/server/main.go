package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"strings"
)

var (
	listenAddr     = flag.String("listen", ":3001", "TCP address to listen on")
	victoriaLogsURL = flag.String("victorialogs.url", "http://localhost:9428", "VictoriaLogs base URL")
)

func main() {
	flag.Parse()

	http.HandleFunc("/insert/lookup", handleLookupUpload)
	http.HandleFunc("/api/health", handleHealth)

	log.Printf("vmui-backend listening on %s", *listenAddr)
	log.Printf("VictoriaLogs URL: %s", *victoriaLogsURL)
	log.Fatal(http.ListenAndServe(*listenAddr, nil))
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"status":"ok"}`)
}

func handleLookupUpload(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var csvReader *csv.Reader
	var filename string

	ct := r.Header.Get("Content-Type")
	mediaType, params, _ := mime.ParseMediaType(ct)

	switch {
	case mediaType == "multipart/form-data":
		// File upload
		boundary := params["boundary"]
		mr := multipart.NewReader(r.Body, boundary)
		part, err := mr.NextPart()
		if err != nil {
			jsonError(w, "failed to read multipart: "+err.Error(), http.StatusBadRequest)
			return
		}
		filename = part.FileName()
		filename = strings.TrimSuffix(filename, ".csv")
		csvReader = csv.NewReader(part)

	case mediaType == "application/json":
		// Pasted CSV content
		var body struct {
			Filename string `json:"filename"`
			Content  string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if body.Filename == "" || body.Content == "" {
			jsonError(w, "filename and content are required", http.StatusBadRequest)
			return
		}
		filename = body.Filename
		csvReader = csv.NewReader(strings.NewReader(body.Content))

	default:
		jsonError(w, "unsupported content type", http.StatusBadRequest)
		return
	}

	// Parse CSV
	headers, err := csvReader.Read()
	if err != nil {
		jsonError(w, "failed to read CSV headers: "+err.Error(), http.StatusBadRequest)
		return
	}

	var ndjsonBuf bytes.Buffer
	totalRows := 0

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			jsonError(w, "CSV parse error: "+err.Error(), http.StatusBadRequest)
			return
		}

		row := make(map[string]string, len(headers)+2)
		vals := make([]string, 0, len(record))
		for i, h := range headers {
			if i < len(record) {
				row[h] = record[i]
				vals = append(vals, record[i])
			}
		}
		row["_lookup"] = filename
		row["_msg"] = strings.Join(vals, " ")

		line, _ := json.Marshal(row)
		ndjsonBuf.Write(line)
		ndjsonBuf.WriteByte('\n')
		totalRows++
	}

	if totalRows == 0 {
		jsonError(w, "CSV contains no data rows", http.StatusBadRequest)
		return
	}

	log.Printf("Parsed %d rows for lookup %q", totalRows, filename)

	// Forward to VictoriaLogs
	url := fmt.Sprintf("%s/insert/jsonline?_stream_fields=_lookup&_msg_field=_msg", *victoriaLogsURL)
	resp, err := http.Post(url, "application/stream+json", &ndjsonBuf)
	if err != nil {
		jsonError(w, "failed to forward to VictoriaLogs: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode/100 != 2 {
		body, _ := io.ReadAll(resp.Body)
		jsonError(w, fmt.Sprintf("VictoriaLogs responded with %d: %s", resp.StatusCode, string(body)), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"filename":  filename,
		"totalRows": totalRows,
	})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
