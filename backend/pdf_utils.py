from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from io import BytesIO


def _simple_document(title, ref, sections, footer_note="Document genere automatiquement par la Plateforme SCI Vanille Bio"):
    """sections: liste de (titre_section, [(label, valeur), ...])"""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 2 * cm

    p.setFont("Helvetica-Bold", 16)
    p.drawString(2 * cm, y, title)
    y -= 1 * cm
    p.setFont("Helvetica", 10)
    p.drawString(2 * cm, y, f"Reference : {ref}")
    y -= 0.5 * cm
    p.line(2 * cm, y, width - 2 * cm, y)
    y -= 1 * cm

    for section_title, rows in sections:
        if y < 4 * cm:
            p.showPage()
            y = height - 2 * cm
        p.setFont("Helvetica-Bold", 12)
        p.drawString(2 * cm, y, section_title)
        y -= 0.6 * cm
        p.setFont("Helvetica", 10)
        for label, value in rows:
            if y < 3 * cm:
                p.showPage()
                y = height - 2 * cm
            p.drawString(2 * cm, y, f"{label} : {value}")
            y -= 0.5 * cm
        y -= 0.5 * cm

    p.setFont("Helvetica-Oblique", 8)
    p.drawCentredString(width / 2, 1 * cm, footer_note)
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer


def generate_collection_pdf(data):
    """Bordereau de collecte (module 4 / document V1 obligatoire)."""
    sections = [
        ("PRODUCTEUR", [
            ("Nom", data["producer_name"]),
            ("Code producteur", data["producer_code"]),
            ("Village", data.get("village", "-")),
        ]),
        ("PARCELLE / RECOLTE", [
            ("Code parcelle", data.get("parcel_code", "-")),
            ("Code recolte", data.get("harvest_code", "-")),
            ("Statut bio", data.get("bio_status", "-")),
        ]),
        ("COLLECTE", [
            ("Date", data["date"]),
            ("Poids brut", f"{data['gross_weight']} kg"),
            ("Poids net", f"{data['net_weight']} kg"),
            ("Collecteur", data["collector_name"]),
            ("Statut", data["status"]),
        ]),
    ]
    buf = _simple_document("BORDEREAU DE COLLECTE - SCI VANILLE BIO", data["code"], sections)
    return buf


def generate_green_lot_pdf(data):
    """Fiche lot vert (module 5 / document V1 obligatoire)."""
    origin_rows = [(f"Collecte {c['code']}", f"{c['net_weight']} kg - {c['bio_status']}") for c in data.get("collections", [])]
    sections = [
        ("LOT VERT", [
            ("Date de creation", data["created_at"]),
            ("Poids total", f"{data['total_weight']} kg"),
            ("Poids restant", f"{data['remaining_weight']} kg"),
            ("Statut", data["status"]),
            ("Statut bio", data["bio_status"]),
        ]),
        ("COLLECTES D'ORIGINE", origin_rows or [("Aucune", "-")]),
    ]
    return _simple_document("FICHE LOT VERT - SCI VANILLE BIO", data["code"], sections)


def generate_transformation_pdf(data):
    """Rapport de transformation (module 6 / document V1 obligatoire)."""
    lots_rows = [(f"Lot vert {l}", "consomme integralement") for l in data.get("input_lot_codes", [])]
    sections = [
        ("OPERATION", [
            ("Date de debut", data["start_date"]),
            ("Date de fin", data.get("end_date", "-")),
            ("Responsable", data["manager_name"]),
            ("Statut", data["status"]),
        ]),
        ("LOTS VERTS EN ENTREE", lots_rows or [("Aucun", "-")]),
        ("BILAN", [
            ("Poids entrant", f"{data['input_weight']} kg"),
            ("Poids sortant", f"{data.get('output_weight', 0)} kg"),
            ("Pertes", f"{data.get('loss_weight', 0)} kg ({data.get('loss_rate', 0)}%)"),
            ("Rendement global", f"{data.get('global_yield', 0)}%"),
        ]),
        ("REPARTITION PAR QUALITE", [
            ("Gourmet", f"{data.get('gourmet_weight') or 0} kg"),
            ("Standard", f"{data.get('standard_weight') or 0} kg"),
            ("TK", f"{data.get('tk_weight') or 0} kg"),
            ("Fendue", f"{data.get('fendue_weight') or 0} kg"),
        ]),
    ]
    return _simple_document("RAPPORT DE TRANSFORMATION - SCI VANILLE BIO", data["operation_number"], sections)


def generate_prepared_lot_pdf(data):
    """Fiche lot prepare (module 07 / document V1 obligatoire)."""
    sections = [
        ("LOT PREPARE", [
            ("Qualite", data["quality"]),
            ("Poids final", f"{data['weight']} kg"),
            ("Quantite disponible en stock", f"{data.get('available_quantity', '-')} kg"),
            ("Humidite", f"{data.get('humidity', '-')}"),
            ("Statut", data["status"]),
            ("Statut bio", data.get("bio_status", "-")),
        ]),
        ("EMPLACEMENT", [
            ("Magasin / emplacement", data.get("location", "-")),
            ("Detail (caisse, etagere...)", data.get("emplacement_detail", "-")),
        ]),
        ("ORIGINE", [
            ("Transformation", data["operation_number"]),
        ]),
    ]
    return _simple_document("FICHE LOT PREPARE - SCI VANILLE BIO", data["code"], sections)


def generate_traceability_pdf(data):
    """Rapport de tracabilite descendante (module 11 / document V1 obligatoire)."""
    rows = []
    for origin in data.get("origins", []):
        rows.append((f"Collecte {origin['collection_code']}",
                      f"{origin['producer_name']} ({origin['producer_code']}) - Parcelle {origin['parcel_code']} - {origin['net_weight']} kg"))
    sections = [
        ("LOT VERT TRACE", [
            ("Code", data["lot_code"]),
            ("Statut", data["status"]),
            ("Poids total", f"{data['total_weight']} kg"),
        ]),
        ("ORIGINES (producteur / parcelle / collecte)", rows or [("Aucune", "-")]),
    ]
    return _simple_document("RAPPORT DE TRACABILITE - SCI VANILLE BIO", data["lot_code"], sections)


def generate_inspection_pdf(data):
    """Rapport d'inspection interne (module 12 / V2)."""
    sections = [
        ("INSPECTION", [
            ("Date", data["date"]),
            ("Auditeur", data["auditor_name"]),
            ("Producteur", data.get("producer_name", "-")),
            ("Objet concerne", data.get("object_type", "Parcelle")),
            ("Reference", data.get("object_reference", data.get("parcel_code", "-"))),
            ("Resultat", data["result"]),
        ]),
        ("CHECKLIST", [
            ("Conformite des bordures", "Oui" if data["compliance_borders"] else "Non"),
            ("Absence de produits chimiques", "Oui" if data["no_chemicals"] else "Non"),
            ("Tracabilite maintenue", "Oui" if data["traceability_maintained"] else "Non"),
            ("Bonnes pratiques de recolte", "Oui" if data["proper_harvest_practices"] else "Non"),
        ]),
        ("SIGNATURES", [
            ("Auditeur", "Signe" if data["auditor_signature"] else "Non signe"),
            ("Producteur", "Signe" if data["producer_signature"] else "Non signe"),
        ]),
    ]
    return _simple_document("RAPPORT D'INSPECTION - SCI VANILLE BIO", data["code"], sections)


def generate_harvest_pdf(harvest_data):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(2 * cm, height - 2 * cm, "BORDEREAU DE COLLECTE - SCI VANILLE BIO")
    
    p.setFont("Helvetica", 10)
    p.drawString(2 * cm, height - 3 * cm, f"Date: {harvest_data['date']}")
    p.drawString(2 * cm, height - 3.5 * cm, f"Référence: {harvest_data['id']}")

    # Content
    p.line(2 * cm, height - 4 * cm, width - 2 * cm, height - 4 * cm)
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(2 * cm, height - 5 * cm, "DÉTAILS DU PRODUCTEUR")
    p.setFont("Helvetica", 10)
    p.drawString(2 * cm, height - 5.5 * cm, f"Nom: {harvest_data['producer_name']}")
    p.drawString(2 * cm, height - 6 * cm, f"Code: {harvest_data['producer_code']}")
    p.drawString(2 * cm, height - 6.5 * cm, f"Village: {harvest_data['village']}")

    p.setFont("Helvetica-Bold", 12)
    p.drawString(2 * cm, height - 8 * cm, "DÉTAILS DE LA RÉCOLTE")
    p.setFont("Helvetica", 10)
    p.drawString(2 * cm, height - 8.5 * cm, f"Poids Net: {harvest_data['weight']} kg")
    p.drawString(2 * cm, height - 9 * cm, f"Qualité: {harvest_data['quality']}")
    p.drawString(2 * cm, height - 9.5 * cm, f"Maturité: {harvest_data['maturity']}")

    # Footer / Signatures
    p.line(2 * cm, 4 * cm, width - 2 * cm, 4 * cm)
    p.drawString(2 * cm, 3.5 * cm, "Signature Producteur:")
    p.drawString(width / 2 + 1 * cm, 3.5 * cm, "Signature Collecteur:")
    
    p.setFont("Helvetica-Oblique", 8)
    p.drawCentredString(width / 2, 1 * cm, "Document généré automatiquement par la Plateforme SCI Vanille Bio")

    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer
