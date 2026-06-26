import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface PDFTableColumn {
  key: string;
  label: string;
  width: number; // in points
}

/**
 * Generates a styled grid PDF report from a set of data rows and columns.
 * Saves the file to `uploads/reports` and returns the static url path.
 */
export async function generatePDFReport(
  filename: string,
  title: string,
  columns: PDFTableColumn[],
  data: any[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, filename);
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Colors
      const primaryColor = '#1A365D'; // Dark Navy
      const secondaryColor = '#2B6CB0'; // Medium Slate Blue
      const textColor = '#2D3748'; // Dark Charcoal
      const borderColor = '#E2E8F0'; // Borders
      const altRowBg = '#F7FAFC'; // Alternating row
      const white = '#FFFFFF';

      // Header title
      doc.fillColor(primaryColor)
        .fontSize(20)
        .text(title, 50, 50)
        .moveDown(0.2);

      // Generation date
      doc.fillColor(textColor)
        .fontSize(9)
        .text(`Generated on: ${new Date().toLocaleString()}`)
        .moveDown(1.5);

      let y = doc.y;
      const startX = 50;
      const totalWidth = columns.reduce((acc, col) => acc + col.width, 0);

      // Helper function to draw a table header block
      const drawHeader = (startY: number) => {
        doc.rect(startX, startY, totalWidth, 24).fill(secondaryColor);
        doc.fillColor(white).fontSize(10);
        let currentX = startX;
        columns.forEach(col => {
          doc.text(col.label, currentX + 5, startY + 7, {
            width: col.width - 10,
            align: 'left',
            lineBreak: false
          });
          currentX += col.width;
        });
      };

      // Draw first header
      drawHeader(y);
      y += 24;

      // Draw rows
      data.forEach((row, rowIndex) => {
        // Page boundary check: A4 height is 842. Margins 50 points top/bottom.
        if (y > 720) {
          doc.addPage();
          y = 50;
          drawHeader(y);
          y += 24;
        }

        // Alternating row background shading
        if (rowIndex % 2 === 1) {
          doc.rect(startX, y, totalWidth, 20).fill(altRowBg);
        }

        doc.fillColor(textColor).fontSize(8.5);
        let cellX = startX;

        columns.forEach(col => {
          let val = row[col.key];
          
          // Format cell value
          if (val === undefined || val === null) {
            val = '-';
          } else if (val instanceof Date) {
            val = val.toLocaleDateString();
          } else if (typeof val === 'object') {
            if (Array.isArray(val)) {
              val = val.map(item => item.name || item.email || item.id || JSON.stringify(item)).join(', ');
            } else {
              val = val.name || val.email || JSON.stringify(val);
            }
          } else {
            val = String(val);
          }

          doc.text(val, cellX + 5, y + 5, {
            width: col.width - 10,
            height: 12,
            ellipsis: true,
            lineBreak: false
          });

          cellX += col.width;
        });

        // Bottom border line for row
        doc.moveTo(startX, y + 20)
          .lineTo(startX + totalWidth, y + 20)
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .stroke();

        y += 20;
      });

      // Total Pages Pagination Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#A0AEC0')
          .fontSize(8)
          .text(
            `Page ${i + 1} of ${range.count}`,
            50,
            780,
            { align: 'center', width: doc.page.width - 100 }
          );
      }

      doc.end();

      stream.on('finish', () => {
        resolve(`/uploads/reports/${filename}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
