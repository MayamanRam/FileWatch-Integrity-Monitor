import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_report(report_data: dict) -> bytes:
    """
    Generate an executive cybersecurity File Integrity Report in PDF format.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0284C7')
    )
    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    disclaimer_style = ParagraphStyle(
        'DisclaimerCustom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748B')
    )

    story = []

    # Title Banner
    story.append(Paragraph("FILEWATCH — FILE INTEGRITY MONITORING", title_style))
    story.append(Paragraph("Automated Integrity Verification & Security Audit Report", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284C7'), spaceAfter=15))

    # Meta Info Table
    gen_time = report_data.get("generated_at", datetime.now().isoformat())
    meta_info = [
        [Paragraph("<b>Report ID:</b>", body_style), Paragraph(str(report_data.get("report_id", "FW-AUDIT")), body_style),
         Paragraph("<b>Generated:</b>", body_style), Paragraph(gen_time, body_style)],
        [Paragraph("<b>Monitored Dirs:</b>", body_style), Paragraph(str(report_data.get("directory_count", 0)), body_style),
         Paragraph("<b>Active Baselines:</b>", body_style), Paragraph(str(report_data.get("baseline_count", 0)), body_style)],
        [Paragraph("<b>Total Files Monitored:</b>", body_style), Paragraph(str(report_data.get("total_files_monitored", 0)), body_style),
         Paragraph("<b>Open Alerts:</b>", body_style), Paragraph(str(len(report_data.get("alerts", []))), body_style)],
    ]
    t_meta = Table(meta_info, colWidths=[130, 140, 130, 140])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # Section 1: Executive Summary
    story.append(Paragraph("1. Executive Security Summary", h2_style))
    stats = report_data.get("summary_stats", {})
    summary_text = (
        f"During the monitoring window, FileWatch tracked <b>{report_data.get('directory_count', 0)}</b> directories "
        f"and verified <b>{report_data.get('total_files_monitored', 0)}</b> file baselines. A total of "
        f"<b>{stats.get('total_events', 0)}</b> security events were recorded ({stats.get('critical_events', 0)} Critical, "
        f"{stats.get('high_events', 0)} High). Baseline cryptographic tamper status is currently "
        f"<b>{report_data.get('tamper_status', 'VALID')}</b>."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 10))

    # Section 2: Monitored Directories & Baselines
    story.append(Paragraph("2. Monitored Scope & Baselines", h2_style))
    dirs = report_data.get("directories", [])
    if dirs:
        dir_rows = [["Directory Label", "Path", "Files", "Status", "Last Scanned"]]
        for d in dirs:
            dir_rows.append([
                Paragraph(d.get("label", ""), body_style),
                Paragraph(d.get("path", "")[:35], body_style),
                str(d.get("file_count", 0)),
                d.get("status", "active"),
                str(d.get("last_scanned_at", "Never"))[:19]
            ])
        t_dirs = Table(dir_rows, colWidths=[100, 200, 50, 70, 120])
        t_dirs.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_dirs)
    else:
        story.append(Paragraph("No active directories configured.", body_style))
    story.append(Spacer(1, 15))

    # Section 3: High & Critical Security Alerts
    story.append(Paragraph("3. Security Incidents & Alerts", h2_style))
    alerts = report_data.get("alerts", [])
    if alerts:
        alert_rows = [["Severity", "Title", "File / Target", "Status", "Timestamp"]]
        for a in alerts[:15]:  # Show top 15 alerts in PDF
            sev = a.get("severity", "LOW")
            sev_color = colors.HexColor('#DC2626') if sev == "CRITICAL" else (
                colors.HexColor('#EA580C') if sev == "HIGH" else colors.HexColor('#CA8A04')
            )
            alert_rows.append([
                Paragraph(f"<b><font color='{sev_color.hexval()}'>{sev}</font></b>", body_style),
                Paragraph(a.get("title", "")[:35], body_style),
                Paragraph(a.get("file_path", "")[:30], body_style),
                a.get("status", "open"),
                str(a.get("created_at", ""))[:19]
            ])
        t_alerts = Table(alert_rows, colWidths=[65, 165, 140, 60, 110])
        t_alerts.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_alerts)
    else:
        story.append(Paragraph("No active security alerts recorded.", body_style))
    story.append(Spacer(1, 15))

    # Section 4: Cryptographic Verification & Disclaimer
    story.append(Paragraph("4. Evidence Integrity & Disclaimers", h2_style))
    disclaimer_text = (
        "<b>Cryptographic Assurance:</b> Baseline records and audit logs are sealed using SHA-256 and HMAC-SHA256 signatures. "
        "Any direct alteration of database records triggers a tampering alert.<br/><br/>"
        "<b>Operating System Disclaimer:</b> Local file integrity monitoring systems rely on host operating system APIs. "
        "FileWatch cannot guarantee detection if an adversary gains root/administrator privileges and compromises kernel or filesystem hooks."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    doc.build(story)
    return buffer.getvalue()

