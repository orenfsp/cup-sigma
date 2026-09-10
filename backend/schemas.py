from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# Status descriptions dictionary for "ты" and "вы"
STATUS_TEXTS = {
    "new": {
        "student": "Мы получили твоё обращение",
        "adult": "Мы получили ваше обращение"
    },
    "assigned": {
        "student": "Мы передали обращение специалисту",
        "adult": "Мы передали ваше обращение специалисту"
    },
    "in_progress": {
        "student": "Специалист разбирается в ситуации",
        "adult": "Специалист разбирается в ситуации"
    },
    "needs_clarification": {
        "student": "Специалист задал вопрос — посмотри, пожалуйста",
        "adult": "Специалист задал вопрос — ознакомьтесь, пожалуйста"
    },
    "answer_ready": {
        "student": "Мы подготовили рекомендации",
        "adult": "Мы подготовили рекомендации"
    },
    "returned": {
        "student": "Мы вернулись к твоей ситуации",
        "adult": "Мы вернулись к вашей ситуации"
    },
    "completed": {
        "student": "Рады, что смогли помочь",
        "adult": "Рады, что смогли помочь"
    },
    "rejected": {
        "student": "Помочь с этим не сможем, вот куда обратиться",
        "adult": "Помочь с этим не сможем, вот куда обратиться"
    },
    "closed_no_response": {
        "student": "Обращение закрыто, но можно написать снова",
        "adult": "Обращение закрыто, но можно написать снова"
    }
}


class AppealCreate(BaseModel):
    applicant_type: str = Field(..., description="'student', 'parent', or 'teacher'")
    initial_text: str = Field(..., min_length=5)
    category_id: Optional[int] = None
    clarification_answers: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[str] = None


class MessageItem(BaseModel):
    id: int
    sender_type: str
    sender_display_name: str
    content: str
    created_at: datetime


class AttachmentItem(BaseModel):
    id: int
    filename: str
    file_size: int
    mime_type: str
    created_at: datetime


class InternalNoteItem(BaseModel):
    id: int
    author_id: int
    author_name: str
    content: str
    created_at: datetime


class TrackLookupResponse(BaseModel):
    track_number: str
    applicant_type: str
    status: str
    status_human: str
    priority: str
    is_crisis: bool
    initial_text: str
    category_name: Optional[str]
    clarification_answers: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    messages: List[MessageItem]
    attachments: List[AttachmentItem]
    can_close: bool
    can_return: bool
    return_count: int
    rating: Optional[int]
    rejection_reason: Optional[str]


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class OperatorAssignRequest(BaseModel):
    category_id: Optional[int] = None
    priority: str = Field(..., description="'urgent', 'standard', 'low'")
    assigned_expert_id: int


class OperatorDirectAnswerRequest(BaseModel):
    answer_text: str = Field(..., min_length=1)


class OperatorRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class OperatorReturnHandleRequest(BaseModel):
    action: str = Field(..., description="'reassign', 'return_to_same', 'close'")
    new_expert_id: Optional[int] = None
    explanation: Optional[str] = None


class ExpertActionRequest(BaseModel):
    action: str = Field(..., description="'take_in_work', 'request_clarification', 'give_answer', 'request_transfer', 'add_co_expert'")
    message: Optional[str] = None
    target_expert_id: Optional[int] = None
    co_expert_id: Optional[int] = None
    transfer_reason: Optional[str] = None


class ApplicantReactionRequest(BaseModel):
    reaction: str = Field(..., description="'helped' or 'not_helped'")
    reason: Optional[str] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    complaint: Optional[str] = None


class AdminInterventionRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_expert_id: Optional[int] = None
    reason: str = Field(..., min_length=5, description="Обязательное обоснование разблокировки для журнала аудита")


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_specialization: str = "psychology"
    default_priority: str = "standard"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_specialization: Optional[str] = None
    default_priority: Optional[str] = None
    is_active: Optional[bool] = None


class RoutingRuleCreate(BaseModel):
    category_id: int
    specialist_group: str
    max_load_limit: int = 8
    priority_modifier: str = "standard"


class RoutingRuleUpdate(BaseModel):
    specialist_group: Optional[str] = None
    max_load_limit: Optional[int] = None
    priority_modifier: Optional[str] = None
    is_active: Optional[bool] = None


class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    full_name: str
    specialization: Optional[str] = None
    max_active_appeals: int = 10


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    specialization: Optional[str] = None
    max_active_appeals: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    full_name: str
    specialization: Optional[str]
