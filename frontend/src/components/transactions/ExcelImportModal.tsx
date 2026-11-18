import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../api/client";
import { Dialog } from "../ui/dialog";
import type { ImportResult } from "../../types/finance";

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExcelImportModal({
  open,
  onOpenChange,
  onSuccess,
}: ExcelImportModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "csv") {
        toast.error("Please upload an Excel (.xlsx) or CSV (.csv) file");
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "csv") {
        toast.error("Please upload an Excel (.xlsx) or CSV (.csv) file");
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await api.post<ImportResult>(
        "/transactions/import",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setResult(res.data);
      if (res.data.importedRows > 0) {
        toast.success(
          `Successfully imported ${res.data.importedRows} transactions`,
        );
        onSuccess?.();
      } else {
        toast.warning(
          "No transactions could be imported. Check the row errors below.",
        );
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to import file. Please check format.";
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/transactions/template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "finance_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Import template downloaded");
    } catch {
      toast.error("Could not download template");
    }
  };

  const downloadExport = async (format: "xlsx" | "csv") => {
    try {
      const filename =
        format === "xlsx"
          ? "personal_finance_statement.xlsx"
          : "transactions.csv";
      const response = await api.get(`/transactions/export?format=${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Financial statement exported (${format.toUpperCase()})`);
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setResult(null);
    setIsUploading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetModal();
        onOpenChange(val);
      }}
      className="wide"
      title="Financial Data Portability & Excel Engine"
      description="Import transaction batches via Excel/CSV or export multi-sheet financial statements."
    >
      <div className="segmented" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={activeTab === "import" ? "selected" : ""}
          onClick={() => setActiveTab("import")}
        >
          <UploadCloud
            size={14}
            style={{ display: "inline", marginRight: 6 }}
          />
          Batch Import Wizard
        </button>
        <button
          type="button"
          className={activeTab === "export" ? "selected" : ""}
          onClick={() => setActiveTab("export")}
        >
          <Download size={14} style={{ display: "inline", marginRight: 6 }} />
          Export & Template Engine
        </button>
      </div>

      {activeTab === "import" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!result ? (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 10,
                  padding: "28px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--hover)",
                  transition: "border-color 0.2s",
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx, .csv"
                  onChange={handleFileChange}
                />
                <FileSpreadsheet
                  size={38}
                  style={{ margin: "0 auto 10px", color: "var(--muted)" }}
                />
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Drag & Drop Excel (.xlsx) or CSV (.csv) file
                </p>
                <p className="subtle" style={{ justifyContent: "center" }}>
                  or click here to browse files from your computer
                </p>
              </div>

              {selectedFile && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <FileText size={18} color="var(--accent)" />
                    <div>
                      <b style={{ fontSize: 12 }}>{selectedFile.name}</b>
                      <small style={{ display: "block" }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  className="text-link"
                  onClick={downloadTemplate}
                >
                  <Download size={14} /> Download Sample Template
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={!selectedFile || isUploading}
                  onClick={handleImport}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Parsing & Importing…
                    </>
                  ) : (
                    "Upload and Process"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    padding: 12,
                    background: "var(--hover)",
                    borderRadius: 8,
                  }}
                >
                  <small>Total Scanned</small>
                  <b style={{ display: "block", fontSize: 20 }}>
                    {result.totalRows}
                  </b>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#08795515",
                    borderRadius: 8,
                    color: "var(--income)",
                  }}
                >
                  <small>Imported Rows</small>
                  <b style={{ display: "block", fontSize: 20 }}>
                    {result.importedRows}
                  </b>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#bd354f15",
                    borderRadius: 8,
                    color: "var(--expense)",
                  }}
                >
                  <small>Failed Rows</small>
                  <b style={{ display: "block", fontSize: 20 }}>
                    {result.failedRows}
                  </b>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    background: "var(--panel)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--expense)",
                      fontWeight: 600,
                      marginBottom: 8,
                      fontSize: 12,
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>Row Validation Highlights:</span>
                  </div>
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: "4px 0",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          minWidth: 50,
                          color: "var(--muted)",
                        }}
                      >
                        Row {err.row}:
                      </span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="button secondary"
                  onClick={resetModal}
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    resetModal();
                    onOpenChange(false);
                  }}
                >
                  <CheckCircle2 size={15} /> Done
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              padding: 14,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <b style={{ fontSize: 13, display: "block" }}>
                Import Template (.xlsx)
              </b>
              <small style={{ color: "var(--muted)" }}>
                Pre-formatted headers, column styles, and 3 sample transactions.
              </small>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={downloadTemplate}
            >
              <Download size={14} /> Download (.xlsx)
            </button>
          </div>

          <div
            style={{
              padding: 14,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <b style={{ fontSize: 13, display: "block" }}>
                Multi-Sheet Financial Statement (.xlsx)
              </b>
              <small style={{ color: "var(--muted)" }}>
                Full ledger + Executive Financial KPI Summary sheet.
              </small>
            </div>
            <button
              type="button"
              className="button primary"
              onClick={() => downloadExport("xlsx")}
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>

          <div
            style={{
              padding: 14,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <b style={{ fontSize: 13, display: "block" }}>
                Raw CSV Data Export (.csv)
              </b>
              <small style={{ color: "var(--muted)" }}>
                Lightweight comma-separated format compatible with any
                spreadsheet tool.
              </small>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={() => downloadExport("csv")}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
