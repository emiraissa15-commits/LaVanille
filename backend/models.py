from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    COORDINATOR_SCI = "COORDINATOR_SCI"
    INTERNAL_AUDITOR = "INTERNAL_AUDITOR"
    COLLECTION_MANAGER = "COLLECTION_MANAGER"
    TRANSFORMATION_MANAGER = "TRANSFORMATION_MANAGER"
    STOCK_MANAGER = "STOCK_MANAGER"
    EXTERNAL_AUDITOR = "EXTERNAL_AUDITOR"

class AccessLevel(str, enum.Enum):
    TOTAL = "Total"
    LIMITE = "Limite"
    LECTURE_SEULE = "Lecture seule"

class Language(str, enum.Enum):
    FRANCAIS = "Francais"
    ANGLAIS = "Anglais"

# --- Enumerations aligned with "FICHES APPLICATION WEB FINAL" (module 1-6 field spec) ---

class Gender(str, enum.Enum):
    HOMME = "Homme"
    FEMME = "Femme"

class Island(str, enum.Enum):
    NGAZIDJA = "Ngazidja"
    MOHELI = "Moheli"
    ANJOUAN = "Anjouan"

class ProducerStatus(str, enum.Enum):
    ACTIF = "Actif"
    SUSPENDU = "Suspendu"
    EXCLU = "Exclu"
    ARCHIVE = "Archive"

class BioStatus(str, enum.Enum):
    BIO = "Bio"
    CONVERSION = "Conversion"
    CONVENTIONNEL = "Conventionnel"

class SurfaceUnit(str, enum.Enum):
    HA = "ha"
    M2 = "m2"

class CropType(str, enum.Enum):
    VANILLE = "Vanille"
    MIXTE = "Mixte"

class ParcelStatus(str, enum.Enum):
    CONFORME = "Conforme"
    SUSPENDUE = "Suspendue"
    BLOQUEE = "Bloquee"
    ARCHIVEE = "Archivee"

class ContaminationRisk(str, enum.Enum):
    FAIBLE = "Faible"
    MOYEN = "Moyen"
    ELEVE = "Eleve"

class HarvestStatus(str, enum.Enum):
    BROUILLON = "Brouillon"
    VALIDEE = "Validee"
    ANNULEE = "Annulee"
    BLOQUEE = "Bloquee"

class CollectionStatus(str, enum.Enum):
    BROUILLON = "Brouillon"
    VALIDEE = "Validee"
    AFFECTEE = "Affectee a un lot vert"
    ANNULEE = "Annulee"
    BLOQUEE = "Bloquee"

class GreenLotStatus(str, enum.Enum):
    DISPONIBLE = "Disponible"
    PARTIEL = "Partiellement utilise"
    TRANSFORME = "Transforme"
    BLOQUE = "Bloque"
    ANNULE = "Annule"

class TransformationStatus(str, enum.Enum):
    BROUILLON = "Brouillon"
    EN_COURS = "En cours"
    CLOTUREE = "Cloturee"
    ANNULEE = "Annulee"
    BLOQUEE = "Bloquee"

class PreparedLotStatus(str, enum.Enum):
    IN_STOCK = "En stock"
    RESERVED = "Reserve"
    SOLD = "Vendu"
    EXPORTED = "Exporte"
    BLOCKED = "Bloque"
    CANCELLED = "Annule"

class QualityType(str, enum.Enum):
    GOURMET = "Gourmet"
    STANDARD = "Standard"
    TK = "TK"
    FENDUE = "Fendue"

class SaleStatus(str, enum.Enum):
    PREPARE = "Prepare"
    EXPEDIE = "Expedie"
    CLOTURE = "Cloture"

class InspectionResult(str, enum.Enum):
    CONFORME = "Conforme"
    CONFORME_RESERVE = "Conforme avec reserve"
    NON_CONFORME = "Non conforme"

class NonConformitySeverity(str, enum.Enum):
    MINEURE = "Mineure"
    MAJEURE = "Majeure"

class NonConformityStatus(str, enum.Enum):
    OUVERTE = "Ouverte"
    EN_COURS = "En cours"
    CLOTUREE = "Cloturee"

class ControlCategory(str, enum.Enum):
    DOCUMENTAIRE = "Documentaire"
    BIO = "Bio"
    TRACABILITE = "Tracabilite"
    STOCK = "Stock"
    QUALITE = "Qualite"
    EXPORT = "Export"

class ControlResult(str, enum.Enum):
    OUI = "Oui"
    NON = "Non"
    NON_APPLICABLE = "Non applicable"

class RiskLevel(str, enum.Enum):
    FAIBLE = "Faible"
    MOYEN = "Moyen"
    ELEVE = "Eleve"

class ObjectType(str, enum.Enum):
    """Objet concerne par une inspection ou une non-conformite, sur toute la chaine de tracabilite A-Z."""
    PRODUCTEUR = "Producteur"
    PARCELLE = "Parcelle"
    RECOLTE = "Recolte"
    COLLECTE = "Collecte"
    LOT_VERT = "Lot vert"
    TRANSFORMATION = "Transformation"
    LOT_PREPARE = "Lot prepare"
    VENTE = "Vente"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=True)  # USER-2026-001
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.INTERNAL_AUDITOR)
    is_active = Column(Boolean, default=True)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.TOTAL)
    account_expiration = Column(DateTime, nullable=True)
    language = Column(Enum(Language), default=Language.FRANCAIS)
    last_login = Column(DateTime, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------- MODULE 01 - PRODUCTEURS ----------------
class Producer(Base):
    __tablename__ = "producers"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # PROD-2026-001
    first_name = Column(String)
    last_name = Column(String)
    gender = Column(Enum(Gender), nullable=True)
    birth_date = Column(DateTime, nullable=True)
    phone = Column(String, nullable=True)
    minor_children_count = Column(Integer, default=0)
    island = Column(Enum(Island), nullable=True)
    region = Column(String, nullable=True)
    village = Column(String)
    entry_date = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(ProducerStatus), default=ProducerStatus.ACTIF)
    bio_status = Column(Enum(BioStatus), default=BioStatus.CONVERSION)
    photo_path = Column(String, nullable=True)
    contract_signed = Column(Boolean, default=False)
    contract_date = Column(DateTime, nullable=True)
    observations = Column(Text, nullable=True)

    # audit
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parcels = relationship("Parcel", back_populates="producer")
    harvests = relationship("Harvest", back_populates="producer")
    collections = relationship("Collection", back_populates="producer")

    @property
    def total_surface(self):
        return round(sum((p.surface or 0) for p in self.parcels), 4)

    @property
    def parcel_count(self):
        return len(self.parcels)


# ---------------- MODULE 02 - PARCELLES ----------------
class Parcel(Base):
    __tablename__ = "parcels"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # PAR-2026-001
    producer_id = Column(Integer, ForeignKey("producers.id"))
    name = Column(String, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_long = Column(Float, nullable=True)
    surface = Column(Float)
    surface_unit = Column(Enum(SurfaceUnit), default=SurfaceUnit.HA)
    altitude = Column(Float, nullable=True)
    crop_type = Column(Enum(CropType), default=CropType.VANILLE)
    status = Column(Enum(ParcelStatus), default=ParcelStatus.CONFORME)
    bio_status = Column(Enum(BioStatus), default=BioStatus.CONVERSION)
    contamination_risk = Column(Enum(ContaminationRisk), default=ContaminationRisk.FAIBLE)
    buffer_zone_present = Column(Boolean, default=False)
    last_inspection_date = Column(DateTime, nullable=True)
    observations = Column(Text, nullable=True)

    # audit
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    producer = relationship("Producer", back_populates="parcels")
    harvests = relationship("Harvest", back_populates="parcel")


# ---------------- MODULE 03 - RECOLTES ----------------
class Harvest(Base):
    __tablename__ = "harvests"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=True)  # REC-2026-001
    producer_id = Column(Integer, ForeignKey("producers.id"), nullable=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id"))
    date = Column(DateTime, default=datetime.utcnow)
    weight = Column(Float)
    remaining_weight = Column(Float, default=0)  # deduit a chaque collecte rattachee
    status = Column(Enum(HarvestStatus), default=HarvestStatus.BROUILLON)
    bio_status = Column(Enum(BioStatus), nullable=True)  # inherited from parcel at creation time
    quality = Column(String, nullable=True)
    maturity = Column(String, nullable=True)
    observations = Column(Text, nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id"))

    # audit
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    producer = relationship("Producer", back_populates="harvests")
    parcel = relationship("Parcel", back_populates="harvests")
    collections = relationship("Collection", back_populates="harvest")


# ---------------- MODULE 04 - COLLECTES ----------------
class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=True)  # COL-2026-001, replaces slip_number semantics
    slip_number = Column(String, unique=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    harvest_id = Column(Integer, ForeignKey("harvests.id"))
    producer_id = Column(Integer, ForeignKey("producers.id"), nullable=True)  # auto from harvest
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=True)  # auto from harvest
    green_lot_id = Column(Integer, ForeignKey("green_lots.id"), nullable=True)
    gross_weight = Column(Float, nullable=True)
    net_weight = Column(Float)
    collector_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(CollectionStatus), default=CollectionStatus.BROUILLON)
    observations = Column(Text, nullable=True)

    # audit
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    harvest = relationship("Harvest", back_populates="collections")
    producer = relationship("Producer", back_populates="collections")
    parcel = relationship("Parcel")
    collector = relationship("User")
    green_lot = relationship("GreenLot", back_populates="collections")


# ---------------- MODULE 05 - LOTS VERTS ----------------
class GreenLot(Base):
    __tablename__ = "green_lots"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # LV-2026-001
    created_at = Column(DateTime, default=datetime.utcnow)
    total_weight = Column(Float, default=0)
    remaining_weight = Column(Float, default=0)
    status = Column(Enum(GreenLotStatus), default=GreenLotStatus.DISPONIBLE)
    bio_status = Column(Enum(BioStatus), nullable=True)  # computed from linked collections; mixed -> Bloque
    observations = Column(Text, nullable=True)

    # audit
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    collections = relationship("Collection", back_populates="green_lot")
    transformations = relationship("Transformation", secondary="transformation_input_lots", back_populates="input_lots")


# ---------------- MODULE 06 - TRANSFORMATIONS ----------------
class Transformation(Base):
    __tablename__ = "transformations"
    id = Column(Integer, primary_key=True, index=True)
    operation_number = Column(String, unique=True, index=True)  # TR-2026-001
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    input_weight = Column(Float, default=0)
    output_weight = Column(Float, nullable=True)
    gourmet_weight = Column(Float, nullable=True)
    standard_weight = Column(Float, nullable=True)
    tk_weight = Column(Float, nullable=True)
    fendue_weight = Column(Float, nullable=True)
    loss_weight = Column(Float, nullable=True)
    loss_rate = Column(Float, nullable=True)
    global_yield = Column(Float, nullable=True)
    status = Column(Enum(TransformationStatus), default=TransformationStatus.BROUILLON)
    manager_id = Column(Integer, ForeignKey("users.id"))
    observations = Column(Text, nullable=True)

    # audit
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    input_lots = relationship("GreenLot", secondary="transformation_input_lots", back_populates="transformations")
    prepared_lots = relationship("PreparedLot", back_populates="transformation")


class TransformationInputLots(Base):
    __tablename__ = "transformation_input_lots"
    transformation_id = Column(Integer, ForeignKey("transformations.id"), primary_key=True)
    green_lot_id = Column(Integer, ForeignKey("green_lots.id"), primary_key=True)


# ---------------- MODULE 07 - LOTS PREPARES ----------------
# NB : pas de module Magasins/Emplacements (12) ni de Mouvements de stock (09) separes
# (hors scope) : l'emplacement est un simple champ texte libre, et le poids du lot est
# modifie uniquement par la finalisation de transformation et les ventes/exports.
class PreparedLot(Base):
    __tablename__ = "prepared_lots"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # LP-GOUR-2026-001
    transformation_id = Column(Integer, ForeignKey("transformations.id"))
    quality = Column(Enum(QualityType))
    weight = Column(Float)
    humidity = Column(Float, nullable=True)
    status = Column(Enum(PreparedLotStatus), default=PreparedLotStatus.IN_STOCK)
    bio_status = Column(Enum(BioStatus), nullable=True)  # herite des lots verts d'origine
    location = Column(String, nullable=True)  # emplacement libre (texte)
    observations = Column(Text, nullable=True)

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transformation = relationship("Transformation", back_populates="prepared_lots")

    @property
    def available_quantity(self):
        # Sans table de stock separee : le poids du lot prepare EST la quantite disponible.
        return self.weight


# ---------------- MODULE 10 - VENTE / EXPORT ----------------
class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True)  # VTE-2026-001
    date = Column(DateTime, default=datetime.utcnow)
    customer_name = Column(String)
    total_weight = Column(Float)
    destination = Column(String, nullable=True)
    status = Column(Enum(SaleStatus), default=SaleStatus.PREPARE)
    observations = Column(Text, nullable=True)

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("SaleItem", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    prepared_lot_id = Column(Integer, ForeignKey("prepared_lots.id"))
    weight = Column(Float)

    sale = relationship("Sale", back_populates="items")
    prepared_lot = relationship("PreparedLot")


# ---------------- MODULE 12 - INSPECTIONS INTERNES (V2) ----------------
class Inspection(Base):
    __tablename__ = "inspections"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=True)  # INSP-2026-001
    # Objet concerne (polymorphe) : un seul des FK ci-dessous est renseigne, selon object_type.
    # Permet la tracabilite/inspection sur toute la chaine A-Z (producteur -> ... -> vente).
    object_type = Column(Enum(ObjectType), default=ObjectType.PARCELLE)
    producer_id = Column(Integer, ForeignKey("producers.id"), nullable=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=True)
    harvest_id = Column(Integer, ForeignKey("harvests.id"), nullable=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    green_lot_id = Column(Integer, ForeignKey("green_lots.id"), nullable=True)
    transformation_id = Column(Integer, ForeignKey("transformations.id"), nullable=True)
    prepared_lot_id = Column(Integer, ForeignKey("prepared_lots.id"), nullable=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True)
    auditor_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.utcnow)

    # checklist (module 6.12) - stocke en JSON texte, structure libre cote frontend
    checklist = Column(Text, nullable=True)
    compliance_borders = Column(Boolean, default=True)
    no_chemicals = Column(Boolean, default=True)
    traceability_maintained = Column(Boolean, default=True)
    proper_harvest_practices = Column(Boolean, default=True)

    photos = Column(Text, nullable=True)  # chemins/URLs separes par virgule
    result = Column(Enum(InspectionResult), default=InspectionResult.CONFORME)
    auditor_signature = Column(Boolean, default=False)
    producer_signature = Column(Boolean, default=False)
    observations = Column(Text, nullable=True)

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    producer = relationship("Producer")
    parcel = relationship("Parcel")
    harvest = relationship("Harvest")
    collection = relationship("Collection")
    green_lot = relationship("GreenLot")
    transformation = relationship("Transformation")
    prepared_lot = relationship("PreparedLot")
    sale = relationship("Sale")
    auditor = relationship("User")
    non_conformities = relationship("NonConformity", back_populates="inspection")
    controls = relationship("InspectionControl", back_populates="inspection")


# ---------------- MODULE 14 - CONTROLES DETAILLES D'INSPECTION ----------------
# Evite de creer une table d'inspection separee par type d'objet : chaque inspection
# (module 12/13) peut porter une liste de points de controle detailles, chacun pouvant
# a son tour declencher automatiquement une non-conformite (module 13).
class InspectionControl(Base):
    __tablename__ = "inspection_controls"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    category = Column(Enum(ControlCategory), default=ControlCategory.DOCUMENTAIRE)
    control_point = Column(String)  # ex : "Contrat signe disponible"
    result = Column(Enum(ControlResult), default=ControlResult.NON_APPLICABLE)
    risk_level = Column(Enum(RiskLevel), nullable=True)
    comment = Column(Text, nullable=True)
    triggers_non_conformity = Column(Boolean, default=False)

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="controls")


# ---------------- MODULE 13 - NON-CONFORMITES (V2) ----------------
class NonConformity(Base):
    __tablename__ = "non_conformities"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=True)  # NC-2026-001
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    # Objet concerne (polymorphe) : cf. Inspection.object_type. Permet de rattacher une
    # non-conformite a n'importe quel maillon de la chaine de tracabilite A-Z.
    object_type = Column(Enum(ObjectType), nullable=True)
    producer_id = Column(Integer, ForeignKey("producers.id"), nullable=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=True)
    harvest_id = Column(Integer, ForeignKey("harvests.id"), nullable=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    green_lot_id = Column(Integer, ForeignKey("green_lots.id"), nullable=True)
    transformation_id = Column(Integer, ForeignKey("transformations.id"), nullable=True)
    prepared_lot_id = Column(Integer, ForeignKey("prepared_lots.id"), nullable=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True)
    date_detected = Column(DateTime, default=datetime.utcnow)
    type = Column(Enum(NonConformitySeverity), default=NonConformitySeverity.MINEURE)
    description = Column(Text)
    severity = Column(String, nullable=True)  # conserve pour compatibilite (doublon libre de "type")
    decision = Column(Text, nullable=True)
    corrective_action = Column(Text, nullable=True)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    deadline = Column(DateTime, nullable=True)
    status = Column(Enum(NonConformityStatus), default=NonConformityStatus.OUVERTE)
    sanction = Column(Text, nullable=True)
    attachments = Column(Text, nullable=True)

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="non_conformities")
    producer = relationship("Producer")
    parcel = relationship("Parcel")
    harvest = relationship("Harvest")
    collection = relationship("Collection")
    green_lot = relationship("GreenLot")
    transformation = relationship("Transformation")
    prepared_lot = relationship("PreparedLot")
    sale = relationship("Sale")
    responsible = relationship("User")
