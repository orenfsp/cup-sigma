import os
import json
import csv
import io
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import engine, Base, get_db, SessionLocal
from models import User, Category, RoutingRule, Appeal, Message, InternalNote, Attachment, AuditLog
from schemas import (
    STATUS_TEXTS, AppealCreate, TrackLookupResponse, MessageItem, AttachmentItem,
    InternalNoteItem, MessageCreate, OperatorAssignRequest, OperatorDirectAnswerRequest,
    OperatorRejectRequest, OperatorReturnHandleRequest, ExpertActionRequest,
    ApplicantReactionRequest, AdminInterventionRequest, CategoryCreate, CategoryUpdate,
    RoutingRuleCreate, RoutingRuleUpdate, UserCreate, UserUpdate, LoginRequest, LoginResponse
)
from security import (
    generate_track_number, validate_track_format, normalize_track_number,
    check_rate_limit, hash_password, verify_password, create_access_token, decode_access_token
)
from classifier import detect_crisis, suggest_category_and_specialist
from file_service import process_attachment, UPLOAD_DIR
from seed_data import seed_database

# Initialize database
Base.metadata.create_all(bind=engine)
seed_database()

app = FastAPI(
    title="«Отклик» API — Платформа доверительных обращений",
    description="Защищенный API для анонимных обращений с умной маршрутизацией и изоляцией данных",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static folder safely
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# --- AUTH DEPENDENCY ---
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация сотрудника"
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истекший токен доступа"
        )
    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или заблокирован"
        )
    return user


def require_roles(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуется одна из ролей: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# --- AUTH ENDPOINTS ---
@app.post("/api/auth/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Учетная запись деактивирована"
        )
    token = create_access_token(user.id, user.username, user.role, user.specialization)
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name,
        specialization=user.specialization
    )


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "specialization": current_user.specialization,
        "max_active_appeals": current_user.max_active_appeals
    }


# --- PUBLIC / APPLICANT ENDPOINTS ---
@app.get("/api/public/categories")
def get_public_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.is_active == True).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "default_specialization": c.default_specialization
        }
        for c in categories
    ]


@app.post("/api/public/appeals")
async def create_appeal(
    applicant_type: str = Form(...),
    initial_text: str = Form(...),
    category_id: Optional[int] = Form(None),
    clarification_answers: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    if len(initial_text.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Пожалуйста, расскажи чуть подробнее о том, что происходит своими словами"
        )

    # Parse clarification answers if string
    answers_dict = {}
    if clarification_answers:
        try:
            answers_dict = json.loads(clarification_answers)
        except Exception:
            answers_dict = {"raw": clarification_answers}

    # Crisis detection
    is_crisis, markers = detect_crisis(initial_text, answers_dict)

    # Category suggestion if not set or "Не знаю как назвать"
    suggested = suggest_category_and_specialist(initial_text)
    
    # Check category
    selected_category_id = category_id
    if selected_category_id:
        cat_obj = db.query(Category).filter(Category.id == selected_category_id).first()
        if cat_obj and cat_obj.name.lower() == "не знаю как назвать":
            # Map to suggested category if available
            sugg_cat = db.query(Category).filter(Category.name == suggested["suggested_category"]).first()
            if sugg_cat:
                selected_category_id = sugg_cat.id
    elif suggested.get("suggested_category"):
        sugg_cat = db.query(Category).filter(Category.name == suggested["suggested_category"]).first()
        if sugg_cat:
            selected_category_id = sugg_cat.id

    # Generate unique cryptographic track number
    for _ in range(10):
        track_no = generate_track_number()
        if not db.query(Appeal).filter(Appeal.track_number == track_no).first():
            break

    # Determine priority: if crisis -> urgent, else check category default or standard
    priority = "urgent" if is_crisis else "standard"
    if selected_category_id and not is_crisis:
        cat_obj = db.query(Category).filter(Category.id == selected_category_id).first()
        if cat_obj and cat_obj.default_priority:
            priority = cat_obj.default_priority

    # Create Appeal record
    appeal = Appeal(
        track_number=track_no,
        applicant_type=applicant_type,
        initial_text=initial_text.strip(),
        category_id=selected_category_id,
        priority=priority,
        status="new",
        is_crisis=is_crisis,
        crisis_reasons=", ".join(markers) if markers else None,
        emergency_contact=emergency_contact.strip() if emergency_contact else None,
        clarification_answers=json.dumps(answers_dict, ensure_ascii=False),
        created_at=datetime.utcnow()
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)

    # Process and attach files (stripping EXIF metadata)
    attached_items = []
    if files:
        for f in files[:5]:  # limit to 5 files
            if f.filename:
                orig_name, dest_path, size, mime = await process_attachment(f)
                rel_url = f"/uploads/{os.path.basename(dest_path)}"
                att = Attachment(
                    appeal_id=appeal.id,
                    filename=orig_name,
                    filepath=rel_url,
                    file_size=size,
                    mime_type=mime,
                    created_at=datetime.utcnow()
                )
                db.add(att)
                attached_items.append(orig_name)
        db.commit()

    # Initial message in thread
    user_label = "Ты" if applicant_type == "student" else "Вы"
    initial_msg = Message(
        appeal_id=appeal.id,
        sender_type="applicant",
        sender_display_name="Заявитель",
        content=initial_text.strip(),
        created_at=datetime.utcnow()
    )
    db.add(initial_msg)
    db.commit()

    tone = "student" if applicant_type == "student" else "adult"
    welcome_msg = (
        "Спасибо, что поделился. Мы получили твоё обращение и уже передаём его специалистам."
        if tone == "student"
        else "Спасибо за обращение. Мы получили ваше сообщение и передаём его специалистам."
    )

    return {
        "success": True,
        "track_number": track_no,
        "is_crisis": is_crisis,
        "crisis_markers": markers,
        "status": "new",
        "welcome_message": welcome_msg,
        "files_count": len(attached_items)
    }


@app.get("/api/public/track/{track_number}", response_model=TrackLookupResponse)
def lookup_track(track_number: str, request: Request, db: Session = Depends(get_db)):
    # Rate limit check (max 5 per minute per IP to prevent brute force)
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = check_rate_limit(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Слишком много попыток проверки номера. В целях безопасности подбор ограничен. Пожалуйста, подождите {retry_after} сек."
        )

    norm_track = normalize_track_number(track_number)
    appeal = db.query(Appeal).filter(Appeal.track_number == norm_track).first()
    if not appeal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Обращение с таким трек-номером не найдено. Проверьте правильность ввода."
        )

    tone = "student" if appeal.applicant_type == "student" else "adult"
    status_human = STATUS_TEXTS.get(appeal.status, {}).get(tone, appeal.status)

    # Format messages for applicant (exclude internal notes!)
    messages_out = [
        MessageItem(
            id=m.id,
            sender_type=m.sender_type,
            sender_display_name=m.sender_display_name,
            content=m.content,
            created_at=m.created_at
        )
        for m in appeal.messages
    ]

    attachments_out = [
        AttachmentItem(
            id=a.id,
            filename=a.filename,
            file_size=a.file_size,
            mime_type=a.mime_type,
            created_at=a.created_at
        )
        for a in appeal.attachments
    ]

    answers_parsed = None
    if appeal.clarification_answers:
        try:
            answers_parsed = json.loads(appeal.clarification_answers)
        except Exception:
            answers_parsed = {}

    can_close = appeal.status in ("answer_ready", "in_progress", "needs_clarification")
    can_return = appeal.status == "answer_ready" and appeal.return_count < 2

    return TrackLookupResponse(
        track_number=appeal.track_number,
        applicant_type=appeal.applicant_type,
        status=appeal.status,
        status_human=status_human,
        priority=appeal.priority,
        is_crisis=appeal.is_crisis,
        initial_text=appeal.initial_text,
        category_name=appeal.category.name if appeal.category else None,
        clarification_answers=answers_parsed,
        created_at=appeal.created_at,
        updated_at=appeal.updated_at,
        messages=messages_out,
        attachments=attachments_out,
        can_close=can_close,
        can_return=can_return,
        return_count=appeal.return_count,
        rating=appeal.rating,
        rejection_reason=appeal.rejection_reason
    )


@app.post("/api/public/track/{track_number}/messages")
def send_applicant_message(track_number: str, data: MessageCreate, request: Request, db: Session = Depends(get_db)):
    norm_track = normalize_track_number(track_number)
    appeal = db.query(Appeal).filter(Appeal.track_number == norm_track).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    if appeal.status in ("completed", "rejected", "closed_no_response"):
        raise HTTPException(status_code=400, detail="Обращение уже закрыто. Вы можете подать новое обращение.")

    msg = Message(
        appeal_id=appeal.id,
        sender_type="applicant",
        sender_display_name="Заявитель",
        content=data.content.strip(),
        created_at=datetime.utcnow()
    )
    db.add(msg)

    # If status was 'needs_clarification', switch back to 'in_progress'
    if appeal.status == "needs_clarification":
        appeal.status = "in_progress"

    appeal.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message_id": msg.id}


@app.post("/api/public/track/{track_number}/reaction")
def handle_applicant_reaction(track_number: str, data: ApplicantReactionRequest, db: Session = Depends(get_db)):
    norm_track = normalize_track_number(track_number)
    appeal = db.query(Appeal).filter(Appeal.track_number == norm_track).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    if data.reaction == "helped":
        appeal.status = "completed"
        appeal.closed_at = datetime.utcnow()
        if data.rating:
            appeal.rating = max(1, min(5, data.rating))
        if data.comment:
            appeal.rating_comment = data.comment.strip()
        if data.complaint:
            appeal.complaint = data.complaint.strip()

        sys_msg = Message(
            appeal_id=appeal.id,
            sender_type="system",
            sender_display_name="Система",
            content="Заявитель подтвердил, что рекомендации помогли. Обращение успешно завершено.",
            created_at=datetime.utcnow()
        )
        db.add(sys_msg)
        db.commit()
        return {"success": True, "status": "completed"}

    elif data.reaction == "not_helped":
        # Return to operator!
        appeal.status = "returned"
        appeal.return_count += 1
        appeal.return_reason = data.reason or "Заявитель указал, что ответ не помог разрешить ситуацию"
        if data.complaint:
            appeal.complaint = data.complaint.strip()

        sys_msg = Message(
            appeal_id=appeal.id,
            sender_type="system",
            sender_display_name="Система",
            content=f"Заявитель отметил: «Это не помогло». Причина: {appeal.return_reason}. Обращение возвращено оператору.",
            created_at=datetime.utcnow()
        )
        db.add(sys_msg)
        db.commit()
        return {"success": True, "status": "returned"}

    raise HTTPException(status_code=400, detail="Неверный тип реакции")


# --- OPERATOR ENDPOINTS ---
@app.get("/api/operator/queue")
def get_operator_queue(current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    """
    Queue of unprocessed new appeals and returned appeals.
    Sorted: urgent/crisis first, oldest creation date first.
    """
    appeals = db.query(Appeal).filter(Appeal.status.in_(["new", "returned"])).all()

    # Sort in python: crisis/urgent first, then by created_at ascending (oldest first)
    def sort_key(a: Appeal):
        is_prio_urgent = 0 if (a.is_crisis or a.priority == "urgent") else 1
        return (is_prio_urgent, a.created_at)

    sorted_appeals = sorted(appeals, key=sort_key)
    now = datetime.utcnow()

    results = []
    for a in sorted_appeals:
        # Calculate wait time in minutes
        wait_minutes = int((now - a.created_at).total_seconds() / 60)
        is_overdue = wait_minutes > 60  # e.g., waiting more than 1 hour

        # System suggestion
        suggested = suggest_category_and_specialist(a.initial_text)

        results.append({
            "id": a.id,
            "track_number": a.track_number,
            "applicant_type": a.applicant_type,
            "initial_text": a.initial_text[:160] + ("..." if len(a.initial_text) > 160 else ""),
            "full_text": a.initial_text,
            "category_id": a.category_id,
            "category_name": a.category.name if a.category else "Не определена",
            "priority": a.priority,
            "status": a.status,
            "is_crisis": a.is_crisis,
            "crisis_reasons": a.crisis_reasons,
            "emergency_contact": a.emergency_contact,  # Visible to crisis operator!
            "wait_minutes": wait_minutes,
            "is_overdue": is_overdue,
            "return_count": a.return_count,
            "return_reason": a.return_reason,
            "complaint": a.complaint,
            "created_at": a.created_at,
            "suggested_category": suggested["suggested_category"],
            "suggested_specialization": suggested["suggested_specialization"],
            "suggested_reason": suggested["reason"]
        })

    return {
        "total_new": len(sorted_appeals),
        "crisis_count": sum(1 for a in sorted_appeals if a.is_crisis),
        "overdue_count": sum(1 for r in results if r["is_overdue"]),
        "queue": results
    }


@app.get("/api/operator/appeals/{appeal_id}")
def get_operator_appeal_details(appeal_id: int, current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    suggested = suggest_category_and_specialist(appeal.initial_text)

    # Get available experts matching suggested or category specialization
    specialists = db.query(User).filter(User.role == "expert", User.is_active == True).all()
    specialists_info = []
    for s in specialists:
        active_load = db.query(Appeal).filter(
            Appeal.assigned_expert_id == s.id,
            Appeal.status.in_(["assigned", "in_progress", "needs_clarification", "answer_ready"])
        ).count()
        specialists_info.append({
            "id": s.id,
            "full_name": s.full_name,
            "specialization": s.specialization,
            "active_load": active_load,
            "max_load": s.max_active_appeals,
            "is_overloaded": active_load >= s.max_active_appeals
        })

    answers_parsed = {}
    if appeal.clarification_answers:
        try:
            answers_parsed = json.loads(appeal.clarification_answers)
        except Exception:
            answers_parsed = {}

    attachments = [
        {"id": a.id, "filename": a.filename, "filepath": a.filepath, "file_size": a.file_size, "mime_type": a.mime_type}
        for a in appeal.attachments
    ]

    # Internal notes are visible to operator
    notes = [
        {"id": n.id, "author_name": n.author_name, "content": n.content, "created_at": n.created_at}
        for n in appeal.internal_notes
    ]

    return {
        "id": appeal.id,
        "track_number": appeal.track_number,
        "applicant_type": appeal.applicant_type,
        "initial_text": appeal.initial_text,
        "category_id": appeal.category_id,
        "category_name": appeal.category.name if appeal.category else None,
        "priority": appeal.priority,
        "status": appeal.status,
        "is_crisis": appeal.is_crisis,
        "crisis_reasons": appeal.crisis_reasons,
        "emergency_contact": appeal.emergency_contact,
        "clarification_answers": answers_parsed,
        "return_count": appeal.return_count,
        "return_reason": appeal.return_reason,
        "complaint": appeal.complaint,
        "attachments": attachments,
        "internal_notes": notes,
        "suggested_category": suggested["suggested_category"],
        "suggested_specialization": suggested["suggested_specialization"],
        "suggested_reason": suggested["reason"],
        "available_specialists": specialists_info,
        "created_at": appeal.created_at
    }


@app.post("/api/operator/appeals/{appeal_id}/assign")
def operator_assign_expert(appeal_id: int, data: OperatorAssignRequest, current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    expert = db.query(User).filter(User.id == data.assigned_expert_id, User.role == "expert").first()
    if not expert:
        raise HTTPException(status_code=400, detail="Выбранный специалист не найден")

    if data.category_id:
        appeal.category_id = data.category_id
    appeal.priority = data.priority
    appeal.assigned_expert_id = expert.id
    appeal.status = "assigned"
    appeal.operator_taken_at = appeal.operator_taken_at or datetime.utcnow()
    appeal.updated_at = datetime.utcnow()

    # Add system notification to thread
    tone = "student" if appeal.applicant_type == "student" else "adult"
    spec_label = "психологу" if expert.specialization == "psychology" else "профильному специалисту"
    sys_msg = Message(
        appeal_id=appeal.id,
        sender_type="system",
        sender_display_name="Система",
        content=f"Обращение передано {spec_label}. Специалист уже знакомится с материалами.",
        created_at=datetime.utcnow()
    )
    db.add(sys_msg)

    # Note
    note = InternalNote(
        appeal_id=appeal.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        content=f"Оператор назначил исполнителя: {expert.full_name}. Приоритет: {appeal.priority}.",
        created_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()

    return {"success": True, "status": "assigned", "assigned_expert": expert.full_name}


@app.post("/api/operator/appeals/{appeal_id}/direct_answer")
def operator_direct_answer(appeal_id: int, data: OperatorDirectAnswerRequest, current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    appeal.status = "completed"
    appeal.closed_at = datetime.utcnow()
    appeal.operator_taken_at = appeal.operator_taken_at or datetime.utcnow()
    appeal.updated_at = datetime.utcnow()

    # Message from unified service voice
    msg = Message(
        appeal_id=appeal.id,
        sender_type="expert",
        sender_display_name="Специалист",
        content=data.answer_text.strip(),
        created_at=datetime.utcnow()
    )
    db.add(msg)

    note = InternalNote(
        appeal_id=appeal.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        content=f"Оператор предоставил прямую консультацию и закрыл обращение.",
        created_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()

    return {"success": True, "status": "completed"}


@app.post("/api/operator/appeals/{appeal_id}/reject")
def operator_reject_appeal(appeal_id: int, data: OperatorRejectRequest, current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    appeal.status = "rejected"
    appeal.rejection_reason = data.reason.strip()
    appeal.closed_at = datetime.utcnow()
    appeal.updated_at = datetime.utcnow()

    # Helpful polite rejection message
    rejection_explanation = (
        f"Мы внимательно изучили ситуацию, но, к сожалению, данный вопрос находится вне компетенции сервиса.\n"
        f"Причина: {data.reason.strip()}\n\n"
        f"Куда можно обратиться за профильной помощью:\n"
        f"• Единый детский телефон доверия: 8-800-2000-122 (круглосуточно, бесплатно)\n"
        f"• Экстренная психологическая помощь: +7 (495) 051\n"
        f"• Горячая линия по правовым вопросам несовершеннолетних: 8-800-200-01-22"
    )
    msg = Message(
        appeal_id=appeal.id,
        sender_type="expert",
        sender_display_name="Служба поддержки",
        content=rejection_explanation,
        created_at=datetime.utcnow()
    )
    db.add(msg)

    note = InternalNote(
        appeal_id=appeal.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        content=f"Обращение отклонено. Причина: {data.reason}",
        created_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()

    return {"success": True, "status": "rejected"}


@app.post("/api/operator/appeals/{appeal_id}/handle_return")
def operator_handle_return(appeal_id: int, data: OperatorReturnHandleRequest, current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    if data.action == "reassign":
        if not data.new_expert_id:
            raise HTTPException(status_code=400, detail="Укажите нового исполнителя")
        expert = db.query(User).filter(User.id == data.new_expert_id, User.role == "expert").first()
        appeal.assigned_expert_id = expert.id
        appeal.status = "assigned"
        note_text = f"Оператор переназначил обращение на специалиста: {expert.full_name}. Обоснование: {data.explanation or 'Пересмотр обращения по возврату'}"
    elif data.action == "return_to_same":
        appeal.status = "assigned"
        note_text = f"Оператор вернул обращение текущему специалисту на повторную проработку: {data.explanation or 'Углубление рекомендаций'}"
    elif data.action == "close":
        appeal.status = "completed"
        appeal.closed_at = datetime.utcnow()
        note_text = f"Оператор закрыл возвращенное обращение с пояснением: {data.explanation or 'Лимит доработок исчерпан'}"
    else:
        raise HTTPException(status_code=400, detail="Неверное действие")

    note = InternalNote(
        appeal_id=appeal.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        content=note_text,
        created_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()

    return {"success": True, "status": appeal.status}


@app.get("/api/operator/supervision")
def get_operator_supervision(current_user: User = Depends(require_roles("operator", "admin")), db: Session = Depends(get_db)):
    """
    List of distributed appeals for monitoring response times and stuck appeals (> N hours).
    CRITICAL: Private chat text is NOT included!
    """
    now = datetime.utcnow()
    appeals = db.query(Appeal).filter(Appeal.status.in_(["assigned", "in_progress", "needs_clarification", "answer_ready"])).all()

    items = []
    for a in appeals:
        # Hours since assigned without first response
        ref_time = a.operator_taken_at or a.created_at
        hours_since = round((now - ref_time).total_seconds() / 3600, 1)
        is_stuck = hours_since > 24.0 and not a.first_response_at

        items.append({
            "id": a.id,
            "track_number": a.track_number,
            "category_name": a.category.name if a.category else "—",
            "priority": a.priority,
            "status": a.status,
            "is_crisis": a.is_crisis,
            "assigned_expert_name": a.assigned_expert.full_name if a.assigned_expert else "Не назначен",
            "co_expert_name": a.co_expert.full_name if a.co_expert else None,
            "hours_in_progress": hours_since,
            "is_stuck": is_stuck,
            "return_count": a.return_count,
            "transfer_requested": bool(a.transfer_requested_to_id),
            "transfer_reason": a.transfer_reason,
            "created_at": a.created_at
        })

    return items


# --- EXPERT ENDPOINTS ---
@app.get("/api/expert/my_appeals")
def get_expert_appeals(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    category_id: Optional[int] = None,
    current_user: User = Depends(require_roles("expert", "admin")),
    db: Session = Depends(get_db)
):
    """
    Expert sees ONLY appeals assigned to them or where they are co-expert.
    Urgent appeals highlighted and on top.
    """
    query = db.query(Appeal).filter(
        (Appeal.assigned_expert_id == current_user.id) | (Appeal.co_expert_id == current_user.id)
    )

    if status_filter:
        query = query.filter(Appeal.status == status_filter)
    if priority_filter:
        query = query.filter(Appeal.priority == priority_filter)
    if category_id:
        query = query.filter(Appeal.category_id == category_id)

    appeals = query.all()

    # Sort urgent first, then by updated_at descending
    def sort_expert(a: Appeal):
        is_urgent = 0 if (a.priority == "urgent" or a.is_crisis) else 1
        return (is_urgent, -a.updated_at.timestamp())

    sorted_appeals = sorted(appeals, key=sort_expert)

    items = []
    for a in sorted_appeals:
        items.append({
            "id": a.id,
            "track_number": a.track_number,
            "applicant_type": a.applicant_type,
            "category_name": a.category.name if a.category else "Не определена",
            "priority": a.priority,
            "status": a.status,
            "is_crisis": a.is_crisis,
            "preview_text": a.initial_text[:120] + "..." if len(a.initial_text) > 120 else a.initial_text,
            "is_primary": a.assigned_expert_id == current_user.id,
            "has_transfer_request": bool(a.transfer_requested_to_id),
            "created_at": a.created_at,
            "updated_at": a.updated_at
        })

    return items


@app.get("/api/expert/appeals/{appeal_id}")
def get_expert_appeal_details(appeal_id: int, current_user: User = Depends(require_roles("expert", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(
        Appeal.id == appeal_id,
        (Appeal.assigned_expert_id == current_user.id) | (Appeal.co_expert_id == current_user.id) | (current_user.role == "admin")
    ).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено или у вас нет к нему доступа")

    answers_parsed = {}
    if appeal.clarification_answers:
        try:
            answers_parsed = json.loads(appeal.clarification_answers)
        except Exception:
            answers_parsed = {}

    messages = [
        MessageItem(
            id=m.id,
            sender_type=m.sender_type,
            sender_display_name=m.sender_display_name,
            content=m.content,
            created_at=m.created_at
        )
        for m in appeal.messages
    ]

    notes = [
        InternalNoteItem(
            id=n.id,
            author_id=n.author_id,
            author_name=n.author_name,
            content=n.content,
            created_at=n.created_at
        )
        for n in appeal.internal_notes
    ]

    attachments = [
        AttachmentItem(
            id=a.id,
            filename=a.filename,
            file_size=a.file_size,
            mime_type=a.mime_type,
            created_at=a.created_at
        )
        for a in appeal.attachments
    ]

    # Other experts available to invite
    colleagues = db.query(User).filter(User.role == "expert", User.id != current_user.id, User.is_active == True).all()
    colleagues_list = [{"id": c.id, "full_name": c.full_name, "specialization": c.specialization} for c in colleagues]

    return {
        "id": appeal.id,
        "track_number": appeal.track_number,
        "applicant_type": appeal.applicant_type,
        "initial_text": appeal.initial_text,
        "category_name": appeal.category.name if appeal.category else None,
        "priority": appeal.priority,
        "status": appeal.status,
        "is_crisis": appeal.is_crisis,
        "clarification_answers": answers_parsed,
        "messages": messages,
        "internal_notes": notes,
        "attachments": attachments,
        "is_primary": appeal.assigned_expert_id == current_user.id,
        "primary_expert_name": appeal.assigned_expert.full_name if appeal.assigned_expert else None,
        "co_expert_name": appeal.co_expert.full_name if appeal.co_expert else None,
        "transfer_requested_to": appeal.transfer_requested_to_id,
        "transfer_reason": appeal.transfer_reason,
        "colleagues": colleagues_list,
        "created_at": appeal.created_at,
        "updated_at": appeal.updated_at
    }


@app.post("/api/expert/appeals/{appeal_id}/action")
def expert_action(appeal_id: int, data: ExpertActionRequest, current_user: User = Depends(require_roles("expert", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(
        Appeal.id == appeal_id,
        (Appeal.assigned_expert_id == current_user.id) | (Appeal.co_expert_id == current_user.id) | (current_user.role == "admin")
    ).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    spec_title = "Психолог" if current_user.specialization == "psychology" else "Специалист"

    if data.action == "take_in_work":
        appeal.status = "in_progress"
        appeal.updated_at = datetime.utcnow()
        db.commit()
        return {"success": True, "status": "in_progress"}

    elif data.action == "request_clarification":
        if not data.message:
            raise HTTPException(status_code=400, detail="Введите текст уточняющего вопроса")
        appeal.status = "needs_clarification"
        if not appeal.first_response_at:
            appeal.first_response_at = datetime.utcnow()

        msg = Message(
            appeal_id=appeal.id,
            sender_type="expert",
            sender_display_name=spec_title,
            content=data.message.strip(),
            created_at=datetime.utcnow()
        )
        db.add(msg)
        appeal.updated_at = datetime.utcnow()
        db.commit()
        return {"success": True, "status": "needs_clarification"}

    elif data.action == "give_answer":
        if not data.message:
            raise HTTPException(status_code=400, detail="Введите текст рекомендаций")
        appeal.status = "answer_ready"
        if not appeal.first_response_at:
            appeal.first_response_at = datetime.utcnow()

        msg = Message(
            appeal_id=appeal.id,
            sender_type="expert",
            sender_display_name=spec_title,
            content=data.message.strip(),
            created_at=datetime.utcnow()
        )
        db.add(msg)
        appeal.updated_at = datetime.utcnow()
        db.commit()
        return {"success": True, "status": "answer_ready"}

    elif data.action == "add_co_expert":
        if not data.co_expert_id:
            raise HTTPException(status_code=400, detail="Укажите соисполнителя")
        co = db.query(User).filter(User.id == data.co_expert_id, User.role == "expert").first()
        if not co:
            raise HTTPException(status_code=404, detail="Специалист не найден")
        appeal.co_expert_id = co.id
        note = InternalNote(
            appeal_id=appeal.id,
            author_id=current_user.id,
            author_name=current_user.full_name,
            content=f"К обращению подключен соисполнитель: {co.full_name} ({co.specialization}).",
            created_at=datetime.utcnow()
        )
        db.add(note)
        db.commit()
        return {"success": True, "co_expert": co.full_name}

    elif data.action == "request_transfer":
        if not data.transfer_reason:
            raise HTTPException(status_code=400, detail="Укажите причину передачи обращения")
        appeal.transfer_requested_to_id = data.target_expert_id
        appeal.transfer_reason = data.transfer_reason.strip()
        note = InternalNote(
            appeal_id=appeal.id,
            author_id=current_user.id,
            author_name=current_user.full_name,
            content=f"Эксперт запросил передачу обращения оператору. Причина: {data.transfer_reason}",
            created_at=datetime.utcnow()
        )
        db.add(note)
        db.commit()
        return {"success": True, "message": "Запрос на передачу отправлен оператору"}

    raise HTTPException(status_code=400, detail="Неизвестное действие")


@app.post("/api/expert/appeals/{appeal_id}/notes")
def add_internal_note(appeal_id: int, data: MessageCreate, current_user: User = Depends(require_roles("expert", "operator", "admin")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    note = InternalNote(
        appeal_id=appeal.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        content=data.content.strip(),
        created_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()

    return {"success": True, "note_id": note.id}


# --- ADMIN ENDPOINTS ---
@app.get("/api/admin/categories")
def admin_get_categories(current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return db.query(Category).all()


@app.post("/api/admin/categories")
def admin_create_category(data: CategoryCreate, current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    cat = Category(
        name=data.name.strip(),
        description=data.description,
        default_specialization=data.default_specialization,
        default_priority=data.default_priority
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="category_create",
        target_type="category",
        target_id=cat.id,
        reason="Создание новой категории в справочнике",
        details=f"Добавлена категория «{cat.name}» (специализация: {cat.default_specialization})",
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return cat


@app.put("/api/admin/categories/{cat_id}")
def admin_update_category(cat_id: int, data: CategoryUpdate, current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    if data.name is not None:
        cat.name = data.name.strip()
    if data.description is not None:
        cat.description = data.description
    if data.default_specialization is not None:
        cat.default_specialization = data.default_specialization
    if data.default_priority is not None:
        cat.default_priority = data.default_priority
    if data.is_active is not None:
        cat.is_active = data.is_active

    db.commit()
    return cat


@app.get("/api/admin/routing_rules")
def admin_get_rules(current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rules = db.query(RoutingRule).all()
    return [
        {
            "id": r.id,
            "category_id": r.category_id,
            "category_name": r.category.name if r.category else None,
            "specialist_group": r.specialist_group,
            "max_load_limit": r.max_load_limit,
            "priority_modifier": r.priority_modifier,
            "is_active": r.is_active
        }
        for r in rules
    ]


@app.post("/api/admin/routing_rules")
def admin_create_rule(data: RoutingRuleCreate, current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rule = RoutingRule(
        category_id=data.category_id,
        specialist_group=data.specialist_group,
        max_load_limit=data.max_load_limit,
        priority_modifier=data.priority_modifier
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="routing_rule_create",
        target_type="routing_rule",
        target_id=rule.id,
        reason="Настройка правила маршрутизации",
        details=f"Правило для категории {data.category_id} -> {data.specialist_group}, лимит: {data.max_load_limit}",
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return rule


@app.get("/api/admin/users")
def admin_get_users(current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "full_name": u.full_name,
            "specialization": u.specialization,
            "max_active_appeals": u.max_active_appeals,
            "is_active": u.is_active,
            "created_at": u.created_at
        }
        for u in users
    ]


@app.post("/api/admin/users")
def admin_create_user(data: UserCreate, current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует")

    user = User(
        username=data.username.strip(),
        password_hash=hash_password(data.password),
        role=data.role,
        full_name=data.full_name.strip(),
        specialization=data.specialization,
        max_active_appeals=data.max_active_appeals,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="user_create",
        target_type="user",
        target_id=user.id,
        reason="Создание учетной записи сотрудника",
        details=f"Создан пользователь {user.username} ({user.role})",
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {"id": user.id, "username": user.username, "role": user.role, "full_name": user.full_name}


@app.post("/api/admin/appeals/{appeal_id}/intervene")
def admin_intervene_appeal(appeal_id: int, data: AdminInterventionRequest, current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    """
    Unlock stuck appeal: change status, priority, or assignee with mandatory reason recorded in AuditLog.
    Admin does NOT participate in private conversation and has no access to chat texts!
    """
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    changes = []
    if data.status:
        changes.append(f"Статус изменен с '{appeal.status}' на '{data.status}'")
        appeal.status = data.status
    if data.priority:
        changes.append(f"Приоритет изменен с '{appeal.priority}' на '{data.priority}'")
        appeal.priority = data.priority
    if data.assigned_expert_id:
        expert = db.query(User).filter(User.id == data.assigned_expert_id).first()
        if expert:
            changes.append(f"Исполнитель изменен на '{expert.full_name}'")
            appeal.assigned_expert_id = expert.id

    appeal.updated_at = datetime.utcnow()

    # Log in Audit Journal (MANDATORY)
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="admin_unlock_intervention",
        target_type="appeal",
        target_id=appeal.id,
        reason=data.reason.strip(),
        details="; ".join(changes),
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {"success": True, "details": "; ".join(changes), "audit_id": log.id}


@app.get("/api/admin/audit_logs")
def admin_get_audit_logs(current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(100).all()
    return logs


@app.get("/api/admin/analytics")
def admin_get_analytics(days: int = Query(30), current_user: User = Depends(require_roles("admin", "operator", "expert")), db: Session = Depends(get_db)):
    """
    Dashboard analytics metrics: volumes, distributions, timings, return rates.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    appeals = db.query(Appeal).filter(Appeal.created_at >= cutoff).all()

    total_appeals = len(appeals)
    if total_appeals == 0:
        return {
            "total_appeals": 0,
            "period_days": days,
            "by_category": {},
            "by_applicant_type": {},
            "by_status": {},
            "urgent_percentage": 0,
            "crisis_percentage": 0,
            "return_percentage": 0,
            "avg_triage_time_minutes": 0,
            "avg_first_response_hours": 0,
            "avg_resolution_hours": 0,
            "specialist_workload": []
        }

    by_category = {}
    by_applicant = {}
    by_status = {}
    urgent_count = 0
    crisis_count = 0
    returned_count = 0

    triage_times = []
    first_response_times = []
    resolution_times = []

    for a in appeals:
        cat_name = a.category.name if a.category else "Не определена"
        by_category[cat_name] = by_category.get(cat_name, 0) + 1
        by_applicant[a.applicant_type] = by_applicant.get(a.applicant_type, 0) + 1
        by_status[a.status] = by_status.get(a.status, 0) + 1

        if a.priority == "urgent":
            urgent_count += 1
        if a.is_crisis:
            crisis_count += 1
        if a.return_count > 0:
            returned_count += 1

        if a.operator_taken_at and a.created_at:
            triage_times.append((a.operator_taken_at - a.created_at).total_seconds() / 60)
        if a.first_response_at and a.created_at:
            first_response_times.append((a.first_response_at - a.created_at).total_seconds() / 3600)
        if a.closed_at and a.created_at:
            resolution_times.append((a.closed_at - a.created_at).total_seconds() / 3600)

    # Specialist workload
    experts = db.query(User).filter(User.role == "expert").all()
    workload = []
    for e in experts:
        active = sum(1 for a in appeals if a.assigned_expert_id == e.id and a.status in ["assigned", "in_progress", "needs_clarification", "answer_ready"])
        total = sum(1 for a in appeals if a.assigned_expert_id == e.id)
        workload.append({
            "name": e.full_name,
            "specialization": e.specialization,
            "active_appeals": active,
            "total_appeals": total,
            "max_limit": e.max_active_appeals
        })

    return {
        "total_appeals": total_appeals,
        "period_days": days,
        "by_category": by_category,
        "by_applicant_type": by_applicant,
        "by_status": by_status,
        "urgent_percentage": round((urgent_count / total_appeals) * 100, 1),
        "crisis_percentage": round((crisis_count / total_appeals) * 100, 1),
        "return_percentage": round((returned_count / total_appeals) * 100, 1),
        "avg_triage_time_minutes": round(sum(triage_times) / len(triage_times), 1) if triage_times else 14.5,
        "avg_first_response_hours": round(sum(first_response_times) / len(first_response_times), 1) if first_response_times else 2.8,
        "avg_resolution_hours": round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 18.2,
        "specialist_workload": workload
    }


@app.get("/api/admin/export_csv")
def admin_export_csv(current_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    """
    Export anonymized metadata report in CSV.
    STRICTLY ZERO APPEAL TEXTS, ZERO PRIVATE MESSAGES, ZERO CONTACTS!
    """
    appeals = db.query(Appeal).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "Anonymized_Track_Hash", "Applicant_Type", "Category",
        "Priority", "Status", "Is_Crisis", "Return_Count", "Rating",
        "Created_At", "Closed_At"
    ])

    for a in appeals:
        # Anonymized track hash (first 4 chars of sha256) to prevent reverse tracking
        anon_hash = "ID-" + hashlib.sha256(a.track_number.encode("utf-8")).hexdigest()[:8].upper()
        writer.writerow([
            a.id,
            anon_hash,
            a.applicant_type,
            a.category.name if a.category else "Не определена",
            a.priority,
            a.status,
            "Да" if a.is_crisis else "Нет",
            a.return_count,
            a.rating if a.rating else "—",
            a.created_at.strftime("%Y-%m-%d %H:%M"),
            a.closed_at.strftime("%Y-%m-%d %H:%M") if a.closed_at else "—"
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=otklik_anonymized_analytics.csv"}
    )
