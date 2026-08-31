import models, auth
from codes import next_code  # noqa: F401 (ensures CodeSequence table is registered before create_all)
from database import SessionLocal, engine
from datetime import datetime


def get_or_create_user(db, username, email, password, role, first_name="", last_name="", phone=""):
    user = db.query(models.User).filter(models.User.username == username).first()
    if user:
        return user
    user = models.User(
        code=next_code(db, "USER"),
        username=username, email=email, hashed_password=auth.get_password_hash(password),
        role=role, first_name=first_name, last_name=last_name, phone=phone,
        created_by="seed", created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Utilisateur cree : {username} / {password} ({role.value})")
    return user


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    admin = get_or_create_user(db, "admin", "admin@vanille.bio", "admin123", models.UserRole.ADMIN, "Admin", "SCI")
    coordinator = get_or_create_user(db, "coordinator", "coord@vanille.bio", "coord123", models.UserRole.COORDINATOR_SCI, "Fatima", "Abdou")
    collector = get_or_create_user(db, "collecteur", "collecteur@vanille.bio", "collecte123", models.UserRole.COLLECTION_MANAGER, "Moudjahid", "Hassani")
    transfo_manager = get_or_create_user(db, "transformateur", "transfo@vanille.bio", "transfo123", models.UserRole.TRANSFORMATION_MANAGER, "Halima", "Said")
    stock_manager = get_or_create_user(db, "stockiste", "stock@vanille.bio", "stock123", models.UserRole.STOCK_MANAGER, "Youssouf", "Ali")
    auditor = get_or_create_user(db, "auditeur", "audit@vanille.bio", "audit123", models.UserRole.INTERNAL_AUDITOR, "Nadia", "Combo")

    if db.query(models.Producer).count() > 0:
        print("Des producteurs existent deja, seed de demonstration ignore.")
        db.close()
        return

    now = datetime.utcnow()

    # --- Producteur 1 : Bio ---
    p1 = models.Producer(
        code=next_code(db, "PROD"), first_name="Ahmed", last_name="Msa",
        gender=models.Gender.HOMME, birth_date=datetime(1975, 3, 12), phone="3320011",
        minor_children_count=3, island=models.Island.NGAZIDJA, region="Itsandra", village="Mvouni",
        entry_date=datetime(2022, 5, 1), status=models.ProducerStatus.ACTIF, bio_status=models.BioStatus.BIO,
        contract_signed=True, contract_date=datetime(2022, 5, 1),
        observations="Producteur historique du groupement.",
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(p1)
    db.flush()

    par1 = models.Parcel(
        code=next_code(db, "PAR"), producer_id=p1.id, name="Parcelle Mvouni Nord",
        gps_lat=-11.7172, gps_long=43.2473, surface=1.2, surface_unit=models.SurfaceUnit.HA,
        altitude=320, crop_type=models.CropType.VANILLE, status=models.ParcelStatus.CONFORME,
        bio_status=models.BioStatus.BIO, contamination_risk=models.ContaminationRisk.FAIBLE,
        buffer_zone_present=True, observations="Zone tampon vegetalisee cote nord.",
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(par1)
    db.flush()

    par1b = models.Parcel(
        code=next_code(db, "PAR"), producer_id=p1.id, name="Parcelle Mvouni Sud",
        gps_lat=-11.7201, gps_long=43.2490, surface=0.6, surface_unit=models.SurfaceUnit.HA,
        crop_type=models.CropType.VANILLE, status=models.ParcelStatus.CONFORME,
        bio_status=models.BioStatus.CONVENTIONNEL, contamination_risk=models.ContaminationRisk.MOYEN,
        buffer_zone_present=False, observations="Parcelle recemment acquise, encore conventionnelle.",
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(par1b)
    db.flush()

    # --- Producteur 2 : Conversion ---
    p2 = models.Producer(
        code=next_code(db, "PROD"), first_name="Halima", last_name="Said",
        gender=models.Gender.FEMME, birth_date=datetime(1988, 11, 2), phone="3320022",
        minor_children_count=1, island=models.Island.ANJOUAN, region="Nyumakele", village="Bimbini",
        entry_date=datetime(2023, 2, 15), status=models.ProducerStatus.ACTIF, bio_status=models.BioStatus.CONVERSION,
        contract_signed=True, contract_date=datetime(2023, 2, 15),
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(p2)
    db.flush()

    par2 = models.Parcel(
        code=next_code(db, "PAR"), producer_id=p2.id, name="Parcelle Bimbini Sud",
        gps_lat=-12.2323, gps_long=44.4531, surface=0.75, surface_unit=models.SurfaceUnit.HA,
        altitude=210, crop_type=models.CropType.MIXTE, status=models.ParcelStatus.CONFORME,
        bio_status=models.BioStatus.CONVERSION, contamination_risk=models.ContaminationRisk.MOYEN,
        buffer_zone_present=False, observations="Deuxieme annee de conversion bio.",
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(par2)
    db.flush()

    db.commit()

    # --- Recoltes ---
    h1 = models.Harvest(
        code=next_code(db, "REC"), producer_id=p1.id, parcel_id=par1.id, date=datetime(2026, 6, 15),
        weight=145.5, remaining_weight=145.5, status=models.HarvestStatus.VALIDEE, bio_status=par1.bio_status,
        quality="Standard", maturity="Optimale", observations="Recolte de saison, bonne maturite.",
        recorded_by_id=collector.id, created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(h1)

    h2 = models.Harvest(
        code=next_code(db, "REC"), producer_id=p1.id, parcel_id=par1b.id, date=datetime(2026, 6, 16),
        weight=40.0, remaining_weight=40.0, status=models.HarvestStatus.VALIDEE, bio_status=par1b.bio_status,
        recorded_by_id=collector.id, created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(h2)

    h3 = models.Harvest(
        code=next_code(db, "REC"), producer_id=p2.id, parcel_id=par2.id, date=datetime(2026, 6, 18),
        weight=62.0, remaining_weight=62.0, status=models.HarvestStatus.VALIDEE, bio_status=par2.bio_status,
        recorded_by_id=collector.id, created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    db.add(h3)
    db.flush()

    # --- Collectes --- (poids net toujours <= poids restant de la recolte, deduit ensuite)
    c1 = models.Collection(
        code=next_code(db, "COL"), slip_number="", harvest_id=h1.id, producer_id=p1.id, parcel_id=par1.id,
        date=datetime(2026, 6, 16), gross_weight=143.0, net_weight=142.0, collector_id=collector.id,
        status=models.CollectionStatus.VALIDEE,
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    c1.slip_number = c1.code
    db.add(c1)
    h1.remaining_weight -= c1.net_weight

    c2 = models.Collection(
        code=next_code(db, "COL"), slip_number="", harvest_id=h2.id, producer_id=p1.id, parcel_id=par1b.id,
        date=datetime(2026, 6, 17), gross_weight=39.0, net_weight=38.5, collector_id=collector.id,
        status=models.CollectionStatus.VALIDEE,
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    c2.slip_number = c2.code
    db.add(c2)
    h2.remaining_weight -= c2.net_weight

    c3 = models.Collection(
        code=next_code(db, "COL"), slip_number="", harvest_id=h3.id, producer_id=p2.id, parcel_id=par2.id,
        date=datetime(2026, 6, 19), gross_weight=61.0, net_weight=60.5, collector_id=collector.id,
        status=models.CollectionStatus.VALIDEE,
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    c3.slip_number = c3.code
    db.add(c3)
    h3.remaining_weight -= c3.net_weight
    db.flush()
    db.commit()

    # --- Lot vert 1 : pur Bio (c1 uniquement) -> Disponible ---
    lot1 = models.GreenLot(
        code=next_code(db, "LV"), created_at=now, total_weight=c1.net_weight, remaining_weight=c1.net_weight,
        status=models.GreenLotStatus.DISPONIBLE, bio_status=models.BioStatus.BIO,
        observations="Lot constitue a partir de la recolte Mvouni Nord.",
        created_by=admin.username, updated_by=admin.username, updated_at=now,
    )
    db.add(lot1)
    db.flush()
    c1.green_lot_id = lot1.id
    c1.status = models.CollectionStatus.AFFECTEE

    # --- Lot vert 2 : MELANGE Bio (c2 origine Conventionnel) + Conversion (c3) -> Bloque automatiquement ---
    lot2 = models.GreenLot(
        code=next_code(db, "LV"), created_at=now, total_weight=c2.net_weight + c3.net_weight,
        remaining_weight=c2.net_weight + c3.net_weight,
        status=models.GreenLotStatus.BLOQUE, bio_status=models.BioStatus.CONVENTIONNEL,
        observations="ATTENTION : melange Conventionnel/Conversion detecte automatiquement -> lot bloque.",
        created_by=admin.username, updated_by=admin.username, updated_at=now,
    )
    db.add(lot2)
    db.flush()
    c2.green_lot_id = lot2.id
    c2.status = models.CollectionStatus.AFFECTEE
    c3.green_lot_id = lot2.id
    c3.status = models.CollectionStatus.AFFECTEE

    db.commit()

    # --- Transformation consommant le lot vert 1 (pur Bio) ---
    trans1 = models.Transformation(
        operation_number=next_code(db, "TR"), start_date=datetime(2026, 6, 25, 8, 0), end_date=datetime(2026, 6, 25, 17, 0),
        input_weight=lot1.remaining_weight, gourmet_weight=55, standard_weight=40, tk_weight=20, fendue_weight=10,
        output_weight=125, loss_weight=lot1.remaining_weight - 125, loss_rate=(lot1.remaining_weight - 125) / lot1.remaining_weight * 100,
        global_yield=125 / lot1.remaining_weight * 100, status=models.TransformationStatus.CLOTUREE,
        manager_id=transfo_manager.id, observations="Premier atelier de preparation de la saison.",
        created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
    )
    trans1.input_lots.append(lot1)
    lot1.status = models.GreenLotStatus.TRANSFORME
    lot1.remaining_weight = 0
    db.add(trans1)
    db.flush()

    # --- Lots prepares (module 07) : code au format LP-{QUALITE}-annee-seq, statut bio herite du lot vert ---
    # (pas de module Magasins/Emplacements : emplacement = simple texte libre)
    quality_abbr = {models.QualityType.GOURMET: "GOUR", models.QualityType.STANDARD: "STD",
                    models.QualityType.TK: "TK", models.QualityType.FENDUE: "FEN"}
    prepared_lots = {}
    for quality, weight in [
        (models.QualityType.GOURMET, 55), (models.QualityType.STANDARD, 40),
        (models.QualityType.TK, 20), (models.QualityType.FENDUE, 10),
    ]:
        pl = models.PreparedLot(
            code=next_code(db, f"LP-{quality_abbr[quality]}"), transformation_id=trans1.id,
            quality=quality, weight=weight, status=models.PreparedLotStatus.IN_STOCK,
            bio_status=lot1.bio_status, location="Magasin central",
            humidity=12.5,
            created_by=admin.username, updated_by=admin.username, created_at=now, updated_at=now,
        )
        db.add(pl)
        db.flush()
        prepared_lots[quality] = pl

    db.commit()

    # --- Correction d'inventaire de demonstration sur le lot Standard ---
    standard_lot = prepared_lots[models.QualityType.STANDARD]
    standard_lot.weight = 39.5
    standard_lot.observations = "Ecart constate lors de l'inventaire physique mensuel."
    standard_lot.updated_by = stock_manager.username
    standard_lot.updated_at = now
    db.commit()

    # --- Vente / Export (module 10) : vente expediee du lot Gourmet -> sortie physique de stock ---
    sale1 = models.Sale(
        invoice_number=next_code(db, "VTE"), date=now, customer_name="Maison Ravel Export",
        total_weight=20, destination="France", status=models.SaleStatus.EXPEDIE,
        observations="Premiere vente de la saison, qualite Gourmet.",
        created_by=coordinator.username, updated_by=coordinator.username, created_at=now, updated_at=now,
    )
    db.add(sale1)
    db.flush()
    gourmet_lot = prepared_lots[models.QualityType.GOURMET]
    db.add(models.SaleItem(sale_id=sale1.id, prepared_lot_id=gourmet_lot.id, weight=20))
    gourmet_lot.weight -= 20
    gourmet_lot.status = models.PreparedLotStatus.SOLD if gourmet_lot.weight <= 0 else models.PreparedLotStatus.IN_STOCK
    gourmet_lot.updated_by = coordinator.username
    gourmet_lot.updated_at = now

    # --- Deuxieme vente encore en preparation (module 10) : reservation sans sortie physique ---
    sale2 = models.Sale(
        invoice_number=next_code(db, "VTE"), date=now, customer_name="Epicerie Bio Moroni",
        total_weight=5, destination="Comores", status=models.SaleStatus.PREPARE,
        observations="Vente locale en preparation, quantite reservee.",
        created_by=coordinator.username, updated_by=coordinator.username, created_at=now, updated_at=now,
    )
    db.add(sale2)
    db.flush()
    tk_lot = prepared_lots[models.QualityType.TK]
    db.add(models.SaleItem(sale_id=sale2.id, prepared_lot_id=tk_lot.id, weight=5))
    tk_lot.status = models.PreparedLotStatus.RESERVED
    tk_lot.updated_by = coordinator.username
    tk_lot.updated_at = now

    db.commit()

    # --- Inspection interne (module 12, V2) : parcelle conforme + parcelle non conforme ---
    insp1 = models.Inspection(
        code=next_code(db, "INSP"), object_type=models.ObjectType.PARCELLE,
        producer_id=p1.id, parcel_id=par1.id, auditor_id=auditor.id, date=now,
        checklist="Controle visuel des bordures, absence de produits chimiques, registre a jour.",
        compliance_borders=True, no_chemicals=True, traceability_maintained=True, proper_harvest_practices=True,
        result=models.InspectionResult.CONFORME, auditor_signature=True, producer_signature=True,
        observations="Parcelle exemplaire, aucun ecart constate.",
        created_by=auditor.username, updated_by=auditor.username, created_at=now, updated_at=now,
    )
    db.add(insp1)

    insp2 = models.Inspection(
        code=next_code(db, "INSP"), object_type=models.ObjectType.PARCELLE,
        producer_id=p1.id, parcel_id=par1b.id, auditor_id=auditor.id, date=now,
        checklist="Trace de produit non autorise repere pres de la bordure sud.",
        compliance_borders=False, no_chemicals=False, traceability_maintained=True, proper_harvest_practices=True,
        result=models.InspectionResult.NON_CONFORME, auditor_signature=True, producer_signature=False,
        observations="Producteur absent lors du controle ; a reconvoquer.",
        created_by=auditor.username, updated_by=auditor.username, created_at=now, updated_at=now,
    )
    db.add(insp2)
    db.flush()
    par1b.status = models.ParcelStatus.SUSPENDUE
    par1.last_inspection_date = now
    par1b.last_inspection_date = now
    db.commit()

    # --- Non-conformite (module 13, V2) liee a l'inspection non conforme ---
    nc1 = models.NonConformity(
        code=next_code(db, "NC"), inspection_id=insp2.id, object_type=models.ObjectType.PARCELLE,
        producer_id=p1.id, parcel_id=par1b.id,
        date_detected=now, type=models.NonConformitySeverity.MAJEURE, severity=models.NonConformitySeverity.MAJEURE.value,
        description="Presence d'un produit phytosanitaire non autorise a proximite de la parcelle.",
        decision="Suspension temporaire de la parcelle en attendant verification.",
        corrective_action="Retrait du produit et nouvelle inspection sous 15 jours.",
        responsible_id=coordinator.id, deadline=datetime(2026, 8, 15), status=models.NonConformityStatus.OUVERTE,
        created_by=auditor.username, updated_by=auditor.username, created_at=now, updated_at=now,
    )
    db.add(nc1)
    db.commit()

    print("Donnees de demonstration creees :")
    print(f"  - 2 producteurs ({p1.code} Bio, {p2.code} Conversion)")
    print(f"  - 3 parcelles ({par1.code} Bio, {par1b.code} Conventionnel -> Suspendue, {par2.code} Conversion)")
    print("  - 3 recoltes, 3 collectes")
    print(f"  - lot vert {lot1.code} (pur Bio, Disponible) et {lot2.code} (MELANGE -> Bloque automatiquement)")
    print(f"  - transformation {trans1.operation_number} (Cloturee, rendement {trans1.global_yield:.1f}%)")
    print(f"  - 4 lots prepares (quantite disponible suivie directement sur le lot, emplacement en texte libre)")
    print(f"  - 2 ventes : {sale1.invoice_number} Expediee (sortie physique) et {sale2.invoice_number} Preparee (reservation)")
    print(f"  - 2 inspections ({insp1.code} conforme, {insp2.code} non conforme), 1 non-conformite ({nc1.code})")

    db.close()


if __name__ == "__main__":
    seed()
