import type { Member, Project, Subscription } from '../data/types';
import { describeProject, fundingPercent, remainingUnits } from './funding';
import { formatDate, formatNaira } from './format';

const FOREST: [number, number, number] = [18, 54, 40];
const CLAY: [number, number, number] = [168, 69, 42];

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function pdfHeader(doc: import('jspdf').jsPDF, title: string, subtitle: string): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...FOREST);
  doc.text('Gidan Daya', 40, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(74, 87, 81);
  doc.text('CBN Cooperative · project subscriptions', 40, 62);

  doc.setDrawColor(220, 213, 196);
  doc.line(40, 72, 555, 72);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(26, 36, 32);
  doc.text(title, 40, 92);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(74, 87, 81);
  doc.text(subtitle, 40, 106);

  return 122;
}

function pdfFooter(doc: import('jspdf').jsPDF, note: string): void {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(122, 132, 126);
    doc.text(note, 40, 812);
    doc.text(`Page ${page} of ${pages}`, 555, 812, { align: 'right' });
  }
}

export async function exportStatementPdf(subscriptions: Subscription[], memberName: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const name = memberName;
  const startY = pdfHeader(
    doc,
    'Subscription statement',
    `${name} · issued ${formatDate(new Date().toISOString())} · sample data unless connected to Supabase`,
  );

  const committed = subscriptions.reduce((sum, item) => sum + item.amount, 0);
  const paid = subscriptions.reduce((sum, item) => sum + item.paid, 0);

  autoTable(doc, {
    startY,
    head: [['Reference', 'Project', 'Units', 'Committed', 'Paid', 'Outstanding', 'Next due', 'Status']],
    body: subscriptions.map((item) => [
      item.reference,
      item.projectName,
      String(item.units),
      formatNaira(item.amount),
      formatNaira(item.paid),
      formatNaira(Math.max(0, item.amount - item.paid)),
      item.nextDueOn ? formatDate(item.nextDueOn) : '—',
      item.status === 'due' ? 'Payment due' : item.status === 'active' ? 'Active' : 'Completed',
    ]),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 6, textColor: [26, 36, 32], lineColor: [220, 213, 196] },
    headStyles: { fillColor: FOREST, textColor: [247, 243, 234], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [251, 248, 241] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  const afterTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  let cursor = afterTable + 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CLAY);
  doc.text('Totals', 40, cursor);
  cursor += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 36, 32);
  doc.text(`Committed ${formatNaira(committed)}`, 40, cursor);
  doc.text(`Paid ${formatNaira(paid)}`, 200, cursor);
  doc.text(`Outstanding ${formatNaira(Math.max(0, committed - paid))}`, 340, cursor);

  pdfFooter(doc, 'Gidan Daya · figures are sample data unless this deployment is connected to Supabase.');
  doc.save(`gidan-daya-statement-${stamp()}.pdf`);
}

export async function exportCycleXlsx(
  projects: Project[],
  subscriptions: Subscription[],
  members: Member[],
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gidan Daya';
  workbook.created = new Date();

  const projectSheet = workbook.addWorksheet('Projects', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  projectSheet.columns = [
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Project', key: 'name', width: 38 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Unit price (NGN)', key: 'unitPrice', width: 18, style: { numFmt: '#,##0' } },
    { header: 'Total units', key: 'totalUnits', width: 12 },
    { header: 'Units taken', key: 'unitsTaken', width: 12 },
    { header: 'Units left', key: 'unitsLeft', width: 11 },
    { header: 'Funded %', key: 'percent', width: 10 },
    { header: 'Closes', key: 'closesOn', width: 13 },
    { header: 'Status', key: 'status', width: 18 },
  ];

  for (const project of projects) {
    projectSheet.addRow({
      code: project.code,
      name: project.name,
      category: project.category,
      unitPrice: project.unitPrice,
      totalUnits: project.totalUnits,
      unitsTaken: project.unitsTaken,
      unitsLeft: remainingUnits(project),
      percent: fundingPercent(project.unitsTaken, project.totalUnits),
      closesOn: formatDate(project.closesOn),
      status: describeProject(project).label,
    });
  }

  const subscriptionSheet = workbook.addWorksheet('Subscriptions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  subscriptionSheet.columns = [
    { header: 'Reference', key: 'reference', width: 14 },
    { header: 'Project', key: 'projectName', width: 38 },
    { header: 'Member', key: 'memberName', width: 24 },
    { header: 'Units', key: 'units', width: 8 },
    { header: 'Committed (NGN)', key: 'amount', width: 18, style: { numFmt: '#,##0' } },
    { header: 'Paid (NGN)', key: 'paid', width: 16, style: { numFmt: '#,##0' } },
    { header: 'Outstanding (NGN)', key: 'outstanding', width: 18, style: { numFmt: '#,##0' } },
    { header: 'Next due', key: 'nextDue', width: 13 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  for (const item of subscriptions) {
    subscriptionSheet.addRow({
      reference: item.reference,
      projectName: item.projectName,
      memberName: item.memberName,
      units: item.units,
      amount: item.amount,
      paid: item.paid,
      outstanding: Math.max(0, item.amount - item.paid),
      nextDue: item.nextDueOn ? formatDate(item.nextDueOn) : '',
      status: item.status === 'due' ? 'Payment due' : item.status === 'active' ? 'Active' : 'Completed',
    });
  }

  const memberSheet = workbook.addWorksheet('Members');
  memberSheet.columns = [
    { header: 'Member', key: 'name', width: 26 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Joined', key: 'joinedOn', width: 13 },
    { header: 'Units', key: 'units', width: 8 },
    { header: 'Committed (NGN)', key: 'committed', width: 18, style: { numFmt: '#,##0' } },
  ];
  for (const member of members) {
    memberSheet.addRow({
      name: member.name,
      email: member.email,
      role: member.role === 'admin' ? 'Secretariat' : 'Member',
      joinedOn: formatDate(member.joinedOn),
      units: member.units,
      committed: member.committed,
    });
  }

  for (const sheet of [projectSheet, subscriptionSheet, memberSheet]) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFF7F3EA' }, size: 10 };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123628' } };
    header.alignment = { vertical: 'middle' };
    header.height = 20;
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `gidan-daya-cycle-${stamp()}.xlsx`,
  );
}
