import { jsPDF } from "jspdf";
import type { Artifact } from "@/hooks/useArtifacts";

export type ExportFormat = "csv" | "json" | "markdown" | "pdf";

export function exportArtifactsToCSV(artifacts: Artifact[]): string {
  const headers = ["ID", "Type", "Title", "Status", "Created At", "Updated At", "Content"];
  const rows = artifacts.map((a) => [
    a.short_id,
    a.type,
    `"${a.title.replace(/"/g, '""')}"`,
    a.status,
    new Date(a.created_at).toISOString(),
    new Date(a.updated_at).toISOString(),
    `"${(a.content_markdown || JSON.stringify(a.content_json) || "").replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportArtifactsToJSON(artifacts: Artifact[]): string {
  const exportData = artifacts.map((a) => ({
    id: a.short_id,
    type: a.type,
    title: a.title,
    status: a.status,
    created_at: a.created_at,
    updated_at: a.updated_at,
    content: a.content_markdown || a.content_json,
    tags: a.tags,
    labels: a.labels,
  }));
  return JSON.stringify(exportData, null, 2);
}

export function exportArtifactsToMarkdown(artifacts: Artifact[]): string {
  return artifacts
    .map((a) => {
      const content = a.content_markdown || JSON.stringify(a.content_json, null, 2);
      return `# ${a.title}

**ID:** ${a.short_id}  
**Type:** ${a.type}  
**Status:** ${a.status}  
**Created:** ${new Date(a.created_at).toLocaleDateString()}  
**Updated:** ${new Date(a.updated_at).toLocaleDateString()}

---

${content}

---
`;
    })
    .join("\n\n");
}

export function exportArtifactsToPDF(artifacts: Artifact[]): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let y = margin;

  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  };

  // Title
  addText("OneTraceAI - Artifacts Export", 18, true);
  addText(`Generated: ${new Date().toLocaleString()}`, 10);
  addText(`Total Artifacts: ${artifacts.length}`, 10);
  y += lineHeight;

  artifacts.forEach((artifact, index) => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }

    // Artifact header
    addText(`${index + 1}. ${artifact.title}`, 14, true);
    addText(`ID: ${artifact.short_id} | Type: ${artifact.type} | Status: ${artifact.status}`, 10);
    addText(`Created: ${new Date(artifact.created_at).toLocaleDateString()} | Updated: ${new Date(artifact.updated_at).toLocaleDateString()}`, 10);
    y += 3;

    // Content
    const content = artifact.content_markdown || JSON.stringify(artifact.content_json, null, 2) || "No content";
    const truncatedContent = content.length > 500 ? content.substring(0, 500) + "..." : content;
    addText(truncatedContent, 10);
    
    y += lineHeight;
    
    // Separator
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineHeight;
  });

  return doc;
}

export function downloadExport(artifacts: Artifact[], format: ExportFormat, filename: string = "artifacts-export") {
  let content: string | Blob;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case "csv":
      content = exportArtifactsToCSV(artifacts);
      mimeType = "text/csv";
      extension = "csv";
      break;
    case "json":
      content = exportArtifactsToJSON(artifacts);
      mimeType = "application/json";
      extension = "json";
      break;
    case "markdown":
      content = exportArtifactsToMarkdown(artifacts);
      mimeType = "text/markdown";
      extension = "md";
      break;
    case "pdf":
      const doc = exportArtifactsToPDF(artifacts);
      doc.save(`${filename}.pdf`);
      return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
