import type { Application, Member, PlotTier, Scheme } from '../data/types';
import { allocationPercent, depositFor, hasPriority, remainingPlots, STATUS_LABEL } from './allocations';
import { formatDate, formatNaira, formatSqm } from './format';

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
  doc.text('CBN Staff Multipurpose Cooperative Society Estate · plot subscriptions', 40, 62);

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

export async function exportApplicationPdf(application: Application, scheme: Scheme): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const startY = pdfHeader(
    doc,
    'Plot application statement',
    `${application.memberName} · ${application.memberNumber} · issued ${formatDate(new Date().toISOString())}`,
  );

  autoTable(doc, {
    startY,
    head: [['Application', 'Detail']],
    body: [
      ['Reference', application.reference],
      ['Plot size', formatSqm(application.sizeSqm)],
      ['House design', application.houseDesign === 'detached' ? '4-bedroom detached duplex' : '4-bedroom semi-detached duplex'],
      ['Rate', `${formatNaira(scheme.pricePerSqm)} per sqm, infrastructure inclusive`],
      ['Price basis', 'Measured size after survey × rate'],
      ['Payments recorded', formatNaira(application.paid)],
      ['Application fee', `${formatNaira(scheme.applicationFee)} non-refundable — paid`],
      ['Grade', application.cadre],
      ['Status', STATUS_LABEL[application.status]],
    ],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [26, 36, 32], lineColor: [220, 213, 196] },
    headStyles: { fillColor: FOREST, textColor: [247, 243, 234], fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { cellWidth: 150, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const afterSummary = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;

  autoTable(doc, {
    startY: afterSummary + 18,
    head: [['Payment', 'Due', 'Recorded']],
    body: [
      ['Application fee', 'On application', application.feePaid ? 'Paid' : 'Outstanding'],
      [
        '50% deposit',
        formatDate(scheme.depositDueOn),
        formatNaira(Math.min(application.paid, depositFor(application.amount))),
      ],
      [
        'Balance',
        formatDate(scheme.balanceDueOn),
        formatNaira(Math.max(0, application.paid - depositFor(application.amount))),
      ],
    ],
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 6, textColor: [26, 36, 32], lineColor: [220, 213, 196] },
    headStyles: { fillColor: [28, 74, 54], textColor: [247, 243, 234], fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  const afterSchedule = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterSummary;
  let cursor = afterSchedule + 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CLAY);
  doc.text('Position', 40, cursor);
  cursor += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 36, 32);
  doc.text(`Recorded ${formatNaira(application.paid)}`, 40, cursor);

  cursor += 26;
  doc.setFontSize(8);
  doc.setTextColor(74, 87, 81);
  doc.text(
    'Refunds are only on written request, after the plot is resold, subject to penalties of up to 5%;',
    40,
    cursor,
  );
  doc.text('infrastructure funds already applied are non-refundable. Allocation is first-come by payment confirmation.', 40, cursor + 11);
  doc.text('Title perfection costs are borne by the subscriber. Figures are sample data unless connected to Supabase.', 40, cursor + 22);

  pdfFooter(doc, 'Gidan Daya · CBN Staff Multipurpose Cooperative Society Estate.');
  doc.save(`gidan-daya-application-${application.reference}.pdf`);
}

export async function exportRegisterPdf(
  applications: Application[],
  tiers: PlotTier[],
  scheme: Scheme,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const width = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...FOREST);
  doc.text('Gidan Daya', margin, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(74, 87, 81);
  doc.text(
    `CBN Staff Multipurpose Cooperative Society Estate · plot register · ${formatNaira(scheme.pricePerSqm)} per sqm`,
    margin,
    58,
  );
  doc.text(`Generated ${formatDate(new Date().toISOString())}`, width - margin, 58, { align: 'right' });

  doc.setDrawColor(220, 213, 196);
  doc.line(margin, 68, width - margin, 68);

  autoTable(doc, {
    startY: 82,
    head: [['Plot size', 'Plots', 'Allocated', 'Remaining', 'Rate per sqm']],
    body: tiers.map((tier) => [
      formatSqm(tier.sizeSqm),
      tier.totalPlots,
      tier.allocated,
      remainingPlots(tier),
      formatNaira(scheme.pricePerSqm),
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [26, 36, 32], lineColor: [220, 213, 196] },
    headStyles: { fillColor: FOREST, textColor: [247, 243, 234], fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: margin, right: margin },
  });

  const afterTiers = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 82;

  autoTable(doc, {
    startY: afterTiers + 20,
    head: [['Reference', 'Applicant', 'Member ID', 'Grade', 'Plot', 'Paid', 'Status', 'Applied']],
    body: applications.map((item) => [
      item.reference,
      item.memberName,
      item.memberNumber,
      item.cadre,
      formatSqm(item.sizeSqm),
      formatNaira(item.paid),
      STATUS_LABEL[item.status],
      formatDate(item.createdAt),
    ]),
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 4.5, textColor: [26, 36, 32], lineColor: [220, 213, 196] },
    headStyles: { fillColor: [28, 74, 54], textColor: [247, 243, 234], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 5: { halign: 'right' } },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(122, 132, 126);
      doc.text('Sample data unless connected to Supabase. Allocation is first-come by payment confirmation.', margin, doc.internal.pageSize.getHeight() - 24);
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        width - margin,
        doc.internal.pageSize.getHeight() - 24,
        { align: 'right' },
      );
    },
  });

  doc.save(`gidan-daya-register-${stamp()}.pdf`);
}

export async function exportAllocationXlsx(
  tiers: PlotTier[],
  applications: Application[],
  members: Member[],
  scheme: Scheme,
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gidan Daya';
  workbook.created = new Date();

  const tierSheet = workbook.addWorksheet('Plot availability', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  tierSheet.columns = [
    { header: 'Plot size (sqm)', key: 'size', width: 16 },
    { header: 'Plots', key: 'total', width: 9 },
    { header: 'Allocated', key: 'allocated', width: 12 },
    { header: 'Remaining', key: 'remaining', width: 12 },
    { header: 'Allocated %', key: 'percent', width: 12 },
    { header: 'Rate (NGN/sqm)', key: 'rate', width: 16, style: { numFmt: '#,##0' } },
  ];
  for (const tier of tiers) {
    tierSheet.addRow({
      size: tier.sizeSqm,
      total: tier.totalPlots,
      allocated: tier.allocated,
      remaining: remainingPlots(tier),
      percent: allocationPercent(tier.allocated, tier.totalPlots),
      rate: scheme.pricePerSqm,
    });
  }

  const applicationSheet = workbook.addWorksheet('Applications', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  applicationSheet.columns = [
    { header: 'Reference', key: 'reference', width: 15 },
    { header: 'Applicant', key: 'memberName', width: 24 },
    { header: 'Member ID', key: 'memberNumber', width: 18 },
    { header: 'Grade', key: 'cadre', width: 22 },
    { header: 'Plot (sqm)', key: 'sizeSqm', width: 11 },
    { header: 'Design', key: 'design', width: 26 },
    { header: 'Paid (NGN)', key: 'paid', width: 15, style: { numFmt: '#,##0' } },
    { header: 'Grade priority', key: 'priority', width: 14 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Applied', key: 'createdAt', width: 13 },
  ];
  for (const item of applications) {
    applicationSheet.addRow({
      reference: item.reference,
      memberName: item.memberName,
      memberNumber: item.memberNumber,
      cadre: item.cadre,
      sizeSqm: item.sizeSqm,
      design: item.houseDesign === 'detached' ? 'Detached duplex' : 'Semi-detached duplex',
      paid: item.paid,
      priority: hasPriority(item.cadre) ? 'Yes' : 'No',
      status: STATUS_LABEL[item.status],
      createdAt: formatDate(item.createdAt),
    });
  }

  const memberSheet = workbook.addWorksheet('Applicants');
  memberSheet.columns = [
    { header: 'Applicant', key: 'name', width: 26 },
    { header: 'Member ID', key: 'memberNumber', width: 18 },
    { header: 'Grade', key: 'cadre', width: 22 },
    { header: 'Role', key: 'role', width: 13 },
    { header: 'Joined', key: 'joinedOn', width: 13 },
    { header: 'Plots', key: 'plots', width: 8 },
  ];
  for (const member of members) {
    memberSheet.addRow({
      name: member.name,
      memberNumber: member.memberNumber,
      cadre: member.cadre,
      role: member.role === 'admin' ? 'Secretariat' : 'Member',
      joinedOn: formatDate(member.joinedOn),
      plots: member.plots,
    });
  }

  for (const sheet of [tierSheet, applicationSheet, memberSheet]) {
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
    `gidan-daya-allocation-${stamp()}.xlsx`,
  );
}
