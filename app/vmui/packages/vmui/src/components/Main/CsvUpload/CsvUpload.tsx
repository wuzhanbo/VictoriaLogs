import { FC, useRef, useState } from "preact/compat";
import Button from "../Button/Button";
import Modal from "../Modal/Modal";
import TextField from "../TextField/TextField";
import "./style.scss";

interface CsvUploadProps {
  onUploadSuccess?: (filename: string, rowCount: number) => void;
}

const CsvUpload: FC<CsvUploadProps> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [filename, setFilename] = useState("");

  const handleClick = () => {
    setShowModal(true);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setShowModal(false);
    await uploadCsv(file.name.replace(".csv", ""), file);
  };

  const handlePasteSubmit = async () => {
    if (!csvContent.trim() || !filename.trim()) {
      setMessage({ type: "error", text: "Please enter both filename and CSV content" });
      return;
    }
    setShowModal(false);
    await uploadCsv(filename, undefined, csvContent);
  };

  const uploadCsv = async (name: string, file?: File, content?: string) => {
    setMessage(null);
    setIsUploading(true);

    try {
      let response;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch("/api/lookup/upload", {
          method: "POST",
          body: formData,
        });
      } else if (content) {
        response = await fetch("/api/lookup/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: name, content }),
        });
      } else {
        throw new Error("No file or content provided");
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Server returned ${response.status}`);
      }

      const result = await response.json();
      setMessage({
        type: "success",
        text: `Uploaded "${result.filename}" with ${result.totalRows} rows`,
      });
      onUploadSuccess?.(result.filename, result.totalRows);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to upload: " + (err as Error).message,
      });
    } finally {
      setIsUploading(false);
      setCsvContent("");
      setFilename("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setCsvContent("");
    setFilename("");
  };

  return (
    <div className="vm-csv-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Button
        onClick={handleClick}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : "Upload CSV"}
      </Button>
      {message && (
        <span className={`vm-csv-upload__message vm-csv-upload__message_${message.type}`}>
          {message.text}
        </span>
      )}
      {showModal && (
        <Modal
          onClose={handleClose}
          title="Upload CSV for Lookup"
        >
          <div className="vm-csv-upload__modal">
            <div className="vm-csv-upload__modal-section">
              <h4>Option 1: Upload File</h4>
              <Button onClick={handleFileUpload}>
                Choose CSV File
              </Button>
            </div>
            <div className="vm-csv-upload__modal-divider">OR</div>
            <div className="vm-csv-upload__modal-section">
              <h4>Option 2: Paste CSV Content</h4>
              <TextField
                label="Filename"
                value={filename}
                onChange={setFilename}
                placeholder="e.g., users"
              />
              <TextField
                label="CSV Content"
                type="textarea"
                value={csvContent}
                onChange={setCsvContent}
                placeholder={"name,email,role\nJohn Doe,john@example.com,admin\nJane Smith,jane@example.com,user"}
              />
              <Button
                onClick={handlePasteSubmit}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CsvUpload;
