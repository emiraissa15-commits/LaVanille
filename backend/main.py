from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas, auth
from database import engine, get_db, SessionLocal
from codes import next_code, CodeSequence
from typing import List, Optional
from datetime import timedelta, datetime
import uuid

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCI Vanille Bio API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- AUTHENTICATION ---

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.settings.SECRET_KEY, algorithms=[auth.settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except auth.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

def check_role(roles: List[models.UserRole]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les permissions necessaires"
            )
        return current_user
    return role_checker

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte desactive")
    if user.account_expiration and user.account_expiration < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte expire")

    user.last_login = datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=auth.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users/", response_model=List[schemas.User])
def list_users(include_inactive: bool = False, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    q = db.query(models.User)
    if not include_inactive:
        q = q.filter(models.User.is_active == True)
    return q.order_by(models.User.username).all()

@app.post("/users/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN]))):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe deja")
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Cet email est deja utilise")

    data = user.dict()
    password = data.pop("password")
    code = next_code(db, "USER")
    now = datetime.utcnow()
    db_user = models.User(
        **data, code=code, hashed_password=auth.get_password_hash(password),
        is_active=True, created_by=current_user.username, created_at=now,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN]))):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    data = user.dict(exclude_unset=True)
    password = data.pop("password", None)
    if password:
        db_user.hashed_password = auth.get_password_hash(password)
    for k, v in data.items():
        setattr(db_user, k, v)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}/deactivate", response_model=schemas.User)
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN]))):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas desactiver votre propre compte")
    db_user.is_active = False
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}/reactivate", response_model=schemas.User)
def reactivate_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN]))):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db_user.is_active = True
    db.commit()
    db.refresh(db_user)
    return db_user


# --- MODULE 01 : PRODUCTEURS ---

@app.get("/producers/", response_model=List[schemas.Producer])
def get_producers(skip: int = 0, limit: int = 500, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Producer).order_by(models.Producer.created_at.desc()).offset(skip).limit(limit).all()

@app.get("/producers/{producer_id}", response_model=schemas.Producer)
def get_producer(producer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_producer = db.query(models.Producer).filter(models.Producer.id == producer_id).first()
    if db_producer is None:
        raise HTTPException(status_code=404, detail="Producteur non trouve")
    return db_producer

@app.post("/producers/", response_model=schemas.Producer, status_code=status.HTTP_201_CREATED)
def create_producer(producer: schemas.ProducerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI]))):
    data = producer.dict()
    code = next_code(db, "PROD")
    now = datetime.utcnow()
    db_producer = models.Producer(**data, code=code, created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now)
    db.add(db_producer)
    db.commit()
    db.refresh(db_producer)
    return db_producer

@app.put("/producers/{producer_id}", response_model=schemas.Producer)
def update_producer(producer_id: int, producer: schemas.ProducerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI]))):
    db_producer = db.query(models.Producer).filter(models.Producer.id == producer_id).first()
    if db_producer is None:
        raise HTTPException(status_code=404, detail="Producteur non trouve")
    for k, v in producer.dict().items():
        setattr(db_producer, k, v)
    db_producer.updated_by = current_user.username
    db_producer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_producer)
    return db_producer


# --- MODULE 02 : PARCELLES ---

@app.get("/parcels/", response_model=List[schemas.Parcel])
def get_parcels(producer_id: Optional[int] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    q = db.query(models.Parcel)
    if producer_id:
        q = q.filter(models.Parcel.producer_id == producer_id)
    return q.order_by(models.Parcel.created_at.desc()).all()

@app.get("/parcels/{parcel_id}", response_model=schemas.Parcel)
def get_parcel(parcel_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_parcel = db.query(models.Parcel).filter(models.Parcel.id == parcel_id).first()
    if db_parcel is None:
        raise HTTPException(status_code=404, detail="Parcelle non trouvee")
    return db_parcel

@app.post("/parcels/", response_model=schemas.Parcel, status_code=status.HTTP_201_CREATED)
def create_parcel(parcel: schemas.ParcelCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    producer = db.query(models.Producer).filter(models.Producer.id == parcel.producer_id).first()
    if not producer:
        raise HTTPException(status_code=400, detail="Producteur introuvable")
    data = parcel.dict()
    code = next_code(db, "PAR")
    now = datetime.utcnow()
    db_parcel = models.Parcel(**data, code=code, created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now)
    db.add(db_parcel)
    db.commit()
    db.refresh(db_parcel)
    return db_parcel

@app.put("/parcels/{parcel_id}", response_model=schemas.Parcel)
def update_parcel(parcel_id: int, parcel: schemas.ParcelCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_parcel = db.query(models.Parcel).filter(models.Parcel.id == parcel_id).first()
    if db_parcel is None:
        raise HTTPException(status_code=404, detail="Parcelle non trouvee")
    for k, v in parcel.dict().items():
        setattr(db_parcel, k, v)
    db_parcel.updated_by = current_user.username
    db_parcel.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_parcel)
    return db_parcel


# --- MODULE 03 : RECOLTES ---

@app.get("/harvests/", response_model=List[schemas.Harvest])
def get_harvests(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Harvest).order_by(models.Harvest.date.desc()).all()

@app.get("/harvests/{harvest_id}", response_model=schemas.Harvest)
def get_harvest(harvest_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_harvest = db.query(models.Harvest).filter(models.Harvest.id == harvest_id).first()
    if not db_harvest:
        raise HTTPException(status_code=404, detail="Recolte non trouvee")
    return db_harvest

@app.post("/harvests/", response_model=schemas.Harvest, status_code=status.HTTP_201_CREATED)
def create_harvest(harvest: schemas.HarvestCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI, models.UserRole.COLLECTION_MANAGER]))):
    parcel = db.query(models.Parcel).filter(models.Parcel.id == harvest.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=400, detail="Parcelle introuvable")
    if parcel.producer.status != models.ProducerStatus.ACTIF:
        raise HTTPException(status_code=400, detail="Action impossible : producteur suspendu, exclu ou archive")

    data = harvest.dict()
    data["producer_id"] = parcel.producer_id  # herite automatiquement, non modifiable par le client
    code = next_code(db, "REC")
    now = datetime.utcnow()
    db_harvest = models.Harvest(
        **data,
        code=code,
        bio_status=parcel.bio_status,  # statut bio herite de la parcelle
        remaining_weight=data["weight"],  # poids restant = poids recolte tant qu'aucune collecte n'est rattachee
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_harvest)
    db.commit()
    db.refresh(db_harvest)
    return db_harvest


# --- MODULE 04 : COLLECTES ---

@app.get("/collections/", response_model=List[schemas.Collection])
def get_collections(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Collection).order_by(models.Collection.date.desc()).all()

@app.post("/collections/", response_model=schemas.Collection, status_code=status.HTTP_201_CREATED)
def create_collection(collection: schemas.CollectionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    harvest = db.query(models.Harvest).filter(models.Harvest.id == collection.harvest_id).first()
    if not harvest:
        raise HTTPException(status_code=400, detail="Recolte introuvable")

    # Le poids collecte ne peut jamais depasser le poids restant de la recolte, et en est deduit.
    remaining = harvest.remaining_weight if harvest.remaining_weight is not None else harvest.weight
    if collection.net_weight > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Poids net collecte ({collection.net_weight} kg) superieur au poids restant de la recolte {harvest.code} ({remaining} kg)"
        )

    data = collection.dict()
    code = next_code(db, "COL")
    now = datetime.utcnow()
    db_collection = models.Collection(
        **data,
        code=code,
        slip_number=code,  # conserve pour compatibilite avec l'ancien champ
        producer_id=harvest.producer_id,
        parcel_id=harvest.parcel_id,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_collection)

    harvest.remaining_weight = round(remaining - collection.net_weight, 3)
    harvest.updated_by = current_user.username
    harvest.updated_at = now

    db.commit()
    db.refresh(db_collection)
    return db_collection


# --- MODULE 05 : LOTS VERTS ---

@app.get("/green-lots/", response_model=List[schemas.GreenLot])
def get_green_lots(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.GreenLot).order_by(models.GreenLot.created_at.desc()).all()

@app.get("/collections/available/", response_model=List[schemas.Collection])
def get_available_collections(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Collectes validees et non encore affectees a un lot vert."""
    return (
        db.query(models.Collection)
        .filter(models.Collection.status == models.CollectionStatus.VALIDEE)
        .filter(models.Collection.green_lot_id.is_(None))
        .order_by(models.Collection.date.desc())
        .all()
    )

@app.post("/green-lots/", response_model=schemas.GreenLot, status_code=status.HTTP_201_CREATED)
def create_green_lot(lot: schemas.GreenLotCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not lot.collection_ids:
        raise HTTPException(status_code=400, detail="Selectionnez au moins une collecte")

    collections = db.query(models.Collection).filter(models.Collection.id.in_(lot.collection_ids)).all()
    if len(collections) != len(lot.collection_ids):
        raise HTTPException(status_code=400, detail="Une ou plusieurs collectes sont introuvables")
    for c in collections:
        if c.green_lot_id is not None:
            raise HTTPException(status_code=400, detail=f"La collecte {c.code} est deja affectee a un lot vert")

    total_weight = sum(c.net_weight for c in collections)
    bio_statuses = set(c.harvest.bio_status for c in collections if c.harvest and c.harvest.bio_status)
    mixed = len(bio_statuses) > 1
    bio_status = models.BioStatus.CONVENTIONNEL if mixed else (next(iter(bio_statuses)) if bio_statuses else models.BioStatus.CONVENTIONNEL)
    final_status = models.GreenLotStatus.BLOQUE if mixed else lot.status

    code = next_code(db, "LV")
    now = datetime.utcnow()
    db_lot = models.GreenLot(
        code=code, created_at=now, total_weight=total_weight, remaining_weight=total_weight,
        status=final_status, bio_status=bio_status, observations=lot.observations,
        created_by=current_user.username, updated_by=current_user.username, updated_at=now,
    )
    db.add(db_lot)
    db.flush()

    for c in collections:
        c.green_lot_id = db_lot.id
        c.status = models.CollectionStatus.AFFECTEE
        c.updated_by = current_user.username

    # Regle prioritaire du cahier des charges : un melange Bio/Conventionnel bloque le lot
    # ET declenche automatiquement la creation d'une non-conformite liee.
    if mixed:
        nc_code = next_code(db, "NC")
        statuses_str = ", ".join(sorted(s.value for s in bio_statuses))
        db.add(models.NonConformity(
            code=nc_code, object_type=models.ObjectType.LOT_VERT, green_lot_id=db_lot.id,
            date_detected=now, type=models.NonConformitySeverity.MAJEURE,
            severity=models.NonConformitySeverity.MAJEURE.value,
            description=f"Melange de statuts bio detecte lors de la creation du lot vert {code} ({statuses_str}). Lot bloque automatiquement.",
            corrective_action="Verifier l'origine des collectes rattachees et re-affecter si besoin avant deblocage manuel du lot.",
            responsible_id=current_user.id, deadline=now + timedelta(days=7),
            status=models.NonConformityStatus.OUVERTE,
            created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
        ))

    db.commit()
    db.refresh(db_lot)
    return db_lot

@app.put("/green-lots/{lot_id}/status", response_model=schemas.GreenLot)
def update_green_lot_status(lot_id: int, update: schemas.GreenLotStatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI]))):
    """Modification manuelle du statut d'un lot vert (ex: debloquer apres verification, annuler)."""
    lot = db.query(models.GreenLot).filter(models.GreenLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot vert introuvable")
    if lot.status == models.GreenLotStatus.TRANSFORME:
        raise HTTPException(status_code=400, detail="Ce lot a deja ete consomme par une transformation, son statut ne peut plus etre modifie manuellement")

    lot.status = update.status
    if update.observations is not None:
        lot.observations = update.observations
    lot.updated_by = current_user.username
    lot.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lot)
    return lot


# --- TRAÇABILITÉ ---

@app.get("/traceability/green-lot/{lot_code}")
def get_lot_genealogy(lot_code: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    lot = db.query(models.GreenLot).filter(models.GreenLot.code == lot_code).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve")

    collections = db.query(models.Collection).filter(models.Collection.green_lot_id == lot.id).all()

    producers_data = []
    for coll in collections:
        harvest = coll.harvest
        parcel = harvest.parcel if harvest else None
        producer = parcel.producer if parcel else None
        producers_data.append({
            "producer": producer,
            "parcel": parcel,
            "harvest": harvest,
            "collection": coll
        })

    return {"lot": lot, "genealogy": producers_data}

@app.get("/traceability/sale/{invoice_number}")
def get_sale_traceability(invoice_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sale = db.query(models.Sale).filter(models.Sale.invoice_number == invoice_number).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvee")

    results = []
    for item in sale.items:
        prep_lot = item.prepared_lot
        trans = prep_lot.transformation

        input_lots_data = []
        for green_lot in trans.input_lots:
            collections = db.query(models.Collection).filter(models.Collection.green_lot_id == green_lot.id).all()
            producers_data = []
            for coll in collections:
                producers_data.append({
                    "producer": coll.harvest.parcel.producer if coll.harvest and coll.harvest.parcel else None,
                    "parcel": coll.harvest.parcel if coll.harvest else None,
                    "harvest": coll.harvest,
                    "collection": coll
                })
            input_lots_data.append({"green_lot": green_lot, "origins": producers_data})

        results.append({"prepared_lot": prep_lot, "transformation": trans, "inputs": input_lots_data})

    return {"sale": sale, "traceability": results}


# --- MODULE 06 : TRANSFORMATIONS ---

@app.get("/transformations/", response_model=List[schemas.Transformation])
def get_transformations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Transformation).order_by(models.Transformation.start_date.desc()).all()

@app.post("/transformations/", response_model=schemas.Transformation)
def create_transformation(trans: schemas.TransformationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.TRANSFORMATION_MANAGER]))):
    if not trans.input_lots:
        raise HTTPException(status_code=400, detail="Selectionnez au moins un lot vert")

    lot_ids = [item.green_lot_id for item in trans.input_lots]
    lots_by_id = {l.id: l for l in db.query(models.GreenLot).filter(models.GreenLot.id.in_(lot_ids)).all()}
    if len(lots_by_id) != len(set(lot_ids)):
        raise HTTPException(status_code=400, detail="Un ou plusieurs lots verts sont introuvables")

    # Consommation partielle possible : weight_used <= poids restant du lot (sinon tout le restant par defaut)
    consumption = []
    for item in trans.input_lots:
        lot = lots_by_id[item.green_lot_id]
        if lot.status not in (models.GreenLotStatus.DISPONIBLE, models.GreenLotStatus.PARTIEL):
            raise HTTPException(status_code=400, detail=f"Le lot {lot.code} n'est pas disponible pour transformation (statut: {lot.status.value})")
        if lot.remaining_weight <= 0:
            raise HTTPException(status_code=400, detail=f"Le lot {lot.code} n'a plus de poids disponible")
        weight_used = item.weight_used if item.weight_used is not None else lot.remaining_weight
        if weight_used <= 0:
            raise HTTPException(status_code=400, detail=f"Poids utilise invalide pour le lot {lot.code}")
        if weight_used > lot.remaining_weight + 1e-6:
            raise HTTPException(status_code=400, detail=f"Poids utilise ({weight_used} kg) superieur au poids restant du lot {lot.code} ({lot.remaining_weight} kg)")
        consumption.append((lot, weight_used))

    input_weight = sum(w for _, w in consumption)
    code = next_code(db, "TR")
    now = datetime.utcnow()

    db_trans = models.Transformation(
        operation_number=code,
        start_date=trans.start_date,
        input_weight=input_weight,
        manager_id=trans.manager_id,
        status=models.TransformationStatus.EN_COURS,
        observations=trans.observations,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_trans)
    db.flush()

    for lot, weight_used in consumption:
        lot.remaining_weight = round(lot.remaining_weight - weight_used, 3)
        lot.status = models.GreenLotStatus.TRANSFORME if lot.remaining_weight <= 0 else models.GreenLotStatus.PARTIEL
        lot.updated_by = current_user.username
        db_trans.input_lots.append(lot)

    db.commit()
    db.refresh(db_trans)
    return db_trans

@app.post("/transformations/{trans_id}/complete", response_model=schemas.Transformation)
def complete_transformation(trans_id: int, update: schemas.TransformationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.TRANSFORMATION_MANAGER]))):
    db_trans = db.query(models.Transformation).filter(models.Transformation.id == trans_id).first()
    if not db_trans:
        raise HTTPException(status_code=404, detail="Transformation non trouvee")

    for label, w in (("Gourmet", update.gourmet_weight), ("Standard", update.standard_weight), ("TK", update.tk_weight), ("Fendue", update.fendue_weight)):
        if w is not None and w < 0:
            raise HTTPException(status_code=400, detail=f"Le poids {label} ne peut pas etre negatif")

    output_weight = (update.gourmet_weight or 0) + (update.standard_weight or 0) + (update.tk_weight or 0) + (update.fendue_weight or 0)

    # Verification des poids : le sortant ne peut jamais depasser l'entrant (sinon pertes negatives, incoherent)
    if output_weight > db_trans.input_weight + 1e-6:
        raise HTTPException(
            status_code=400,
            detail=f"Poids de sortie total ({output_weight} kg) superieur au poids entrant de la transformation ({db_trans.input_weight} kg) : verifiez la repartition par qualite."
        )

    db_trans.end_date = update.end_date
    db_trans.gourmet_weight = update.gourmet_weight
    db_trans.standard_weight = update.standard_weight
    db_trans.tk_weight = update.tk_weight
    db_trans.fendue_weight = update.fendue_weight
    db_trans.output_weight = output_weight
    db_trans.loss_weight = max(0.0, db_trans.input_weight - output_weight)
    db_trans.loss_rate = (db_trans.loss_weight / db_trans.input_weight * 100) if db_trans.input_weight else 0
    db_trans.global_yield = (output_weight / db_trans.input_weight * 100) if db_trans.input_weight else 0
    db_trans.status = update.status
    db_trans.observations = update.observations or db_trans.observations
    db_trans.updated_by = current_user.username
    db_trans.updated_at = datetime.utcnow()

    # Statut bio herite des lots verts consommes (mixte -> Conventionnel, comme pour les lots verts)
    input_bio_statuses = set(l.bio_status for l in db_trans.input_lots if l.bio_status)
    prepared_bio_status = (
        models.BioStatus.CONVENTIONNEL if len(input_bio_statuses) > 1
        else (next(iter(input_bio_statuses)) if input_bio_statuses else None)
    )

    # Lots prepares par qualite (module 07) - creation automatique a la cloture,
    # code au format LP-{QUALITE}-annee-seq conforme au tableau final
    quality_abbr = {
        models.QualityType.GOURMET: "GOUR",
        models.QualityType.STANDARD: "STD",
        models.QualityType.TK: "TK",
        models.QualityType.FENDUE: "FEN",
    }
    qualities = {
        models.QualityType.GOURMET: update.gourmet_weight,
        models.QualityType.STANDARD: update.standard_weight,
        models.QualityType.TK: update.tk_weight,
        models.QualityType.FENDUE: update.fendue_weight,
    }
    now = datetime.utcnow()
    for quality, weight in qualities.items():
        if weight and weight > 0:
            lot_code = next_code(db, f"LP-{quality_abbr[quality]}")
            db_lot = models.PreparedLot(
                code=lot_code, transformation_id=db_trans.id, quality=quality, weight=weight,
                status=models.PreparedLotStatus.IN_STOCK, bio_status=prepared_bio_status,
                location="Magasin principal",
                created_by=current_user.username, updated_by=current_user.username,
                created_at=now, updated_at=now,
            )
            db.add(db_lot)

    db.commit()
    db.refresh(db_trans)
    return db_trans

@app.put("/transformations/{trans_id}/status", response_model=schemas.Transformation)
def update_transformation_status(trans_id: int, update: schemas.TransformationStatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.TRANSFORMATION_MANAGER, models.UserRole.COORDINATOR_SCI]))):
    """Modification manuelle du statut (ex: Bloquee, Annulee) avant finalisation."""
    db_trans = db.query(models.Transformation).filter(models.Transformation.id == trans_id).first()
    if not db_trans:
        raise HTTPException(status_code=404, detail="Transformation non trouvee")
    if db_trans.status == models.TransformationStatus.CLOTUREE:
        raise HTTPException(status_code=400, detail="Cette transformation est deja cloturee (lots prepares generes), son statut ne peut plus etre modifie manuellement")

    db_trans.status = update.status
    if update.observations is not None:
        db_trans.observations = update.observations
    db_trans.updated_by = current_user.username
    db_trans.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_trans)
    return db_trans

@app.get("/prepared-lots/", response_model=List[schemas.PreparedLot])
def get_prepared_lots(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.PreparedLot).all()

@app.post("/prepared-lots/", response_model=schemas.PreparedLot, status_code=status.HTTP_201_CREATED)
def create_prepared_lot(lot: schemas.PreparedLotCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.TRANSFORMATION_MANAGER, models.UserRole.STOCK_MANAGER]))):
    """Creation manuelle d'un lot prepare (correction, ajout hors flux automatique de finalisation)."""
    trans = db.query(models.Transformation).filter(models.Transformation.id == lot.transformation_id).first()
    if not trans:
        raise HTTPException(status_code=400, detail="Transformation introuvable")
    if lot.weight <= 0:
        raise HTTPException(status_code=400, detail="Le poids doit etre superieur a 0")

    quality_abbr = {
        models.QualityType.GOURMET: "GOUR", models.QualityType.STANDARD: "STD",
        models.QualityType.TK: "TK", models.QualityType.FENDUE: "FEN",
    }
    code = next_code(db, f"LP-{quality_abbr[lot.quality]}")
    now = datetime.utcnow()
    db_lot = models.PreparedLot(
        code=code, transformation_id=lot.transformation_id, quality=lot.quality, weight=lot.weight,
        humidity=lot.humidity, status=lot.status, bio_status=lot.bio_status, location=lot.location,
        observations=lot.observations,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_lot)
    db.commit()
    db.refresh(db_lot)
    return db_lot


# --- DASHBOARD ---

@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    producers_count = db.query(models.Producer).count()
    parcels_count = db.query(models.Parcel).count()
    harvests_count = db.query(models.Harvest).count()
    collections_count = db.query(models.Collection).count()
    green_lots_count = db.query(models.GreenLot).count()
    transformations_count = db.query(models.Transformation).count()
    blocked_lots = db.query(models.GreenLot).filter(models.GreenLot.status == models.GreenLotStatus.BLOQUE).count()
    total_harvest_weight = db.query(func.coalesce(func.sum(models.Harvest.weight), 0)).scalar() or 0
    total_output_weight = db.query(func.coalesce(func.sum(models.Transformation.output_weight), 0)).scalar() or 0
    avg_yield = db.query(func.avg(models.Transformation.global_yield)).filter(models.Transformation.global_yield.isnot(None)).scalar()
    stock_by_quality = {}
    for quality in models.QualityType:
        rows = db.query(models.PreparedLot).filter(
            models.PreparedLot.quality == quality,
            models.PreparedLot.status.notin_([models.PreparedLotStatus.SOLD, models.PreparedLotStatus.EXPORTED, models.PreparedLotStatus.CANCELLED]),
        ).all()
        stock_by_quality[quality.value] = round(sum(r.weight or 0 for r in rows), 2)
    non_conformities_open = db.query(models.NonConformity).filter(models.NonConformity.status == models.NonConformityStatus.OUVERTE).count()

    return {
        "producers": producers_count,
        "parcels": parcels_count,
        "harvests": harvests_count,
        "collections": collections_count,
        "green_lots": green_lots_count,
        "transformations": transformations_count,
        "blocked_green_lots": blocked_lots,
        "total_harvest_weight": round(total_harvest_weight, 2),
        "total_output_weight": round(total_output_weight, 2),
        "average_yield": round(avg_yield, 2) if avg_yield else 0,
        "stock_by_quality": stock_by_quality,
        "non_conformities_open": non_conformities_open,
    }


# --- MODULE 07 : LOTS PREPARES ---
# NB : pas de module Magasins/Emplacements (12) ni de Mouvements de stock (09) separes
# (hors scope). La quantite disponible d'un lot prepare EST son poids (PreparedLot.weight),
# modifie uniquement par la finalisation de transformation et par les ventes/exports.

@app.get("/prepared-lots/{lot_id}", response_model=schemas.PreparedLot)
def get_prepared_lot(lot_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    lot = db.query(models.PreparedLot).filter(models.PreparedLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot prepare introuvable")
    return lot

@app.get("/stock/inventory")
def get_stock_inventory(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Inventaire du stock actuel : poids des lots prepares encore disponibles, par qualite."""
    lots = db.query(models.PreparedLot).filter(
        models.PreparedLot.status.notin_([models.PreparedLotStatus.SOLD, models.PreparedLotStatus.EXPORTED, models.PreparedLotStatus.CANCELLED])
    ).all()
    by_quality = {}
    total_available = 0
    for lot in lots:
        w = lot.weight or 0
        total_available += w
        q = lot.quality.value if lot.quality else "Non renseigne"
        by_quality[q] = by_quality.get(q, 0) + w
    return {
        "total_stock": round(total_available, 2),
        "by_quality": {k: round(v, 2) for k, v in by_quality.items()},
        "lots_count": len(lots),
    }


# --- MODULE 10 : VENTE / EXPORT ---

@app.get("/sales/", response_model=List[schemas.Sale])
def get_sales(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Sale).order_by(models.Sale.date.desc()).all()

@app.post("/sales/", response_model=schemas.Sale, status_code=status.HTTP_201_CREATED)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI]))):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Selectionnez au moins un lot prepare")

    total_w = sum(item.weight for item in sale.items)
    invoice_number = next_code(db, "VTE")
    now = datetime.utcnow()
    shipped = sale.status in (models.SaleStatus.EXPEDIE, models.SaleStatus.CLOTURE)

    db_sale = models.Sale(
        invoice_number=invoice_number,
        customer_name=sale.customer_name,
        destination=sale.destination,
        total_weight=total_w,
        status=sale.status,
        observations=sale.observations,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_sale)
    db.flush()

    for item in sale.items:
        lot = db.query(models.PreparedLot).filter(models.PreparedLot.id == item.prepared_lot_id).first()
        if not lot or lot.status not in (models.PreparedLotStatus.IN_STOCK, models.PreparedLotStatus.RESERVED) or lot.weight < item.weight:
            raise HTTPException(status_code=400, detail=f"Stock insuffisant pour le lot {lot.code if lot else 'inconnu'}")

        db_item = models.SaleItem(sale_id=db_sale.id, prepared_lot_id=lot.id, weight=item.weight)
        db.add(db_item)

        # "Une vente confirmee doit reserver ou sortir la quantite correspondante du stock" (regle prioritaire)
        if shipped:
            lot.weight -= item.weight
            lot.status = models.PreparedLotStatus.SOLD if lot.weight <= 0 else models.PreparedLotStatus.IN_STOCK
            lot.updated_by = current_user.username
            lot.updated_at = now
        else:
            # Reservation uniquement : le poids physique n'est pas modifie, seul le statut change.
            lot.status = models.PreparedLotStatus.RESERVED
            lot.updated_by = current_user.username
            lot.updated_at = now

    db.commit()
    db.refresh(db_sale)
    return db_sale


# --- MODULE 12 : INSPECTIONS INTERNES (V2) ---

@app.get("/inspections/", response_model=List[schemas.Inspection])
def get_inspections(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Inspection).order_by(models.Inspection.date.desc()).all()

@app.get("/inspections/{insp_id}", response_model=schemas.Inspection)
def get_inspection(insp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    insp = db.query(models.Inspection).filter(models.Inspection.id == insp_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable")
    return insp

# Objet concerne par une inspection/NC (polymorphe) : (modele, nom du champ FK, message d'erreur)
OBJECT_TYPE_MAP = {
    models.ObjectType.PRODUCTEUR: (models.Producer, "producer_id", "Producteur introuvable"),
    models.ObjectType.PARCELLE: (models.Parcel, "parcel_id", "Parcelle introuvable"),
    models.ObjectType.RECOLTE: (models.Harvest, "harvest_id", "Recolte introuvable"),
    models.ObjectType.COLLECTE: (models.Collection, "collection_id", "Collecte introuvable"),
    models.ObjectType.LOT_VERT: (models.GreenLot, "green_lot_id", "Lot vert introuvable"),
    models.ObjectType.TRANSFORMATION: (models.Transformation, "transformation_id", "Transformation introuvable"),
    models.ObjectType.LOT_PREPARE: (models.PreparedLot, "prepared_lot_id", "Lot prepare introuvable"),
    models.ObjectType.VENTE: (models.Sale, "sale_id", "Vente introuvable"),
}

@app.post("/inspections/", response_model=schemas.Inspection, status_code=status.HTTP_201_CREATED)
def create_inspection(insp: schemas.InspectionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI, models.UserRole.INTERNAL_AUDITOR]))):
    data = insp.dict()
    object_type = data.get("object_type") or models.ObjectType.PARCELLE

    model_cls, fk_field, err_msg = OBJECT_TYPE_MAP[object_type]
    ref_id = data.get(fk_field)
    if not ref_id:
        raise HTTPException(status_code=400, detail=f"{fk_field} requis pour une inspection de type '{object_type.value}'")
    ref_obj = db.query(model_cls).filter(model_cls.id == ref_id).first()
    if not ref_obj:
        raise HTTPException(status_code=400, detail=err_msg)

    # Deduction automatique de la parcelle/producteur concernes, quand l'objet inspecte
    # en decoule (recolte/collecte -> parcelle ; parcelle -> producteur), pour permettre
    # les effets de bord module 2 (last_inspection_date / suspension) meme hors inspection directe de parcelle.
    parcel = None
    if object_type == models.ObjectType.PARCELLE:
        parcel = ref_obj
    elif object_type == models.ObjectType.RECOLTE:
        parcel = ref_obj.parcel
        data["producer_id"] = data.get("producer_id") or ref_obj.producer_id
    elif object_type == models.ObjectType.COLLECTE:
        parcel = ref_obj.parcel
        data["producer_id"] = data.get("producer_id") or ref_obj.producer_id
    elif object_type == models.ObjectType.PRODUCTEUR:
        data["producer_id"] = data.get("producer_id") or ref_obj.id

    if parcel:
        data["parcel_id"] = data.get("parcel_id") or parcel.id
        data["producer_id"] = data.get("producer_id") or parcel.producer_id

    code = next_code(db, "INSP")
    now = datetime.utcnow()

    db_insp = models.Inspection(
        **data, code=code,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_insp)
    db.commit()
    db.refresh(db_insp)

    # Met a jour la date de derniere inspection et le statut de conformite sur la parcelle (module 2),
    # uniquement quand une parcelle est effectivement concernee par l'inspection.
    if parcel:
        parcel.last_inspection_date = db_insp.date
        if db_insp.result == models.InspectionResult.NON_CONFORME:
            parcel.status = models.ParcelStatus.SUSPENDUE
        parcel.updated_by = current_user.username
        parcel.updated_at = now
        db.commit()

    return db_insp


# --- MODULE 14 : CONTROLES DETAILLES D'INSPECTION (V2) ---
# Evite de multiplier les tables d'inspection par type d'objet : une inspection (module 12)
# porte une liste de points de controle detailles, chacun pouvant declencher automatiquement
# une non-conformite (module 13) rattachee au meme objet que l'inspection parente.

@app.get("/inspections/{insp_id}/controls", response_model=List[schemas.InspectionControl])
def get_inspection_controls(insp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    insp = db.query(models.Inspection).filter(models.Inspection.id == insp_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable")
    return db.query(models.InspectionControl).filter(models.InspectionControl.inspection_id == insp_id).order_by(models.InspectionControl.id).all()

@app.post("/inspections/{insp_id}/controls", response_model=schemas.InspectionControl, status_code=status.HTTP_201_CREATED)
def create_inspection_control(insp_id: int, control: schemas.InspectionControlCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.COORDINATOR_SCI, models.UserRole.INTERNAL_AUDITOR]))):
    insp = db.query(models.Inspection).filter(models.Inspection.id == insp_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable")

    now = datetime.utcnow()
    db_ctrl = models.InspectionControl(
        **control.dict(), inspection_id=insp_id,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_ctrl)
    db.commit()
    db.refresh(db_ctrl)

    # Declenchement automatique d'une non-conformite, rattachee au meme objet que l'inspection parente.
    if db_ctrl.triggers_non_conformity:
        nc_code = next_code(db, "NC")
        object_fields = {
            f: getattr(insp, f) for f in (
                "object_type", "producer_id", "parcel_id", "harvest_id", "collection_id",
                "green_lot_id", "transformation_id", "prepared_lot_id", "sale_id",
            )
        }
        severity = models.NonConformitySeverity.MAJEURE if db_ctrl.risk_level == models.RiskLevel.ELEVE else models.NonConformitySeverity.MINEURE
        db.add(models.NonConformity(
            code=nc_code, inspection_id=insp.id, **object_fields,
            date_detected=now, type=severity, severity=severity.value,
            description=f"Controle '{db_ctrl.control_point}' ({db_ctrl.category.value}) non conforme lors de l'inspection {insp.code}." + (f" {db_ctrl.comment}" if db_ctrl.comment else ""),
            corrective_action="A definir suite au controle detaille.",
            responsible_id=insp.auditor_id, deadline=now + timedelta(days=7),
            status=models.NonConformityStatus.OUVERTE,
            created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
        ))
        db.commit()

    return db_ctrl


# --- MODULE 13 : NON-CONFORMITES (V2) ---

@app.get("/non-conformities/", response_model=List[schemas.NonConformity])
def get_non_conformities(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.NonConformity).order_by(models.NonConformity.date_detected.desc()).all()

@app.post("/non-conformities/", response_model=schemas.NonConformity, status_code=status.HTTP_201_CREATED)
def create_nc(nc: schemas.NonConformityCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.INTERNAL_AUDITOR, models.UserRole.COORDINATOR_SCI]))):
    code = next_code(db, "NC")
    now = datetime.utcnow()
    db_nc = models.NonConformity(
        **nc.dict(), code=code, severity=nc.type.value,
        created_by=current_user.username, updated_by=current_user.username, created_at=now, updated_at=now,
    )
    db.add(db_nc)
    db.commit()
    db.refresh(db_nc)
    return db_nc

@app.put("/non-conformities/{nc_id}", response_model=schemas.NonConformity)
def update_nc(nc_id: int, nc: schemas.NonConformityCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role([models.UserRole.ADMIN, models.UserRole.INTERNAL_AUDITOR, models.UserRole.COORDINATOR_SCI]))):
    db_nc = db.query(models.NonConformity).filter(models.NonConformity.id == nc_id).first()
    if not db_nc:
        raise HTTPException(status_code=404, detail="Non-conformite introuvable")
    for key, value in nc.dict().items():
        setattr(db_nc, key, value)
    db_nc.severity = nc.type.value
    db_nc.updated_by = current_user.username
    db_nc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_nc)
    return db_nc


# --- TABLEAU DE BORD AVANCE + MASS BALANCE (V2) ---

@app.get("/dashboard/mass-balance")
def get_mass_balance(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Reconciliation des poids sur toute la chaine : recolte -> collecte -> lot vert -> transformation -> lot prepare -> stock -> vente."""
    total_harvested = db.query(func.coalesce(func.sum(models.Harvest.weight), 0)).scalar() or 0
    total_collected = db.query(func.coalesce(func.sum(models.Collection.net_weight), 0)).scalar() or 0
    total_green_lots = db.query(func.coalesce(func.sum(models.GreenLot.total_weight), 0)).filter(
        models.GreenLot.status != models.GreenLotStatus.ANNULE
    ).scalar() or 0
    blocked_green_weight = db.query(func.coalesce(func.sum(models.GreenLot.total_weight), 0)).filter(
        models.GreenLot.status == models.GreenLotStatus.BLOQUE
    ).scalar() or 0
    total_input = db.query(func.coalesce(func.sum(models.Transformation.input_weight), 0)).scalar() or 0
    total_output = db.query(func.coalesce(func.sum(models.Transformation.output_weight), 0)).filter(
        models.Transformation.output_weight.isnot(None)
    ).scalar() or 0
    total_loss = db.query(func.coalesce(func.sum(models.Transformation.loss_weight), 0)).filter(
        models.Transformation.loss_weight.isnot(None)
    ).scalar() or 0
    total_prepared = db.query(func.coalesce(func.sum(models.PreparedLot.weight), 0)).scalar() or 0
    total_in_stock = db.query(func.coalesce(func.sum(models.PreparedLot.weight), 0)).filter(
        models.PreparedLot.status.notin_([models.PreparedLotStatus.SOLD, models.PreparedLotStatus.EXPORTED, models.PreparedLotStatus.CANCELLED])
    ).scalar() or 0
    total_sold = db.query(func.coalesce(func.sum(models.SaleItem.weight), 0)).scalar() or 0

    yield_per_quality = {}
    for quality in models.QualityType:
        w = db.query(func.coalesce(func.sum(models.PreparedLot.weight), 0)).filter(
            models.PreparedLot.quality == quality
        ).scalar() or 0
        yield_per_quality[quality.value] = round(w, 2)

    # Ecart theorique : entrant transformation - (perte + sortant) doit etre ~0
    balance_gap = round(total_input - (total_loss + total_output), 2)

    return {
        "total_harvested_kg": round(total_harvested, 2),
        "total_collected_kg": round(total_collected, 2),
        "total_green_lots_kg": round(total_green_lots, 2),
        "blocked_green_lots_kg": round(blocked_green_weight, 2),
        "total_transformation_input_kg": round(total_input, 2),
        "total_transformation_output_kg": round(total_output, 2),
        "total_transformation_loss_kg": round(total_loss, 2),
        "transformation_balance_gap_kg": balance_gap,
        "total_prepared_kg": round(total_prepared, 2),
        "total_in_stock_kg": round(total_in_stock, 2),
        "total_sold_kg": round(total_sold, 2),
        "yield_per_quality_kg": yield_per_quality,
    }

@app.get("/exports/{entity}.csv")
def export_csv(entity: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Exports avances (module documents V2) : producteurs, transformations, ventes, stock."""
    import csv, io

    buf = io.StringIO()
    writer = csv.writer(buf)

    if entity == "producers":
        writer.writerow(["code", "nom", "prenom", "village", "statut", "statut_bio", "superficie_ha", "nb_parcelles"])
        for p in db.query(models.Producer).all():
            writer.writerow([p.code, p.last_name, p.first_name, p.village, p.status.value, p.bio_status.value, p.total_surface, p.parcel_count])
    elif entity == "transformations":
        writer.writerow(["operation", "date_debut", "poids_entrant", "poids_sortant", "pertes_kg", "rendement_pct", "statut"])
        for t in db.query(models.Transformation).all():
            writer.writerow([t.operation_number, t.start_date.strftime("%Y-%m-%d"), t.input_weight, t.output_weight or "", t.loss_weight or "", round(t.global_yield, 2) if t.global_yield else "", t.status.value])
    elif entity == "sales":
        writer.writerow(["facture", "date", "client", "destination", "poids_total_kg", "statut"])
        for s in db.query(models.Sale).all():
            writer.writerow([s.invoice_number, s.date.strftime("%Y-%m-%d"), s.customer_name, s.destination, s.total_weight, s.status.value])
    elif entity == "stock":
        writer.writerow(["code_lot_prepare", "qualite", "poids_disponible_kg", "emplacement", "statut"])
        for lot in db.query(models.PreparedLot).all():
            writer.writerow([lot.code, lot.quality.value if lot.quality else "", lot.weight, lot.location or "", lot.status.value])
    else:
        raise HTTPException(status_code=404, detail="Export inconnu (producers, transformations, sales, stock)")

    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename={entity}.csv"
    })


@app.get("/dashboard/top-producers")
def get_top_producers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), limit: int = 5):
    rows = (
        db.query(models.Producer, func.coalesce(func.sum(models.Harvest.weight), 0).label("total"))
        .outerjoin(models.Harvest, models.Harvest.producer_id == models.Producer.id)
        .group_by(models.Producer.id)
        .order_by(func.coalesce(func.sum(models.Harvest.weight), 0).desc())
        .limit(limit)
        .all()
    )
    return [{"producer_code": p.code, "producer_name": f"{p.first_name} {p.last_name}", "total_harvested_kg": round(total, 2)} for p, total in rows]


from fastapi.responses import StreamingResponse
import pdf_utils

@app.get("/documents/harvest/{harvest_id}/pdf")
def get_harvest_report(harvest_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    harvest = db.query(models.Harvest).filter(models.Harvest.id == harvest_id).first()
    if not harvest:
        raise HTTPException(status_code=404, detail="Recolte non trouvee")

    data = {
        "id": harvest.code or f"REC-{harvest.id:04d}",
        "date": harvest.date.strftime("%d/%m/%Y"),
        "producer_name": f"{harvest.parcel.producer.first_name} {harvest.parcel.producer.last_name}",
        "producer_code": harvest.parcel.producer.code,
        "village": harvest.parcel.producer.village,
        "weight": harvest.weight,
        "quality": harvest.quality or "Standard",
        "maturity": harvest.maturity or "Optimale",
    }

    pdf_buffer = pdf_utils.generate_harvest_pdf(data)
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=bordereau_{data['id']}.pdf"
    })


@app.get("/documents/collection/{collection_id}/pdf")
def get_collection_report(collection_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    coll = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collecte non trouvee")
    producer = coll.producer
    parcel = coll.parcel
    data = {
        "code": coll.code or f"COL-{coll.id:04d}",
        "date": coll.date.strftime("%d/%m/%Y"),
        "producer_name": f"{producer.first_name} {producer.last_name}" if producer else "-",
        "producer_code": producer.code if producer else "-",
        "village": producer.village if producer else "-",
        "parcel_code": parcel.code if parcel else "-",
        "harvest_code": coll.harvest.code if coll.harvest else "-",
        "bio_status": coll.harvest.bio_status.value if coll.harvest and coll.harvest.bio_status else "-",
        "gross_weight": coll.gross_weight or "-",
        "net_weight": coll.net_weight,
        "collector_name": f"{coll.collector.first_name or ''} {coll.collector.last_name or ''}".strip() or coll.collector.username,
        "status": coll.status.value,
    }
    buf = pdf_utils.generate_collection_pdf(data)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=bordereau_{data['code']}.pdf"
    })


@app.get("/documents/green-lot/{lot_id}/pdf")
def get_green_lot_report(lot_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    lot = db.query(models.GreenLot).filter(models.GreenLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot vert non trouve")
    collections = db.query(models.Collection).filter(models.Collection.green_lot_id == lot.id).all()
    data = {
        "code": lot.code,
        "created_at": lot.created_at.strftime("%d/%m/%Y"),
        "total_weight": lot.total_weight,
        "remaining_weight": lot.remaining_weight,
        "status": lot.status.value,
        "bio_status": lot.bio_status.value if lot.bio_status else "-",
        "collections": [
            {"code": c.code, "net_weight": c.net_weight, "bio_status": c.harvest.bio_status.value if c.harvest and c.harvest.bio_status else "-"}
            for c in collections
        ],
    }
    buf = pdf_utils.generate_green_lot_pdf(data)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=fiche_{data['code']}.pdf"
    })


@app.get("/documents/transformation/{trans_id}/pdf")
def get_transformation_report(trans_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trans = db.query(models.Transformation).filter(models.Transformation.id == trans_id).first()
    if not trans:
        raise HTTPException(status_code=404, detail="Transformation non trouvee")
    manager = db.query(models.User).filter(models.User.id == trans.manager_id).first()
    data = {
        "operation_number": trans.operation_number,
        "start_date": trans.start_date.strftime("%d/%m/%Y"),
        "end_date": trans.end_date.strftime("%d/%m/%Y") if trans.end_date else None,
        "manager_name": f"{manager.first_name or ''} {manager.last_name or ''}".strip() if manager else "-",
        "status": trans.status.value,
        "input_weight": trans.input_weight,
        "output_weight": trans.output_weight,
        "loss_weight": trans.loss_weight,
        "loss_rate": round(trans.loss_rate, 2) if trans.loss_rate else 0,
        "global_yield": round(trans.global_yield, 2) if trans.global_yield else 0,
        "gourmet_weight": trans.gourmet_weight,
        "standard_weight": trans.standard_weight,
        "tk_weight": trans.tk_weight,
        "fendue_weight": trans.fendue_weight,
        "input_lot_codes": [l.code for l in trans.input_lots],
    }
    buf = pdf_utils.generate_transformation_pdf(data)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=rapport_{data['operation_number']}.pdf"
    })


@app.get("/documents/prepared-lot/{lot_id}/pdf")
def get_prepared_lot_report(lot_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    lot = db.query(models.PreparedLot).filter(models.PreparedLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot prepare non trouve")
    data = {
        "code": lot.code,
        "quality": lot.quality.value,
        "weight": lot.weight,
        "humidity": lot.humidity,
        "status": lot.status.value,
        "bio_status": lot.bio_status.value if lot.bio_status else "-",
        "location": lot.location or "-",
        "emplacement_detail": "-",
        "available_quantity": lot.weight,
        "operation_number": lot.transformation.operation_number if lot.transformation else "-",
    }
    buf = pdf_utils.generate_prepared_lot_pdf(data)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=fiche_{data['code']}.pdf"
    })


@app.get("/documents/traceability/{lot_code}/pdf")
def get_traceability_report(lot_code: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    lot = db.query(models.GreenLot).filter(models.GreenLot.code == lot_code).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouve")
    collections = db.query(models.Collection).filter(models.Collection.green_lot_id == lot.id).all()
    origins = []
    for c in collections:
        producer = c.harvest.parcel.producer if c.harvest and c.harvest.parcel else None
        parcel = c.harvest.parcel if c.harvest else None
        origins.append({
            "collection_code": c.code,
            "producer_name": f"{producer.first_name} {producer.last_name}" if producer else "-",
            "producer_code": producer.code if producer else "-",
            "parcel_code": parcel.code if parcel else "-",
            "net_weight": c.net_weight,
        })
    data = {"lot_code": lot.code, "status": lot.status.value, "total_weight": lot.total_weight, "origins": origins}
    buf = pdf_utils.generate_traceability_pdf(data)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=tracabilite_{lot.code}.pdf"
    })


@app.get("/documents/inspection/{insp_id}/pdf")
def get_inspection_report(insp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    insp = db.query(models.Inspection).filter(models.Inspection.id == insp_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection non trouvee")

    # Reference lisible de l'objet inspecte, quel que soit son type (chaine polymorphe A-Z)
    object_ref_map = {
        models.ObjectType.PRODUCTEUR: lambda: f"{insp.producer.first_name} {insp.producer.last_name}" if insp.producer else "-",
        models.ObjectType.PARCELLE: lambda: insp.parcel.code if insp.parcel else "-",
        models.ObjectType.RECOLTE: lambda: insp.harvest.code if insp.harvest else "-",
        models.ObjectType.COLLECTE: lambda: insp.collection.code if insp.collection else "-",
        models.ObjectType.LOT_VERT: lambda: insp.green_lot.code if insp.green_lot else "-",
        models.ObjectType.TRANSFORMATION: lambda: insp.transformation.operation_number if insp.transformation else "-",
        models.ObjectType.LOT_PREPARE: lambda: insp.prepared_lot.code if insp.prepared_lot else "-",
        models.ObjectType.VENTE: lambda: insp.sale.invoice_number if insp.sale else "-",
    }
    object_type = insp.object_type or models.ObjectType.PARCELLE
    object_reference = object_ref_map.get(object_type, lambda: "-")()

    data = {
        "code": insp.code,
        "date": insp.date.strftime("%d/%m/%Y"),
        "auditor_name": f"{insp.auditor.first_name or ''} {insp.auditor.last_name or ''}".strip() if insp.auditor else "-",
        "producer_name": f"{insp.producer.first_name} {insp.producer.last_name}" if insp.producer else "-",
        "parcel_code": insp.parcel.code if insp.parcel else "-",
        "object_type": object_type.value,
        "object_reference": object_reference,
        "result": insp.result.value,
        "compliance_borders": insp.compliance_borders,
        "no_chemicals": insp.no_chemicals,
        "traceability_maintained": insp.traceability_maintained,
        "proper_harvest_practices": insp.proper_harvest_practices,
        "auditor_signature": insp.auditor_signature,
        "producer_signature": insp.producer_signature,
    }
    buf = pdf_utils.generate_inspection_pdf(data)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=inspection_{data['code']}.pdf"
    })
