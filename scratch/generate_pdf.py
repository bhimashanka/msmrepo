import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (Only on page 2+)
        if self._pageNumber > 1:
            self.drawString(54, 750, "MILITARY ASSET MANAGEMENT SYSTEM (MAMS) - SYSTEM ARCHITECTURE REPORT")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Footer (All pages)
        self.setFont("Helvetica", 8)
        self.drawString(54, 36, "Confidential - Military Logistics System Technical Assessment Report")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf(pdf_path):
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0F172A")    # Deep Navy
    c_secondary = colors.HexColor("#0284C7")  # Cyber Blue
    c_accent = colors.HexColor("#059669")     # Emerald Green
    c_dark = colors.HexColor("#1E293B")       # Dark Slate
    c_light = colors.HexColor("#F8FAFC")      # Soft Light
    c_text = colors.HexColor("#334155")       # Muted Text

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=c_secondary,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_text,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_text,
        leftIndent=12,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#E2E8F0"),
        borderWidth=1,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    tbl_header_style = ParagraphStyle(
        'TblHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    tbl_cell_style = ParagraphStyle(
        'TblCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_text
    )

    story = []

    # Banner Header
    story.append(Paragraph("MILITARY ASSET MANAGEMENT SYSTEM (MAMS)", title_style))
    story.append(Paragraph("TECHNICAL ARCHITECTURE & COMPREHENSIVE ASSESSMENT REPORT", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_secondary, spaceBefore=0, spaceAfter=12))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Project Name:</b> Military Asset Management System (MAMS)", body_style),
            Paragraph("<b>Deployment:</b> Vercel + Render + Aiven Cloud", body_style)
        ],
        [
            Paragraph("<b>Author/Candidate:</b> Bhima Shankar", body_style),
            Paragraph("<b>Repository:</b> github.com/bhimashanka/msmrepo", body_style)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[250, 254])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # 1. Project Overview
    story.append(Paragraph("1. Project Overview", h1_style))
    story.append(Paragraph(
        "The <b>Military Asset Management System (MAMS)</b> is a secure, web-based defense logistics enterprise platform designed for defense commands, base commanders, and supply officers. MAMS provides centralized, real-time tracking, allocation, procurement, inter-base transfers, and expenditure accounting for defense equipment assets including weapons, heavy vehicles, ammunition crates, and satellite communications gear.",
        body_style
    ))
    story.append(Paragraph("<b>Key System Highlights:</b>", h2_style))
    story.append(Paragraph("• <b>Net Movement Logistics Math:</b> Real-time opening balance, purchases, transfers in/out, assignments, expenditures, and closing stock calculation.", bullet_style))
    story.append(Paragraph("• <b>Role-Based Scoping (RBAC):</b> Scoped view enforcing strict base-level permissions for Base Commanders vs Supreme Admin oversight.", bullet_style))
    story.append(Paragraph("• <b>Full Audit Trail:</b> Every asset transaction generates an immutable audit record with user role, base, resource, and timestamp.", bullet_style))
    story.append(Paragraph("• <b>Dual DB Resilience Engine:</b> Automatic cloud database connection (Aiven PostgreSQL) with zero-config local SQLite3 and in-memory fallback capability.", bullet_style))
    
    story.append(Paragraph("<b>System Assumptions & Limitations:</b>", h2_style))
    story.append(Paragraph("• <i>Assumptions:</i> Base IDs and Equipment categories operate under standardized defense classification codes. Multi-base transfers enforce status states (Pending, In-Transit, Completed).", bullet_style))
    story.append(Paragraph("• <i>Limitations:</i> Production authentication integrates JWT tokens, while demo inspector mode provides rapid single-click role switching for evaluation simplicity.", bullet_style))

    story.append(Spacer(1, 8))

    # 2. Tech Stack & Architecture
    story.append(Paragraph("2. Tech Stack & Architecture", h1_style))
    
    stack_table_data = [
        [Paragraph("Layer", tbl_header_style), Paragraph("Technology", tbl_header_style), Paragraph("Architectural Rationale & Benefits", tbl_header_style)],
        [
            Paragraph("<b>Frontend UI</b>", tbl_cell_style),
            Paragraph("React 19 + Vite 8 + TailwindCSS v4", tbl_cell_style),
            Paragraph("High performance SPA, sub-second HMR development, clean military dark-mode aesthetic with interactive charts via Recharts.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Backend API</b>", tbl_cell_style),
            Paragraph("Node.js 20 LTS + Express 5", tbl_cell_style),
            Paragraph("Asynchronous non-blocking REST API middleware engine, parameterized SQL queries, CORS configuration for cross-origin deployment.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Database</b>", tbl_cell_style),
            Paragraph("Aiven Cloud PostgreSQL 16", tbl_cell_style),
            Paragraph("Managed relational cloud DB with SSL encryption, ACID compliance, automatic table creation DDL, and sample dataset auto-seeding.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Deployment</b>", tbl_cell_style),
            Paragraph("Vercel (Edge UI) + Render (API)", tbl_cell_style),
            Paragraph("Automated Git continuous deployment: Vercel CDN for React frontend, Render web container for Node backend API.", tbl_cell_style)
        ]
    ]
    t_stack = Table(stack_table_data, colWidths=[90, 140, 274])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_stack)

    story.append(Spacer(1, 10))

    # 3. Data Models / Schema
    story.append(Paragraph("3. Core Data Models & Schema", h1_style))
    story.append(Paragraph("The database architecture consists of 9 relational tables enforcing foreign key integrity and indexing:", body_style))

    schema_table_data = [
        [Paragraph("Entity Table", tbl_header_style), Paragraph("Key Attributes / Columns", tbl_header_style), Paragraph("Relationships & Constraints", tbl_header_style)],
        [
            Paragraph("<b>bases</b>", tbl_cell_style),
            Paragraph("id (PK), code (UNIQUE), name, location, commander_name, created_at", tbl_cell_style),
            Paragraph("Parent to inventory, purchases, transfers, assignments, expenditures, users.", tbl_cell_style)
        ],
        [
            Paragraph("<b>equipment_types</b>", tbl_cell_style),
            Paragraph("id (PK), name, category, description, unit_of_measure, is_serialized", tbl_cell_style),
            Paragraph("Classifies catalog items across Weapons, Vehicles, Ammunition, Comms.", tbl_cell_style)
        ],
        [
            Paragraph("<b>inventory</b>", tbl_cell_style),
            Paragraph("id (PK), base_id (FK), equipment_id (FK), opening_balance, current_stock", tbl_cell_style),
            Paragraph("UNIQUE(base_id, equipment_id). Tracks stock balances per base.", tbl_cell_style)
        ],
        [
            Paragraph("<b>purchases</b>", tbl_cell_style),
            Paragraph("id (PK), base_id (FK), equipment_id (FK), quantity, unit_cost, total_cost, po_reference (UNIQUE), supplier, purchase_date", tbl_cell_style),
            Paragraph("Increments inventory current_stock automatically upon creation.", tbl_cell_style)
        ],
        [
            Paragraph("<b>transfers</b>", tbl_cell_style),
            Paragraph("id (PK), source_base_id (FK), dest_base_id (FK), equipment_id (FK), quantity, tracking_number (UNIQUE), status", tbl_cell_style),
            Paragraph("Status: Pending, In-Transit, Completed. Completed transfers re-balance stock.", tbl_cell_style)
        ],
        [
            Paragraph("<b>assignments</b>", tbl_cell_style),
            Paragraph("id (PK), base_id (FK), equipment_id (FK), quantity, personnel_name, rank, service_id, unit, status", tbl_cell_style),
            Paragraph("Status: Active, Returned, Overdue. Tracks issued weapons/equipment.", tbl_cell_style)
        ],
        [
            Paragraph("<b>expenditures</b>", tbl_cell_style),
            Paragraph("id (PK), base_id (FK), equipment_id (FK), quantity, expenditure_date, reason, operation_name", tbl_cell_style),
            Paragraph("Decrements current_stock for live-fire training or combat losses.", tbl_cell_style)
        ],
        [
            Paragraph("<b>users & audit_logs</b>", tbl_cell_style),
            Paragraph("users: id, username (UNIQUE), role, base_id (FK)<br/>audit_logs: id, username, action, resource, details, timestamp", tbl_cell_style),
            Paragraph("Enforces RBAC authorization and logs immutable audit records.", tbl_cell_style)
        ]
    ]
    t_schema = Table(schema_table_data, colWidths=[100, 220, 184])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_schema)

    story.append(Spacer(1, 10))

    # 4. RBAC Explanation
    story.append(Paragraph("4. Role-Based Access Control (RBAC)", h1_style))
    story.append(Paragraph(
        "MAMS implements a granular 3-tier Role-Based Access Control model enforced at both Express API middleware level (<b>auth.js</b>) and React UI component rendering level:",
        body_style
    ))

    rbac_table_data = [
        [Paragraph("Role", tbl_header_style), Paragraph("Scope & Access Level", tbl_header_style), Paragraph("Enforcement Strategy", tbl_header_style)],
        [
            Paragraph("<b>Admin (General)</b>", tbl_cell_style),
            Paragraph("Unrestricted global visibility across all bases. Full read/write access to Purchases, Transfers, Assignments, Expenditures, and Audit Logs.", tbl_cell_style),
            Paragraph("<code>authenticateUser</code> attaches <code>req.user.role='admin'</code>. Global metrics aggregated across all installations.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Base Commander</b>", tbl_cell_style),
            Paragraph("Strictly scoped to their assigned Base ID (e.g. Fort Alpha HQ). Cannot initiate or view operations outside their installation.", tbl_cell_style),
            Paragraph("<code>scopeBaseAccess</code> middleware rejects requests targeting other base IDs (HTTP 403 Forbidden). UI locks base selector.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Logistics Officer</b>", tbl_cell_style),
            Paragraph("Operational access restricted to Procurement (Purchases) and Inter-Base Transfers. Locked out of Personnel Assignments and Expenditures.", tbl_cell_style),
            Paragraph("<code>authorizeRoles('admin', 'base_commander')</code> returns HTTP 403 for restricted endpoints.", tbl_cell_style)
        ]
    ]
    t_rbac = Table(rbac_table_data, colWidths=[110, 210, 184])
    t_rbac.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_rbac)

    story.append(Spacer(1, 10))

    # 5. API Logging
    story.append(Paragraph("5. Transaction Logging & Audit Trail", h1_style))
    story.append(Paragraph(
        "To ensure complete transparency and military accountability, all state-changing API transactions trigger automated audit logging through <code>auditLogger.js</code> middleware into the <b>audit_logs</b> database repository.",
        body_style
    ))
    story.append(Paragraph("<b>Recorded Audit Action Codes:</b>", h2_style))
    story.append(Paragraph("• <b>PURCHASE_RECORDED:</b> Logs PO reference, supplier, equipment type, quantity, total cost, and creator.", bullet_style))
    story.append(Paragraph("• <b>TRANSFER_INITIATED / COMPLETED:</b> Logs tracking number, origin base, destination base, equipment, and status.", bullet_style))
    story.append(Paragraph("• <b>ASSET_ASSIGNED / RETURNED:</b> Logs soldier personnel name, military service ID, rank, and unit.", bullet_style))
    story.append(Paragraph("• <b>ASSET_EXPENDED:</b> Logs expenditure operation name, ammunition/equipment quantity, and authorizing officer.", bullet_style))

    story.append(Spacer(1, 10))

    # 6. Setup Instructions
    story.append(Paragraph("6. Setup & Installation Instructions", h1_style))
    story.append(Paragraph("<b>Local Development Setup:</b>", h2_style))
    story.append(Paragraph("<code># 1. Clone repository<br/>git clone https://github.com/bhimashanka/msmrepo.git<br/>cd msmrepo<br/><br/># 2. Run Backend<br/>cd backend<br/>npm install<br/>npm start<br/><br/># 3. Run Frontend (in new terminal)<br/>cd frontend<br/>npm install<br/>npm run dev</code>", code_style))

    story.append(Paragraph("<b>Production Cloud Deployment Setup:</b>", h2_style))
    story.append(Paragraph("1. <b>Database (Aiven PostgreSQL):</b> Create PostgreSQL service on Aiven, copy Service URI.", bullet_style))
    story.append(Paragraph("2. <b>Backend (Render):</b> Connect GitHub repo <code>msmrepo</code>, set Root Dir to <code>backend</code>, set <code>DATABASE_URL</code> and <code>NODE_VERSION=20.18.0</code>.", bullet_style))
    story.append(Paragraph("3. <b>Frontend (Vercel):</b> Import repo <code>msmrepo</code>, set Root Dir to <code>frontend</code>, set <code>VITE_API_URL=https://msmrepo.onrender.com/api</code>.", bullet_style))

    story.append(Spacer(1, 10))

    # 7. API Endpoints
    story.append(Paragraph("7. Key Documented API Endpoints", h1_style))

    api_table_data = [
        [Paragraph("Method", tbl_header_style), Paragraph("Endpoint Route", tbl_header_style), Paragraph("Description & Access Level", tbl_header_style)],
        [Paragraph("GET", tbl_cell_style), Paragraph("<code>/api/health</code>", tbl_cell_style), Paragraph("Health check & system status timestamp.", tbl_cell_style)],
        [Paragraph("GET", tbl_cell_style), Paragraph("<code>/api/bases</code>", tbl_cell_style), Paragraph("Fetch all military bases & outposts.", tbl_cell_style)],
        [Paragraph("GET", tbl_cell_style), Paragraph("<code>/api/equipment-types</code>", tbl_cell_style), Paragraph("Fetch equipment catalog & categories.", tbl_cell_style)],
        [Paragraph("GET", tbl_cell_style), Paragraph("<code>/api/dashboard/metrics</code>", tbl_cell_style), Paragraph("Calculate Net Movement, Opening/Closing stock, & Category Analytics.", tbl_cell_style)],
        [Paragraph("GET / POST", tbl_cell_style), Paragraph("<code>/api/purchases</code>", tbl_cell_style), Paragraph("Fetch purchase logs / Record new asset acquisition.", tbl_cell_style)],
        [Paragraph("GET / POST", tbl_cell_style), Paragraph("<code>/api/transfers</code>", tbl_cell_style), Paragraph("Fetch transfers / Initiate inter-base equipment movement.", tbl_cell_style)],
        [Paragraph("GET / POST", tbl_cell_style), Paragraph("<code>/api/assignments</code>", tbl_cell_style), Paragraph("Fetch / Issue equipment assignments to military personnel.", tbl_cell_style)],
        [Paragraph("GET / POST", tbl_cell_style), Paragraph("<code>/api/expenditures</code>", tbl_cell_style), Paragraph("Fetch / Record operational asset expenditures & combat losses.", tbl_cell_style)],
        [Paragraph("GET", tbl_cell_style), Paragraph("<code>/api/audit-logs</code>", tbl_cell_style), Paragraph("Fetch system-wide transaction audit trail (Admin / Base Cmd).", tbl_cell_style)]
    ]
    t_api = Table(api_table_data, colWidths=[60, 160, 284])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_dark),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_api)

    story.append(Spacer(1, 10))

    # 8. Login Credentials
    story.append(Paragraph("8. Platform Login Credentials & Inspector Roles", h1_style))
    story.append(Paragraph("The platform features instant role switching via the top navigation bar for inspector evaluation:", body_style))

    cred_table_data = [
        [Paragraph("Role / Profile Name", tbl_header_style), Paragraph("Username", tbl_header_style), Paragraph("Assigned Base", tbl_header_style), Paragraph("Permitted Features", tbl_header_style)],
        [
            Paragraph("<b>General Arthur Vance</b><br/>(Supreme Admin)", tbl_cell_style),
            Paragraph("<code>admin_gen</code>", tbl_cell_style),
            Paragraph("All Bases (Global)", tbl_cell_style),
            Paragraph("Full Read/Write across all modules, Net Movement drill-down, Audit Trail.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Col. Marcus Miller</b><br/>(Base Commander)", tbl_cell_style),
            Paragraph("<code>commander_alpha</code>", tbl_cell_style),
            Paragraph("Fort Alpha HQ (Base ID 1)", tbl_cell_style),
            Paragraph("Scoped operations for Fort Alpha. Cannot view or alter Bravo/Charlie/Delta data.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Col. Sarah Davis</b><br/>(Base Commander)", tbl_cell_style),
            Paragraph("<code>commander_bravo</code>", tbl_cell_style),
            Paragraph("Fort Bravo Post (Base ID 2)", tbl_cell_style),
            Paragraph("Scoped operations for Fort Bravo Post.", tbl_cell_style)
        ],
        [
            Paragraph("<b>Lt. James Hayes</b><br/>(Logistics Officer)", tbl_cell_style),
            Paragraph("<code>logistics_officer</code>", tbl_cell_style),
            Paragraph("Fort Alpha HQ (Base ID 1)", tbl_cell_style),
            Paragraph("Procurement and Transfers only. Restricted from Personnel Assignments & Expenditures.", tbl_cell_style)
        ]
    ]
    t_cred = Table(cred_table_data, colWidths=[120, 100, 110, 174])
    t_cred.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_cred)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {pdf_path}")

if __name__ == "__main__":
    output_pdf = os.path.join(r"c:\Users\BHIMA SHANKAR\OneDrive\Desktop\Assessment", "Military_Asset_Management_System_Report.pdf")
    build_pdf(output_pdf)
