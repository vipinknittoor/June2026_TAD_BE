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

      // Automatically switch to landscape orientation if there are more than 6 columns
      const isLandscape = columns.length > 6;
      const printableWidth = isLandscape ? 742 : 495;
      const pageBoundaryY = isLandscape ? 520 : 770;
      const footerY = isLandscape ? 530 : 780;

      // Scale column widths to fit the printable width exactly
      const totalWidthDefault = columns.reduce((acc, col) => acc + col.width, 0);
      if (totalWidthDefault > 0) {
        const scale = printableWidth / totalWidthDefault;
        columns = columns.map(col => ({
          ...col,
          width: Math.floor(col.width * scale)
        }));
      }

      const filePath = path.join(reportsDir, filename);
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        layout: isLandscape ? 'landscape' : 'portrait',
        bufferPages: true
      });
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
            lineBreak: true // Wrap headers nicely to prevent cutting off words
          });
          currentX += col.width;
        });
      };

      // Draw first header
      drawHeader(y);
      y += 24;

      // Draw rows
      data.forEach((row, rowIndex) => {
        // Pre-format all cell values and calculate required row height
        const formattedRow: Record<string, string> = {};
        let maxRowHeight = 20; // Default minimum row height

        columns.forEach(col => {
          let val = row[col.key];
          
          // Format cell value
          if (val === undefined || val === null) {
            val = '-';
          } else if (val instanceof Date) {
            val = val.toLocaleDateString();
          } else if (typeof val === 'object') {
            if (Array.isArray(val)) {
              val = val.map((item: any) => item.name || item.email || item.id || JSON.stringify(item)).join(', ');
            } else {
              val = val.name || val.email || JSON.stringify(val);
            }
          } else {
            val = String(val);
          }

          formattedRow[col.key] = val;

          // Set temporary doc font size for accurate height check
          doc.fontSize(8.5);
          const cellHeight = doc.heightOfString(val, {
            width: col.width - 10,
          }) + 10; // 10 points total padding (5 points top, 5 points bottom)

          if (cellHeight > maxRowHeight) {
            maxRowHeight = cellHeight;
          }
        });

        // Page boundary check: We use pageBoundaryY dynamically depending on orientation
        if (y + maxRowHeight > pageBoundaryY) {
          doc.addPage();
          y = 50;
          drawHeader(y);
          y += 24;
        }

        // Alternating row background shading using dynamic maxRowHeight
        if (rowIndex % 2 === 1) {
          doc.rect(startX, y, totalWidth, maxRowHeight).fill(altRowBg);
        }

        doc.fillColor(textColor).fontSize(8.5);
        let cellX = startX;

        columns.forEach(col => {
          const val = formattedRow[col.key];

          doc.text(val, cellX + 5, y + 5, {
            width: col.width - 10,
            lineBreak: true
          });

          cellX += col.width;
        });

        // Bottom border line for row using dynamic maxRowHeight
        doc.moveTo(startX, y + maxRowHeight)
          .lineTo(startX + totalWidth, y + maxRowHeight)
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .stroke();

        y += maxRowHeight;
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
            footerY,
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
