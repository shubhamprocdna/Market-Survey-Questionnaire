import { jsPDF } from 'jspdf';

function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Replace headers
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Lists
  html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  
  return html;
}

export function exportToDoc(content: string, filename: string = 'questionnaire.doc') {
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Market Survey Questionnaire</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #1E3A8A; font-size: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; }
        h2 { color: #1E3A8A; font-size: 20px; margin-top: 20px; }
        h3 { color: #0073CF; font-size: 16px; margin-top: 15px; }
        strong { color: #1E293B; }
        li { margin-bottom: 6px; }
      </style>
    </head>
    <body>
      ${markdownToHtml(content)}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(content: string, filename: string = 'questionnaire.pdf') {
  const doc = new jsPDF();
  
  // Title Setup
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // Navy blue (#1E3A8A)
  doc.text("Market Survey Questionnaire", 20, 25);
  
  // Header line divider
  doc.setDrawColor(226, 232, 240); // Light gray (#E2E8F0)
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);
  
  // Body text setup
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85); // Slate (#334155)
  
  // Process the content line by line to handle markdown headings and lists cleanly
  const rawLines = content.split('\n');
  let y = 40;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const width = doc.internal.pageSize.width - (margin * 2);
  
  for (let rawLine of rawLines) {
    // Determine block styles based on Markdown
    let isHeader1 = false;
    let isHeader2 = false;
    let isHeader3 = false;
    let isList = false;
    
    if (rawLine.startsWith('# ')) {
      isHeader1 = true;
      rawLine = rawLine.substring(2);
    } else if (rawLine.startsWith('## ')) {
      isHeader2 = true;
      rawLine = rawLine.substring(3);
    } else if (rawLine.startsWith('### ')) {
      isHeader3 = true;
      rawLine = rawLine.substring(4);
    } else if (rawLine.startsWith('- ')) {
      isList = true;
      rawLine = `•  ${rawLine.substring(2)}`;
    }
    
    // Set style
    if (isHeader1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      y += 5;
    } else if (isHeader2) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      y += 4;
    } else if (isHeader3) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 115, 207); // Blue (#0073CF)
      y += 3;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
    }
    
    // Parse out double asterisks for bold inline text, and write line wraps
    const cleanLine = rawLine.replace(/\*\*/g, '');
    const splitLines = doc.splitTextToSize(cleanLine, isList ? width - 5 : width);
    
    for (let line of splitLines) {
      // Check page overflow
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
      }
      
      doc.text(line, isList ? margin + 5 : margin, y);
      y += 6; // line spacing
    }
    
    // Extra spacing between blocks
    if (isHeader1 || isHeader2 || isHeader3) {
      y += 4;
    } else {
      y += 2;
    }
  }
  
  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}
