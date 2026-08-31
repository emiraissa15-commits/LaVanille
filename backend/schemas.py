from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional
from models import (
    UserRole, Gender, Island, ProducerStatus, BioStatus, SurfaceUnit, CropType,
    ParcelStatus, ContaminationRisk, HarvestStatus, CollectionStatus, GreenLotStatus,
    TransformationStatus, PreparedLotStatus, QualityType, SaleStatus,
    InspectionResult, NonConformitySeverity, NonConformityStatus, ObjectType,
    ControlCategory, ControlResult, RiskLevel,
    AccessLevel, Language,
)

# --- User / auth ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    access_level: AccessLevel = AccessLevel.TOTAL
    account_expiration: Optional[datetime] = None
    language: Language = Language.FRANCAIS

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    access_level: Optional[AccessLevel] = None
    account_expiration: Optional[datetime] = None
    language: Optional[Language] = None
    password: Optional[str] = None  # si fourni, reinitialise le mot de passe

class User(UserBase):
    id: int
    code: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None


# --- MODULE 01 - Producteurs ---
class ProducerBase(BaseModel):
    first_name: str
    last_name: str
    gender: Optional[Gender] = None
    birth_date: Optional[datetime] = None
    phone: Optional[str] = None
    minor_children_count: int = 0
    island: Optional[Island] = None
    region: Optional[str] = None
    village: str
    status: ProducerStatus = ProducerStatus.ACTIF
    bio_status: BioStatus = BioStatus.CONVERSION
    contract_signed: bool = False
    contract_date: Optional[datetime] = None
    observations: Optional[str] = None

class ProducerCreate(ProducerBase):
    pass

class Producer(ProducerBase):
    id: int
    code: str
    entry_date: datetime
    photo_path: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    # calculated (populated by the endpoint, not stored)
    total_surface: Optional[float] = 0
    parcel_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- MODULE 02 - Parcelles ---
class ParcelBase(BaseModel):
    producer_id: int
    name: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    surface: float
    surface_unit: SurfaceUnit = SurfaceUnit.HA
    altitude: Optional[float] = None
    crop_type: CropType = CropType.VANILLE
    status: ParcelStatus = ParcelStatus.CONFORME
    bio_status: BioStatus = BioStatus.CONVERSION
    contamination_risk: ContaminationRisk = ContaminationRisk.FAIBLE
    buffer_zone_present: bool = False
    observations: Optional[str] = None

class ParcelCreate(ParcelBase):
    pass

class Parcel(ParcelBase):
    id: int
    code: str
    last_inspection_date: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- MODULE 03 - Recoltes (Harvest) ---
class HarvestBase(BaseModel):
    producer_id: Optional[int] = None
    parcel_id: int
    date: datetime = Field(default_factory=datetime.utcnow)
    weight: float
    status: HarvestStatus = HarvestStatus.BROUILLON
    quality: Optional[str] = None
    maturity: Optional[str] = None
    observations: Optional[str] = None

class HarvestCreate(HarvestBase):
    recorded_by_id: int

class Harvest(HarvestBase):
    id: int
    code: Optional[str] = None
    bio_status: Optional[BioStatus] = None
    remaining_weight: Optional[float] = None
    recorded_by_id: int
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- MODULE 05 - Lots verts (GreenLot) ---
class GreenLotBase(BaseModel):
    observations: Optional[str] = None

class GreenLotCreate(GreenLotBase):
    collection_ids: List[int]
    status: GreenLotStatus = GreenLotStatus.DISPONIBLE

class GreenLotStatusUpdate(BaseModel):
    status: GreenLotStatus
    observations: Optional[str] = None

class GreenLot(GreenLotBase):
    id: int
    code: str
    created_at: datetime
    total_weight: float
    remaining_weight: float
    status: GreenLotStatus
    bio_status: Optional[BioStatus] = None

    class Config:
        from_attributes = True


# --- MODULE 04 - Collectes (Collection) ---
class CollectionBase(BaseModel):
    harvest_id: int
    date: datetime = Field(default_factory=datetime.utcnow)
    gross_weight: Optional[float] = None
    net_weight: float
    status: CollectionStatus = CollectionStatus.BROUILLON
    observations: Optional[str] = None

class CollectionCreate(CollectionBase):
    collector_id: int

class Collection(CollectionBase):
    id: int
    code: Optional[str] = None
    slip_number: str
    producer_id: Optional[int] = None
    parcel_id: Optional[int] = None
    green_lot_id: Optional[int] = None
    collector_id: int
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- MODULE 06 - Transformations ---
class TransformationBase(BaseModel):
    start_date: datetime = Field(default_factory=datetime.utcnow)
    observations: Optional[str] = None

class TransformationInputItem(BaseModel):
    green_lot_id: int
    weight_used: Optional[float] = None  # absent/None = consomme tout le poids restant du lot

class TransformationCreate(TransformationBase):
    input_lots: List[TransformationInputItem]
    manager_id: int

class TransformationUpdate(BaseModel):
    end_date: datetime = Field(default_factory=datetime.utcnow)
    gourmet_weight: float = 0
    standard_weight: float = 0
    tk_weight: float = 0
    fendue_weight: float = 0
    status: TransformationStatus = TransformationStatus.CLOTUREE
    observations: Optional[str] = None

class TransformationStatusUpdate(BaseModel):
    status: TransformationStatus
    observations: Optional[str] = None

class Transformation(TransformationBase):
    id: int
    operation_number: str
    end_date: Optional[datetime] = None
    input_weight: Optional[float] = None
    output_weight: Optional[float] = None
    gourmet_weight: Optional[float] = None
    standard_weight: Optional[float] = None
    tk_weight: Optional[float] = None
    fendue_weight: Optional[float] = None
    loss_weight: Optional[float] = None
    loss_rate: Optional[float] = None
    global_yield: Optional[float] = None
    status: TransformationStatus
    manager_id: int

    class Config:
        from_attributes = True


# --- MODULE 07 - Lots prepares ---
# NB : pas de module Magasins/Emplacements (12) ni de Mouvements de stock (09) separes
# (hors scope) : le poids/statut du lot est modifie uniquement par la finalisation de
# transformation et par les ventes/exports.
class PreparedLotBase(BaseModel):
    quality: QualityType
    weight: float
    humidity: Optional[float] = None
    status: PreparedLotStatus = PreparedLotStatus.IN_STOCK
    bio_status: Optional[BioStatus] = None
    location: Optional[str] = None
    observations: Optional[str] = None

class PreparedLotCreate(PreparedLotBase):
    transformation_id: int

class PreparedLot(PreparedLotBase):
    id: int
    code: str
    transformation_id: int
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    # calculee (= weight) : conservee pour compatibilite frontend, pas de table de stock separee
    available_quantity: Optional[float] = None

    class Config:
        from_attributes = True


# --- MODULE 10 - Vente / Export ---
class SaleItemBase(BaseModel):
    prepared_lot_id: int
    weight: float

class SaleCreate(BaseModel):
    customer_name: str
    destination: str
    status: SaleStatus = SaleStatus.PREPARE
    observations: Optional[str] = None
    items: List[SaleItemBase]

class SaleItem(SaleItemBase):
    id: int
    sale_id: int
    prepared_lot: PreparedLot

    class Config:
        from_attributes = True

class Sale(BaseModel):
    id: int
    invoice_number: str
    date: datetime
    customer_name: str
    total_weight: float
    destination: str
    status: SaleStatus
    observations: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[SaleItem]

    class Config:
        from_attributes = True


# --- MODULE 12 - Inspections internes (V2) ---
# Inspection polymorphe : object_type indique quel maillon de la chaine est concerne,
# et seul le FK correspondant doit etre renseigne (producer_id/parcel_id/harvest_id/
# collection_id/green_lot_id/transformation_id/prepared_lot_id/sale_id).
class InspectionBase(BaseModel):
    object_type: ObjectType = ObjectType.PARCELLE
    producer_id: Optional[int] = None
    parcel_id: Optional[int] = None
    harvest_id: Optional[int] = None
    collection_id: Optional[int] = None
    green_lot_id: Optional[int] = None
    transformation_id: Optional[int] = None
    prepared_lot_id: Optional[int] = None
    sale_id: Optional[int] = None
    checklist: Optional[str] = None
    compliance_borders: bool = True
    no_chemicals: bool = True
    traceability_maintained: bool = True
    proper_harvest_practices: bool = True
    photos: Optional[str] = None
    result: InspectionResult = InspectionResult.CONFORME
    auditor_signature: bool = False
    producer_signature: bool = False
    observations: Optional[str] = None

class InspectionCreate(InspectionBase):
    auditor_id: int

class Inspection(InspectionBase):
    id: int
    code: Optional[str] = None
    auditor_id: int
    date: datetime
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- MODULE 14 - Controles detailles d'inspection (V2) ---
class InspectionControlBase(BaseModel):
    category: ControlCategory = ControlCategory.DOCUMENTAIRE
    control_point: str
    result: ControlResult = ControlResult.NON_APPLICABLE
    risk_level: Optional[RiskLevel] = None
    comment: Optional[str] = None
    triggers_non_conformity: bool = False

class InspectionControlCreate(InspectionControlBase):
    pass

class InspectionControl(InspectionControlBase):
    id: int
    inspection_id: int
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- MODULE 13 - Non-conformites (V2) ---
# Non-conformite polymorphe (memes regles que Inspection ci-dessus) : object_type est
# optionnel (une NC peut rester libre / rattachee uniquement a une inspection).
class NonConformityBase(BaseModel):
    inspection_id: Optional[int] = None
    object_type: Optional[ObjectType] = None
    producer_id: Optional[int] = None
    parcel_id: Optional[int] = None
    harvest_id: Optional[int] = None
    collection_id: Optional[int] = None
    green_lot_id: Optional[int] = None
    transformation_id: Optional[int] = None
    prepared_lot_id: Optional[int] = None
    sale_id: Optional[int] = None
    type: NonConformitySeverity = NonConformitySeverity.MINEURE
    description: str
    decision: Optional[str] = None
    corrective_action: Optional[str] = None
    responsible_id: Optional[int] = None
    deadline: Optional[datetime] = None
    status: NonConformityStatus = NonConformityStatus.OUVERTE
    sanction: Optional[str] = None
    attachments: Optional[str] = None

class NonConformityCreate(NonConformityBase):
    pass

class NonConformity(NonConformityBase):
    id: int
    code: Optional[str] = None
    date_detected: datetime
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
